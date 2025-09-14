# detailer/server/prisma/prisma/routing.py
from django.urls import re_path
from main.consumer import DetailerNotificationConsumer

websocket_urlpatterns = [
    re_path(r'ws/detailer/(?P<token>[^/]+)/$',  DetailerNotificationConsumer.as_asgi()),
]

