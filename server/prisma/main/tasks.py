from django.core.mail import send_mail
from celery import shared_task
from django.conf import settings
from django.template.loader import render_to_string
from main.util.graph_mail import send_mail as graph_send_mail
from asgiref.sync import async_to_sync
from exponent_server_sdk import PushClient, PushMessage
import redis
import json



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


""" Publish the job acceptance to redis so that the client app will receive the notification and then create the job in the database"""
@shared_task
def publish_job_acceptance(booking_reference):
    try:
        r = redis.Redis(host='prisma_redis', port=6379, db=0)
        channel = 'job_acceptance'
        message = json.dumps(booking_reference)
        result = r.publish(channel, message)
        return f"Job acceptance published to redis: {result}"
    except Exception as e:
        return f"Failed to publish job acceptance to redis: {str(e)}"


@shared_task
def publish_job_started(booking_reference):
    print(f"DEBUG: publish_job_started called with booking_reference: {booking_reference}")
    try:
        r = redis.Redis(host='prisma_redis', port=6379, db=0)
        channel = 'job_started'
        message = json.dumps(booking_reference)
        result = r.publish(channel, message)
        print(f"DEBUG: publish_job_started result: {result}")
        return f"Job started published to redis: {result}"
    except Exception as e:
        print(f"DEBUG: publish_job_started error: {str(e)}")
        return f"Failed to publish job started to redis: {str(e)}"


@shared_task
def publish_job_completed(booking_reference):
    print(f"DEBUG: publish_job_completed called with booking_reference: {booking_reference}")
    try:
        r = redis.Redis(host='prisma_redis', port=6379, db=0)
        channel = 'job_completed'
        message = json.dumps(booking_reference)
        result = r.publish(channel, message)
        print(f"DEBUG: publish_job_completed result: {result}")
        return f"Job completed published to redis: {result}"
    except Exception as e:
        print(f"DEBUG: publish_job_completed error: {str(e)}")
        return f"Failed to publish job completed to redis: {str(e)}"


@shared_task
def send_appointment_cancellation_email(booking_reference, detailer_email, appointment_date, appointment_time):
    print(f"DEBUG: send_appointment_cancellation_email called with booking_reference: {booking_reference} and detailer_email: {detailer_email}")
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
        print(f"DEBUG: send_appointment_cancellation_email error: {str(e)}")
        return f"Failed to send appointment cancellation email: {str(e)}"


@shared_task
def send_appointment_rescheduling_email(booking_reference, detailer_email, new_appointment_date, new_appointment_time, total_amount):
    print(f"DEBUG: send_appointment_rescheduling_email called with booking_reference: {booking_reference} and detailer_email: {detailer_email}")
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
        print(f"DEBUG: send_appointment_rescheduling_email error: {str(e)}")
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
        print(f"Websocket notification sent to {user_id}")
    except Exception as e:
        print(f"Failed to send websocket notification: {e}")
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
        print(f"Failed to create notification: {e}")
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
        push_client.send_message(
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
        return f"Push notification sent successfully to user {user_id}"
        
    except Exception as e:
        error_msg = f"Failed to send push notification to user {user_id}: {str(e)}"
        print(error_msg)
        return error_msg