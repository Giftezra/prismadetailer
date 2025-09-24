"""
Dashboard API Views

This module contains the API views for the dashboard functionality of the detailer application.
It provides endpoints for retrieving today's overview, quick stats, and recent jobs data.

The dashboard serves as the main interface for detailers to view their daily schedule,
earnings, and job history.

Author: Detailer App Team
Date: 2024
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.utils import timezone
from datetime import datetime, timedelta
from django.db.models import Sum, Avg, Count, Q
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from ..models import Detailer, Job, Earning, Review, ServiceType
from ..tasks import publish_job_started, publish_job_completed
import json
import logging

# Set up logging for debugging and error tracking
logger = logging.getLogger(__name__)


class DashboardView(APIView):
    """
    Dashboard API View
    
    This view handles all dashboard-related API requests including:
    - Today's overview (appointments, current job, next appointment)
    - Quick stats (earnings, job counts, ratings)
    - Recent jobs (completed jobs from last 7 days)
    
    All endpoints require authentication and return data specific to the authenticated detailer.
    
    Attributes:
        permission_classes: List of permission classes (IsAuthenticated)
        action_handler: Dictionary mapping action names to handler methods
    """
    
    permission_classes = [IsAuthenticated] 

    # Map action names to their corresponding handler methods
    action_handler = {
        "get_today_overview": '_get_today_overview',
        "get_quick_stats": '_get_quick_stats',
        "get_recent_jobs": '_get_recent_jobs',
        "start_current_job": '_start_current_job',
        "complete_current_job": '_complete_current_job',
    }   

    def get(self, request, *args, **kwargs):
        action = kwargs.get('action')
        if action not in self.action_handler:
            return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)
        handler = getattr(self, self.action_handler[action])
        return handler(request)
    
    def patch(self, request, *args, **kwargs):
        action = kwargs.get('action')
        if action not in self.action_handler:
            return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)
        handler = getattr(self, self.action_handler[action])
        return handler(request)


    def _get_today_overview(self, request):
        try:
            today = timezone.now().date()

            # Get today's jobs for the authenticated detailer
            today_jobs = Job.objects.filter(
                detailer__user=request.user,
                appointment_date__date=today,
                status__in=['pending', 'accepted', 'in_progress']
            )
            # Calculate basic statistics
            total_appointments = today_jobs.count()
            completed_jobs = today_jobs.filter(status='completed').count()
            pending_jobs = today_jobs.filter(status__in=['pending', 'accepted', 'in_progress']).count()
            
            # Get current job first (job currently in progress)
            current_job = None
            in_progress_job = None
            try:
                # Find the job that's currently in progress or accepted
                in_progress_job = today_jobs.filter(status__in=['in_progress', 'accepted']).first()
                
                if in_progress_job:
                    # Calculate progress (simplified - you might want to track actual progress)
                    progress = 50  # Default progress
                    current_job = {
                        "id": str(in_progress_job.id),
                        "clientName": in_progress_job.client_name if in_progress_job.client_name else "",
                        "serviceType": in_progress_job.service_type.name if in_progress_job.service_type else "",
                        "startTime": in_progress_job.appointment_time.strftime("%H:%M") if in_progress_job.appointment_time else "",
                        "estimatedEndTime": (datetime.combine(today, in_progress_job.appointment_time) + 
                                           timedelta(minutes=in_progress_job.service_type.duration)).strftime("%H:%M") if in_progress_job.appointment_time and in_progress_job.service_type else "",
                        "progress": progress,
                        "status": in_progress_job.status,
                        "valetType": in_progress_job.valet_type if in_progress_job.valet_type else "",
                        "addons": in_progress_job.addons.all().values_list('name', flat=True) if in_progress_job.addons.all().exists() else [],
                        "specialInstruction": in_progress_job.owner_note if in_progress_job.owner_note else "",
                        'vehicleInfo': f"{in_progress_job.vehicle_make} {in_progress_job.vehicle_model} ({in_progress_job.vehicle_registration})" if in_progress_job.vehicle_registration else "",
                        "booking_reference": in_progress_job.booking_reference,
                        "clientPhone": in_progress_job.client_phone if in_progress_job.client_phone else "",
                    }
            except Exception as e:
                logger.error(f"Error getting current job: {str(e)}")
                current_job = None
            
            # Get next appointment for today (excludes the currently in-progress job)
            next_appointment = None
            try:
                # Get the next pending/accepted job that's not currently in progress
                next_job = today_jobs.filter(
                    status__in=['pending', 'accepted']
                ).exclude(
                    id=in_progress_job.id if in_progress_job else None
                ).order_by('appointment_date').first()
                
                print(f"Next job found: {next_job}")
                print(f"Current in_progress_job: {in_progress_job}")
                
                if next_job:
                    next_appointment = {
                        "id": str(next_job.id) if next_job.id else "",
                        "clientName": next_job.client_name if next_job.client_name else "",
                        "serviceType": next_job.service_type.name if next_job.service_type else "",
                        "appointmentTime": next_job.appointment_time.strftime("%H:%M") if next_job.appointment_time else "",
                        "duration": next_job.service_type.duration if next_job.service_type else 0,
                        "address": next_job.address if next_job.address else "",
                        "vehicleInfo": f"{next_job.vehicle_make} {next_job.vehicle_model} ({next_job.vehicle_registration})" if next_job.vehicle_registration else "",
                        "valetType": next_job.valet_type if next_job.valet_type else "",
                        "addons": next_job.addons.all().values_list('name', flat=True) if next_job.addons.all().exists() else [],
                        "specialInstruction": next_job.owner_note if next_job.owner_note else ""
                    }
            except Exception as e:
                logger.error(f"Error getting next appointment: {str(e)}")
                next_appointment = None
            
            # Prepare response data
            data = {
                "totalAppointments": total_appointments,
                "completedJobs": completed_jobs,
                "pendingJobs": pending_jobs,
                "nextAppointment": next_appointment,
                "currentJob": current_job
            }
            
            # Ensure all numeric fields are integers, not None for consistent client handling
            data["totalAppointments"] = int(data["totalAppointments"]) if data["totalAppointments"] is not None else 0
            data["completedJobs"] = int(data["completedJobs"]) if data["completedJobs"] is not None else 0
            data["pendingJobs"] = int(data["pendingJobs"]) if data["pendingJobs"] is not None else 0

            return Response(data, status=status.HTTP_200_OK)
            
        except Detailer.DoesNotExist:
            logger.error("Detailer not found for user")
            return Response(
                {"error": "Detailer profile not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error in _get_today_overview: {str(e)}")
            return Response(
                {"error": "Internal server error", "details": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )



    def _get_quick_stats(self, request):
        try:
            detailer = Detailer.objects.get(user=request.user)
            today = timezone.now().date()
            
            # Calculate date ranges for weekly and monthly statistics
            week_start = today - timedelta(days=today.weekday())  # Start of current week (Monday)
            month_start = today.replace(day=1)  # Start of current month
            
            # Calculate weekly earnings (including tips from reviews)
            try:
                # Get earnings with payout_date in the week (paid out earnings)
                weekly_paid_earnings = Earning.objects.filter(
                    detailer=detailer,
                    payout_date__gte=week_start,
                    payout_date__lte=today
                ).aggregate(
                    total_net=Sum('net_amount'),
                    total_tips=Sum('tip_amount')
                )
                
                weekly_net_earnings = weekly_paid_earnings['total_net'] or 0
                weekly_tip_earnings = weekly_paid_earnings['total_tips'] or 0
                
                # Get earnings for jobs completed this week but not yet paid out
                weekly_completed_jobs = Job.objects.filter(
                    detailer=detailer,
                    status='completed',
                    appointment_date__date__gte=week_start,
                    appointment_date__date__lte=today
                )
                weekly_new_earnings = Earning.objects.filter(
                    detailer=detailer,
                    job__in=weekly_completed_jobs,
                    payout_date__isnull=True
                ).aggregate(
                    total_net=Sum('net_amount'),
                    total_tips=Sum('tip_amount')
                )
                
                weekly_new_net = weekly_new_earnings['total_net'] or 0
                weekly_new_tips = weekly_new_earnings['total_tips'] or 0
                
                weekly_earnings = weekly_net_earnings + weekly_new_net
                weekly_tips = weekly_tip_earnings + weekly_new_tips
                weekly_total_earnings = weekly_earnings + weekly_tips
                
            except Exception as e:
                logger.error(f"Error calculating weekly earnings: {str(e)}")
                weekly_earnings = 0
                weekly_tips = 0
                weekly_total_earnings = 0
            
            # Calculate monthly earnings (including tips from reviews)
            try:
                # Get earnings with payout_date in the month (paid out earnings)
                monthly_paid_earnings = Earning.objects.filter(
                    detailer=detailer,
                    payout_date__gte=month_start,
                    payout_date__lte=today
                ).aggregate(
                    total_net=Sum('net_amount'),
                    total_tips=Sum('tip_amount')
                )
                
                monthly_net_earnings = monthly_paid_earnings['total_net'] or 0
                monthly_tip_earnings = monthly_paid_earnings['total_tips'] or 0
                
                # Get earnings for jobs completed this month but not yet paid out
                monthly_completed_jobs = Job.objects.filter(
                    detailer=detailer,
                    status='completed',
                    appointment_date__date__gte=month_start,
                    appointment_date__date__lte=today
                )
                monthly_new_earnings = Earning.objects.filter(
                    detailer=detailer,
                    job__in=monthly_completed_jobs,
                    payout_date__isnull=True
                ).aggregate(
                    total_net=Sum('net_amount'),
                    total_tips=Sum('tip_amount')
                )
                
                monthly_new_net = monthly_new_earnings['total_net'] or 0
                monthly_new_tips = monthly_new_earnings['total_tips'] or 0
                
                monthly_earnings = monthly_net_earnings + monthly_new_net
                monthly_tips = monthly_tip_earnings + monthly_new_tips
                monthly_total_earnings = monthly_earnings + monthly_tips
                
            except Exception as e:
                logger.error(f"Error calculating monthly earnings: {str(e)}")
                monthly_earnings = 0
                monthly_tips = 0
                monthly_total_earnings = 0
            
            # Calculate completed jobs this week
            try:
                completed_jobs_this_week = Job.objects.filter(
                    detailer=detailer,
                    status='completed',
                    appointment_date__date__gte=week_start,
                    appointment_date__date__lte=today
                ).count()
            except Exception as e:
                logger.error(f"Error calculating completed jobs this week: {str(e)}")
                completed_jobs_this_week = 0
            
            # Calculate completed jobs this month
            try:
                completed_jobs_this_month = Job.objects.filter(
                    detailer=detailer,
                    status='completed',
                    appointment_date__date__gte=month_start,
                    appointment_date__date__lte=today
                ).count()
            except Exception as e:
                logger.error(f"Error calculating completed jobs this month: {str(e)}")
                completed_jobs_this_month = 0
            
            # Calculate pending jobs count (all pending jobs, not just today)
            try:
                pending_jobs_count = Job.objects.filter(
                    detailer=detailer,
                    status__in=['pending', 'accepted']
                ).count()
            except Exception as e:
                logger.error(f"Error calculating pending jobs count: {str(e)}")
                pending_jobs_count = 0
            
            # Calculate average rating and total reviews - using both Review model and Job rating
            try:
                # Get reviews from Review model (more reliable)
                reviews = Review.objects.filter(detailer=detailer)
                review_avg_rating = reviews.aggregate(avg_rating=Avg('rating'))['avg_rating'] or 0
                review_count = reviews.count()
                
                # Also get ratings from Job model (updated by appointment_subscriber)
                jobs_with_ratings = Job.objects.filter(
                    detailer=detailer,
                    rating__gt=0
                )
                job_avg_rating = jobs_with_ratings.aggregate(avg_rating=Avg('rating'))['avg_rating'] or 0
                job_rating_count = jobs_with_ratings.count()
                
                # Use the most recent/accurate data
                # If we have Review model data, use that; otherwise use Job model data
                if review_count > 0:
                    average_rating = review_avg_rating
                    total_reviews = review_count
                else:
                    average_rating = job_avg_rating
                    total_reviews = job_rating_count
                    
            except Exception as e:
                logger.error(f"Error calculating ratings: {str(e)}")
                average_rating = 0
                total_reviews = 0
            
            # Calculate recent tips (tips received in the last 7 days)
            try:
                seven_days_ago = today - timedelta(days=7)
                recent_tips = Earning.objects.filter(
                    detailer=detailer,
                    tip_amount__gt=0,
                    job__appointment_date__date__gte=seven_days_ago
                ).aggregate(total_tips=Sum('tip_amount'))['total_tips'] or 0
            except Exception as e:
                logger.error(f"Error calculating recent tips: {str(e)}")
                recent_tips = 0

            # Debug logging
            logger.info(f"Weekly: {weekly_earnings} + {weekly_tips} = {weekly_total_earnings}")
            logger.info(f"Monthly: {monthly_earnings} + {monthly_tips} = {monthly_total_earnings}")
            logger.info(f"Rating: {average_rating} from {total_reviews} reviews")
            logger.info(f"Recent tips: {recent_tips}")
            
            # Prepare response data
            data = {
                "weeklyEarnings": float(weekly_total_earnings),
                "weeklyNetEarnings": float(weekly_earnings),
                "weeklyTips": float(weekly_tips),
                "monthlyEarnings": float(monthly_total_earnings),
                "monthlyNetEarnings": float(monthly_earnings),
                "monthlyTips": float(monthly_tips),
                "completedJobsThisWeek": completed_jobs_this_week,
                "completedJobsThisMonth": completed_jobs_this_month,
                "pendingJobsCount": pending_jobs_count,
                "averageRating": float(average_rating),
                "totalReviews": total_reviews,
                "recentTips": float(recent_tips)
            }
            
            return Response(data, status=status.HTTP_200_OK)
            
        except Detailer.DoesNotExist:
            logger.error("Detailer not found for user")
            return Response(
                {"error": "Detailer profile not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error in _get_quick_stats: {str(e)}")
            return Response(
                {"error": "Internal server error", "details": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


    def _get_recent_jobs(self, request):
        """
        Get recent completed jobs for the authenticated detailer
        
        Retrieves completed jobs from the last 7 days with associated earnings and ratings.
        This provides a history of recent work and performance for the detailer.
        
        Only completed jobs are returned to show actual work history, not pending
        or in-progress jobs.
        
        Args:
            request: The HTTP request object containing the authenticated user
            
        Returns:
            Response: JSON object containing:
                - recentJobs: Array of job objects with:
                    - id: Job identifier
                    - clientName: Name of the client
                    - serviceType: Type of service provided
                    - completedAt: ISO formatted completion date/time
                    - earnings: Amount earned for the job
                    - rating: Client rating (if available)
                    - status: Job status (should be 'completed')
                    
        Raises:
            HTTP_404_NOT_FOUND: If detailer profile doesn't exist
            HTTP_500_INTERNAL_SERVER_ERROR: If database query fails
        """
        try:
            # Get completed jobs from the last 7 days
            seven_days_ago = timezone.now().date() - timedelta(days=7)
            recent_jobs = Job.objects.filter(
                detailer__user=request.user,
                appointment_date__date__gte=seven_days_ago,
                status='completed'  # Only completed jobs for history
            ).order_by('-appointment_date')  # Most recent first
            
            # Process each job to include earnings and ratings
            recent_jobs_data = []
            for job in recent_jobs:
                try:
                    # Get earnings for this job
                    earning = Earning.objects.filter(job=job).first()
                    earnings_amount = float(earning.net_amount) if earning else 0
                    
                    # Get rating for this job
                    review = Review.objects.filter(job=job).first()
                    rating = float(review.rating) if review else None
                    
                    # Build job data object
                    recent_jobs_data.append({
                        "id": str(job.id),
                        "clientName": job.client_name if job.client_name else "", 
                        "serviceType": job.service_type.name if job.service_type else "",
                        "completedAt": job.appointment_date.isoformat() if job.appointment_date else "",
                        "earnings": earnings_amount,
                        "rating": rating,
                        "status": job.status if job.status else ""
                    })
                except Exception as e:
                    logger.error(f"Error processing job {job.id}: {str(e)}")
                    continue  # Skip this job if there's an error
            
            # Prepare response data
            data = {
                "recentJobs": recent_jobs_data,
            }
            
            return Response(data, status=status.HTTP_200_OK)
            
        except Detailer.DoesNotExist:
            logger.error("Detailer not found for user")
            return Response(
                {"error": "Detailer profile not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error in _get_recent_jobs: {str(e)}")
            return Response(
                {"error": "Internal server error", "details": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
    
    def _start_current_job(self, request):
        """
        Start the current job
        
        Args:
            request: The HTTP request object containing the authenticated user
        """
        try:
            id = request.data.get('id')
            job = Job.objects.get(id=id, detailer__user=request.user)
            if job.status != 'in_progress':
                job.status = 'in_progress'
                job.save()
                
                # trigger the job started to redis
                publish_job_started.delay(job.booking_reference)
                
                return Response({"message": "Job started successfully"}, status=status.HTTP_200_OK)
            else:
                return Response({"message": "Job is already in progress"}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error in _start_current_job: {str(e)}")
            return Response(
                {"error": "Internal server error", "details": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
    def _complete_current_job(self, request):
        """
        Complete the current job
        
        Args:
            request: The HTTP request object containing the authenticated user
            id: The ID of the job to complete

        Returns:
            Response: JSON object containing:
                - message: Success message

        Raises:
            HTTP_404_NOT_FOUND: If job not found
            HTTP_500_INTERNAL_SERVER_ERROR: If error occurs

        """
        try:
            id = request.data.get('id')
            print('job id', id)
            job = Job.objects.get(id=id, detailer__user=request.user)
            if job.status == 'in_progress':
                job.status = 'completed'
                job.save()  # This will trigger the Job model's save method which creates the earning record

                # trigger the job completed to redis
                publish_job_completed.delay(job.booking_reference)

                # Get the earning record that was created by the Job model's save method
                earning = Earning.objects.filter(job=job).first()
                if earning:
                    # Update the payout_date if it wasn't set
                    if not earning.payout_date:
                        earning.payout_date = timezone.now().date()
                        earning.save()
                    earning_message = f'you have earned {earning.net_amount}'
                else:
                    earning_message = 'Job completed successfully'
                return Response({"message": f"Assignment completed successfully. {earning_message}"}, status=status.HTTP_200_OK)
            else:
                return Response({"message": "You have already completed this job"}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error in _complete_current_job: {str(e)}")
            return Response(
                {"error": "Internal server error", "details": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    