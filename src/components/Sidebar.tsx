import {
  AudioLines,
  CalendarDays,
  ChartColumn,
  ChevronsUpDown,
  Clapperboard,
  ClipboardList,
  CreditCard,
  Film,
  FolderOpen,
  LayoutDashboard,
  Library,
  LogOut,
  PenLine,
  Plus,
  RectangleVertical,
  Settings,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { Menu } from "@base-ui/react/menu";
import { Link, NavLink, useLocation, useNavigate } from "react-router";
import { fullName, useAuth } from "../auth/context";
import { useAutomationsEnabled, useAutomationSummary } from "../lib/automations";
import { cn } from "../lib/cn";
import { initials } from "../lib/format";
import BrandMark from "./BrandMark";
import { buttonStyles } from "./ui/button";

interface Props {
  /** Called after a link is followed, so the mobile drawer can close. */
  onNavigate?: () => void;
}

const navItems: { label: string; to: string; icon: LucideIcon; soon?: boolean; automations?: boolean }[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", to: "/projects", icon: FolderOpen },
  { label: "Content Library", to: "/library", icon: Library },
  { label: "Clips", to: "/clips", icon: Clapperboard },
  { label: "Vertical Videos", to: "/vertical", icon: RectangleVertical },
  { label: "Motion Studio", to: "/studio", icon: Film },
  { label: "AI Studio", to: "/ai-studio", icon: PenLine },
  { label: "Calendar", to: "/calendar", icon: CalendarDays },
  { label: "Analytics", to: "/analytics", icon: ChartColumn },
  { label: "Content Plans", to: "/plans", icon: ClipboardList },
  // Only for workspaces that have Automations while they're being built.
  { label: "Automations", to: "/automations", icon: Workflow, automations: true },
  { label: "Brand Voice", to: "/brand-voice", icon: AudioLines },
];

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
  const { pathname } = useLocation();
  const name = user ? fullName(user) : "";
  const workspace = user?.workspaces[0];
  // On Billing or Settings, the account menu's button shows it, as a link would.
  const inAccount = accountItems.some((item) => pathname.startsWith(item.to));
  const automations = useAutomationsEnabled();
  // How many scripts and videos wait for approval, shown on Automations.
  const waiting = useAutomationSummary(automations).data?.waiting ?? 0;

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
        {navItems.filter((item) => !item.automations || automations).map(({ label, to, icon: Icon, soon, automations: counted }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )
            }
          >
            <Icon aria-hidden="true" className="size-4" />
            {label}
            {soon && <span className="ml-auto rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">Soon</span>}
            {counted && waiting > 0 && (
              <span className="ml-auto rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900 tabular-nums">
                {waiting}
                <span className="sr-only"> waiting for approval</span>
              </span>
            )}
          </NavLink>
        ))}
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
                <Menu.Popup className="w-[var(--anchor-width)] min-w-52 origin-[var(--transform-origin)] rounded-xl border border-border bg-white py-1.5 shadow-lg outline-none transition-[opacity,scale] duration-150 ease-out data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
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
