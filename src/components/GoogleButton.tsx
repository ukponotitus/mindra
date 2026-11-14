import { API_URL } from "../lib/api";
import { buttonStyles } from "./ui/button";

/** Google's "G", in its own colours as its sign-in branding asks. */
function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 18 18" className="size-[18px] shrink-0">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.96 10.71a5.41 5.41 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08l3-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}

/**
 * "Continue with Google": sends the browser to the API, which sends it on to Google and back to `/login/google`
 * (src/pages/GoogleSignIn.tsx). `next` is the page to open once signed in.
 */
export default function GoogleButton({ next }: { next?: string }) {
  const query = next ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <a href={`${API_URL}/api/auth/google/start/${query}`} className={buttonStyles({ variant: "secondary", size: "lg", className: "w-full" })}>
      <GoogleMark />
      Continue with Google
    </a>
  );
}
