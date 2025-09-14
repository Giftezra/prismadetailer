from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from main.models import Job
from datetime import datetime
from main.util.media_helper import get_full_media_url
from main.tasks import publish_job_acceptance, publish_job_started, publish_job_completed
# from channels.layers import get_channel_layer
# from asgiref.sync import async_to_sync
# from main.task import send_job_accepted_email


class AppointmentView(APIView):
    permission_classes = [IsAuthenticated]

    action_handler = {
        "get_all_appointments": '_get_all_appointments',
        "get_appointment_details": '_get_appointment_details',
        "accept_appointment": '_accept_appointment',
        "cancel_appointment": '_cancel_appointment',
        "complete_appointment": '_complete_appointment',
        "start_appointment": '_start_appointment',
    }   

    def get(self, request, *args, **kwargs):
        action = kwargs.get('action')
        if action not in self.action_handler:
            return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)
        handler = getattr(self, self.action_handler[action])
        return handler(request)
    
    """ Override the patch method here.
        This will be used to update the detailers appointments
    """
    def patch(self, request, *args, **kwargs):
        action = kwargs.get('action')
        if action not in self.action_handler:
            return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)
        handler = getattr(self, self.action_handler[action])
        return handler(request)
    

    def _get_all_appointments(self, request):
        try:
            # Get the date from the request and use the date to query the jobs
            # model.
            date = datetime.strptime(request.query_params.get('date'), '%Y-%m-%d').date()
            appointments = Job.objects.filter(appointment_date__date=date, detailer__user=request.user)
            # Return the appointments in a list if it exists
            appointment_list = []
            if appointments.exists():
                for appointment in appointments:
                    appointment_data = {
                        'id': appointment.id,
                        'booking_reference': appointment.booking_reference,
                        'service_type': appointment.service_type.name,
                        'client_name': appointment.client_name,
                        'valet_type': appointment.valet_type,
                        'appointment_date': appointment.appointment_date.strftime('%Y-%m-%d'),
                        'appointment_time': appointment.appointment_time.strftime('%H:%M'),
                        'duration': appointment.service_type.duration if appointment.service_type.duration else 0,
                        'status': appointment.status,
                    }
                    appointment_list.append(appointment_data)
            else:
                return Response({"error": "No appointments found for this date"}, status=status.HTTP_200_OK)
            # Return the appointments in a list if it exists
            return Response(appointment_list, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
    
    def _get_appointment_details(self, request):
        try:
            appointment = Job.objects.get(id=request.query_params.get('id'), detailer__user=request.user)
            if not appointment:
                return Response({"error": "Appointment Details not found"}, status=status.HTTP_404_NOT_FOUND)
            
            appointment_detaile = {
                'id': appointment.id,
                'booking_reference': appointment.booking_reference,
                'client_name': appointment.client_name if appointment.client_name else '',
                'client_phone': appointment.client_phone if appointment.client_phone else '',
                'vehicle_make': appointment.vehicle_make if appointment.vehicle_make else '',
                'vehicle_model': appointment.vehicle_model if appointment.vehicle_model else '',
                'vehicle_color': appointment.vehicle_color if appointment.vehicle_color else '',
                'vehicle_year': appointment.vehicle_year if appointment.vehicle_year else '',
                'vehiclie_license': appointment.vehicle_registration if appointment.vehicle_registration else '',
                'service_type': {
                    'name': appointment.service_type.name if appointment.service_type.name else '',
                    'description': appointment.service_type.description if appointment.service_type.description else [],
                    'duration': appointment.service_type.duration if appointment.service_type.duration else 0,
                    'price': appointment.service_type.price if appointment.service_type.price else 0,
                } if appointment.service_type else None,
                'address': appointment.address if appointment.address else '',
                'city': appointment.city if appointment.city else '',
                'post_code': appointment.post_code if appointment.post_code else '',
                'country': appointment.country if appointment.country else '',
                'latitude': appointment.latitude if appointment.latitude else '',
                'longitude': appointment.longitude if appointment.longitude else '',
                'appointment_date': appointment.appointment_date.strftime('%Y-%m-%d'),
                'appointment_time': appointment.appointment_time.strftime('%H:%M'),
                'duration': appointment.duration if appointment.duration else 0,
                'status': appointment.status,
                'special_instruction': appointment.owner_note if appointment.owner_note else '',
                'valet_type': appointment.valet_type if appointment.valet_type else '',
                'addons': appointment.addons.all().values_list('name', flat=True) if appointment.addons.all().exists() else [],
                'before_images': get_full_media_url(appointment.before_photo.url) if appointment.before_photo else '',
                'after_images': get_full_media_url(appointment.after_photo.url) if appointment.after_photo else '',
            }
            return Response(appointment_detaile, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        

    def _accept_appointment(self, request):
        """ The method is used to accept the appointment given to a detailer.
            After an appointment is accepted, the detailer and the client will be notified via websocket.#
            
            The method will also trigger updates on the client app stack to send an email and a notification to the client.
            
            ARGS:
                - appointment id: The id of the appointment to be accepted.

        """
        try:
            appointment = Job.objects.get(id=request.data.get('id'), detailer__user=request.user)
            if not appointment:
                return Response({"error": "Appointment not found"}, status=status.HTTP_404_NOT_FOUND)
            # Check if the appointment is already accepted, completed, or in progress
            if appointment.status in ['completed','accepted','in_progress']:
                return Response({"error": "Appointment already completed, accepted, or in progress"}, status=status.HTTP_400_BAD_REQUEST)
            appointment.status = 'accepted'
            appointment.save()

            # trigger the job acceptance to redis
            publish_job_acceptance.delay(appointment.booking_reference)

            return Response({"message": "Appointment accepted"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


    def _cancel_appointment(self, request):
        """ Cancel the appointment
        Args:
            request: The request object
        Returns:
            Response: The response object
        """
        try:
            appointment = Job.objects.get(id=request.data.get('id'), detailer__user=request.user)
            if not appointment:
                return Response({"error": "Appointment not found"}, status=status.HTTP_404_NOT_FOUND)
            
            # Check if the appointment is already completed
            if appointment.status == 'completed':
                return Response({"error": "Cannot cancel a completed appointment"}, status=status.HTTP_400_BAD_REQUEST)
            
            appointment.status = 'cancelled'
            appointment.save()
            return Response({"message": "Appointment cancelled successfully"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


    def _start_appointment(self, request):
        """ Start the appointment
        Args:
            request: The request objectwhy does
        Returns:
            Response: The response object
        """
        try:
            appointment = Job.objects.get(id=request.data.get('id'), detailer__user=request.user)
            if not appointment:
                return Response({"error": "Appointment not found"}, status=status.HTTP_404_NOT_FOUND)
            
            # Check if the appointment is already started, completed, or cancelled
            if appointment.status in ['in_progress', 'completed', 'cancelled']:
                return Response({"error": "Appointment is already in progress, completed, or cancelled"}, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if the appointment is accepted before starting
            if appointment.status != 'accepted':
                return Response({"error": "Appointment must be accepted before starting"}, status=status.HTTP_400_BAD_REQUEST)
            
            appointment.status = 'in_progress'
            appointment.save()

            # trigger the job started to redis
            publish_job_started.delay(appointment.booking_reference)

            return Response({"message": "Appointment started successfully"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
            

    def _complete_appointment(self, request):
        """ Complete the appointment
        Args:
            request: The request object
        Returns:
            Response: The response object
        """
        try:
            appointment = Job.objects.get(id=request.data.get('id'), detailer__user=request.user)
            if not appointment:
                return Response({"error": "Appointment not found"}, status=status.HTTP_404_NOT_FOUND)
            
            # Check if the appointment is already completed or cancelled
            if appointment.status in ['completed', 'cancelled']:
                return Response({"error": "Appointment is already completed or cancelled"}, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if the appointment is in progress before completing
            if appointment.status != 'in_progress':
                return Response({"error": "Appointment must be in progress before completing"}, status=status.HTTP_400_BAD_REQUEST)
            
            appointment.status = 'completed'
            appointment.save()

            # trigger the job completed to redis
            publish_job_completed.delay(appointment.booking_reference)

            return Response({"message": "Appointment completed successfully"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)