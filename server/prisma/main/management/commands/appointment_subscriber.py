from django.core.management.base import BaseCommand
import json
import time

from main.tasks import (
    send_appointment_cancellation_email,
    send_appointment_rescheduling_email,
    send_push_notification,
)
from main.models import Job, Notification, Review
from main.utils.redis_streams import (
    STREAM_JOB_EVENTS,
    ensure_consumer_group,
    read_group_blocking,
    read_pending,
    ack,
    get_redis,
)

DETAILER_GROUP = "detailer_group"
CONSUMER_NAME = "appointment_subscriber"


class Command(BaseCommand):
    help = "Read from Redis stream job_events (booking_cancelled, booking_rescheduled, review_received) and process messages."

    def connect_with_retry(self, max_retries=30, delay=10):
        """Ensure Redis is reachable before starting."""
        for attempt in range(max_retries):
            try:
                r = get_redis(decode_responses=True)
                r.ping()
                self.stdout.write(self.style.SUCCESS(f"Connected to Redis on attempt {attempt + 1}"))
                return
            except Exception as e:
                if attempt < max_retries - 1:
                    self.stdout.write(
                        self.style.WARNING(f"Redis connection failed: {e}. Retrying in {delay}s... ({attempt + 1}/{max_retries})")
                    )
                    time.sleep(delay)
                else:
                    self.stdout.write(self.style.ERROR(f"Failed to connect after {max_retries} attempts: {e}"))
                    raise

    def handle(self, *args, **kwargs):
        self.connect_with_retry()
        ensure_consumer_group(STREAM_JOB_EVENTS, DETAILER_GROUP)
        self.stdout.write(self.style.SUCCESS("Subscribed to job_events stream (detailer_group)"))

        # Process pending messages from previous run
        for msg_id, fields in read_pending(STREAM_JOB_EVENTS, DETAILER_GROUP, CONSUMER_NAME):
            self._process_message(msg_id, fields)

        try:
            while True:
                entries = read_group_blocking(STREAM_JOB_EVENTS, DETAILER_GROUP, CONSUMER_NAME, block_ms=5000)
                for msg_id, fields in entries:
                    self._process_message(msg_id, fields)
        except KeyboardInterrupt:
            self.stdout.write(self.style.SUCCESS("appointment_subscriber stopped"))

    def _process_message(self, msg_id, fields):
        event = fields.get("event")
        raw = fields.get("payload", "{}")
        if event not in ("booking_cancelled", "booking_rescheduled", "review_received"):
            ack(STREAM_JOB_EVENTS, DETAILER_GROUP, msg_id)
            return
        try:
            data = json.loads(raw)
            if isinstance(data, dict):
                booking_reference = data.get("booking_reference", data)
                new_appointment_date = data.get("new_appointment_date", "")
                new_appointment_time = data.get("new_appointment_time", "")
                total_amount = data.get("total_amount", 0)
                try:
                    rating = int(data.get("rating", 0))
                except (TypeError, ValueError):
                    rating = 0
            else:
                booking_reference = str(data).strip().strip('"').strip("'")
                new_appointment_date = new_appointment_time = ""
                total_amount = rating = 0
        except Exception:
            booking_reference = str(raw).strip().strip('"').strip("'")
            new_appointment_date = new_appointment_time = ""
            total_amount = rating = 0

        self.stdout.write(f"Received {event}: {booking_reference}" + (f" (rating={rating})" if event == "review_received" else ""))

        try:
            job = Job.objects.get(booking_reference=booking_reference)
            primary = getattr(job, "primary_detailer", None)
            if not primary:
                self.stdout.write(self.style.WARNING(f"Job {booking_reference} has no primary_detailer, skipping"))
                ack(STREAM_JOB_EVENTS, DETAILER_GROUP, msg_id)
                return

            if event == "booking_cancelled":
                job.status = "cancelled"
                job.save()
                if primary.user.allow_email_notifications:
                    send_appointment_cancellation_email(
                        booking_reference,
                        primary.user.email,
                        job.appointment_date,
                        job.appointment_time,
                    )
                if primary.user.allow_push_notifications and primary.user.notification_token:
                    send_push_notification(
                        primary.user.id,
                        "Appointment Cancelled",
                        "Your appointment has been cancelled",
                        "booking_cancelled",
                    )
                self.create_notification(
                    primary.user,
                    "Appointment Cancelled",
                    "booking_cancelled",
                    "error",
                    "Your appointment has been cancelled",
                )

            elif event == "booking_rescheduled":
                job.appointment_date = new_appointment_date
                job.appointment_time = new_appointment_time
                job.total_amount = total_amount
                job.status = "pending"
                job.save()
                if primary.user.allow_email_notifications:
                    send_appointment_rescheduling_email(
                        booking_reference,
                        primary.user.email,
                        new_appointment_date,
                        new_appointment_time,
                        total_amount,
                    )
                if primary.user.allow_push_notifications and primary.user.notification_token:
                    send_push_notification(
                        primary.user.id,
                        "Appointment Rescheduled",
                        "Your appointment has been rescheduled",
                        "booking_rescheduled",
                    )
                self.create_notification(
                    primary.user,
                    "Appointment Rescheduled",
                    "booking_rescheduled",
                    "warning",
                    "Your appointment has been rescheduled",
                )

            elif event == "review_received":
                Review.objects.update_or_create(
                    job=job,
                    defaults={"detailer": primary, "rating": rating, "comment": None},
                )
                self.stdout.write(self.style.SUCCESS(f"Review saved for job {booking_reference} (rating={rating})"))
                notification_message = f"You have received a {rating} star review"
                self.create_notification(
                    primary.user,
                    "Review Received",
                    "review_received",
                    "success",
                    notification_message,
                )
                if primary.user.allow_push_notifications and primary.user.notification_token:
                    send_push_notification(
                        primary.user.id,
                        "Review Received",
                        notification_message,
                        "review_received",
                    )
                primary.update_rating_from_reviews()
                primary.check_for_deactivation()
                self.stdout.write(self.style.SUCCESS(f"Detailer {primary.id} updated; notification sent."))

            ack(STREAM_JOB_EVENTS, DETAILER_GROUP, msg_id)
        except Job.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"Job not found: {booking_reference} (review will not appear on detailer)"))
            ack(STREAM_JOB_EVENTS, DETAILER_GROUP, msg_id)
        except Exception as e:
            import traceback
            self.stdout.write(self.style.ERROR(f"Error processing message: {str(e)}"))
            self.stdout.write(traceback.format_exc())
            ack(STREAM_JOB_EVENTS, DETAILER_GROUP, msg_id)

    def create_notification(self, user, title, type, status, message):
        try:
            Notification.objects.create(user=user, title=title, type=type, status=status, message=message)
            self.stdout.write(f"Notification created for user {user.id}")
            return True
        except Exception as e:
            self.stderr.write(f"Failed to create notification: {e}")
            return False

