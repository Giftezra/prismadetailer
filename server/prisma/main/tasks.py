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
    try:
        r = redis.Redis(host='prisma_redis', port=6379, db=0)
        channel = 'job_started'
        message = json.dumps(booking_reference)
        result = r.publish(channel, message)
        return f"Job started published to redis: {result}"
    except Exception as e:
        return f"Failed to publish job started to redis: {str(e)}"


@shared_task
def publish_job_completed(booking_reference):
    try:
        r = redis.Redis(host='prisma_redis', port=6379, db=0)
        channel = 'job_completed'
        message = json.dumps(booking_reference)
        result = r.publish(channel, message)
        return f"Job completed published to redis: {result}"
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
def create_job_chat_room(job_id):
    """Create a chat room for a specific job - IDENTICAL algorithm to client app"""
    try:
        from .models import Job, JobChatRoom
        from django.utils import timezone
        
        # Get the job
        job = Job.objects.get(id=job_id)
        
        # Check if job is still accepted and not completed/cancelled
        if job.status not in ['accepted', 'in_progress']:
            return f"Job {job.booking_reference} is no longer active"
        
        # Check if chat room already exists
        if JobChatRoom.objects.filter(job=job).exists():
            return f"Chat room already exists for job {job.booking_reference}"
        
        # Create the chat room
        chat_room = JobChatRoom.objects.create(
            job=job,
            client_name=job.client_name,
            detailer=job.detailer,
            is_active=True
        )
        
        # Send notification to detailer
        if job.detailer.user.allow_push_notifications and job.detailer.user.notification_token:
            send_push_notification.delay(
                job.detailer.user.id,
                "Chat Available 💬",
                f"Chat is now available for your upcoming {job.service_type.name} service with {job.client_name}",
                "chat_available"
            )
        
        return f"Chat room created successfully for job {job.booking_reference}"
        
    except Job.DoesNotExist:
        return f"Job with ID {job_id} not found"
    except Exception as e:
        return f"Failed to create chat room: {str(e)}"


@shared_task
def cleanup_job_chat(chat_room_id):
    """Clean up chat messages after job completion - IDENTICAL to client app"""
    try:
        from .models import JobChatRoom, JobChatMessage
        from django.utils import timezone
        from datetime import timedelta
        
        # Wait 24 hours before cleanup to allow for reviews
        cleanup_time = timezone.now() + timedelta(hours=24)
        
        # Schedule the actual cleanup
        cleanup_job_chat_messages.apply_async(
            args=[chat_room_id],
            eta=cleanup_time
        )
        
        return f"Chat cleanup scheduled for room {chat_room_id}"
    except Exception as e:
        return f"Failed to schedule chat cleanup: {e}"


@shared_task
def cleanup_job_chat_messages(chat_room_id):
    """Actually delete chat messages - IDENTICAL to client app"""
    try:
        from .models import JobChatRoom, JobChatMessage
        
        chat_room = JobChatRoom.objects.get(id=chat_room_id)
        
        # Delete all messages
        message_count = JobChatMessage.objects.filter(room=chat_room).count()
        JobChatMessage.objects.filter(room=chat_room).delete()
        
        # Delete the chat room
        chat_room.delete()
        
        return f"Cleaned up {message_count} messages from room {chat_room_id}"
    except Exception as e:
        return f"Failed to cleanup chat room {chat_room_id}: {e}"


@shared_task
def send_password_reset_email(user_email, user_name, reset_token):
    subject = "Reset Your Prisma Password"
    
    # Get base URL from settings
    from django.conf import settings
    base_url = getattr(settings, 'BASE_URL', 'https://yourdomain.com')
    
    # Web URL that works for everyone
    web_reset_url = f"{base_url}/reset-password/?token={reset_token}"
    
    # Mobile deep link for app users
    mobile_deep_link = f"prismadetailer://onboarding/ResetPasswordScreen?token={reset_token}"
    
    html_message = render_to_string('password_reset_email.html', {
        'user_name': user_name,
        'web_reset_url': web_reset_url,
        'mobile_deep_link': mobile_deep_link,
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
    from main.models import Job
    from django.utils import timezone
    from datetime import timedelta
    
    today = timezone.now().date()
    
    # Get all detailers with jobs today
    detailers_with_jobs = Job.objects.filter(
        appointment_date__date=today,
        status__in=['accepted', 'in_progress']
    ).values('detailer').distinct()
    
    for detailer_data in detailers_with_jobs:
        detailer_id = detailer_data['detailer']
        today_jobs = Job.objects.filter(
            detailer_id=detailer_id,
            appointment_date__date=today,
            status__in=['accepted', 'in_progress']
        ).order_by('appointment_time')
        
        if today_jobs.exists():
            job_count = today_jobs.count()
            first_job = today_jobs.first()
            
            title = f"Daily Schedule - {job_count} Job{'s' if job_count > 1 else ''} Today"
            message = f"You have {job_count} job{'s' if job_count > 1 else ''} scheduled today. First appointment: {first_job.appointment_time.strftime('%H:%M')} - {first_job.service_type.name}"
            
            send_push_notification.delay(
                first_job.detailer.user.id,
                first_job.id,
                title,
                message,
                "reminder"
            )


@shared_task
def check_upcoming_jobs():
    """Check for jobs starting soon and send reminders"""
    from main.models import Job
    from django.utils import timezone
    from datetime import timedelta
    
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
        send_push_notification.delay(
            job.detailer.user.id,
            job.id,
            "Job Starting Soon! 🚗",
            f"Your {job.service_type.name} appointment with {job.client_name} starts in 30 minutes at {job.address}",
            "reminder"
        )


@shared_task
def check_pending_jobs():
    """ Send notification for jobs that are pending and haven't been accepted yet """
    from main.models import Job
    from django.utils import timezone
    from datetime import timedelta
    
    try:
        now = timezone.now()
    
        # Check for jobs that are pending and haven't been accepted yet
        pending_jobs = Job.objects.filter(
            status='pending'
        )

        for job in pending_jobs:
            send_push_notification.delay(
                job.detailer.user.id,
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
        result = send_push_notification.delay(
            job.detailer.user.id,
            "Job Closing Soon! 🚗",
            f"Your appointment with {job.client_name} ends in 15 minutes please remember to complete the job",
            "reminder"
        )
        
        pass
        return f"Closing notification sent for job {job.booking_reference}"
        
    except Job.DoesNotExist:
        return f"Job with ID {job_id} not found"
    except Exception as e:
        return f"Failed to send closing notification: {str(e)}"
    
    