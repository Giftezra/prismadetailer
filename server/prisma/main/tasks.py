from django.core.mail import send_mail
from celery import shared_task
from django.conf import settings
from django.template.loader import render_to_string
from main.util.graph_mail import send_mail as graph_send_mail
from asgiref.sync import async_to_sync
from exponent_server_sdk import PushClient, PushMessage
import json
from main.utils.redis_streams import stream_add, STREAM_JOB_EVENTS



@shared_task
def send_welcome_email(user_email):
    subject = "Welcome to Prisma - Let's Get Started! 🎉"
    html_message = render_to_string('welcome_email.html')
    try:
        graph_send_mail(subject, html_message, user_email)
        return f"Welcome email sent successfully to {user_email}"
    except Exception as e:
        return f"Failed to send welcome email: {str(e)}"


@shared_task
def send_booking_confirmation_email(detailer_email, booking_reference, appointment_date, appointment_time, address, service_type_name, owner_note, total_amount):
    subject = "Booking Confirmation"
    html_message = render_to_string('booking_confirmation.html', {
        'booking_reference': booking_reference,
        'appointment_date': appointment_date,
        'appointment_time': appointment_time, 
        'address': address,
        'service_type_name': service_type_name,
        'owner_note': owner_note,
        'total_amount': total_amount})
    try:
        graph_send_mail(subject, html_message, detailer_email)
        return f"Booking confirmation email sent successfully to {detailer_email}"
    except Exception as e:
        return f"Failed to send booking confirmation email: {str(e)}"


"""Publish the job acceptance to Redis stream so the client app receives the notification and creates the job in the database."""
@shared_task
def publish_job_acceptance(booking_reference, detailer_email, detailer_name, detailer_phone, detailer_rating=0.0):
    try:
        message_data = {
            'booking_reference': booking_reference,
            'detailer': {
                'name': detailer_name,
                'phone': detailer_phone,
                'rating': detailer_rating
            }
        }
        payload = json.dumps(message_data)
        msg_id = stream_add(STREAM_JOB_EVENTS, {'event': 'job_acceptance', 'payload': payload})
        return f"Job acceptance published to stream: {msg_id}"
    except Exception as e:
        return f"Failed to publish job acceptance to redis: {str(e)}"


@shared_task
def publish_job_started(booking_reference):
    try:
        from main.models import Job
        from main.util.media_helper import get_full_media_url
        
        # Get the job with its before images
        try:
            job = Job.objects.get(booking_reference=booking_reference)
            
            # Collect ONLY before images with segment
            before_images = []
            for img in job.images.filter(image_type='before'):
                before_images.append({
                    'image_url': get_full_media_url(img.image.url),
                    'uploaded_at': img.uploaded_at.isoformat(),
                    'segment': img.segment
                })
            
            # Structure the message with booking reference and before images
            message_data = {
                'booking_reference': booking_reference,
                'before_images': before_images
            }
            
        except Job.DoesNotExist:
            # If job not found, send just the booking reference (backwards compatible)
            message_data = {
                'booking_reference': booking_reference,
                'before_images': []
            }
        payload = json.dumps(message_data)
        msg_id = stream_add(STREAM_JOB_EVENTS, {'event': 'job_started', 'payload': payload})
        return f"Job started published to stream: {msg_id}"
    except Exception as e:
        return f"Failed to publish job started to redis: {str(e)}"


@shared_task
def publish_job_completed(booking_reference):
    try:
        from main.models import Job
        from main.util.media_helper import get_full_media_url
        
        # Get the job with its after images
        try:
            job = Job.objects.get(booking_reference=booking_reference)
            
            # Collect ONLY after images with segment
            after_images = []
            for img in job.images.filter(image_type='after'):
                after_images.append({
                    'image_url': get_full_media_url(img.image.url),
                    'uploaded_at': img.uploaded_at.isoformat(),
                    'segment': img.segment
                })
            
            # Get fleet maintenance data if exists
            fleet_maintenance_data = None
            if hasattr(job, 'fleet_maintenance') and job.fleet_maintenance:
                from main.serializer import JobFleetMaintenanceSerializer
                fleet_maintenance_data = JobFleetMaintenanceSerializer(job.fleet_maintenance).data
            
            # Structure the message with booking reference, after images, and fleet maintenance
            message_data = {
                'booking_reference': booking_reference,
                'after_images': after_images,
                'fleet_maintenance': fleet_maintenance_data
            }
            
        except Job.DoesNotExist:
            # If job not found, send just the booking reference (backwards compatible)
            message_data = {
                'booking_reference': booking_reference,
                'after_images': [],
                'fleet_maintenance': None
            }
        payload = json.dumps(message_data)
        msg_id = stream_add(STREAM_JOB_EVENTS, {'event': 'job_completed', 'payload': payload})
        return f"Job completed published to stream: {msg_id}"
    except Exception as e:
        return f"Failed to publish job completed to redis: {str(e)}"


@shared_task
def send_appointment_cancellation_email(booking_reference, detailer_email, appointment_date, appointment_time):
    try:
        subject = "Appointment Cancellation"
        html_message = render_to_string('appointment_cancellation.html', {
            'booking_reference': booking_reference,
            'appointment_date': appointment_date,
            'appointment_time': appointment_time,
        })
        graph_send_mail(subject, html_message, detailer_email)
        return f"Appointment cancellation email sent successfully to {detailer_email}"
    except Exception as e:
        return f"Failed to send appointment cancellation email: {str(e)}"



@shared_task
def send_appointment_rescheduling_email(booking_reference, detailer_email, new_appointment_date, new_appointment_time, total_amount):
    try:
        subject = "Appointment Rescheduling"
        html_message = render_to_string('appointment_rescheduling.html', {
            'booking_reference': booking_reference,
            'new_appointment_date': new_appointment_date,
            'new_appointment_time': new_appointment_time,
            'total_amount': total_amount,
        })
        graph_send_mail(subject, html_message, detailer_email)
        return f"Appointment rescheduling email sent successfully to {detailer_email}"
    except Exception as e:
        return f"Failed to send appointment rescheduling email: {str(e)}"




@shared_task
def send_websocket_notification(user_id, booking_reference, status, message):
    """ Send a websocket notification to the user """
    try:
        from channels.layers import get_channel_layer
        channel_layer = get_channel_layer()
        
        async_to_sync(channel_layer.group_send)(
            f"detailer_{user_id}",
            {
                'type': 'status_update',
                'booking_reference': booking_reference,
                'status': status,
                'message': message
            }
        )
        pass
    except Exception as e:
        pass
        return False
    return True


@shared_task
def create_notification(user_id, title, type, status, message):
    """ Create a notification """
    try:
        from main.models import Notification, User
        user = User.objects.get(id=user_id)
        Notification.objects.create(
            user=user,
            title=title,
            type=type,
            status=status,
            message=message
        )
        return True
    except Exception as e:
        return False


@shared_task
def send_push_notification(user_id, title, message, type):
    """ Send a push notification to the user """
    try:
        from main.models import User
        user = User.objects.get(id=user_id)
        
        # Check if user has notification token
        if not user.notification_token:
            return f"Push notification not sent: User {user_id} has no notification token"
        
        # Check if user has allowed push notifications
        if not user.allow_push_notifications:
            return f"Push notification not sent: User {user_id} has disabled push notifications"
        
        # Send the notification
        push_client = PushClient()
        response = push_client.publish(
            PushMessage(
                to=user.notification_token, 
                title=title, 
                body=message,
                data={
                    "type": type,
                    "title": title,
                    "body": message
                }
            )
        )
        
        # Check if the response indicates success
        if response and hasattr(response, 'data') and response.data:
            return f"Push notification sent successfully to user {user_id}"
        else:
            return f"Push notification failed for user {user_id}: Invalid response"
        
    except Exception as e:
        error_msg = f"Failed to send push notification to user {user_id}: {str(e)}"
        return error_msg


@shared_task
def send_password_reset_email(user_email, user_name, reset_token):
    subject = "Reset Your Prisma Password"
    
    # Get base URL from settings
    from django.conf import settings
    base_url = getattr(settings, 'BASE_URL', 'https://yourdomain.com')
    
    # Web URL that works for everyone - note the /api/v1/ prefix
    web_reset_url = f"{base_url}/api/v1/auth/web-reset-password/?token={reset_token}"
    
    html_message = render_to_string('password_reset_email.html', {
        'user_name': user_name,
        'web_reset_url': web_reset_url,
        'expires_in': '1 hour'
    })
    
    try:
        graph_send_mail(subject, html_message, user_email)
        return f"Password reset email sent successfully to {user_email}"
    except Exception as e:
        return f"Failed to send password reset email: {str(e)}"


@shared_task
def check_daily_schedule():
    """Send daily schedule summary to detailers"""
    from django.db import close_old_connections
    from main.models import Job
    from django.utils import timezone
    from datetime import timedelta
    
    # Close stale database connections before querying
    close_old_connections()
    
    today = timezone.now().date()
    
    # Get all detailers with jobs today (by primary_detailer)
    detailers_with_jobs = Job.objects.filter(
        appointment_date__date=today,
        status__in=['accepted', 'in_progress'],
        primary_detailer__isnull=False
    ).values('primary_detailer').distinct()
    
    for detailer_data in detailers_with_jobs:
        detailer_id = detailer_data['primary_detailer']
        today_jobs = Job.objects.filter(
            primary_detailer_id=detailer_id,
            appointment_date__date=today,
            status__in=['accepted', 'in_progress']
        ).order_by('appointment_time')
        
        if today_jobs.exists():
            job_count = today_jobs.count()
            first_job = today_jobs.first()
            
            title = f"Daily Schedule - {job_count} Job{'s' if job_count > 1 else ''} Today"
            message = f"You have {job_count} job{'s' if job_count > 1 else ''} scheduled today. First appointment: {first_job.appointment_time.strftime('%H:%M')} - {first_job.service_type.name}"
            
            send_push_notification.delay(
                first_job.primary_detailer.user.id,
                first_job.id,
                title,
                message,
                "reminder"
            )


@shared_task
def check_upcoming_jobs():
    """Check for jobs starting soon and send reminders"""
    from django.db import close_old_connections
    from main.models import Job
    from django.utils import timezone
    from datetime import timedelta
    
    # Close stale database connections before querying
    close_old_connections()
    
    now = timezone.now()
    
    # Check for jobs starting in 30 minutes
    thirty_minutes_from_now = now + timedelta(minutes=30)
    
    # Create time range for filtering (25-35 minutes from now)
    time_lower_bound = (thirty_minutes_from_now - timedelta(minutes=5)).time()
    time_upper_bound = (thirty_minutes_from_now + timedelta(minutes=5)).time()
    
    upcoming_jobs = Job.objects.filter(
        status='accepted',
        appointment_date__date=thirty_minutes_from_now.date(),
        appointment_time__gte=time_lower_bound,
        appointment_time__lte=time_upper_bound
    )
    
    for job in upcoming_jobs:
        if job.primary_detailer:
            send_push_notification.delay(
                job.primary_detailer.user.id,
                job.id,
                "Job Starting Soon! 🚗",
                f"Your {job.service_type.name} appointment with {job.client_name} starts in 30 minutes at {job.address}",
                "reminder"
            )


@shared_task
def check_pending_jobs():
    """ Send notification for jobs that are pending and haven't been accepted yet """
    from django.db import close_old_connections
    from main.models import Job, Notification
    from django.utils import timezone
    from datetime import timedelta
    
    # Close stale database connections before querying
    close_old_connections()
    
    try:
        now = timezone.now()
        # Only send notifications for pending jobs that haven't been notified in the last hour
        one_hour_ago = now - timedelta(hours=1)
    
        # Check for jobs that are pending and haven't been accepted yet
        pending_jobs = Job.objects.filter(
            status='pending'
        )

        for job in pending_jobs:
            if job.primary_detailer:
                send_push_notification.delay(
                    job.primary_detailer.user.id,
                    "Pending Tasks",
                    f"You have pending tasks to either accept or reject. Please check your dashboard to manage your tasks.",
                    "pending_jobs"
                )

    except Exception as e:
        return f"Failed to check pending jobs: {str(e)}"


@shared_task
def send_job_closing_notification(job_id):
    """Send 15-minute closing notification for a specific job"""
    try:
        from main.models import Job
        from django.utils import timezone
        
        # Get the job
        job = Job.objects.get(id=job_id)
        
        # Check if job is still in progress
        if job.status != 'in_progress':
            return f"Job {job.booking_reference} is no longer in progress"
        
        # Send the closing notification
        if job.primary_detailer:
            result = send_push_notification.delay(
                job.primary_detailer.user.id,
                "Job Closing Soon! 🚗",
                f"Your appointment with {job.client_name} ends in 15 minutes please remember to complete the job",
                "reminder"
            )
        return f"Closing notification sent for job {job.booking_reference}"
        
    except Job.DoesNotExist:
        return f"Job with ID {job_id} not found"
    except Exception as e:
        return f"Failed to send closing notification: {str(e)}"
    
    