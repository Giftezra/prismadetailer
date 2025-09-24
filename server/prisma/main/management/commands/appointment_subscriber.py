from django.core.management.base import BaseCommand
from main.tasks import send_appointment_cancellation_email, send_appointment_rescheduling_email, send_booking_confirmation_email, send_push_notification
from main.util.media_helper import get_full_media_url
from main.models import Job, Notification, Earning
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import redis
import json
import time


class Command(BaseCommand):
    help = "Subscribe to appointment cancellations"

    def connect_to_redis(self, max_retries=30, delay=5):
        """Connect to Redis with retry logic"""
        for attempt in range(max_retries):
            try:
                r = redis.Redis(host='prisma_redis', port=6379, db=0, decode_responses=True)
                r.ping()  # Test the connection
                self.stdout.write(self.style.SUCCESS(f'Successfully connected to Redis on attempt {attempt + 1}'))
                return r
            except redis.ConnectionError as e:
                if attempt < max_retries - 1:
                    self.stdout.write(
                        self.style.WARNING(f'Redis connection failed: {e}. Retrying in {delay} seconds... (attempt {attempt + 1}/{max_retries})')
                    )
                    time.sleep(delay)
                else:
                    self.stdout.write(self.style.ERROR(f'Failed to connect to Redis after {max_retries} attempts: {e}'))
                    raise

    def handle(self, *args, **kwargs):
        
        # Connect to Redis with retry logic
        r = self.connect_to_redis()
        pubsub = r.pubsub()

        pubsub.subscribe('booking_cancelled', 'booking_rescheduled','review_received')
        self.stdout.write(self.style.SUCCESS('Subscribed to booking cancellations and reschedules and review received'))

        channel_layer = get_channel_layer()

        try:
            for message in pubsub.listen():
                if message.get('type') != 'message':
                    continue

                channel = message.get('channel')
                raw_data = message.get('data')

                try:
                    # Parse the JSON data - handle both object and string formats
                    data = json.loads(raw_data)
                    if isinstance(data, dict):
                        # Object format: {"booking_reference": "ABC123"}
                        booking_reference = data.get('booking_reference', raw_data)
                        new_appointment_date = data.get('new_appointment_date', '')
                        new_appointment_time = data.get('new_appointment_time', '')
                        total_amount = data.get('total_amount', 0)
                        rating = data.get('rating', 0)
                        tip_amount = data.get('tip_amount', 0)
                    else:
                        # String format: "ABC123"
                        booking_reference = str(data).strip().strip('"').strip("'")
                        new_appointment_date = ''
                        new_appointment_time = ''
                        total_amount = 0
                        rating = 0
                        tip_amount = 0
                except Exception as e:
                    # Fallback to string parsing if JSON fails
                    booking_reference = str(raw_data).strip().strip('"').strip("'")
                    new_appointment_date = ''
                    new_appointment_time = ''
                    total_amount = 0

                self.stdout.write(f"Received on {channel}: {booking_reference}")

                try:
                    job = Job.objects.get(booking_reference=booking_reference)

                    if channel == 'booking_cancelled':
                        job.status = 'cancelled'
                        job.save()

                        # Send the email notification if the detailer has email notifications enabled
                        if job.detailer.user.allow_email_notifications:
                            send_appointment_cancellation_email(
                                booking_reference, 
                                job.detailer.user.email, 
                                job.appointment_date, 
                                job.appointment_time
                            )

                        # Send the push notification if the detailer has push notifications enabled
                        if job.detailer.user.allow_push_notifications and job.detailer.user.notification_token:
                            send_push_notification(
                                job.detailer.user.id, 
                                'Appointment Cancelled', 
                                'Your appointment has been cancelled', 
                                'booking_cancelled'
                            )

                        self.create_notification(
                            job.detailer.user, 
                            'Appointment Cancelled', 
                            'booking_cancelled', 
                            'error', 
                            'Your appointment has been cancelled')

                    elif channel == 'booking_rescheduled':
                        job.appointment_date = new_appointment_date
                        job.appointment_time = new_appointment_time
                        job.total_amount = total_amount
                        job.status = 'pending'
                        job.save()
                        if job.detailer.user.allow_email_notifications:
                            send_appointment_rescheduling_email(
                            booking_reference, 
                            job.detailer.user.email, 
                            new_appointment_date, 
                            new_appointment_time, 
                            total_amount
                            )

                        if job.detailer.user.allow_push_notifications and job.detailer.user.notification_token:
                            send_push_notification(
                                job.detailer.user.id, 
                                'Appointment Rescheduled', 
                                'Your appointment has been rescheduled', 
                                'booking_rescheduled'
                            )
                            
                        self.create_notification(
                            job.detailer.user, 
                            'Appointment Rescheduled', 
                            'booking_rescheduled', 
                            'warning', 
                            'Your appointment has been rescheduled')
                    
                    # Given the booking reference, get the job and update the rating on the associated detailer account
                    # Also update the tip amount on the associated earning record
                    elif channel == 'review_received':
                        job.rating = rating
                        job.save()
                        earning = Earning.objects.get(job=job)
                        earning.tip_amount = tip_amount
                        earning.save()

                        self.create_notification(
                            job.detailer.user, 
                            'Review Received', 
                            'review_received', 
                            'success', 
                            f'You have received a review with a rating of {rating} and a tip amount of {self.get_currency(job.detailer.country)} {tip_amount}'
                            )

                        if job.detailer.user.allow_push_notifications and job.detailer.user.notification_token:
                            send_push_notification(
                                job.detailer.user.id, 
                                'Review Received', 
                                f'You have received a review with a rating of {rating} and a tip amount of {self.get_currency(job.detailer.country)} {tip_amount}', 
                                'review_received'
                            )


                except Job.DoesNotExist:
                    self.stdout.write(self.style.ERROR(f"Job not found: {booking_reference}"))
                    continue
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error processing message: {str(e)}"))
                    continue
        finally:
            pubsub.close()
            self.stdout.write(self.style.SUCCESS('Unsubscribed from job cancellations and reschedules'))
    

    def send_websocket_notification(self, channel_layer, user_id, booking_reference, status, message):
        """ Send a websocket notification to the user """
        try:
            async_to_sync(channel_layer.group_send)(
                f"detailer_{user_id}",
                {
                    'type': 'status_update',
                    'booking_reference': booking_reference,
                    'status': status,
                    'message': message
                }
            )
            self.stdout.write(f"Websocket notification sent to {user_id}")
        except Exception as e:
            self.stderr.write(f"Failed to send websocket notification: {e}")
            return False
        return True



    def create_notification(self, user, title, type, status, message):
        """ Create a notification """
        try:
            Notification.objects.create(
                user=user,
                title=title,
                type=type,
                status=status,
                message=message
            )
            self.stdout.write(f"Notification created for user {user.id}")
            return True
        except Exception as e:
            self.stderr.write(f"Failed to create notification: {e}")
            return False

    
    # Get the currency of the detailer using the country
    def get_currency(self, country):
        """ Get the currency of the detailer using the country """
        if country == 'united kingdom' or country == 'United Kingdom':
            return '£'
        elif country == 'ireland' or country == 'Ireland':
            return '€'
        else:
            return '€'

