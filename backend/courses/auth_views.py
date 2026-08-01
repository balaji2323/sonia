import random
from datetime import timedelta

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from .models import EmailOTP

OTP_EXP_MINUTES = 10


def _is_gmail(email: str) -> bool:
    return email.lower().endswith("@gmail.com")


def _gen_otp() -> str:
    return str(random.randint(100000, 999999))


@csrf_exempt
def send_otp(request):
    """
    Only allowed if user DOES NOT have a password (first-time users).
    """
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    import json
    data = json.loads(request.body.decode("utf-8"))
    email = (data.get("email") or "").strip().lower()

    if not _is_gmail(email):
        return JsonResponse({"detail": "Only Gmail addresses are allowed."}, status=400)

    user = User.objects.filter(username=email).first()

    #  If user exists and already has password => do NOT allow OTP
    if user and user.has_usable_password():
        return JsonResponse(
            {"detail": "This email already has a password. Please login using password."},
            status=400,
        )

    otp = _gen_otp()
    EmailOTP.objects.create(email=email, otp=otp, is_used=False)

    send_mail(
        subject="Your Syddhi Learning OTP",
        message=f"Your OTP is {otp}. It is valid for {OTP_EXP_MINUTES} minutes.",
        from_email=None,
        recipient_list=[email],
        fail_silently=False,
    )

    return JsonResponse({"detail": "OTP sent"})


@csrf_exempt
def verify_otp(request):
    """
    Verifies OTP and logs the user in (session cookie).
    Then frontend will take them to Set Password screen.
    """
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    import json
    data = json.loads(request.body.decode("utf-8"))
    email = (data.get("email") or "").strip().lower()
    otp = (data.get("otp") or "").strip()

    if not _is_gmail(email):
        return JsonResponse({"detail": "Only Gmail addresses are allowed."}, status=400)

    user = User.objects.filter(username=email).first()

    #  If user already has password, OTP should not be used
    if user and user.has_usable_password():
        return JsonResponse(
            {"detail": "Password already set. Please login using password."},
            status=400,
        )

    row = (
        EmailOTP.objects.filter(email=email, otp=otp, is_used=False)
        .order_by("-created_at")
        .first()
    )
    if not row:
        return JsonResponse({"detail": "Invalid OTP"}, status=400)

    if timezone.now() - row.created_at > timedelta(minutes=OTP_EXP_MINUTES):
        return JsonResponse({"detail": "OTP expired"}, status=400)

    row.is_used = True
    row.save()

    # Create user if first time
    if not user:
        user = User.objects.create_user(username=email, email=email)

    # Login user for session (required for set-password step)
    user.backend = "django.contrib.auth.backends.ModelBackend"
    login(request, user)

    #  tell frontend to show Set Password screen
    return JsonResponse({"detail": "OTP verified", "needs_password_setup": True})


@csrf_exempt
def set_password(request):
    """
    Only allowed after OTP login (session must exist).
    Sets password once. After this, user must use password login next time.
    """
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Unauthorized"}, status=401)

    import json
    data = json.loads(request.body.decode("utf-8"))
    password = (data.get("password") or "").strip()

    if len(password) < 6:
        return JsonResponse({"detail": "Password must be at least 6 characters."}, status=400)

    #  do not allow resetting again via this endpoint
    if request.user.has_usable_password():
        return JsonResponse({"detail": "Password already set. Please login normally."}, status=400)

    request.user.set_password(password)
    request.user.save()

    # IMPORTANT: after set_password, session auth can get invalid.
    # So re-login user.
    user = authenticate(username=request.user.username, password=password)
    if user:
        login(request, user)

    return JsonResponse({"detail": "Password set"})


@csrf_exempt
def password_login(request):
    """
    2nd time onwards: Gmail + password (NO OTP).
    """
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    import json
    data = json.loads(request.body.decode("utf-8"))
    email = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()

    if not _is_gmail(email):
        return JsonResponse({"detail": "Only Gmail addresses are allowed."}, status=400)

    user = authenticate(username=email, password=password)
    if not user:
        return JsonResponse({"detail": "Invalid credentials"}, status=400)

    login(request, user)
    return JsonResponse({"detail": "Logged in"})


@csrf_exempt
def student_logout(request):
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)
    logout(request)
    return JsonResponse({"detail": "Logged out"})
