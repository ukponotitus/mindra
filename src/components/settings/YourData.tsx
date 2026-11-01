import { useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { Link } from "react-router";
import { useAuth } from "../../auth/context";
import { ApiError, apiRequest } from "../../lib/api";
import ConfirmDialog from "../ui/ConfirmDialog";
import { buttonStyles } from "../ui/button";

// A copy of what Mindra holds about the person (the API's /api/auth/export/), and deleting their account with every
// workspace that's only theirs (/api/auth/delete-account/, after their password).

export default function YourData() {
  const { user, signOut } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const download = async () => {
    setDownloading(true);
    setDownloadError("");
    try {
      const data = await apiRequest<unknown>("/api/auth/export/");
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `mindra-data-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setDownloadError(error instanceof ApiError ? error.message : "Couldn't make the copy. Try again.");
    } finally {
      setDownloading(false);
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      await apiRequest<null>("/api/auth/delete-account/", { method: "POST", body: { password } });
      await signOut();
      // A fresh load, so nothing of the account stays in memory; the login page says it's done.
      window.location.replace("/login?account=deleted");
    } catch (error) {
      setDeleteError(error instanceof ApiError ? error.message : "Something went wrong. Nothing was deleted.");
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-foreground">Download your data</p>
        <p className="mt-1 mb-3 text-sm text-pretty text-muted-foreground">
          A file with your account, brand profile, campaigns, projects and transcripts, posts, connected accounts (never their
          passwords or tokens), payments and conversations with the assistant. Files come as links that work for a few hours.
        </p>
        <button type="button" onClick={download} disabled={downloading} className={buttonStyles({ variant: "secondary" })}>
          <Download aria-hidden="true" className="size-4" />
          {downloading ? "Making the file…" : "Download your data"}
        </button>
        {downloadError && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {downloadError}
          </p>
        )}
      </div>

      <div className="border-t border-border pt-6">
        <p className="text-sm font-medium text-foreground">Delete your account</p>
        <p className="mt-1 mb-3 text-sm text-pretty text-muted-foreground">
          This deletes your account and every workspace where you're the only member, with everything in it: recordings,
          transcripts, posts, clips, videos, plans and connected accounts. A plan that renews is stopped first. It can't be
          undone; backups keep copies for up to 7 days. Posts already on social media stay there. The{" "}
          <Link to="/data-deletion" className="font-medium text-primary hover:underline">
            Data Deletion page
          </Link>{" "}
          has more.
        </p>
        <label htmlFor="delete-password" className="mb-1.5 block text-sm font-medium text-foreground">
          Your password
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="delete-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 sm:max-w-xs"
          />
          <ConfirmDialog
            trigger={
              <button type="button" disabled={!password || deleting} className={buttonStyles({ variant: "danger-outline" })}>
                <Trash2 aria-hidden="true" className="size-4" />
                {deleting ? "Deleting…" : "Delete my account"}
              </button>
            }
            title="Delete your account?"
            description={`Your account (${user?.email ?? ""}) and every workspace that's only yours go, with everything in them. This can't be undone.`}
            confirmLabel="Delete everything"
            onConfirm={deleteAccount}
          />
        </div>
        {deleteError && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {deleteError}
          </p>
        )}
      </div>
    </div>
  );
}
