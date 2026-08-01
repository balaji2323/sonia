from django.http import JsonResponse

def home(request):
    return JsonResponse({
        "message": "Syddhi LMS backend is running ✅",
        "admin": "/admin/",
        "api_examples": [
            "/api/courses/",
            "/api/auth/send-otp/",
            "/api/me/dashboard/"
        ]
    })
