# Run by seed.sh inside the backend's `manage.py shell`, on the journey tests' database.
import os
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone

from analytics.models import PostResult
from content.models import ContentPiece
from projects.models import Project
from social.models import ConnectedAccount

user = get_user_model().objects.get(email=os.environ["SEED_EMAIL"])
workspace = user.memberships.first().workspace

if os.environ["SEED_WHAT"] == "youtube-post":
    channel = ConnectedAccount(workspace=workspace, kind="youtube", external_id="UC-standin", name="Ada's channel", username="adachannel")
    channel.token = "stand-in-token"  # never sent anywhere but the stand-in
    channel.save()
    project = Project.objects.create(
        workspace=workspace, name="Sunscreen every day", source_type="transcript", status=Project.Status.COMPLETED, source_text="UV passes through windows."
    )
    posted = timezone.now() - timedelta(days=1)
    piece = ContentPiece.objects.create(
        project=project,
        platform="youtube_shorts",
        title="Sunscreen every day",
        body="Title: Sunscreen every day\nUV light passes through windows. #skincare",
        scheduled_at=posted,
        posted_at=posted,
        published_at=posted,
        publish_to=channel,
        external_post_id="standin0001",
        published_url="https://www.youtube.com/shorts/standin0001",
    )
    PostResult.objects.create(
        piece=piece, account=channel, kind="youtube", external_id="standin0001", url=piece.published_url, posted_at=posted, comments=2
    )
    print("seeded")
