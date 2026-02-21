from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from main.models import Detailer, Availability, Job, ServiceType
from main.utils.detailer_matcher import find_detailers_for_location
from datetime import datetime, time, timedelta
import json

""" The class is used to handle all of the users availability related actions

    It is also used to handle the commuinication between the client app stack and the server
    through the internal docker container network
 """
class AvailabilityView(APIView):
    """ Enssure that only a few methods are accessed without authentication. 
        This is to allow the client app stack to access the availability endpoints without authentication.

        To do this, we will destructure and override the get_permissions method.
    """
    public_actions = ['get_timeslots']
    
    def get_permissions(self):
        """ set permissions to the allow any for the method that is connected from the client app stack
        """
        action = self.kwargs.get('action')
        if action in ['get_timeslots']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    
    """ Create the action handler to route the user to the appropriate view, given the action """
    action_handler = {
        'get_timeslots': 'get_timeslots',
    }

    def get(self, request, *args, **kwargs):
        action = kwargs.get('action')
        if action not in self.action_handler:
            return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)
        handler = getattr(self, self.action_handler[action])
        return handler(request)
    
    def post(self, request, *args, **kwargs):
        action = kwargs.get('action')
        if action not in self.action_handler:
            return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)
        handler = getattr(self, self.action_handler[action])
        return handler(request)
    
    
    def get_timeslots(self, request):
        """
        Get available time slots for detailers in a specific location
        
        Query Parameters:
        - date: YYYY-MM-DD format
        - service_duration: Duration in minutes
        - country: Country name
        - city: City name
        - latitude: Optional - Client latitude for geographic fallback (30km radius)
        - longitude: Optional - Client longitude for geographic fallback (30km radius)
        - is_express_service: Boolean (optional) - if True, checks for 2 available detailers
        
        Returns:
        - slots: Array of available time slots
        """
        try:
            data = request.query_params
            date_str = data.get('date')
            service_duration = int(data.get('service_duration', 60))
            country = data.get('country').strip() if data.get('country') else None
            city = data.get('city').strip() if data.get('city') else None
            latitude_str = data.get('latitude')
            longitude_str = data.get('longitude')
            is_express_service = data.get('is_express_service', 'false').lower() == 'true'

            # Optional lat/lng for geographic fallback
            latitude = None
            longitude = None
            if latitude_str and longitude_str:
                try:
                    latitude = float(latitude_str)
                    longitude = float(longitude_str)
                except (TypeError, ValueError):
                    pass

            # Validate required parameters
            if not all([date_str, country, city]):
                return Response({
                    "error": "Missing required parameters: date, country, city"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Parse date
            try:
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response({
                    "error": "Invalid date format. Use YYYY-MM-DD"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Get detailers using three-step fallback: exact -> normalized -> 30km radius
            detailers, _ = find_detailers_for_location(
                country=country,
                city=city,
                latitude=latitude,
                longitude=longitude,
                is_available=None,
            )

            if not detailers.exists():
                return Response({
                    "error": f"No active detailers found in {city}, {country}. We are currently working to bring PRISMA closer to you. Please check back another time.",
                    "slots": []
                }, status=status.HTTP_200_OK)

            # Business hours: 6 AM to 9 PM (default if no availability set)
            business_start = time(6, 0)  # 7:00 AM
            business_end = time(21, 0)   # 9:00 PM
            
            # Travel time interval between jobs (30 minutes)
            travel_interval = 30
            
            # Get detailers' availability for the target date
            detailer_availability = Availability.objects.filter(
                detailer__in=detailers,
                date=target_date,
                is_available=True
            ).select_related('detailer')

            # If no specific availability is set, use default business hours
            if not detailer_availability.exists():
                # Generate all possible time slots for the day using default business hours
                all_slots = self._generate_time_slots(
                    business_start, 
                    business_end, 
                    service_duration, 
                    travel_interval
                )
            else:
                # Use detailers' set availability times
                all_slots = self._generate_slots_from_availability(
                    detailer_availability,
                    service_duration,
                    travel_interval
                )

            # Get existing appointments for all detailers on the target date
            existing_jobs = Job.objects.filter(
                primary_detailer__in=detailers,
                appointment_date__date=target_date,
                status__in=['accepted', 'in_progress', 'pending']
            ).select_related('primary_detailer')

            # Calculate available slots by removing booked times
            available_slots = self._calculate_available_slots(
                all_slots, 
                existing_jobs, 
                service_duration, 
                travel_interval
            )

            if not available_slots:
                return Response({
                    "error": "No available slots found",
                    "slots": []
                }, status=status.HTTP_200_OK)
            return Response({
                "slots": available_slots,
            }, status=status.HTTP_200_OK)

        except ValueError as e:
            return Response({
                "error": f"Invalid parameter: {str(e)}"
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                "error": f"Server error: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        

    def _generate_time_slots(self, start_time, end_time, service_duration, travel_interval):
        slots = []
        current_time = start_time
        
        while current_time < end_time:
            # Calculate end time for this slot
            start_minutes = current_time.hour * 60 + current_time.minute
            end_minutes = start_minutes + service_duration
            
            # Check if this slot would extend beyond business hours
            if end_minutes > (end_time.hour * 60 + end_time.minute):
                break
                
            end_time_slot = time(end_minutes // 60, end_minutes % 60)
            
            slots.append({
                "start_time": current_time.strftime("%H:%M"),
                "end_time": end_time_slot.strftime("%H:%M"),
                "is_available": True
            })
            
            next_start_minutes = end_minutes + travel_interval
            current_time = time(next_start_minutes // 60, next_start_minutes % 60)
        
        return slots
    

    def _generate_slots_from_availability(self, detailer_availability, service_duration, travel_interval):
        all_slots = []
        
        for availability in detailer_availability:
            # Generate slots for this detailer's availability window
            detailer_slots = self._generate_time_slots(
                availability.start_time,
                availability.end_time,
                service_duration,
                travel_interval
            )
            
            # Add detailer info to each slot
            for slot in detailer_slots:
                slot['detailer_id'] = availability.detailer.id
                slot['detailer_name'] = availability.detailer.user.get_full_name()
            
            all_slots.extend(detailer_slots)
        
        # Remove duplicates and sort by start time
        unique_slots = []
        seen_times = set()
        
        for slot in sorted(all_slots, key=lambda x: x['start_time']):
            time_key = f"{slot['start_time']}-{slot['end_time']}"
            if time_key not in seen_times:
                seen_times.add(time_key)
                unique_slots.append(slot)
        
        return unique_slots

    def _calculate_available_slots(self, all_slots, existing_jobs, service_duration, travel_interval, is_express_service=False, detailers=None):
        """
        Calculate available slots by removing booked times
        
        Args:
            all_slots: List of all possible time slots
            existing_jobs: QuerySet of existing jobs
            service_duration: Service duration in minutes
            travel_interval: Travel time interval in minutes
            is_express_service: Boolean - if True, checks for 2 available detailers
            detailers: QuerySet of available detailers (for express service check)
            
        Returns:
            List of available time slots
        """
        available_slots = []
        
        for slot in all_slots:
            slot_start = datetime.strptime(slot["start_time"], "%H:%M").time()
            slot_end = datetime.strptime(slot["end_time"], "%H:%M").time()
            
            # Check if this slot conflicts with any existing job
            is_conflicting = False
            
            for job in existing_jobs:
                job_start = job.appointment_time
                
                # Calculate job end time based on service duration
                job_start_minutes = job_start.hour * 60 + job_start.minute
                job_end_minutes = job_start_minutes + job.service_type.duration
                job_end = time(job_end_minutes // 60, job_end_minutes % 60)
                
                # Add travel interval after job
                travel_end_minutes = job_end_minutes + travel_interval
                travel_end = time(travel_end_minutes // 60, travel_end_minutes % 60)
                
                # Check for overlap
                # New slot starts before existing job ends + travel time
                # AND new slot ends after existing job starts
                if (slot_start < travel_end and slot_end > job_start):
                    is_conflicting = True
                    break
            
            # For express service, check if at least 2 detailers are available at this time
            if not is_conflicting and is_express_service and detailers:
                # Count how many detailers are available for this slot
                available_detailers_count = 0
                for detailer in detailers:
                    # Check if this detailer has any conflicting jobs at this time
                    detailer_conflicts = existing_jobs.filter(
                        primary_detailer=detailer,
                        appointment_time__lte=slot_end,
                    )
                    has_conflict = False
                    for conflict_job in detailer_conflicts:
                        conflict_start = conflict_job.appointment_time
                        conflict_start_minutes = conflict_start.hour * 60 + conflict_start.minute
                        conflict_end_minutes = conflict_start_minutes + conflict_job.service_type.duration + travel_interval
                        conflict_end = time(conflict_end_minutes // 60, conflict_end_minutes % 60)
                        if (slot_start < conflict_end and slot_end > conflict_start):
                            has_conflict = True
                            break
                    if not has_conflict:
                        available_detailers_count += 1
                
                # For express service, need at least 2 detailers (but allow fallback to 1)
                # We'll still show the slot even if only 1 is available (fallback behavior)
                # The booking assignment logic will handle the actual assignment
                if available_detailers_count < 1:
                    is_conflicting = True
            
            if not is_conflicting:
                # Create a clean slot object without detailer info for the response
                clean_slot = {
                    "start_time": slot["start_time"],
                    "end_time": slot["end_time"],
                    "is_available": True
                }
                available_slots.append(clean_slot)
        
        return available_slots
    

    def _get_detailer_availability(self, request):
        """ The method is designed to get all of the detailers availability for a year
           ARGs None
           Returns:
           - List of detailers availability for a year
          """
        pass

    def _update_detailer_availability(self, request):
        """ The method is designed to update the availability of a detailer
        """
        
        pass
