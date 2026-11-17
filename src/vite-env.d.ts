/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Address of the Mindra API (the mindra-backend project). Defaults to http://localhost:8000. */
  readonly VITE_API_URL?: string;
  /** Meta's pixel (dataset) id, for measuring Mindra's own ads; without it the sign-up forms don't offer it. */
  readonly VITE_META_PIXEL_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
