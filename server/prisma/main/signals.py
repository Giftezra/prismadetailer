from django.db.models.signals import post_save
from django.dispatch import receiver
from datetime import timedelta
from django.utils import timezone
from main.models import Job, JobChatRoom, Notification
from main.tasks import send_push_notification, cleanup_job_chat, create_job_chat_room, send_job_closing_notification

@receiver(post_save, sender=Job)
def handle_job_status_change(sender, instance, created, **kwargs):
    """Handle job status changes and chat room lifecycle - IDENTICAL to client app"""
    if not created:  # Only for updates, not new jobs
        
        # Schedule chat room creation 1 hour before job starts when job is accepted
        if instance.status == 'accepted':
            # Calculate when to create the chat room (1 hour before appointment)
            # Note: Job model has appointment_date as DateTimeField and appointment_time as TimeField
            appointment_datetime = timezone.datetime.combine(
                instance.appointment_date.date(), 
                instance.appointment_time
            )
            appointment_datetime = timezone.make_aware(appointment_datetime)

            # Set the reminder time to 30 mins and send a reminder notification
            reminder_time = appointment_datetime - timedelta(minutes=30)
            now = timezone.now()
            if reminder_time > now:
                send_push_notification.apply_async(
                    args=[instance.detailer.user.id, "Job Starting Soon! 🚗", f"Your {instance.service_type.name} appointment with {instance.client_name} starts in 30 minutes at {instance.address}", "reminder"],
                    eta=reminder_time
                )
                print(f"Scheduled 30-minute reminder for job {instance.booking_reference} at {reminder_time}")
        
        # Schedule 15-minute closing notification when job status changes to in_progress
        elif instance.status == 'in_progress':
            # Calculate closing notification time (15 minutes before appointment ends)
            appointment_datetime = timezone.datetime.combine(
                instance.appointment_date.date(), 
                instance.appointment_time
            )
            appointment_datetime = timezone.make_aware(appointment_datetime)
            
            # Add duration to get end time (duration is in minutes)
            end_time = appointment_datetime + timedelta(minutes=instance.duration or 0)
            closing_notification_time = end_time - timedelta(minutes=15)
            now = timezone.now()
            
            # Only schedule if the closing notification time is in the future
            if closing_notification_time > now:
                # Schedule the dedicated closing notification task to execute at the exact time
                send_job_closing_notification.apply_async(
                    args=[instance.id],
                    eta=closing_notification_time
                )
                print(f"Scheduled 15-minute closing notification for job {instance.booking_reference} at {closing_notification_time}")
            else:
                print(f"Cannot schedule closing notification for job {instance.booking_reference} - notification time {closing_notification_time} is in the past")
        
        # Close and cleanup chat room when job is completed or cancelled
        elif instance.status in ['completed', 'cancelled']:
            try:
                chat_room = JobChatRoom.objects.get(job=instance)
                chat_room.is_active = False
                chat_room.closed_at = timezone.now()
                chat_room.save()
                
                # Schedule cleanup task
                cleanup_job_chat.delay(str(chat_room.id))
                print(f"Chat room closed for job {instance.booking_reference}")
            except JobChatRoom.DoesNotExist:
                pass
