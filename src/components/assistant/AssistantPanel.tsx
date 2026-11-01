import { Menu } from "@base-ui/react/menu";
import { History, Maximize2, Plus, X } from "lucide-react";
import { Link } from "react-router";
import { useActiveThread, useThreads } from "../../lib/assistant";
import { cn } from "../../lib/cn";
import { formatDate } from "../../lib/format";
import AssistantChat from "./AssistantChat";

const iconButton =
  "grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const itemClass =
  "flex w-full cursor-default flex-col items-start px-3 py-2 text-left text-sm text-foreground outline-none select-none data-[highlighted]:bg-secondary";

/** The assistant beside any page: the open conversation, earlier ones, a new one, and the full page. */
export default function AssistantPanel({ onClose }: { onClose: () => void }) {
  const { threadId, choose, title } = useActiveThread();
  const threads = useThreads();

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex h-14 shrink-0 items-center gap-1 border-b border-border bg-card px-3">
        <h2 className="min-w-0 flex-1 truncate px-1 text-sm font-semibold text-foreground">{threadId && title ? title : "Assistant"}</h2>
        <button type="button" onClick={() => choose(null)} aria-label="New conversation" title="New conversation" className={iconButton}>
          <Plus aria-hidden="true" className="size-4" />
        </button>
        <Menu.Root>
          <Menu.Trigger aria-label="Earlier conversations" title="Earlier conversations" className={iconButton}>
            <History aria-hidden="true" className="size-4" />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner side="bottom" align="end" sideOffset={6} className="z-50">
              <Menu.Popup className="max-h-96 w-72 overflow-y-auto rounded-xl border border-border bg-card py-1.5 shadow-lg outline-none">
                {threads.data?.length ? (
                  threads.data.map((thread) => (
                    <Menu.Item key={thread.id} onClick={() => choose(thread.id)} className={cn(itemClass, thread.id === threadId && "bg-primary/5")}>
                      <span className="w-full truncate font-medium">{thread.title || "New conversation"}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(thread.updated_at)}</span>
                    </Menu.Item>
                  ))
                ) : (
                  <p className="px-3 py-2 text-sm text-muted-foreground">No earlier conversations.</p>
                )}
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
        <Link to={threadId ? `/assistant?thread=${threadId}` : "/assistant"} onClick={onClose} aria-label="Open the full page" title="Open the full page" className={iconButton}>
          <Maximize2 aria-hidden="true" className="size-4" />
        </Link>
        <button type="button" onClick={onClose} aria-label="Close the assistant" title="Close" className={iconButton}>
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
      <AssistantChat threadId={threadId} onThreadCreated={choose} />
    </div>
  );
}
