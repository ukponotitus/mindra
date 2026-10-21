// Sends a recording straight to file storage (Cloudflare R2) in parts, through presigned URLs from the API
// (mindra-backend projects/uploads.py), instead of through the Mindra server.
//
// Built for 1 to 2 GB services on church Wi-Fi and mobile data:
// - the file goes in parts of 8 MB or more, 3 at a time;
// - a failed part is retried with growing waits, and while the browser is offline it waits for the connection;
// - the upload's key and id are kept in localStorage, so after a dropped connection, a closed tab or a reload,
//   choosing the same file again (same name, size and date) asks the API which parts arrived and sends the rest.
//
// Each part's ETag is read from storage's answer to the PUT, so the bucket's CORS rules must expose the ETag header
// (see mindra-backend/README.md, "Uploads"). If they don't, the ETags are fetched from the API at the end instead.

import { ApiError, apiRequest } from "./api";
import type { SourceType, StartedUpload, UploadPartUrls, UploadStatus } from "./types";

export type UploadProgress = {
  /** Bytes in storage so far, including parts sent before a resume. */
  loaded: number;
  total: number;
  /** Estimated seconds left at the recent speed; null until there's enough to go on, or while waiting. */
  secondsLeft: number | null;
};

/** "waiting": the connection dropped and it will continue by itself; "finishing": every part is in. */
export type UploadPhase = "uploading" | "waiting" | "finishing";

export type DirectUploadOptions = {
  sourceType: Exclude<SourceType, "transcript">;
  /** What the file is for: a project's recording (the default), or a video to make vertical, which the server doesn't
   * count against the month's hours. Kept apart when continuing an interrupted upload. */
  purpose?: "project" | "vertical";
  onProgress?: (progress: UploadProgress) => void;
  onPhase?: (phase: UploadPhase) => void;
  /** Called when an earlier, interrupted upload of this file is continued, with the bytes already stored. */
  onResume?: (bytesDone: number) => void;
};

export type DirectUploadResult = { key: string; resumed: boolean };

export type PutResult = { status: number; etag: string | null };

/** What the uploader needs from the browser. Tests pass their own. */
export type UploadEnvironment = {
  /** POST JSON to the Mindra API; rejects with ApiError (status 0 when the server can't be reached). */
  api: <T>(path: string, body: unknown, signal: AbortSignal) => Promise<T>;
  /** PUT a part to a presigned URL. Resolves with status 0 on a network error; rejects only when stopped. */
  putPart: (url: string, body: Blob, onProgress: (loaded: number) => void, signal: AbortSignal) => Promise<PutResult>;
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;
  isOnline: () => boolean;
  waitForOnline: (signal: AbortSignal) => Promise<void>;
  sleep: (ms: number, signal: AbortSignal) => Promise<void>;
  now: () => number;
};

const CONCURRENCY = 3;
const URL_BATCH = 20;
/** Ask for a new URL when this little of its lifetime is left. */
const URL_MARGIN_MS = 5 * 60 * 1000;
/** Storage errors (not network drops) given up on after this many tries of one part. */
const MAX_HTTP_ATTEMPTS = 10;
/** Network failures in a row for one part, while the browser says it's online, before giving up (about 30 min). */
const MAX_NETWORK_ATTEMPTS = 60;
/** With nothing sent yet, this many network failures in a row (3 rounds of 3 parts) make it check storage. */
const SETUP_CHECK_AFTER = 9;
const MAX_WAIT_MS = 30 * 1000;
/** A part that sends nothing for this long is dropped and sent again (stuck mobile connections). */
const STALL_MS = 60 * 1000;
/**
 * How long a part that the browser has finished handing over may wait for storage's answer. Phones report the whole
 * part as sent while their network is still pushing it out (on slow mobile data, 8 MB can take minutes), so the
 * answer comes long after the last progress event.
 */
const REPLY_WAIT_MS = 10 * 60 * 1000;
const PROGRESS_EVERY_MS = 200;
const SPEED_WINDOW_MS = 30 * 1000;
const SAVED_KEY = "mindra.uploads";
/** Storage drops unfinished uploads after 7 days. */
const SAVED_MAX_AGE_MS = 6 * 24 * 60 * 60 * 1000;

type SavedUpload = {
  key: string;
  uploadId: string;
  partSize: number;
  partCount: number;
  /** Every part is in and the file is whole; only the project still needs creating. */
  complete: boolean;
  savedAt: number;
};

/** Thrown by start() after pause() or cancel(). */
export class UploadStopped extends Error {
  constructor() {
    super("The upload was stopped.");
    this.name = "UploadStopped";
  }
}

export function isUploadStopped(error: unknown): boolean {
  return error instanceof Error && error.name === "UploadStopped";
}

function fingerprint(file: File, sourceType: string): string {
  return [sourceType, file.name, file.size, file.lastModified].join("|");
}

function readSaved(env: UploadEnvironment): Record<string, SavedUpload> {
  try {
    const parsed: unknown = JSON.parse(env.storage?.getItem(SAVED_KEY) ?? "{}");
    if (!parsed || typeof parsed !== "object") return {};
    const fresh: Record<string, SavedUpload> = {};
    for (const [id, saved] of Object.entries(parsed as Record<string, SavedUpload>)) {
      if (saved && typeof saved.key === "string" && env.now() - saved.savedAt < SAVED_MAX_AGE_MS) fresh[id] = saved;
    }
    return fresh;
  } catch {
    return {};
  }
}

function writeSaved(env: UploadEnvironment, id: string, saved: SavedUpload | null) {
  const all = readSaved(env);
  if (saved) all[id] = saved;
  else delete all[id];
  try {
    if (Object.keys(all).length > 0) env.storage?.setItem(SAVED_KEY, JSON.stringify(all));
    else env.storage?.removeItem(SAVED_KEY);
  } catch {
    // Storage can be full or blocked; the upload still works, it just can't continue after a reload.
  }
}

/** Whether part of this file was uploaded before, so choosing it again continues where it stopped. */
export function hasSavedUpload(file: File, sourceType: string, env: UploadEnvironment = browserEnvironment()): boolean {
  return fingerprint(file, sourceType) in readSaved(env);
}

/** Forget the saved upload of this file, once its project exists (or its upload can't be used). */
export function forgetSavedUpload(file: File, sourceType: string, env: UploadEnvironment = browserEnvironment()) {
  writeSaved(env, fingerprint(file, sourceType), null);
}

/** 754 → "about 13 min left". */
export function formatTimeLeft(seconds: number): string {
  if (seconds < 60) return "less than a minute left";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `about ${minutes} min left`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `about ${hours} h ${rest} min left` : `about ${hours} h left`;
}

/**
 * One file's upload. `start()` resolves with the storage key to create the project with (`source_key`).
 * `pause()` stops it but keeps what was sent; `cancel()` stops it and throws the sent parts away.
 */
export class DirectUpload {
  private readonly file: File;
  private readonly options: DirectUploadOptions;
  private readonly env: UploadEnvironment;
  private readonly id: string;
  private readonly controller = new AbortController();
  private saved: SavedUpload | null = null;
  private readonly etags = new Map<number, string>();
  private readonly sending = new Map<number, number>();
  private readonly urls = new Map<number, { url: string; expiresAt: number }>();
  private urlRequest: Promise<void> | null = null;
  private pending: number[] = [];
  private phase: UploadPhase | null = null;
  private lastProgressAt = 0;
  private samples: { at: number; loaded: number }[] = [];
  private stored = 0;
  /** Parts sent at once: CONCURRENCY, then one at a time after a part drops, so on a weak connection one part has
   * all of it and gets through, instead of several failing together. */
  private lanes = CONCURRENCY;
  /** Whether any bytes have left for storage. A bucket that refuses this site stops the browser before any do. */
  private anythingSent = false;
  /** Network failures in a row, across all parts. */
  private networkFailures = 0;
  private setupChecked = false;

  constructor(file: File, options: DirectUploadOptions, env: UploadEnvironment = browserEnvironment()) {
    this.file = file;
    this.options = options;
    this.env = env;
    this.id = fingerprint(file, options.purpose === "vertical" ? "vertical" : options.sourceType);
  }

  async start(): Promise<DirectUploadResult> {
    const resumed = await this.begin();
    const saved = this.saved!;
    if (!saved.complete) {
      this.setPhase("uploading");
      this.report(true); // A continued upload starts from the bytes already stored.
      this.pending = Array.from({ length: saved.partCount }, (_, index) => index + 1).filter((n) => !this.etags.has(n));
      const queue = [...this.pending];
      const worker = async (lane: number) => {
        // Lanes past `this.lanes` stop taking parts once it drops to one; the first lane sends the rest.
        while (lane < this.lanes) {
          const number = queue.shift();
          if (number === undefined) return;
          await this.sendPart(number);
        }
      };
      try {
        await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, (_, lane) => worker(lane)));
      } catch (error) {
        this.controller.abort(); // Stop the other parts too.
        throw error;
      }
      this.setPhase("finishing");
      await this.finish();
    }
    this.report(true);
    return { key: saved.key, resumed };
  }

  pause() {
    this.controller.abort(new UploadStopped());
  }

  async cancel() {
    const saved = this.saved;
    this.controller.abort(new UploadStopped());
    writeSaved(this.env, this.id, null);
    if (saved && !saved.complete) {
      // Best effort: storage also drops unfinished uploads by itself after a week.
      const signal = new AbortController().signal;
      await this.env.api("/api/uploads/abort/", { key: saved.key, upload_id: saved.uploadId }, signal).catch(() => {});
    }
  }

  private get signal() {
    return this.controller.signal;
  }

  private partSize(number: number): number {
    const { partSize } = this.saved!;
    return Math.min(partSize, this.file.size - (number - 1) * partSize);
  }

  /** Continue a saved upload of this file if storage still has it, otherwise start a new one. */
  private async begin(): Promise<boolean> {
    const saved = readSaved(this.env)[this.id];
    if (saved?.complete) {
      this.saved = saved;
      this.stored = this.file.size;
      this.options.onResume?.(this.file.size);
      return true;
    }
    if (saved && saved.partCount === Math.ceil(this.file.size / saved.partSize)) {
      try {
        const status = await this.call<UploadStatus>("/api/uploads/status/", {
          key: saved.key,
          upload_id: saved.uploadId,
        });
        this.saved = saved;
        for (const part of status.parts) {
          // A part of the wrong size can't be from this file; it's sent again (storage keeps the newest).
          if (part.part_number <= saved.partCount && part.size === this.partSize(part.part_number)) {
            this.etags.set(part.part_number, part.etag);
            this.stored += part.size;
          }
        }
        this.options.onResume?.(this.stored);
        return true;
      } catch (error) {
        // Storage no longer has it (expired, cancelled, or another account's), or the saved details are bad.
        if (!(error instanceof ApiError && (error.status === 404 || error.status === 400))) throw error;
        this.saved = null;
        this.stored = 0;
        this.etags.clear();
      }
    }
    const started = await this.call<StartedUpload>("/api/uploads/", {
      filename: this.file.name,
      size: this.file.size,
      content_type: this.file.type,
      source_type: this.options.sourceType,
      ...(this.options.purpose ? { purpose: this.options.purpose } : {}),
    });
    this.saved = {
      key: started.key,
      uploadId: started.upload_id,
      partSize: started.part_size,
      partCount: started.part_count,
      complete: false,
      savedAt: this.env.now(),
    };
    writeSaved(this.env, this.id, this.saved);
    return false;
  }

  private async finish() {
    const saved = this.saved!;
    const ref = { key: saved.key, upload_id: saved.uploadId };
    if ([...this.etags.values()].some((etag) => !etag)) {
      // Storage's answers didn't show the ETag (CORS ExposeHeaders), so ask the API for them.
      const status = await this.call<UploadStatus>("/api/uploads/status/", ref);
      for (const part of status.parts) this.etags.set(part.part_number, part.etag);
    }
    const parts = [...this.etags.entries()]
      .sort(([a], [b]) => a - b)
      .map(([part_number, etag]) => ({ part_number, etag }));
    try {
      await this.call("/api/uploads/complete/", { ...ref, parts });
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) this.forgetAndThrow();
      throw error;
    }
    this.saved = { ...saved, complete: true, savedAt: this.env.now() };
    writeSaved(this.env, this.id, this.saved);
  }

  private forgetAndThrow(): never {
    writeSaved(this.env, this.id, null);
    throw new ApiError(0, "This upload expired before it finished. Choose Start Processing to upload the file again.");
  }

  private throwIfStopped() {
    if (this.signal.aborted) throw new UploadStopped();
  }

  /** An API call, retried while the connection is down or the server is briefly unavailable. */
  private async call<T>(path: string, body: unknown): Promise<T> {
    for (let failures = 1; ; failures++) {
      await this.whenOnline();
      try {
        return await this.env.api<T>(path, body, this.signal);
      } catch (error) {
        this.throwIfStopped();
        const offline = error instanceof ApiError && error.status === 0;
        const busy = error instanceof ApiError && (error.status >= 500 || error.status === 429);
        if (!(offline || busy) || failures >= (offline ? MAX_NETWORK_ATTEMPTS : MAX_HTTP_ATTEMPTS)) throw error;
        this.setPhase("waiting");
        await this.wait(failures);
      }
    }
  }

  private async whenOnline() {
    this.throwIfStopped();
    if (this.env.isOnline()) return;
    this.setPhase("waiting");
    try {
      await this.env.waitForOnline(this.signal);
    } catch {
      this.throwIfStopped();
    }
  }

  /** 1 s, 2 s, 4 s… up to 30 s, with some randomness so parts don't all retry at once. */
  private async wait(failures: number) {
    const ms = Math.min(MAX_WAIT_MS, 1000 * 2 ** (failures - 1)) * (0.75 + Math.random() * 0.25);
    try {
      await this.env.sleep(ms, this.signal);
    } catch {
      this.throwIfStopped();
    }
  }

  private async urlFor(number: number): Promise<string> {
    const fresh = () => {
      const entry = this.urls.get(number);
      return entry && entry.expiresAt - this.env.now() > URL_MARGIN_MS ? entry.url : null;
    };
    for (let url = fresh(); ; url = fresh()) {
      if (url) return url;
      if (this.urlRequest) {
        await this.urlRequest.catch(() => {});
        this.throwIfStopped();
        continue;
      }
      // This part and the next few that still need a URL, in one request.
      const from = Math.max(0, this.pending.indexOf(number));
      const numbers = [
        number,
        ...this.pending
          .slice(from + 1)
          .filter((n) => !this.etags.has(n) && !this.sending.has(n) && !this.urls.has(n))
          .slice(0, URL_BATCH - 1),
      ];
      const saved = this.saved!;
      this.urlRequest = this.call<UploadPartUrls>("/api/uploads/parts/", {
        key: saved.key,
        upload_id: saved.uploadId,
        part_numbers: numbers,
      }).then((answer) => {
        const expiresAt = this.env.now() + answer.expires_in * 1000;
        for (const { part_number, url } of answer.urls) this.urls.set(part_number, { url, expiresAt });
      });
      try {
        await this.urlRequest;
      } finally {
        this.urlRequest = null;
      }
    }
  }

  private async sendPart(number: number) {
    const start = (number - 1) * this.saved!.partSize;
    const body = this.file.slice(start, start + this.partSize(number));
    for (let httpFailures = 0, networkFailures = 0; ; ) {
      await this.whenOnline();
      const url = await this.urlFor(number);
      this.sending.set(number, 0);
      const result = await this.env.putPart(url, body, (loaded) => this.progress(number, loaded), this.signal);
      this.sending.delete(number);
      this.throwIfStopped();

      if (result.status >= 200 && result.status < 300) {
        this.etags.set(number, result.etag ?? "");
        this.urls.delete(number);
        this.stored += body.size;
        this.networkFailures = 0;
        this.setPhase("uploading");
        this.report(true);
        return;
      }

      this.samples = []; // The speed so far says nothing about after the drop.
      this.report(true);
      if (result.status === 0) {
        networkFailures += 1;
        this.networkFailures += 1;
        this.lanes = 1;
        if (networkFailures >= MAX_NETWORK_ATTEMPTS) {
          throw new ApiError(
            0,
            "The connection kept dropping, so the upload stopped. Choose Start Processing to continue where it stopped.",
          );
        }
        await this.checkStorageReachable();
        this.setPhase("waiting");
        await this.wait(networkFailures);
        continue;
      }
      // 404: storage no longer has this upload. Other 4xx (except an expired URL) won't get better by retrying.
      if (result.status === 404) this.forgetAndThrow();
      httpFailures += 1;
      const retryable = result.status === 403 || result.status === 408 || result.status === 429 || result.status >= 500;
      if (!retryable || httpFailures >= MAX_HTTP_ATTEMPTS) {
        console.error(`Mindra upload: storage answered ${result.status} for part ${number}.`);
        throw new ApiError(result.status, "File storage refused part of the upload. Try again in a few minutes.");
      }
      if (result.status === 403) this.urls.delete(number); // Expired or refused: sign it again.
      this.setPhase("waiting");
      await this.wait(httpFailures);
    }
  }

  /**
   * If no bytes have left for storage yet and puts keep failing while the Mindra API answers, the browser can reach
   * Mindra but not storage, which is usually the bucket's CORS rules rather than the connection. (When bytes do go
   * out, the bucket accepted this site, and the failures are the connection's.)
   */
  private async checkStorageReachable() {
    if (this.setupChecked || this.stored > 0 || this.anythingSent || this.networkFailures < SETUP_CHECK_AFTER) return;
    this.setupChecked = true;
    const saved = this.saved!;
    try {
      await this.env.api("/api/uploads/status/", { key: saved.key, upload_id: saved.uploadId }, this.signal);
    } catch {
      this.throwIfStopped();
      return; // The API can't be reached either: it's the connection, so keep waiting.
    }
    console.error(
      "Mindra upload: the API answers but file storage can't be reached. Check the bucket's CORS rules allow PUT from this site.",
    );
    throw new ApiError(
      0,
      "Your connection reaches Mindra but not its file storage. Try again in a few minutes, and contact us if it keeps happening.",
    );
  }

  private setPhase(phase: UploadPhase) {
    if (phase === this.phase) return;
    this.phase = phase;
    this.options.onPhase?.(phase);
  }

  private progress(number: number, loaded: number) {
    this.sending.set(number, loaded);
    if (loaded > 0) this.anythingSent = true;
    if (this.phase === "waiting" && loaded > 0) this.setPhase("uploading");
    this.report(false);
  }

  private report(force: boolean) {
    const now = this.env.now();
    if (!force && now - this.lastProgressAt < PROGRESS_EVERY_MS) return;
    this.lastProgressAt = now;
    let loaded = this.stored;
    for (const bytes of this.sending.values()) loaded += bytes;
    loaded = Math.min(loaded, this.file.size);

    this.samples.push({ at: now, loaded });
    while (this.samples.length > 2 && now - this.samples[1].at > SPEED_WINDOW_MS) this.samples.shift();
    const first = this.samples[0];
    const seconds = (now - first.at) / 1000;
    const speed = seconds >= 3 ? (loaded - first.loaded) / seconds : 0;
    const secondsLeft = speed > 0 && this.phase !== "waiting" ? (this.file.size - loaded) / speed : null;
    this.options.onProgress?.({ loaded, total: this.file.size, secondsLeft });
  }
}

function putWithXhr(url: string, body: Blob, onProgress: (loaded: number) => void, signal: AbortSignal) {
  return new Promise<PutResult>((resolve, reject) => {
    const request = new XMLHttpRequest();
    let stalled = false;
    let stallTimer = 0;
    const watch = (wait = STALL_MS) => {
      window.clearTimeout(stallTimer);
      stallTimer = window.setTimeout(() => {
        stalled = true;
        request.abort();
      }, wait);
    };
    const stop = () => request.abort();
    const done = () => {
      window.clearTimeout(stallTimer);
      signal.removeEventListener("abort", stop);
    };
    request.open("PUT", url);
    request.upload.onprogress = (event) => {
      // Once the whole part is handed over, no more progress comes: wait for storage's answer instead.
      watch(event.lengthComputable && event.loaded >= event.total ? REPLY_WAIT_MS : STALL_MS);
      onProgress(event.loaded);
    };
    request.upload.onload = () => watch(REPLY_WAIT_MS);
    request.onload = () => {
      done();
      resolve({ status: request.status, etag: request.getResponseHeader("ETag") });
    };
    request.onerror = () => {
      done();
      resolve({ status: 0, etag: null });
    };
    request.onabort = () => {
      done();
      if (stalled) resolve({ status: 0, etag: null });
      else reject(new UploadStopped());
    };
    if (signal.aborted) {
      reject(new UploadStopped());
      return;
    }
    signal.addEventListener("abort", stop, { once: true });
    watch();
    request.send(body);
  });
}

function stoppable(signal: AbortSignal, begin: (resolve: () => void) => () => void): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new UploadStopped());
    const finish = () => {
      cleanup();
      signal.removeEventListener("abort", abort);
      resolve();
    };
    const abort = () => {
      cleanup();
      reject(new UploadStopped());
    };
    const cleanup = begin(finish);
    signal.addEventListener("abort", abort, { once: true });
  });
}

function browserStorage(): UploadEnvironment["storage"] {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function browserEnvironment(): UploadEnvironment {
  return {
    api: <T>(path: string, body: unknown, signal: AbortSignal) => apiRequest<T>(path, { method: "POST", body, signal }),
    putPart: putWithXhr,
    storage: browserStorage(),
    isOnline: () => navigator.onLine !== false,
    waitForOnline: (signal) =>
      stoppable(signal, (resolve) => {
        window.addEventListener("online", resolve);
        return () => window.removeEventListener("online", resolve);
      }),
    sleep: (ms, signal) =>
      stoppable(signal, (resolve) => {
        const timer = window.setTimeout(resolve, ms);
        return () => window.clearTimeout(timer);
      }),
    now: () => Date.now(),
  };
}
