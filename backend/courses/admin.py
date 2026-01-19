from django.contrib import admin
from .models import Course, Lesson, Enrollment, LessonProgress, EmailOTP

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "category", "level", "created_at")
    search_fields = ("title", "category", "level")

@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ("id", "course", "order", "title", "duration_minutes")
    list_filter = ("course",)
    ordering = ("course", "order")

admin.site.register(Enrollment)
admin.site.register(LessonProgress)
admin.site.register(EmailOTP)
