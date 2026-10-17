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

export type SourceType = "video" | "audio" | "transcript";

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
  created_at: string;
  updated_at: string;
};

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

export type ContentPiece = {
  id: string;
  project: string;
  project_name: string;
  generation: string | null;
  /** The clip this post is the caption for, if any. */
  clip: ClipSummary | null;
  platform: Platform;
  title: string;
  body: string;
  tone: string;
  status: "draft" | "approved";
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
};

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
