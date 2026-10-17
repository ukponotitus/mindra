import { WifiOff } from "lucide-react";
import { Navigate, Outlet, useLocation } from "react-router";
import { buttonStyles } from "../components/ui/button";
import { useAuth } from "./context";

/** Wraps the signed-in part of the app: shows the page, a loading state, or sends people to log in. */
export default function RequireAuth() {
  const { status, retry } = useAuth();
  const location = useLocation();

  if (status === "signedOut") {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  if (status === "unreachable") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-6">
        <div role="alert" className="max-w-sm rounded-xl border border-border bg-white p-8 text-center">
          <WifiOff aria-hidden="true" className="mx-auto mb-3 size-7 text-muted-foreground" />
          <h1 className="mb-2 font-semibold text-balance text-foreground">Can't reach Mindra</h1>
          <p className="mb-5 text-sm text-pretty text-muted-foreground">Check your internet connection, then try again.</p>
          <button type="button" onClick={retry} className={buttonStyles()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div role="status" className="flex min-h-dvh items-center justify-center bg-background">
        <span aria-hidden="true" className="size-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  return <Outlet />;
}
