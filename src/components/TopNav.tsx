import { Menu } from "@base-ui/react/menu";
import { ChevronDown, CreditCard, LogOut, MessagesSquare, PanelLeft, Settings } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { fullName, useAuth } from "../auth/context";
import { cn } from "../lib/cn";
import { initials } from "../lib/format";
import ThemeMenuItems from "./ThemeMenuItems";

interface Props {
  title: string;
  /** Shows or hides the navigation: a collapsing column on large screens, a drawer on small ones. */
  onToggleNavigation: () => void;
  navigationLabel: string;
  assistantOpen?: boolean;
  /** Opens or closes the assistant beside the page; left out where the page is the assistant. */
  onToggleAssistant?: () => void;
}

const itemClass =
  "flex w-full cursor-default items-center gap-2 px-3 py-2 text-sm text-foreground outline-none select-none data-[highlighted]:bg-secondary";

export default function TopNav({ title, onToggleNavigation, navigationLabel, assistantOpen, onToggleAssistant }: Props) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const name = user ? fullName(user) : "";

  const logOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onToggleNavigation}
          aria-label={navigationLabel}
          className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <PanelLeft aria-hidden="true" className="size-[18px]" />
        </button>
        <h1 className="truncate text-sm font-semibold text-foreground">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
      {onToggleAssistant && (
        <button
          type="button"
          onClick={onToggleAssistant}
          aria-expanded={assistantOpen}
          aria-label={assistantOpen ? "Close the assistant" : "Open the assistant"}
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm font-medium transition-colors sm:px-3",
            assistantOpen ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
          )}
        >
          <MessagesSquare aria-hidden="true" className="size-[18px]" />
          <span className="hidden sm:inline">Assistant</span>
        </button>
      )}
      {user && (
        <Menu.Root>
          {/* The arrow says it opens a menu. */}
          <Menu.Trigger
            aria-label="Account menu"
            className="group flex items-center gap-1 rounded-full p-0.5 pr-1.5 transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary data-[popup-open]:bg-secondary"
          >
            <span className="grid size-8 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{initials(name)}</span>
            <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground transition-transform duration-150 group-data-[popup-open]:rotate-180" />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner side="bottom" align="end" sideOffset={8} className="z-50">
              <Menu.Popup className="w-60 origin-[var(--transform-origin)] rounded-xl border border-border bg-card py-1.5 shadow-lg outline-none transition-[opacity,scale] duration-150 ease-out data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
                <div className="border-b border-border px-3 pt-1 pb-2.5">
                  <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
                <div className="pt-1.5">
                  <Menu.LinkItem render={<Link to="/billing" />} className={itemClass}>
                    <CreditCard aria-hidden="true" className="size-4 text-muted-foreground" />
                    Billing
                  </Menu.LinkItem>
                  <Menu.LinkItem render={<Link to="/settings" />} className={itemClass}>
                    <Settings aria-hidden="true" className="size-4 text-muted-foreground" />
                    Settings
                  </Menu.LinkItem>
                  <Menu.Separator className="my-1.5 h-px bg-border" />
                  <ThemeMenuItems itemClass={itemClass} />
                  <Menu.Separator className="my-1.5 h-px bg-border" />
                  <Menu.Item onClick={logOut} className={cn(itemClass, "text-red-600 data-[highlighted]:bg-red-50")}>
                    <LogOut aria-hidden="true" className="size-4" />
                    Log out
                  </Menu.Item>
                </div>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      )}
      </div>
    </header>
  );
}
