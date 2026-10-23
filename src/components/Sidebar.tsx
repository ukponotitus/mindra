import {
  AudioLines,
  CalendarDays,
  Clapperboard,
  ClipboardList,
  CreditCard,
  FolderOpen,
  LayoutDashboard,
  Library,
  PenLine,
  Plus,
  RectangleVertical,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { Link, NavLink } from "react-router";
import { fullName, useAuth } from "../auth/context";
import { cn } from "../lib/cn";
import { initials } from "../lib/format";
import BrandMark from "./BrandMark";
import { buttonStyles } from "./ui/button";

interface Props {
  /** Called after a link is followed, so the mobile drawer can close. */
  onNavigate?: () => void;
}

const navItems: { label: string; to: string; icon: LucideIcon; soon?: boolean }[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", to: "/projects", icon: FolderOpen },
  { label: "Content Library", to: "/library", icon: Library },
  { label: "Clips", to: "/clips", icon: Clapperboard },
  { label: "Vertical Videos", to: "/vertical", icon: RectangleVertical },
  { label: "AI Studio", to: "/ai-studio", icon: PenLine },
  { label: "Calendar", to: "/calendar", icon: CalendarDays },
  { label: "Content Plans", to: "/plans", icon: ClipboardList },
  { label: "Brand Voice", to: "/brand-voice", icon: AudioLines },
  { label: "Billing", to: "/billing", icon: CreditCard, soon: true },
  { label: "Settings", to: "/settings", icon: Settings },
];

/** The app's navigation. DashboardShell shows it as a column on large screens and in a drawer on small ones. */
export default function Sidebar({ onNavigate }: Props) {
  const { user } = useAuth();
  const name = user ? fullName(user) : "";
  const workspace = user?.workspaces[0];

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
        {navItems.map(({ label, to, icon: Icon, soon }) => (
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
          <div className="mt-3 flex items-center gap-2 px-1">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {initials(name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-foreground">{name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
