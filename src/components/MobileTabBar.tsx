import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import {
  AudioLines,
  CalendarDays,
  ChevronRight,
  Film,
  FileText,
  House,
  Images,
  Library,
  Megaphone,
  Menu,
  Plus,
  RectangleVertical,
  X,
  type LucideIcon,
} from "lucide-react";
import { Link, useLocation } from "react-router";
import { cn } from "../lib/cn";

// On phones, the places people go most sit at the bottom of the screen, in reach of a thumb: Home, Create, the
// Planner, the Content Library, and More (the whole navigation, the drawer). Create opens a sheet of what can be made.

type Tab = { label: string; to: string; icon: LucideIcon; matches: (path: string) => boolean };

const TABS: Tab[] = [
  { label: "Home", to: "/dashboard", icon: House, matches: (path) => path === "/dashboard" },
  { label: "Planner", to: "/planner", icon: CalendarDays, matches: (path) => path.startsWith("/planner") },
  { label: "Library", to: "/library", icon: Library, matches: (path) => path.startsWith("/library") },
];

type Choice = { label: string; hint: string; to: string; icon: LucideIcon };

const CHOICES: Choice[] = [
  { label: "Posts from a video", hint: "A talk, a class, a live or an event: posts, clips and captions from it", to: "/projects/new?type=video", icon: Film },
  { label: "Posts from audio", hint: "A voice note, a podcast or a recording", to: "/projects/new?type=audio", icon: AudioLines },
  { label: "Photo post", hint: "Your photos with captions, and a video if you add audio", to: "/projects/new?type=photos", icon: Images },
  { label: "Flyer post", hint: "Mindra reads the flyer and writes the posts", to: "/projects/new?type=flyer", icon: Megaphone },
  { label: "Posts from text", hint: "Paste notes, an article or a transcript", to: "/projects/new?type=transcript", icon: FileText },
  { label: "Motion Studio video", hint: "Photos, clips, text and music made into a short video", to: "/studio", icon: Film },
  { label: "Vertical video", hint: "A landscape video made 9:16 for Reels, TikTok and Status", to: "/vertical", icon: RectangleVertical },
];

const tabClass =
  "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary";

export default function MobileTabBar({ onMore }: { onMore: () => void }) {
  const { pathname } = useLocation();
  const [creating, setCreating] = useState(false);
  const [home, ...rest] = TABS;

  const tab = (item: Tab) => {
    const current = item.matches(pathname);
    return (
      <Link
        key={item.to}
        to={item.to}
        aria-current={current ? "page" : undefined}
        className={cn(tabClass, current ? "text-primary" : "text-muted-foreground hover:text-foreground")}
      >
        <item.icon aria-hidden="true" className="size-5" />
        {item.label}
      </Link>
    );
  };

  return (
    <>
      <nav
        aria-label="Quick navigation"
        className="shrink-0 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5 px-1">
          {tab(home)}
          <button
            type="button"
            onClick={() => setCreating(true)}
            aria-haspopup="dialog"
            className={cn(tabClass, "text-foreground")}
          >
            <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
              <Plus aria-hidden="true" className="size-5" />
            </span>
            Create
          </button>
          {rest.map(tab)}
          <button type="button" onClick={onMore} className={cn(tabClass, "text-muted-foreground hover:text-foreground")}>
            <Menu aria-hidden="true" className="size-5" />
            More
          </button>
        </div>
      </nav>

      <Dialog.Root open={creating} onOpenChange={setCreating}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
          <Dialog.Popup className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-card pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-xl transition-transform duration-200 ease-out data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full">
            <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-4 py-3">
              <Dialog.Title className="text-base font-semibold text-foreground">What would you like to make?</Dialog.Title>
              <Dialog.Close aria-label="Close" className="grid size-11 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground">
                <X aria-hidden="true" className="size-5" />
              </Dialog.Close>
            </div>
            <ul className="divide-y divide-border px-2">
              {CHOICES.map((choice) => (
                <li key={choice.to}>
                  <Link
                    to={choice.to}
                    onClick={() => setCreating(false)}
                    className="flex min-h-16 items-center gap-3 rounded-lg px-2 py-2.5 outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-foreground">
                      <choice.icon aria-hidden="true" className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">{choice.label}</span>
                      <span className="block text-xs text-pretty text-muted-foreground">{choice.hint}</span>
                    </span>
                    <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
