from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Avg
from main.models import Job, Review, Earning, Detailer


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    action_handler = {
        "get_profile_statistics": "_get_profile_statistics",
    }

    def get(self, request, *args, **kwargs):
        action = kwargs.get('action')
        if action not in self.action_handler:
            return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)
        handler = getattr(self, self.action_handler[action])
        return handler(request)
    
    def _get_profile_statistics(self, request):
        try:
            # Get the stats which includes the commission rate, average rating, total bookings, total earnings and reviews
            total_bookings = Job.objects.filter(detailer__user=request.user).count()

            total_earnings = Earning.objects.filter(detailer__user=request.user).aggregate(total=Sum('net_amount'))['total'] or 0

            average_rating = Review.objects.filter(detailer__user=request.user).aggregate(avg_rating=Avg('rating'))['avg_rating'] or 0

            commission_rate = Detailer.objects.get(user=request.user).commission_rate * 100

            reviews = Review.objects.filter(detailer__user=request.user)

            review_data=[]
            # Loop through this and create a review data object
            for review in reviews:
                review_data.append({
                    'id': review.id,
                    'rating': review.rating,
                    'comment': review.comment,
                    'created_at': review.created_at,
                    'created_by': review.job.client_name
                })

            data = {
                'commission_rate': commission_rate,
                'avg_rating': average_rating,
                'total_bookings': total_bookings,
                'total_earnings': total_earnings,
                'reviews': review_data
            }
            print('Profile statistics data:', data)
            return Response(data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
