import { Component, type ErrorInfo, type ReactNode } from "react";
import { RotateCw } from "lucide-react";
import { buttonStyles } from "./ui/button";
import { cn } from "../lib/cn";
import { isStaleBuild, reloadOnce } from "../lib/reload";

// A page that fails while it's shown says so, with Reload, instead of leaving a blank screen; one whose code couldn't
// be loaded (a new version came out while it was open) reloads by itself once. Opening another page starts again.

type Props = { resetKey: string; fullPage?: boolean; children: ReactNode };
type State = { error: Error | null; key: string };

export default class PageErrorBoundary extends Component<Props, State> {
  state: State = { error: null, key: this.props.resetKey };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null;
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (isStaleBuild(error) && reloadOnce()) return;
    console.error("A page failed to show.", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const stale = isStaleBuild(error);
    return (
      <div className={cn("grid place-items-center", this.props.fullPage ? "min-h-dvh bg-background p-4" : "py-16")}>
        <div role="alert" className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center">
          <h2 className="text-lg font-semibold text-balance text-foreground">{stale ? "Mindra was updated" : "This page didn't load"}</h2>
          <p className="mt-2 text-sm text-pretty text-muted-foreground">
            {stale
              ? "A new version came out while this page was open. Reload to get it."
              : "Something went wrong showing this page. Reloading usually fixes it. If it doesn't, tell us with the feedback form on Home."}
          </p>
          <button type="button" onClick={() => window.location.reload()} className={buttonStyles({ className: "mt-5" })}>
            <RotateCw aria-hidden="true" className="size-4" />
            Reload
          </button>
        </div>
      </div>
    );
  }
}
