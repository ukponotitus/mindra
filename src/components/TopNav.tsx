import { Menu } from "@base-ui/react/menu";
import { CreditCard, LogOut, PanelLeft, Settings } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { fullName, useAuth } from "../auth/context";
import { cn } from "../lib/cn";
import { initials } from "../lib/format";

interface Props {
  title: string;
  /** Shows or hides the navigation: a collapsing column on large screens, a drawer on small ones. */
  onToggleNavigation: () => void;
  navigationLabel: string;
}

const itemClass =
  "flex w-full cursor-default items-center gap-2 px-3 py-2 text-sm text-foreground outline-none select-none data-[highlighted]:bg-secondary";

export default function TopNav({ title, onToggleNavigation, navigationLabel }: Props) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const name = user ? fullName(user) : "";

  const logOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-white px-4 sm:px-6">
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

      {user && (
        <Menu.Root>
          <Menu.Trigger
            aria-label="Account menu"
            className="grid size-8 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
          >
            {initials(name)}
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner side="bottom" align="end" sideOffset={8} className="z-50">
              <Menu.Popup className="w-60 origin-[var(--transform-origin)] rounded-xl border border-border bg-white py-1.5 shadow-lg outline-none transition-[opacity,scale] duration-150 ease-out data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
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
    </header>
  );
}
