"""
ASGI config for syddhi_lms project.
"""

import os
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "syddhi_lms.settings")

application = get_asgi_application()
