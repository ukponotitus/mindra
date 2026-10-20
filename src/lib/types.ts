// Shapes of the Mindra API responses (see mindra-backend/README.md).

/** Which writer produced an analysis or post: Gemini, Claude, or the stand-in that needs no key. */
export type AiProvider = "gemini" | "anthropic" | "fake";

export type WorkspaceMembership = {
  id: number;
  name: string;
  role: "owner" | "admin" | "member";
};

export type User = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  workspaces: WorkspaceMembership[];
};

export type AuthResponse = {
  token: string;
  user: User;
};

/** "photos": a photo post's pictures, uploaded one by one; nothing is processed, so it's ready at once. */
export type SourceType = "video" | "audio" | "transcript" | "photos";

export type ProjectStatus = "queued" | "extracting_audio" | "transcribing" | "analyzing" | "completed" | "failed";

export type Platform =
  | "instagram"
  | "facebook"
  | "tiktok"
  | "youtube_shorts"
  | "whatsapp"
  | "x"
  | "linkedin"
  | "newsletter"
  | "blog"
  | "quote_cards";

export type Project = {
  id: string;
  workspace: number;
  name: string;
  source_type: SourceType;
  source_filename: string;
  source_url: string | null;
  target_platforms: Platform[];
  status: ProjectStatus;
  progress: number;
  error: string;
  duration_seconds: number | null;
  language: string;
  segment_count: number;
  content_count: number;
  analysis: Analysis | Record<string, never>;
  analysis_error: string;
  /** What the photos show (or, for other projects, an optional description), up to 500 characters. */
  note: string;
  /** Photos projects: the recording whose message the captions can use. */
  linked_recording: string | null;
  linked_recording_name: string;
  photo_count: number;
  /** The first photo's thumbnail, or null. */
  cover_url: string | null;
  created_at: string;
  updated_at: string;
};

/** One picture of a photos project (GET /api/projects/<id>/photos/), in posting order. */
export type Photo = {
  id: string;
  position: number;
  width: number;
  height: number;
  url: string;
  thumbnail_url: string;
  original_filename: string;
};

/** A picture as a post shows it. */
export type PostPhoto = Pick<Photo, "id" | "url" | "thumbnail_url" | "width" | "height">;

/** GET /api/projects/<id>/photos/files/: direct addresses a page can fetch to share the files. */
export type PhotoFile = { url: string; filename: string; content_type: string };

export type Moment = { text: string; start: number };

export type Analysis = {
  summary: string;
  topics: string[];
  takeaways: string[];
  quotes: Moment[];
  hooks: Moment[];
  provider: AiProvider;
  model: string;
};

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type TranscriptSegment = {
  index: number;
  start: number | null;
  end: number | null;
  speaker: string;
  text: string;
};

export type Transcript = {
  status: ProjectStatus;
  language: string;
  segments: TranscriptSegment[];
};

export type ProjectSummary = {
  total_projects: number;
  projects_this_week: number;
  completed_projects: number;
  processing_jobs: number;
  queued_jobs: number;
  failed_projects: number;
  minutes_processed: number;
  content_pieces: number;
};

/** A spoken language the transcription service is asked for; the code "auto" means detect it. */
export type SpokenLanguage = { code: string; name: string };

export type UploadOptions = {
  max_upload_mb: number;
  extensions: { video: string[]; audio: string[] };
  /** In the order to offer them: the default first, "auto" (detect automatically) last. */
  languages: SpokenLanguage[];
  default_language: string;
  /** True: files go straight to storage in parts (src/lib/upload.ts); false: the file is sent with the project. */
  direct_upload: boolean;
  /** Photo extensions the server takes, such as ".jpg" and ".heic". */
  photo_types: string[];
  /** Largest photo the server takes, before it processes it. */
  max_photo_mb: number;
  max_photos: number;
};

/** POST /api/uploads/: a direct upload that has started. */
export type StartedUpload = {
  key: string;
  upload_id: string;
  part_size: number;
  part_count: number;
};

/** POST /api/uploads/parts/: presigned PUT URLs, valid for `expires_in` seconds. */
export type UploadPartUrls = {
  urls: { part_number: number; url: string }[];
  expires_in: number;
};

/** POST /api/uploads/status/: the parts storage already has. */
export type UploadStatus = {
  key: string;
  upload_id: string;
  parts: { part_number: number; etag: string; size: number }[];
};

/** What a post shows of the clip it goes with. */
export type ClipSummary = {
  id: string;
  title: string;
  start: number;
  end: number;
  duration: number;
  status: "suggested" | "rendering" | "ready" | "failed";
  is_stale: boolean;
  video_url: string | null;
  download_url: string | null;
  thumbnail_url: string | null;
};

/**
 * Where a post is on the calendar: "" not scheduled; "planned" before its time; "reminded" once the reminder went out;
 * "posted" once someone marked it; "missed" when it wasn't marked within some hours of its time. Posts set to post
 * automatically (`publish_to`): "publishing" while Mindra posts it; "published" once it's out (it then counts as posted
 * everywhere, with `posted_at` its `published_at`); "failed" when automatic posting gave up and the person was reminded.
 */
export type ScheduleStatus = "" | "planned" | "reminded" | "posted" | "missed" | "publishing" | "published" | "failed";

export type ContentPiece = {
  id: string;
  project: string;
  project_name: string;
  generation: string | null;
  /** The clip this post is the caption for, if any. */
  clip: ClipSummary | null;
  /** A photo post's pictures, in order (its project's photos); empty for other posts. */
  photos: PostPhoto[];
  platform: Platform;
  title: string;
  body: string;
  tone: string;
  status: "draft" | "approved";
  is_favorite: boolean;
  /** When the post is planned to go out (ISO 8601), or null when it isn't on the calendar. */
  scheduled_at: string | null;
  /** When the reminder for its current time went out. */
  reminded_at: string | null;
  /** When someone marked it as posted. */
  posted_at: string | null;
  schedule_status: ScheduleStatus;
  /** The connected account Mindra posts it to automatically at its time, or null to only remind. */
  publish_to: ConnectedAccountId | null;
  /** That account's name ("" without one). */
  publish_to_name: string;
  /** When Mindra posted it. */
  published_at: string | null;
  /** The post on Facebook or Instagram, once it's out. */
  published_url: string | null;
  /** Why automatic posting failed, in words for the person. */
  publish_error: string;
  created_at: string;
  updated_at: string;
};

/** GET /api/social/accounts/: a Facebook Page or an Instagram professional account Mindra can post to. */
export type ConnectedAccountKind = "facebook_page" | "instagram";

export type ConnectedAccountId = number | string;

export type ConnectedAccount = {
  id: ConnectedAccountId;
  kind: ConnectedAccountKind;
  name: string;
  /** The Instagram handle without "@", or "". */
  username: string;
  picture_url: string;
  /** "needs_reconnect": Facebook stopped accepting Mindra's access (expired, password changed, permission removed). */
  status: "active" | "needs_reconnect";
  last_error: string;
  connected_at: string;
};

/**
 * GET /api/social/meta/pending/<id>/: what Facebook shared, waiting for the signed-in person to confirm it (the callback
 * doesn't save accounts, so nobody can connect their accounts to someone else's workspace with a link).
 */
export type PendingConnection = {
  accounts: Pick<ConnectedAccount, "kind" | "name" | "username" | "picture_url">[];
  /** Something to know, such as a Page that was left out; or "". */
  notice: string;
  expires_at: string;
};

/** POST /api/social/meta/pending/<id>/confirm/: the accounts it saved. */
export type ConfirmedConnection = { accounts: ConnectedAccount[]; notice: string };

/** GET /api/notifications/: how reminders reach the signed-in person. */
export type NotificationSettings = {
  /** The server's VAPID public key for Web Push, or null when push isn't set up on the server. */
  push_public_key: string | null;
  email_reminders: boolean;
  /** True when the server can really send email. */
  email_available: boolean;
};

/** POST /api/notifications/test/: what a test reminder reached. */
export type TestReminderResult = { push_sent: number; email_sent: boolean };

export type Generation = {
  id: string;
  project: string;
  clip: string | null;
  platforms: Platform[];
  tone: string;
  variations: number;
  status: "queued" | "running" | "completed" | "failed";
  progress: number;
  error: string;
  /** Something to know about a run that worked, such as a platform that couldn't be written, or a retry. */
  notice: string;
  created_at: string;
  updated_at: string;
};

export type BrandVoice = {
  brand_name: string;
  audience: string;
  tone: string;
  style_notes: string;
  words_to_use: string;
  words_to_avoid: string;
  sample_posts: string;
  updated_at: string | null;
};

export type AiStatus = {
  provider: AiProvider;
  model: string;
};

/** One way to improve a post, with the whole post rewritten to apply it. */
export type SuggestionIdea = {
  label: string;
  why: string;
  body: string;
};

/** What the editor's Suggestions panel shows for one post. Hashtags come without the "#". */
export type Suggestions = {
  ideas: SuggestionIdea[];
  openers: string[];
  ctas: string[];
  hashtags: string[];
  emoji: { emoji: string; where: string }[];
};
