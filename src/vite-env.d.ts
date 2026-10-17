/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Address of the Mindra API (the mindra-backend project). Defaults to http://localhost:8000. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
