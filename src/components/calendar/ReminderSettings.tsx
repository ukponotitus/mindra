import { useEffect, useId, useState } from "react";
import { Switch } from "@base-ui/react/switch";
import { LoaderCircle, Send } from "lucide-react";
import { buttonStyles } from "../ui/button";
import { useAuth } from "../../auth/context";
import { cn } from "../../lib/cn";
import {
  currentSubscription,
  pushSupport,
  saveSubscription,
  turnOffPush,
  turnOnPush,
  useNotificationSettings,
  useTestReminder,
  useUpdateNotificationSettings,
} from "../../lib/notifications";

type DeviceState = "checking" | "on" | "off" | "blocked" | "dismissed" | "unsupported" | "install-first" | "update-ios" | "no-server";

const switchClass =
  "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full bg-gray-300 p-0.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary data-[checked]:bg-primary data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50";
const thumbClass = "size-5 rounded-full bg-white shadow-sm transition-transform duration-150 ease-out data-[checked]:translate-x-4";

const DEVICE_NOTES: Record<DeviceState, string> = {
  checking: "Checking this device…",
  on: "This device gets a notification at each post's time. Tap it to open the post, ready to share.",
  off: "Get a notification on this device at each post's time.",
  dismissed: "Notifications weren't allowed. Turn the switch on again to be asked.",
  blocked: "Notifications are blocked for Mindra in this browser's settings. Allow them there, then come back and turn this on.",
  unsupported: "This browser can't show notifications from Mindra. Try Chrome on Android or a computer.",
  "install-first": "Add Mindra to your Home Screen first: Share → Add to Home Screen. Then open Mindra from there and turn this on.",
  "update-ios": "This iPhone needs iOS 16.4 or later for notifications from Mindra.",
  "no-server": "Phone notifications aren't set up on the Mindra server yet.",
};

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/** Settings → Reminders: phone notifications on this device, email reminders, and a test. */
export default function ReminderSettings() {
  const { user } = useAuth();
  const settings = useNotificationSettings();
  const updateSettings = useUpdateNotificationSettings();
  const test = useTestReminder();
  const [support] = useState(pushSupport);
  const [device, setDevice] = useState<DeviceState>("checking");
  const [busy, setBusy] = useState(false);
  const [deviceError, setDeviceError] = useState("");
  const ids = { push: useId(), pushNote: useId(), email: useId(), emailNote: useId() };
  const publicKey = settings.data?.push_public_key ?? null;

  // What this device is set to, once the server has said whether it has push set up.
  useEffect(() => {
    if (!settings.data) return;
    if (support !== "supported") return setDevice(support);
    if (!publicKey) return setDevice("no-server");
    if (Notification.permission === "denied") return setDevice("blocked");
    let stale = false;
    currentSubscription(publicKey)
      .then((subscription) => {
        if (stale) return;
        setDevice(subscription ? "on" : "off");
        // Make sure the server has it for whoever is signed in now; sending it again just updates it.
        if (subscription) saveSubscription(subscription).catch(() => {});
      })
      .catch(() => !stale && setDevice("off"));
    return () => {
      stale = true;
    };
  }, [settings.data, support, publicKey]);

  const togglePush = async (on: boolean) => {
    if (!publicKey) return;
    setBusy(true);
    setDeviceError("");
    try {
      if (on) setDevice(await turnOnPush(publicKey));
      else {
        await turnOffPush();
        setDevice("off");
      }
    } catch (error) {
      setDeviceError(error instanceof Error ? error.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (settings.isPending) {
    return (
      <div aria-busy="true" className="space-y-3">
        <p role="status" className="sr-only">
          Loading reminder settings
        </p>
        <div className="h-5 w-2/3 animate-pulse rounded bg-secondary" />
        <div className="h-5 w-1/2 animate-pulse rounded bg-secondary" />
      </div>
    );
  }
  if (settings.isError) {
    return (
      <div>
        <p role="alert" className="text-sm text-pretty text-red-600">
          {settings.error.message}
        </p>
        <button type="button" onClick={() => settings.refetch()} className={buttonStyles({ variant: "secondary", size: "sm", className: "mt-3" })}>
          Try again
        </button>
      </div>
    );
  }

  const { email_reminders: emailOn, email_available: emailAvailable } = settings.data;
  const canToggle = device === "on" || device === "off" || device === "dismissed";
  const testResult = test.data;
  let testMessage = "";
  if (testResult) {
    const parts: string[] = [];
    if (testResult.push_sent > 0) parts.push(`Sent to ${plural(testResult.push_sent, "device")}.`);
    if (testResult.email_sent) parts.push(`An email is on its way to ${user?.email ?? "you"}.`);
    testMessage = parts.length ? parts.join(" ") : "Nothing was sent. Turn on phone notifications on a device, or email reminders, first.";
  }

  return (
    <div className="divide-y divide-border">
      <div className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <label htmlFor={ids.push} className="text-sm font-medium text-foreground">
            Phone notifications on this device
          </label>
          <span className="flex items-center gap-2">
            {busy && <LoaderCircle aria-hidden="true" className="size-4 animate-spin text-muted-foreground" />}
            <Switch.Root
              id={ids.push}
              nativeButton
              render={<button type="button" />}
              checked={device === "on"}
              onCheckedChange={togglePush}
              disabled={!canToggle || busy}
              aria-describedby={ids.pushNote}
              className={switchClass}
            >
              <Switch.Thumb className={thumbClass} />
            </Switch.Root>
          </span>
        </div>
        <p
          id={ids.pushNote}
          className={cn(
            "mt-1 text-sm text-pretty",
            device === "blocked" || device === "no-server" ? "text-amber-800" : "text-muted-foreground",
          )}
        >
          {DEVICE_NOTES[device]}
        </p>
        {deviceError && (
          <p role="alert" className="mt-2 text-sm text-pretty text-red-600">
            {deviceError}
          </p>
        )}
      </div>

      <div className="py-4">
        <div className="flex items-start justify-between gap-4">
          <label htmlFor={ids.email} className="text-sm font-medium text-foreground">
            Email reminders
          </label>
          <Switch.Root
            id={ids.email}
            nativeButton
            render={<button type="button" />}
            checked={updateSettings.isPending ? Boolean(updateSettings.variables?.email_reminders) : emailOn}
            onCheckedChange={(checked) => updateSettings.mutate({ email_reminders: checked })}
            disabled={updateSettings.isPending}
            aria-describedby={ids.emailNote}
            className={switchClass}
          >
            <Switch.Thumb className={thumbClass} />
          </Switch.Root>
        </div>
        <p id={ids.emailNote} className="mt-1 text-sm text-pretty text-muted-foreground">
          {emailAvailable
            ? `An email to ${user?.email ?? "you"} at each post's time, with a link to the post.`
            : "Emails start once email is set up for Mindra. Your choice is saved until then."}
        </p>
        {updateSettings.isError && (
          <p role="alert" className="mt-2 text-sm text-pretty text-red-600">
            {updateSettings.error.message}
          </p>
        )}
      </div>

      <div className="pt-4">
        <button type="button" onClick={() => test.mutate()} disabled={test.isPending} className={buttonStyles({ variant: "secondary" })}>
          {test.isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Send aria-hidden="true" className="size-4" />}
          {test.isPending ? "Sending…" : "Send a test reminder"}
        </button>
        <p role="status" className={cn("text-sm text-pretty text-muted-foreground", testMessage ? "mt-2" : "sr-only")}>
          {testMessage}
        </p>
        {test.isError && (
          <p role="alert" className="mt-2 text-sm text-pretty text-red-600">
            {test.error.message}
          </p>
        )}
      </div>
    </div>
  );
}
