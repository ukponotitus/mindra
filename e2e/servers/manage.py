"""The backend's manage.py with LinkedIn pointed at the stand-in (linkedin.py here, at E2E_LINKEDIN_URL), for the API
and both workers. Run from the backend's folder: python <this file> <command> ..."""

import os
import sys

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
sys.path.insert(0, os.getcwd())

import django  # noqa: E402

django.setup()

from django.core.management import execute_from_command_line  # noqa: E402

from social import linkedin  # noqa: E402

stand_in = os.environ["E2E_LINKEDIN_URL"]
linkedin.API = stand_in
linkedin.AUTHORIZE_URL = f"{stand_in}/oauth/v2/authorization"
linkedin.TOKEN_URL = f"{stand_in}/oauth/v2/accessToken"

execute_from_command_line(["manage.py", *sys.argv[1:]])
