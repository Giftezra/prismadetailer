from django.core.management.base import BaseCommand
import redis
import json
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import time

class Command(BaseCommand):
    help = "Subscribe to job chat messages from client app"


    def connect_to_redis(self, max_retries=30, delay=5):
        """Connect to Redis with retry logic"""
        for attempt in range(max_retries):
            try:
                r = redis.Redis(host='prisma_redis', port=6379, db=0, decode_responses=True)
                r.ping()  # Test the connection
                self.stdout.write(self.style.SUCCESS(f'Successfully connected to Redis on attempt {attempt + 1}'))
                return r
            except redis.ConnectionError as e:
                if attempt < max_retries - 1:
                    self.stdout.write(
                        self.style.WARNING(f'Redis connection failed: {e}. Retrying in {delay} seconds... (attempt {attempt + 1}/{max_retries})')
                    )
                    time.sleep(delay)
                else:
                    self.stdout.write(self.style.ERROR(f'Failed to connect to Redis after {max_retries} attempts: {e}'))
                    raise


    def handle(self, *args, **options):
        r = self.connect_to_redis()
        pubsub = r.pubsub()
        
        # Subscribe to job chat channels
        pubsub.psubscribe('job_chat')
        self.stdout.write(self.style.SUCCESS('Subscribed to job chat channels'))
        
        channel_layer = get_channel_layer()
        
        try:
            for message in pubsub.listen():
                if message.get('type') != 'pmessage':
                    continue
                
                channel = message.get('channel')
                data = json.loads(message.get('data'))
                
                # Forward message to WebSocket clients
                async_to_sync(channel_layer.group_send)(
                    channel,
                    {
                        'type': 'chat_message',
                        'message': data['message']
                    }
                )
                
                self.stdout.write(f"Forwarded chat message from {channel}")
                
        except KeyboardInterrupt:
            self.stdout.write(self.style.SUCCESS('Chat subscriber stopped'))
