from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from main.models import Detailer, ServiceType, Job, Availability, Addon    
from main.serializer import DetailerSerializer, ServiceTypeSerializer
from datetime import datetime, time, timedelta
from django.utils import timezone
from main.util.media_helper import get_full_media_url
from main.tasks import send_booking_confirmation_email, send_push_notification, create_notification   
from channels.layers import get_channel_layer

class BookingView(APIView):
    permission_classes = [AllowAny] 

    action_handler = {
        "create_booking": '_create_booking',
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
    

    def _create_booking(self, request):
        """ The client app stack uses this method to communicate with the detailer app stack servers.

            When the data required to complete a booking is recieved in the params, the method is to destructure it so that it can be used to create a new booking.
        """
        try:

            try:
                data = request.data
            except:
                data = {}
            pass

            channel_layer = get_channel_layer()

            # Get the service type from the db using the name of the service type sent from the client app stack
            try:
                service_type = ServiceType.objects.get(name=data['service_type'])
            except ServiceType.DoesNotExist:
                return Response({
                    "error": f"Service type '{data.get('service_type')}' not found"
                }, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                pass
                return Response({
                    "error": f"Error finding service type: {str(e)}"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get addons
            try:
                addons = Addon.objects.filter(name__in=data['addons'])
                pass
            except Exception as e:
                pass
                return Response({
                    "error": f"Error finding addons: {str(e)}"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Clean up the city and country
            data['city'] = data['city'].strip() if data['city'] else None
            data['country'] = data['country'].strip() if data['country'] else None

            # Find the first available detailer in the specified location
            try:
                detailers = Detailer.objects.filter(
                    country=data['country'], 
                    city=data['city'], 
                    is_active=True, 
                    is_verified=True, 
                    is_available=True
                )
                pass
            except Exception as e:
                pass
                return Response({
                    "error": f"Error finding detailers: {str(e)}"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not detailers.exists():
                pass
                return Response({
                    "success": False,
                    "error": f"No available detailers found in {data['city']}, {data['country']}"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get the first detailer (you can implement more sophisticated selection logic here)
            detailer = detailers.first()
            
            # Check if the detailer is available for the specified time
            appointment_date = datetime.strptime(data['booking_date'], '%Y-%m-%d').date()
            
            # Handle time format - client sends HH:MM:SS.sss or HH:MM:SS
            try:
                appointment_time = datetime.strptime(data['start_time'], '%H:%M:%S.%f').time()
            except ValueError:
                try:
                    appointment_time = datetime.strptime(data['start_time'], '%H:%M:%S').time()
                except ValueError:
                    return Response({
                        "error": "Invalid start_time format"
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                appointment_end_time = datetime.strptime(data['end_time'], '%H:%M:%S.%f').time()
            except ValueError:
                try:
                    appointment_end_time = datetime.strptime(data['end_time'], '%H:%M:%S').time()
                except ValueError:
                    return Response({
                        "error": "Invalid end_time format"
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create timezone-aware datetime for proper handling
            appointment_datetime_naive = datetime.combine(appointment_date, appointment_time)
            # Convert to timezone-aware datetime (assuming client sends in local timezone)
            appointment_datetime = timezone.make_aware(appointment_datetime_naive)
            
            # Check for conflicting jobs
            conflicting_jobs = Job.objects.filter(
                detailer=detailer,
                appointment_date__date=appointment_date,
                status__in=['pending', 'accepted', 'in_progress']
            )
            
            has_conflict = False
            for job in conflicting_jobs:
                job_start = job.appointment_time
                job_end_minutes = job_start.hour * 60 + job_start.minute + service_type.duration
                job_end = time(job_end_minutes // 60, job_end_minutes % 60)
                
                # Check for time overlap (including 30-minute travel buffer)
                travel_buffer = 30  # minutes
                job_end_with_buffer_minutes = job_end.hour * 60 + job_end.minute + travel_buffer
                job_end_with_buffer = time(job_end_with_buffer_minutes // 60, job_end_with_buffer_minutes % 60)
                
                # Check if new appointment overlaps with existing job
                if (appointment_time < job_end_with_buffer and appointment_end_time > job_start):
                    has_conflict = True
                    break
            
            if has_conflict:
                return Response({
                    "success": False,
                    "error": "No detailers available for the specified time"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Convert vehicle_year to integer if it's a string
            vehicle_year = data.get('vehicle_year')
            if vehicle_year and isinstance(vehicle_year, str):
                try:
                    vehicle_year = int(vehicle_year)
                except ValueError:
                    vehicle_year = None
            
            # Convert total_amount to decimal
            total_amount = data.get('total_amount', 0)
            if isinstance(total_amount, str):
                try:
                    total_amount = float(total_amount)
                except ValueError:
                    total_amount = 0
            
            # Create the job
            try:
                pass
                job = Job.objects.create(
                    booking_reference=data['booking_reference'],
                    detailer=detailer,
                    service_type=service_type,
                    client_name=data['client_name'],
                    client_phone=data['client_phone'],
                    vehicle_registration=data['vehicle_registration'],
                    vehicle_make=data['vehicle_make'],
                    vehicle_model=data['vehicle_model'],
                    vehicle_color=data['vehicle_color'],
                    vehicle_year=vehicle_year,
                    total_amount=total_amount,
                    valet_type=data['valet_type'],
                    owner_note=data.get('special_instructions', ''),
                    address=data['address'],
                    city=data['city'],
                    post_code=data['postcode'],
                    country=data['country'],
                    latitude=data['latitude'],
                    longitude=data['longitude'],
                    appointment_date=appointment_datetime,
                    appointment_time=appointment_time,
                    status=data['status'],
                    loyalty_tier=data.get('loyalty_tier', 'bronze'),
                    loyalty_benefits=data.get('loyalty_benefits', [])
                )
                pass
            except Exception as e:
                pass
                return Response({
                    "error": f"Error creating job: {str(e)}"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Add addons to the job
            if addons.exists():
                job.addons.set(addons)

            # Calculate the total amount by deduction the commission first from the total amount
            total_amount = job.total_amount - (job.total_amount * float(detailer.commission_rate))
            formatted_total_amount = f"{total_amount:.2f}"
            
            # Format appointment date and time for email display (convert to local timezone)
            local_datetime = timezone.localtime(job.appointment_date)
            formatted_appointment_date = local_datetime.strftime('%b. %d, %Y, %I %p').replace(' 0', ' ').lower()
            formatted_appointment_time = local_datetime.strftime('%I %p').replace(' 0', ' ').lower()
            
            # check if the detailer has email notifications enabled
            if detailer.user.allow_email_notifications:
                send_booking_confirmation_email.delay(
                    detailer.user.email,
                    job.booking_reference, 
                    formatted_appointment_date, 
                    formatted_appointment_time, 
                    job.address, 
                    job.service_type.name, 
                    job.owner_note, 
                    formatted_total_amount
                )

            # Check if the detailer has push notifications enabled
            create_notification.delay(
                detailer.user.id,
                'New Appointment',
                'pending',
                'success',
                'You have a new appointment!'
            )

            # Send the user a push notification if they have allowed push notifications and 
            # have a notification token
            if detailer.user.allow_push_notifications and detailer.user.notification_token:
                send_push_notification.delay(
                    detailer.user.id,
                    'New Appointment',
                    'You have a new appointment| ' + self.format_appointment_date_time(job.appointment_date, job.appointment_time) + ' at ' + job.post_code,
                    'booking_created'
                )

            # Return success response with appointment ID
            response_data = {
                'detailer':{
                    'name': detailer.user.get_full_name(),
                    'phone': detailer.user.phone,
                    'rating': detailer.rating,
                },
                'job':{
                    'booking_reference': job.booking_reference,
                    'appointment_date': job.appointment_date,
                    'appointment_time': job.appointment_time,
                    'address': job.address,
                }
            }
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except ServiceType.DoesNotExist:
            return Response({
                "success": False,
                "error": f"Service type '{data.get('service_type', 'Unknown')}' not found"
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                "success": False,
                "error": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        

    
    # Format the appointment date and time so it says the day and time 
    # Example: Wednesday 8:00 AM
    def format_appointment_date_time(self, appointment_date, appointment_time):
        """ Format the appointment date and time so it says the day and time """
        return f"{appointment_date.strftime('%A')} {appointment_time.strftime('%I:%M %p')}"
    

    # def get_available_detailer(self, country, city, appointment_date, appointment_time, service_duration=60, appointment_end_time=None):
    #     """ 
    #       Check if any detailer is available for a given appointment time in the specified location.
    #       The method uses get_all_detailer to get all detailers and checks their availability.
    #     ARGS:
    #         country: str - Country name
    #         city: str - City name
    #         appointment_date: str - Date in YYYY-MM-DD format
    #         appointment_time: str - Time in HH:MM format
    #         service_duration: int - Duration of the service in minutes (default 60)
    #       RETURNS:
    #         bool - True if any detailer is available, False otherwise
    #     """
    #     try:
    #         # Parse the appointment date and time
    #         try:
    #             target_date = datetime.strptime(appointment_date, '%Y-%m-%d').date()
    #             target_time = datetime.strptime(appointment_time, '%H:%M').time()
    #             target_end_time = datetime.strptime(appointment_end_time, '%H:%M').time()
    #         except ValueError:
    #             return False
            
    #         # Get all detailers in the location using the existing method
    #         detailers = self.get_all_detailer(country, city)
    #         if not detailers:
    #             return False
    #         # Calculate the end time of the appointment
    #         start_minutes = target_time.hour * 60 + target_time.minute
    #         end_minutes = start_minutes + service_duration
    #         appointment_end_time = time(end_minutes // 60, end_minutes % 60)
            
    #         # Check each detailer for availability
    #         for detailer in detailers:
    #             # Check if detailer has any conflicting jobs on the same date
    #             conflicting_jobs = Job.objects.filter(
    #                 detailer=detailer,
    #                 appointment_date__date=target_date,
    #                 status__in=['pending', 'accepted', 'in_progress']
    #             )
                
    #             has_conflict = False
    #             for job in conflicting_jobs:
    #                 job_start = job.appointment_time
    #                 job_end = target_end_time
    #                 job_start_minutes = job_start.hour * 60 + job_start.minute
    #                 job_end_minutes = job_end.hour * 60 + job_end.minute
                    
    #                 # Check for time overlap (including 30-minute travel buffer)
    #                 travel_buffer = 30  # minutes
    #                 job_end_with_buffer_minutes = job_end_minutes + travel_buffer
    #                 job_end_with_buffer = time(job_end_with_buffer_minutes // 60, job_end_with_buffer_minutes % 60)
                    
    #                 # Check if new appointment overlaps with existing job
    #                 if (target_time < job_end_with_buffer and appointment_end_time > job_start):
    #                     has_conflict = True
    #                     break
                
    #             if has_conflict:
    #                 continue  # Check next detailer
                
    #             # If no specific availability is set, use default business hours (6 AM to 9 PM)
    #             else:
    #                 business_start = time(6, 0)  # 6:00 AM
    #                 business_end = time(21, 0)   # 9:00 PM
                    
    #                 if target_time < business_start or appointment_end_time > business_end:
    #                     continue  # Check next detailer
                
    #             # If we reach here, this detailer is available
    #             return True
            
    #         # If no detailer is available
    #         return False

    #     except Exception as e:
    #         print(f"Error checking detailer availability: {str(e)}")
    #         return False
        


    # def get_all_detailer(self, country=None, city=None):
    #     """ 
    #       Given the params the method is designed to get the available detailers in the city and country.
    #       ARGS:
    #         country: str
    #         city: str
    #       RETURNS:
    #         list of detailers
    #     """
    #     try:
    #         detailers = Detailer.objects.filter(country=country, city=city, is_active=True, is_verified=True)
    #         if not detailers.exists():
    #             return Response({"error": "No active detailers found in the city and country"}, status=status.HTTP_400_BAD_REQUEST)
    #         # Serialize the detailers
    #         detailers_serializer = DetailerSerializer(detailers, many=True)
    #         # Return the detailers
    #         return Response({"detailers": detailers_serializer.data}, status=status.HTTP_200_OK)
    #     except Exception as e:
    #         return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        
        
    # def get_service_type(self, service_type):
    #     """ 
    #       Given the service type the method is designed to get the service type from the service type model.
    #       ARGS:
    #         service_type: str
    #       RETURNS:
    #         service type
    #     """
    #     try:
    #         service_type = ServiceType.objects.get(name=service_type)
    #         # Serialize the service type
    #         service_type_serializer = ServiceTypeSerializer(service_type)
    #         # Return the service type
    #         return Response({"service_type": service_type_serializer.data}, status=status.HTTP_200_OK)
    #     except Exception as e:
    #         return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        

        




