import { useEffect, useState } from "react";
import {
  AudioLines,
  CalendarDays,
  CalendarRange,
  ChartColumn,
  ChevronDown,
  ChevronsUpDown,
  Clapperboard,
  Clock,
  ClipboardList,
  CreditCard,
  Eye,
  FileText,
  Film,
  FolderOpen,
  House,
  Library,
  Link2,
  LogOut,
  Megaphone,
  MessagesSquare,
  Palette,
  PenLine,
  Plus,
  RectangleVertical,
  Settings,
  ThumbsUp,
  TrendingUp,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { Collapsible } from "@base-ui/react/collapsible";
import { Menu } from "@base-ui/react/menu";
import { Link, useLocation, useNavigate } from "react-router";
import { fullName, useAuth } from "../auth/context";
import { useAutomationsEnabled, useAutomationSummary } from "../lib/automations";
import { cn } from "../lib/cn";
import { initials } from "../lib/format";
import BrandMark from "./BrandMark";
import ThemeMenuItems from "./ThemeMenuItems";
import { buttonStyles } from "./ui/button";

interface Props {
  /** Called after a link is followed, so the mobile drawer can close. */
  onNavigate?: () => void;
}

type Place = { pathname: string; search: string; hash: string };

type NavLeaf = {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Only for workspaces that have Automations while they're being built. */
  automations?: boolean;
  /** When the page counts as open; by default its path or a page under it. */
  current?: (place: Place) => boolean;
};

type NavGroup = { id: string; label: string; icon: LucideIcon; items: NavLeaf[] };

const analyticsTab = (tab: string) => (place: Place) =>
  place.pathname === "/analytics" && (new URLSearchParams(place.search).get("tab") ?? "overview") === tab;

// Grouped like Facebook's Creator dashboard: related pages sit under a heading that opens and closes, in the order of
// the journey (who you are, plan, create, the content itself, what worked).
const nav: (NavLeaf | NavGroup)[] = [
  { label: "Home", to: "/dashboard", icon: House },
  { label: "Assistant", to: "/assistant", icon: MessagesSquare },
  {
    id: "brand",
    label: "Brand",
    icon: Palette,
    items: [
      { label: "Brand profile", to: "/brand", icon: AudioLines },
      {
        label: "Connected accounts",
        to: "/settings#accounts",
        icon: Link2,
        current: (place) => place.pathname === "/settings" && place.hash === "#accounts",
      },
    ],
  },
  {
    id: "plan",
    label: "Plan",
    icon: ClipboardList,
    items: [
      { label: "Campaigns", to: "/campaigns", icon: Megaphone },
      { label: "Content calendar", to: "/content-calendar", icon: CalendarRange },
      { label: "Content Plans", to: "/plans", icon: ClipboardList },
    ],
  },
  {
    id: "create",
    label: "Create",
    icon: PenLine,
    items: [
      { label: "Content studio", to: "/content-studio", icon: PenLine },
      { label: "Projects", to: "/projects", icon: FolderOpen },
      { label: "Clips", to: "/clips", icon: Clapperboard },
      { label: "Vertical Videos", to: "/vertical", icon: RectangleVertical },
      { label: "Motion Studio", to: "/studio", icon: Film },
    ],
  },
  {
    id: "content",
    label: "Content",
    icon: Library,
    items: [
      { label: "Content Library", to: "/library", icon: FileText },
      { label: "Planner", to: "/planner", icon: CalendarDays },
      { label: "Activity log", to: "/activity", icon: Clock },
    ],
  },
  {
    id: "insights",
    label: "Insights",
    icon: ChartColumn,
    items: [
      { label: "Overview", to: "/analytics", icon: Eye, current: analyticsTab("overview") },
      { label: "Content", to: "/analytics?tab=content", icon: FileText, current: analyticsTab("content") },
      { label: "Engagement", to: "/analytics?tab=engagement", icon: ThumbsUp, current: analyticsTab("engagement") },
      { label: "Audience", to: "/analytics?tab=audience", icon: Users, current: analyticsTab("audience") },
      { label: "Trends", to: "/analytics?tab=trends", icon: TrendingUp, current: analyticsTab("trends") },
    ],
  },
  { label: "Automations", to: "/automations", icon: Workflow, automations: true },
];

function isGroup(entry: NavLeaf | NavGroup): entry is NavGroup {
  return "items" in entry;
}

function isCurrent(item: NavLeaf, place: Place) {
  if (item.current) return item.current(place);
  return place.pathname === item.to || place.pathname.startsWith(`${item.to}/`);
}

/** The group holding the open page, if any. */
function groupOf(place: Place) {
  return nav.find((entry): entry is NavGroup => isGroup(entry) && entry.items.some((item) => isCurrent(item, place)))?.id;
}

const OPEN_KEY = "mindra.sidebar.open";

/** The groups the person opened or closed, remembered on this device. */
function savedOpen(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(OPEN_KEY) ?? "{}") as Record<string, boolean>;
  } catch {
    return {};
  }
}

const rowClass = "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors";
const idleClass = "text-muted-foreground hover:bg-secondary hover:text-foreground";
const activeClass = "bg-primary/10 text-primary";

// In the account menu at the bottom, which opens upwards.
const accountItems: { label: string; to: string; icon: LucideIcon }[] = [
  { label: "Billing", to: "/billing", icon: CreditCard },
  { label: "Settings", to: "/settings", icon: Settings },
];

const menuItemClass =
  "flex w-full cursor-default items-center gap-2.5 px-3 py-2 text-sm text-foreground outline-none select-none data-[highlighted]:bg-secondary";

/** The app's navigation. DashboardShell shows it as a column on large screens and in a drawer on small ones. */
export default function Sidebar({ onNavigate }: Props) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname, search, hash } = useLocation();
  const place = { pathname, search, hash };
  const name = user ? fullName(user) : "";
  const workspace = user?.workspaces[0];
  // On Billing or Settings, the account menu's button shows it, as a link would.
  const inAccount = accountItems.some((item) => pathname.startsWith(item.to));
  const automations = useAutomationsEnabled();
  // How many scripts and videos wait for approval, shown on Automations.
  const waiting = useAutomationSummary(automations).data?.waiting ?? 0;
  const [open, setOpen] = useState<Record<string, boolean>>(savedOpen);
  const currentGroup = groupOf(place);

  // Opening a page opens its group, so the current page is always in view.
  useEffect(() => {
    const group = groupOf({ pathname, search, hash });
    if (group) setOpen((state) => (state[group] ? state : { ...state, [group]: true }));
  }, [pathname, search, hash]);

  const toggle = (id: string, next: boolean) =>
    setOpen((state) => {
      const changed = { ...state, [id]: next };
      try {
        localStorage.setItem(OPEN_KEY, JSON.stringify(changed));
      } catch {
        // Not remembered on this device; the groups still open and close.
      }
      return changed;
    });

  const leaf = (item: NavLeaf, nested: boolean) => {
    const here = isCurrent(item, place);
    const Icon = item.icon;
    return (
      <Link
        key={item.to}
        to={item.to}
        onClick={onNavigate}
        aria-current={here ? "page" : undefined}
        className={cn(rowClass, nested && "py-1.5 pl-9", here ? activeClass : idleClass)}
      >
        <Icon aria-hidden="true" className="size-4 shrink-0" />
        <span className="min-w-0 truncate">{item.label}</span>
        {item.automations && waiting > 0 && (
          <span className="ml-auto rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900 tabular-nums">
            {waiting}
            <span className="sr-only"> waiting for approval</span>
          </span>
        )}
      </Link>
    );
  };

  const logOut = async () => {
    onNavigate?.();
    await signOut();
    navigate("/login");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-5 py-4">
        <Link to="/dashboard" onClick={onNavigate} className="flex items-center gap-2.5">
          <BrandMark />
          <span className="font-semibold text-foreground">Mindra</span>
        </Link>
      </div>

      <div className="px-4 pt-4 pb-2">
        <Link to="/projects/new" onClick={onNavigate} className={buttonStyles({ className: "w-full" })}>
          <Plus aria-hidden="true" className="size-4" />
          New Project
        </Link>
      </div>

      <nav aria-label="Main" className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {nav.map((entry) => {
          if (!isGroup(entry)) return entry.automations && !automations ? null : leaf(entry, false);
          const Icon = entry.icon;
          const expanded = Boolean(open[entry.id]);
          const holdsCurrent = currentGroup === entry.id;
          return (
            <Collapsible.Root key={entry.id} open={expanded} onOpenChange={(next) => toggle(entry.id, next)}>
              <Collapsible.Trigger
                className={cn(
                  rowClass,
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  holdsCurrent && !expanded ? "text-primary hover:bg-secondary" : idleClass,
                )}
              >
                <Icon aria-hidden="true" className="size-4 shrink-0" />
                <span className="min-w-0 truncate">{entry.label}</span>
                <ChevronDown
                  aria-hidden="true"
                  className={cn("ml-auto size-4 shrink-0 transition-transform duration-150 ease-out", expanded && "rotate-180")}
                />
              </Collapsible.Trigger>
              <Collapsible.Panel className="space-y-0.5 pt-0.5">{entry.items.map((item) => leaf(item, true))}</Collapsible.Panel>
            </Collapsible.Root>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-border px-4 pt-3 pb-4">
        {workspace && (
          <div className="rounded-lg bg-secondary px-3 py-2">
            <p className="text-xs text-muted-foreground">Workspace</p>
            <p className="mt-0.5 truncate text-xs font-semibold text-foreground">{workspace.name}</p>
          </div>
        )}
        {user && (
          <Menu.Root>
            <Menu.Trigger
              aria-label={`Account: ${name}`}
              className={cn(
                "mt-2 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-primary data-[popup-open]:bg-secondary",
                inAccount && "bg-primary/10 hover:bg-primary/10",
              )}
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {initials(name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-foreground">{name}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{user.email}</span>
              </span>
              <ChevronsUpDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner side="top" align="start" sideOffset={6} className="z-50">
                <Menu.Popup className="w-[var(--anchor-width)] min-w-52 origin-[var(--transform-origin)] rounded-xl border border-border bg-card py-1.5 shadow-lg outline-none transition-[opacity,scale] duration-150 ease-out data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
                  {accountItems.map(({ label, to, icon: Icon }) => (
                    <Menu.LinkItem
                      key={to}
                      render={<Link to={to} />}
                      onClick={onNavigate}
                      className={cn(menuItemClass, pathname.startsWith(to) && "font-medium text-primary")}
                    >
                      <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
                      {label}
                    </Menu.LinkItem>
                  ))}
                  <Menu.Separator className="my-1.5 h-px bg-border" />
                  <ThemeMenuItems itemClass={menuItemClass} />
                  <Menu.Separator className="my-1.5 h-px bg-border" />
                  <Menu.Item onClick={logOut} className={cn(menuItemClass, "text-red-600 data-[highlighted]:bg-red-50")}>
                    <LogOut aria-hidden="true" className="size-4" />
                    Log out
                  </Menu.Item>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        )}
      </div>
    </div>
  );
}
