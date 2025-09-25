from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from datetime import timedelta
from django.shortcuts import render
from django.conf import settings
import secrets
import hashlib
from main.models import User, PasswordResetToken
from main.tasks import send_password_reset_email
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.exceptions import ValidationError

class RequestPasswordResetView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        
        if not email:
            return Response(
                {'error': 'Email is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(email=email)
            
            # Invalidate any existing tokens for this user
            PasswordResetToken.objects.filter(user=user, used=False).update(used=True)
            
            # Create new reset token
            token = secrets.token_urlsafe(32)
            expires_at = timezone.now() + timedelta(hours=1)
            
            reset_token = PasswordResetToken.objects.create(
                user=user,
                token=token,
                expires_at=expires_at
            )
            
            # Send reset email
            send_password_reset_email.delay(user.email, user.get_full_name(), token)
            
            # Always return success to prevent email enumeration
            return Response({
                'message': 'If an account with that email exists, a password reset link has been sent.'
            }, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            return Response({
                'message': 'If an account with that email exists, a password reset link has been sent.'
            }, status=status.HTTP_200_OK)

class ValidateResetTokenView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        token = request.data.get('token', '').strip()
        
        if not token:
            return Response(
                {'error': 'Token is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            reset_token = PasswordResetToken.objects.get(token=token)
            
            if not reset_token.is_valid():
                return Response(
                    {'error': 'Invalid or expired token'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Return user info for display purposes (optional)
            return Response({
                'valid': True,
                'message': 'Token is valid',
                'expires_at': reset_token.expires_at.isoformat(),
                'user_email': reset_token.user.email
            }, status=status.HTTP_200_OK)
            
        except PasswordResetToken.DoesNotExist:
            return Response(
                {'error': 'Invalid or expired token'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

class ResetPasswordView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        token = request.data.get('token', '').strip()
        new_password = request.data.get('password', '').strip()
        
        if not token or not new_password:
            return Response(
                {'error': 'Token and new password are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate password strength
        if len(new_password) < 8:
            return Response(
                {'error': 'Password must be at least 8 characters long'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            reset_token = PasswordResetToken.objects.get(token=token)
            
            if not reset_token.is_valid():
                return Response(
                    {'error': 'Invalid or expired token'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Update password
            user = reset_token.user
            user.set_password(new_password)
            user.save()
            
            # Mark token as used
            reset_token.used = True
            reset_token.save()
            
            # Generate new tokens for immediate login
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)
            
            return Response({
                'message': 'Password reset successfully',
                'access': access_token,
                'refresh': refresh_token,
                'user': {
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'email': user.email,
                    'phone': user.phone,
                }
            }, status=status.HTTP_200_OK)
            
        except PasswordResetToken.DoesNotExist:
            return Response(
                {'error': 'Invalid or expired token'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

class WebResetPasswordView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        """Display the password reset form"""
        token = request.GET.get('token', '').strip()
        
        if not token:
            return render(request, 'password_reset_invalid.html', {
                'error': 'Token is required'
            })
        
        try:
            reset_token = PasswordResetToken.objects.get(token=token)
            
            if not reset_token.is_valid():
                return render(request, 'password_reset_invalid.html', {
                    'error': 'Invalid or expired token'
                })
            
            return render(request, 'password_reset_form.html', {
                'token': token,
                'user_email': reset_token.user.email,
                'expires_at': reset_token.expires_at
            })
            
        except PasswordResetToken.DoesNotExist:
            return render(request, 'password_reset_invalid.html', {
                'error': 'Invalid or expired token'
            })
    
    def post(self, request):
        """Process the password reset form submission"""
        token = request.POST.get('token', '').strip()
        new_password = request.POST.get('password', '').strip()
        confirm_password = request.POST.get('confirm_password', '').strip()
        
        if not token or not new_password or not confirm_password:
            return render(request, 'password_reset_form.html', {
                'token': token,
                'error': 'All fields are required'
            })
        
        if new_password != confirm_password:
            return render(request, 'password_reset_form.html', {
                'token': token,
                'error': 'Passwords do not match'
            })
        
        # Validate password strength
        if len(new_password) < 8:
            return render(request, 'password_reset_form.html', {
                'token': token,
                'error': 'Password must be at least 8 characters long'
            })
        
        if not any(c.islower() for c in new_password):
            return render(request, 'password_reset_form.html', {
                'token': token,
                'error': 'Password must contain at least one lowercase letter'
            })
        
        if not any(c.isupper() for c in new_password):
            return render(request, 'password_reset_form.html', {
                'token': token,
                'error': 'Password must contain at least one uppercase letter'
            })
        
        if not any(c.isdigit() for c in new_password):
            return render(request, 'password_reset_form.html', {
                'token': token,
                'error': 'Password must contain at least one number'
            })
        
        try:
            reset_token = PasswordResetToken.objects.get(token=token)
            
            if not reset_token.is_valid():
                return render(request, 'password_reset_invalid.html', {
                    'error': 'Invalid or expired token'
                })
            
            # Update password
            user = reset_token.user
            user.set_password(new_password)
            user.save()
            
            # Mark token as used
            reset_token.used = True
            reset_token.save()
            
            return render(request, 'password_reset_success.html', {
                'user_email': user.email
            })
            
        except PasswordResetToken.DoesNotExist:
            return render(request, 'password_reset_invalid.html', {
                'error': 'Invalid or expired token'
            })

