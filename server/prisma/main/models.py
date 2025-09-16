from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils import timezone
import math
from django.db.models import Sum, Avg
from main.tasks import send_welcome_email


# -------------------------------
# User Management
# -------------------------------
class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        extra_fields.setdefault("is_detailer", True)
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("is_admin", True)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        return self.create_user(email, password, **extra_fields)
    

class User(AbstractUser):
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=30)
    last_name = models.CharField(max_length=30)
    phone = models.CharField(max_length=15, unique=True)
    image = models.ImageField(upload_to="profile_images/", null=True, blank=True)
    is_detailer = models.BooleanField(default=False)
    is_admin = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    allow_marketing_emails = models.BooleanField(default=False)
    allow_push_notifications = models.BooleanField(default=False)
    allow_email_notifications = models.BooleanField(default=True)
    notification_token = models.TextField(null=True, blank=True)
    date_joined = models.DateTimeField(auto_now_add=True)
    last_login = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    def __str__(self):
        return self.email
    
    
    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"
    
    def save(self, *args, **kwargs):
        self.username = self.email
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new:
            send_welcome_email.delay(self.email)


# -------------------------------
# Detailer
# -------------------------------
class Detailer(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE )
    rating = models.FloatField(default=0, blank=True, null=True)
    address = models.CharField(max_length=120, blank=True, null=True)
    city = models.CharField(max_length=55, blank=True, null=True)
    post_code = models.CharField(max_length=10, blank=True, null=True)
    country = models.CharField(max_length=55, blank=True, null=True)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=4, default=0.15)
    latitude = models.FloatField(blank=True, null=True)
    longitude = models.FloatField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.user.get_full_name()} - {self.user.email}'

    # Aggregation helpers
    def total_earnings(self):
        return self.earnings.aggregate(total=Sum("net_amount"))["total"] or 0

    def unpaid_earnings(self):
        return self.earnings.filter(payment_status="pending").aggregate(total=Sum("net_amount"))["total"] or 0


# -------------------------------
# Service Type
# -------------------------------
class ServiceType(models.Model):
    name = models.CharField(max_length=120)  # e.g. "Full Interior Clean"
    description = models.JSONField(blank=True, null=True, default=dict)
    duration = models.IntegerField(default=0)  # in minutes
    price = models.FloatField(default=0)

    def __str__(self):
        return f"{self.name}"


# -------------------------------
# Availability
# -------------------------------
class TimeSlot(models.Model):
    detailer = models.ForeignKey(Detailer, on_delete=models.CASCADE)
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_available = models.BooleanField(default=True)
    is_booked = models.BooleanField(default=False)

    class Meta:
        unique_together = ('detailer', 'date', 'start_time', 'end_time')
        ordering = ('date', 'start_time')
    
    def __str__(self):
        return f'{self.detailer.user.get_full_name()} - {self.date} - {self.start_time} - {self.end_time}'

class Addon(models.Model):
    name = models.CharField(max_length=120)

    def __str__(self):
        return self.name


class Job(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    LOYALTY_TIER_CHOICES = [
        ('bronze', 'Bronze'),
        ('silver', 'Silver'),
        ('gold', 'Gold'),
        ('platinum', 'Platinum'),
    ]

    
    service_type = models.ForeignKey(ServiceType, on_delete=models.CASCADE)

    booking_reference = models.CharField(max_length=120, unique=True)
    client_name = models.CharField(max_length=120)
    client_phone = models.CharField(max_length=15)

    vehicle_registration = models.CharField(max_length=15)
    vehicle_make = models.CharField(max_length=55)
    vehicle_model = models.CharField(max_length=55)
    vehicle_color = models.CharField(max_length=55)
    vehicle_year = models.IntegerField(blank=True, null=True)
    owner_note = models.TextField(blank=True, null=True)
    address = models.CharField(max_length=120)
    city = models.CharField(max_length=55)
    post_code = models.CharField(max_length=10)
    country = models.CharField(max_length=55)
    latitude = models.FloatField(blank=True, null=True)
    longitude = models.FloatField(blank=True, null=True)
    appointment_date = models.DateTimeField()
    appointment_time = models.TimeField()
    duration = models.IntegerField(default=0, blank=True, null=True)
    addons = models.ManyToManyField(Addon, blank=True)
    valet_type = models.CharField(max_length=20, default=None, null=True, blank=True)
    total_amount = models.DecimalField(default=0, blank=True, null=True, max_digits=6, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    loyalty_tier = models.CharField(max_length=20, choices=LOYALTY_TIER_CHOICES, default='bronze')
    loyalty_benefits = models.JSONField(default=list, blank=True, null=True)
    detailer = models.ForeignKey(Detailer, on_delete=models.CASCADE, related_name="jobs", blank=True, null=True)
    
    before_photo = models.ImageField(upload_to="jobs/before/", blank=True, null=True)
    after_photo = models.ImageField(upload_to="jobs/after/", blank=True, null=True)

    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['detailer', 'status', 'appointment_date', 'appointment_time', 'booking_reference']),
        ]

    # Create an earning record for every completed job
    def create_earning(self):
        if self.status == "completed":
            # Check if earning already exists to avoid duplicates
            if not Earning.objects.filter(job=self).exists():
                Earning.objects.create(
                    detailer=self.detailer,
                    job=self,
                    gross_amount=self.total_amount,
                    payout_date=timezone.now().date()  # Set payout date to today
                )

    def __str__(self):
        return f'Job {self.id} - {self.detailer.user.get_full_name()}'

    def get_total_earnings(self):
        return self.service_type.price * (1 - self.detailer.commission_rate)#
    
    def save(self, *args, **kwargs):
        # Check if rating is being updated
        rating_updated = False
        if self.pk:  # Only for existing records
            try:
                old_job = Job.objects.get(pk=self.pk)
                rating_updated = old_job.rating != self.rating
            except Job.DoesNotExist:
                pass
        else:
            # New record with rating
            rating_updated = self.rating and self.rating > 0
        
        # Save the job first
        super().save(*args, **kwargs)
        
        # Update detailer rating if rating was changed and detailer exists
        if rating_updated and self.detailer:
            self.update_detailer_rating()
        
        # Create earning if job is completed
        if self.status == "completed":
            self.create_earning()

    
    def update_detailer_rating(self):
        """Update the detailer's rating based on average of all job ratings"""
        try:
            # Calculate average rating from all jobs with ratings > 0
            avg_rating = Job.objects.filter(
                detailer=self.detailer,
                rating__gt=0
            ).aggregate(avg_rating=Avg('rating'))['avg_rating']
            
            if avg_rating is not None:
                # Round to 2 decimal places and ensure it doesn't exceed 5.0
                self.detailer.rating = min(round(float(avg_rating), 2), 5.0)
            else:
                # No ratings yet, set to 0
                self.detailer.rating = 0.0
            
            # Save the detailer without triggering signals to avoid recursion
            Detailer.objects.filter(pk=self.detailer.pk).update(rating=self.detailer.rating)
            
        except Exception as e:
            # Log the error but don't raise it to avoid breaking the save process
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to update detailer rating: {e}")


class Earning(models.Model):
    PAYMENT_STATUS = [
        ("pending", "Pending"),
        ("paid", "Paid"),
    ]

    detailer = models.ForeignKey(Detailer, on_delete=models.CASCADE, related_name="earnings")
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name="earnings")
    gross_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    commission = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    net_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tip_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, blank=True, null=True)
    payout_date = models.DateField(blank=True, null=True)
    payment_status = models.CharField(max_length=10, choices=PAYMENT_STATUS, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Earning for {self.detailer.user.get_full_name()} - Job {self.job.id}"

    def save(self, *args, **kwargs):
        if not self.commission:
            from decimal import Decimal
            # Convert commission_rate to Decimal to ensure proper calculation
            commission_rate = Decimal(str(self.detailer.commission_rate))
            self.commission = self.gross_amount * commission_rate
        self.net_amount = self.gross_amount - self.commission
        super().save(*args, **kwargs)

    def mark_as_paid(self, payout_date=None):
        self.payment_status = "paid"
        self.payout_date = payout_date
        self.save()


""" Defines the account neccessary where the users earnings will be paid into """
class BankAccount(models.Model):
    detailer = models.ForeignKey(Detailer, on_delete=models.CASCADE)
    account_number = models.CharField(max_length=20)
    account_name = models.CharField(max_length=100)
    bank_name = models.CharField(max_length=100)
    iban = models.CharField(max_length=55)
    bic = models.CharField(max_length=55)
    sort_code = models.CharField(max_length=55)
    is_primary = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

# -------------------------------
# Review
# -------------------------------
class Review(models.Model):
    job = models.OneToOneField(Job, on_delete=models.CASCADE)
    detailer = models.ForeignKey(Detailer, on_delete=models.CASCADE)
    rating = models.DecimalField(max_digits=3, decimal_places=2)
    comment = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Review for {self.detailer.user.get_full_name()} - Job {self.job.id}'
    

class Availability(models.Model):
    detailer = models.ForeignKey(Detailer, on_delete=models.CASCADE, related_name="availability")
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)


# -------------------------------
# Training Records
# -------------------------------
class TrainingRecord(models.Model):
    detailer = models.ForeignKey(Detailer, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=[("pending", "Pending"), ("completed", "Completed")], default="pending")
    date_completed = models.DateField(blank=True, null=True)

    def __str__(self):
        return f'Training: {self.title} - {self.detailer.user.get_full_name()}'


class PayoutHistory(models.Model):
    PAYOUT_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("processing", "Processing"),
        ("completed", "Completed"),
        ("failed", "Failed"),
        ("cancelled", "Cancelled"),
    ]

    PAYOUT_TYPE_CHOICE = [
        ("request", "Request"),
        ("scheduled", "Scheduled")
    ]
    
    detailer = models.ForeignKey(Detailer, on_delete=models.CASCADE, related_name="payout_history")
    bank_account = models.ForeignKey(BankAccount, on_delete=models.CASCADE)
    payout_amount = models.DecimalField(max_digits=10, decimal_places=2)
    payout_reference = models.CharField(max_length=100, unique=True, blank=True, null=True)
    status = models.CharField(max_length=20, choices=PAYOUT_STATUS_CHOICES, default="pending")
    payment_type =models.CharField(max_length=20, choices=PAYOUT_TYPE_CHOICE, default='scheduled')
    initiated_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    earnings = models.ManyToManyField(Earning, related_name="payouts")
    failure_reason = models.TextField(blank=True, null=True)
    external_transaction_id = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['detailer', 'status', 'initiated_at']),
            models.Index(fields=['payout_reference']),
        ]
    
    def __str__(self):
        return f"Payout {self.payout_reference or self.id} - {self.detailer.user.get_full_name()} - {self.payout_amount}"
    
    def mark_as_processing(self):
        self.status = "processing"
        self.processed_at = timezone.now()
        self.save()
    
    def mark_as_completed(self, external_transaction_id=None):
        self.status = "completed"
        self.completed_at = timezone.now()
        if external_transaction_id:
            self.external_transaction_id = external_transaction_id
        self.save()
        
        # Mark related earnings as paid
        for earning in self.earnings.all():
            earning.mark_as_paid(self.completed_at.date())
    
    def mark_as_failed(self, failure_reason=None):
        self.status = "failed"
        if failure_reason:
            self.failure_reason = failure_reason
        self.save()



class Notification(models.Model):
    NOTIFICATION_TYPE_CHOICES = [
        ('booking_confirmed', 'Booking Confirmed'),
        ('booking_cancelled', 'Booking Cancelled'),
        ('booking_rescheduled', 'Booking Rescheduled'),
        ('booking_created', 'Booking Created'),
        ('cleaning_completed', 'Cleaning Completed'),
        ('appointment_started', 'Appointment Started'),
        ('review_received', 'Review Received'),
        ('pending', 'Pending'),
        ('car_ready', 'Car Ready'),
        ('payment_received', 'Payment Received'),
        ('reminder', 'Reminder'),
        ('system', 'System'),
    ]
    NOTIFICATION_STATUS_CHOICES = [
        ('success', 'Success'),
        ('warning', 'Warning'),
        ('error', 'Error'),
        ('info', 'Info'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    message = models.TextField()
    type = models.CharField(max_length=255, choices=NOTIFICATION_TYPE_CHOICES, default='pending')
    status = models.CharField(max_length=255, choices=NOTIFICATION_STATUS_CHOICES, default='info')
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.first_name} {self.user.last_name} - {self.title}"
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
