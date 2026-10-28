// One way to call the Mindra API: adds the base URL and sign-in token, and turns
// error responses into ApiError with readable messages.

export const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

const TOKEN_KEY = "mindra.token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage can be blocked (private mode); the session then lasts until the tab closes.
  }
}

export type FieldErrors = Record<string, string[]>;

export class ApiError extends Error {
  status: number;
  fieldErrors: FieldErrors;
  /** What kind of refusal it is, when the API says ("plan_limit": a limit of the workspace's plan), or "". */
  code: string;

  constructor(status: number, message: string, fieldErrors: FieldErrors = {}, code = "") {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.code = code;
  }
}

/** The error is a limit of the workspace's plan, so the plans in Billing are the way on. */
export function isPlanLimit(error: unknown): boolean {
  return error instanceof ApiError && error.code === "plan_limit";
}

let unauthorizedHandler: (() => void) | null = null;

/** Called when the API rejects the saved token (expired or signed out elsewhere). */
export function onUnauthorized(handler: () => void) {
  unauthorizedHandler = handler;
  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = null;
  };
}

function messagesFrom(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(messagesFrom);
  if (value && typeof value === "object") return Object.values(value).flatMap(messagesFrom);
  return value == null ? [] : [String(value)];
}

function toApiError(status: number, body: unknown): ApiError {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const record = body as Record<string, unknown>;
    if (typeof record.detail === "string") {
      return new ApiError(status, record.detail, {}, typeof record.code === "string" ? record.code : "");
    }
    const fieldErrors: FieldErrors = {};
    for (const [field, value] of Object.entries(record)) fieldErrors[field] = messagesFrom(value);
    const message = fieldErrors.non_field_errors?.[0] ?? Object.values(fieldErrors)[0]?.[0];
    return new ApiError(status, message ?? "Something went wrong.", fieldErrors);
  }
  if (status >= 500) return new ApiError(status, "The server ran into a problem. Try again in a moment.");
  return new ApiError(status, messagesFrom(body)[0] ?? "Something went wrong.");
}

function handleResponse<T>(status: number, body: unknown): T {
  if (status === 401 && getToken()) unauthorizedHandler?.();
  if (status < 200 || status >= 300) throw toApiError(status, body);
  return body as T;
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Token ${token}` } : {};
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Stops the request; the promise then rejects with the signal's reason instead of an ApiError. */
  signal?: AbortSignal;
};

export async function apiRequest<T>(path: string, { method = "GET", body, signal }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json", ...authHeaders() };
  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { method, headers, body: payload, signal });
  } catch (error) {
    if (signal?.aborted) throw signal.reason ?? error;
    throw new ApiError(0, "Can't reach the Mindra server. Check your connection and try again.");
  }

  let data: unknown = null;
  if (response.status !== 204) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }
  return handleResponse<T>(response.status, data);
}

/** POST a form with files, reporting upload progress from 0 to 1 (fetch can't report upload progress). */
export function uploadWithProgress<T>(path: string, form: FormData, onProgress: (fraction: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `${API_URL}${path}`);
    request.setRequestHeader("Accept", "application/json");
    for (const [name, value] of Object.entries(authHeaders())) request.setRequestHeader(name, value);

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    request.onload = () => {
      let data: unknown = null;
      try {
        data = request.responseText ? JSON.parse(request.responseText) : null;
      } catch {
        data = null;
      }
      try {
        resolve(handleResponse<T>(request.status, data));
      } catch (error) {
        reject(error);
      }
    };
    request.onerror = () => reject(new ApiError(0, "The upload failed. Check your connection and try again."));
    request.send(form);
  });
}
