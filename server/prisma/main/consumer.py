import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

class JobChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        from django.contrib.auth.models import AnonymousUser
        from rest_framework_simplejwt.tokens import AccessToken
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        
        await self.accept()
        
        # Authenticate user
        self.user = await self.get_user(User, AnonymousUser, AccessToken)
        if self.user.is_anonymous:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Authentication failed'
            }))
            await self.close()
            return
        
        # Get booking reference from URL
        self.booking_reference = self.scope['url_route']['kwargs']['booking_reference']
        
        # Verify user has access to this job
        try:
            self.job = await self.get_job()
            if self.job.detailer.user != self.user:
                await self.close()
                return
        except:
            await self.close()
            return
        
        # Join room-specific channel
        self.room_group_name = f"job_chat_{self.booking_reference}"
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        # Create or get chat room
        self.chat_room = await self.get_or_create_chat_room()
        
        pass

    async def disconnect(self, close_code):
        # Only try to leave the group if we successfully joined it
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type', 'text')
        content = data.get('content', '').strip()
        
        if not content:
            return
        
        # Save message to database
        message = await self.save_message(content, message_type)
        
        # Send message to room group (only if we're properly connected)
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': {
                        'id': str(message.id),
                        'content': message.content,
                        'sender_type': message.sender_type,
                        'message_type': message.message_type,
                        'created_at': message.created_at.isoformat(),
                        'is_read': message.is_read,
                    }
                }
            )
        
        # Publish to Redis for cross-app delivery
        await self.publish_to_redis(message)

    async def chat_message(self, event):
        message = event['message']
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': message
        }))

    @database_sync_to_async
    def get_user(self, User, AnonymousUser, AccessToken):
        # Extract token from URL path
        token = self.scope['url_route']['kwargs'].get('token')
        pass
        
        if not token:
            pass
            return AnonymousUser()
        
        try:
            # Validate JWT token
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            pass
            user = User.objects.get(id=user_id)
            pass
            return user
        except Exception as e:
            pass
            return AnonymousUser()

    @database_sync_to_async
    def get_job(self):
        from .models import Job
        return Job.objects.get(booking_reference=self.booking_reference)

    @database_sync_to_async
    def get_or_create_chat_room(self):
        from .models import JobChatRoom
        room, created = JobChatRoom.objects.get_or_create(
            job=self.job,
            defaults={
                'client_name': self.job.client_name,
                'detailer': self.job.detailer,
                'is_active': True
            }
        )
        return room

    @database_sync_to_async
    def save_message(self, content, message_type):
        from .models import JobChatMessage
        return JobChatMessage.objects.create(
            room=self.chat_room,
            sender_id=str(self.user.id),
            sender_type='detailer',
            message_type=message_type,
            content=content
        )

    async def publish_to_redis(self, message):
        # Only publish if we have the booking reference
        if not hasattr(self, 'booking_reference'):
            return
            
        import redis
        import asyncio
        
        def publish():
            r = redis.Redis(host='prisma_redis', port=6379, db=0)
            r.publish(f'job_chat_{self.booking_reference}', json.dumps({
                'type': 'chat_message',
                'booking_reference': self.booking_reference,
                'message': {
                    'id': str(message.id),
                    'content': message.content,
                    'sender_type': message.sender_type,
                    'message_type': message.message_type,
                    'created_at': message.created_at.isoformat(),
                }
            }))
        
        await asyncio.get_event_loop().run_in_executor(None, publish)

