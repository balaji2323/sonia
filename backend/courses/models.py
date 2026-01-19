from django.db import models
from django.contrib.auth.models import User

def course_thumb_path(instance, filename):
    return f"course_thumbnails/course_{instance.id}/{filename}"

def lesson_video_path(instance, filename):
    return f"course_videos/course_{instance.course_id}/lesson_{instance.id}/{filename}"

class Course(models.Model):
    title = models.CharField(max_length=140)
    description = models.TextField()
    category = models.CharField(max_length=80, default="General")
    level = models.CharField(max_length=30, default="Beginner")
    thumbnail = models.ImageField(upload_to=course_thumb_path, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class Lesson(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="lessons")
    title = models.CharField(max_length=140)
    order = models.PositiveIntegerField(default=1)

    #  recorded video upload
    video_file = models.FileField(upload_to=lesson_video_path)

    duration_minutes = models.PositiveIntegerField(default=5)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.course.title} - {self.title}"

class Enrollment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="enrollments")
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="enrollments")
    enrolled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "course")

class LessonProgress(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE)

    completed = models.BooleanField(default=False)

    #  watch tracking
    watched_seconds = models.PositiveIntegerField(default=0)

    #  continue watching
    last_position_seconds = models.PositiveIntegerField(default=0)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "lesson")

class EmailOTP(models.Model):
    email = models.EmailField()
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    def __str__(self):
        return self.email
