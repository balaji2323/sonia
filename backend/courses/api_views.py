import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .models import Course, Enrollment, LessonProgress, Lesson


def require_student_login(request):
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Login required"}, status=401)
    return None


def _media_url(request, file_field):
    if not file_field:
        return None
    return request.build_absolute_uri(file_field.url)


def list_courses(request):
    """
    Show all courses ONLY if logged-in student.
    """
    err = require_student_login(request)
    if err:
        return err

    courses = Course.objects.all().order_by("-created_at")
    data = []
    for c in courses:
        data.append({
            "id": c.id,
            "title": c.title,
            "description": c.description[:140],
            "category": c.category,
            "level": c.level,
            "thumbnail_url": _media_url(request, c.thumbnail),
            "lessons_count": c.lessons.count(),
        })
    return JsonResponse(data, safe=False)


def course_detail(request, course_id: int):
    """
    Course + lessons details ONLY if logged-in student.
    """
    err = require_student_login(request)
    if err:
        return err

    try:
        c = Course.objects.get(id=course_id)
    except Course.DoesNotExist:
        return JsonResponse({"detail": "Course not found"}, status=404)

    progress_rows = LessonProgress.objects.filter(user=request.user, lesson__course=c)
    progress_map = {p.lesson_id: p for p in progress_rows}

    lessons = []
    for l in c.lessons.all():
        p = progress_map.get(l.id)
        lessons.append({
            "id": l.id,
            "title": l.title,
            "order": l.order,
            "duration_minutes": l.duration_minutes,
            "video_url": _media_url(request, l.video_file),
            "completed": bool(p.completed) if p else False,
            "last_position_seconds": int(p.last_position_seconds) if p else 0,
            "watched_seconds": int(p.watched_seconds) if p else 0,
        })

    is_enrolled = Enrollment.objects.filter(user=request.user, course=c).exists()

    return JsonResponse({
        "id": c.id,
        "title": c.title,
        "description": c.description,
        "category": c.category,
        "level": c.level,
        "thumbnail_url": _media_url(request, c.thumbnail),
        "is_enrolled": is_enrolled,
        "lessons": lessons
    })


@csrf_exempt
def enroll(request, course_id: int):
    """
    Enroll course - requires login
    """
    err = require_student_login(request)
    if err:
        return err

    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    try:
        c = Course.objects.get(id=course_id)
    except Course.DoesNotExist:
        return JsonResponse({"detail": "Course not found"}, status=404)

    Enrollment.objects.get_or_create(user=request.user, course=c)
    return JsonResponse({"detail": "Enrolled"})


def my_dashboard(request):
    """
    Student dashboard - requires login
    Includes:
    - enrolled_count
    - continue_watching (last lesson watched)
    - per-course progress_percent
    - per-course watched_seconds_total
    - overall_progress_percent
    """
    err = require_student_login(request)
    if err:
        return err

    enrollments = Enrollment.objects.filter(user=request.user).select_related("course")
    enrolled_count = enrollments.count()

    courses = []
    continue_list = []

    overall_sum = 0
    overall_count = 0

    for e in enrollments:
        course = e.course

        total_lessons = Lesson.objects.filter(course=course).count()

        completed_lessons = LessonProgress.objects.filter(
            user=request.user,
            lesson__course=course,
            completed=True
        ).count()

        # total watched seconds in this course
        watched_seconds_total = 0
        for p in LessonProgress.objects.filter(user=request.user, lesson__course=course):
            watched_seconds_total += int(p.watched_seconds or 0)

        progress_percent = 0
        if total_lessons > 0:
            progress_percent = int((completed_lessons / total_lessons) * 100)

        overall_sum += progress_percent
        overall_count += 1

        courses.append({
            "course_id": course.id,
            "title": course.title,
            "thumbnail_url": _media_url(request, course.thumbnail),
            "progress_percent": progress_percent,
            "total_lessons": total_lessons,
            "completed_lessons": completed_lessons,
            "watched_seconds_total": watched_seconds_total,
        })

        # Continue watching (latest unfinished lesson with position)
        latest_lp = (LessonProgress.objects
                     .filter(user=request.user, lesson__course=course)
                     .select_related("lesson")
                     .order_by("-updated_at")
                     .first())

        if latest_lp and latest_lp.last_position_seconds > 0 and not latest_lp.completed:
            continue_list.append({
                "course_id": course.id,
                "course_title": course.title,
                "lesson_id": latest_lp.lesson.id,
                "lesson_title": latest_lp.lesson.title,
                "last_position_seconds": int(latest_lp.last_position_seconds or 0),
                "video_url": _media_url(request, latest_lp.lesson.video_file),
            })

    overall_progress_percent = 0
    if overall_count > 0:
        overall_progress_percent = int(overall_sum / overall_count)

    return JsonResponse({
        "email": request.user.email or request.user.username,
        "enrolled_count": enrolled_count,
        "overall_progress_percent": overall_progress_percent,
        "continue_watching": continue_list[:3],
        "courses": courses
    })


@csrf_exempt
def update_watch(request, lesson_id: int):
    """
    Watch-time tracking + continue-watching
    body: {current_time_seconds, delta_seconds, completed}
    """
    err = require_student_login(request)
    if err:
        return err

    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    try:
        data = json.loads(request.body.decode("utf-8") or "{}")
    except Exception:
        data = {}

    current_time = int(data.get("current_time_seconds") or 0)
    delta = int(data.get("delta_seconds") or 0)
    completed = bool(data.get("completed") or False)

    try:
        lesson = Lesson.objects.get(id=lesson_id)
    except Lesson.DoesNotExist:
        return JsonResponse({"detail": "Lesson not found"}, status=404)

    if not Enrollment.objects.filter(user=request.user, course=lesson.course).exists():
        return JsonResponse({"detail": "Not enrolled in this course"}, status=403)

    obj, _ = LessonProgress.objects.get_or_create(user=request.user, lesson=lesson)

    if delta > 0:
        obj.watched_seconds += delta

    if current_time > obj.last_position_seconds:
        obj.last_position_seconds = current_time

    if completed:
        obj.completed = True

    obj.save()
    return JsonResponse({"detail": "Watch updated"})


@csrf_exempt
def mark_lesson_complete(request, lesson_id: int):
    """
    Mark lesson complete - requires login + enrollment
    """
    err = require_student_login(request)
    if err:
        return err

    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    try:
        lesson = Lesson.objects.get(id=lesson_id)
    except Lesson.DoesNotExist:
        return JsonResponse({"detail": "Lesson not found"}, status=404)

    if not Enrollment.objects.filter(user=request.user, course=lesson.course).exists():
        return JsonResponse({"detail": "Not enrolled in this course"}, status=403)

    obj, _ = LessonProgress.objects.get_or_create(user=request.user, lesson=lesson)
    obj.completed = True
    obj.save()
    return JsonResponse({"detail": "Lesson marked complete"})


@csrf_exempt
def watch_ping(request, lesson_id: int):
    """
    Optional endpoint - if you still use it, keep it.
    """
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Unauthorized"}, status=401)

    try:
        lesson = Lesson.objects.get(id=lesson_id)
    except Lesson.DoesNotExist:
        return JsonResponse({"detail": "Lesson not found"}, status=404)

    if not Enrollment.objects.filter(user=request.user, course=lesson.course).exists():
        return JsonResponse({"detail": "Not enrolled in this course"}, status=403)

    try:
        data = json.loads(request.body.decode("utf-8") or "{}")
    except Exception:
        data = {}

    current_time = int(data.get("current_time_seconds") or 0)
    completed = bool(data.get("completed") or False)

    obj, _ = LessonProgress.objects.get_or_create(user=request.user, lesson=lesson)
    obj.last_position_seconds = max(0, current_time)
    if completed:
        obj.completed = True
    obj.save()

    return JsonResponse({"detail": "Saved"})
