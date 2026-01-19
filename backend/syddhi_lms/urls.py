from .home_view import home

from django.contrib import admin
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from courses.auth_views import (
    send_otp,
    verify_otp,
    set_password,
    password_login,
    student_logout,
)

from courses.api_views import (
    list_courses,
    course_detail,
    enroll,
    my_dashboard,
    watch_ping,
    mark_lesson_complete,
)

urlpatterns = [
    path("", home),

    path("admin/", admin.site.urls),

    # Auth
    path("api/auth/send-otp/", send_otp),
    path("api/auth/verify-otp/", verify_otp),
    path("api/auth/set-password/", set_password),
    path("api/auth/password-login/", password_login),
    path("api/auth/logout/", student_logout),

    # Courses
    path("api/courses/", list_courses),
    path("api/courses/<int:course_id>/", course_detail),
    path("api/courses/<int:course_id>/enroll/", enroll),

    # Student Dashboard
    path("api/me/dashboard/", my_dashboard),

    # Watch tracking
    path("api/lessons/<int:lesson_id>/watch/", watch_ping),
    path("api/lessons/<int:lesson_id>/complete/", mark_lesson_complete),
]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

