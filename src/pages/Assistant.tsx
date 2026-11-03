import { Menu } from "@base-ui/react/menu";
import { History, Plus, Trash2 } from "lucide-react";
import { useSearchParams } from "react-router";
import AssistantChat from "../components/assistant/AssistantChat";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { buttonStyles } from "../components/ui/button";
import { useActiveThread, useDeleteThread, useThreads } from "../lib/assistant";
import { cn } from "../lib/cn";
import { formatDate } from "../lib/format";

const iconButton =
  "grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const itemClass =
  "flex w-full cursor-default flex-col items-start px-3 py-2 text-left text-sm text-foreground outline-none select-none data-[highlighted]:bg-secondary";

/** The assistant on its own page, for longer work: every conversation on the left, the open one on the right. On
 * phones the list is a menu in a bar above the conversation, beside New and Delete. */
export default function Assistant() {
  const [params, setParams] = useSearchParams();
  const active = useActiveThread();
  const threads = useThreads();
  const remove = useDeleteThread();
  // The address names the conversation (?thread=), so a link opens it; otherwise the panel's last one.
  const threadId = params.get("thread") ?? active.threadId;

  const open = (id: string | null) => {
    active.choose(id);
    setParams(id ? { thread: id } : {}, { replace: true });
  };
  const current = threads.data?.find((thread) => thread.id === threadId);

  return (
    <div className="-m-4 flex h-[calc(100%+2rem)] min-h-0 sm:-m-6 sm:h-[calc(100%+3rem)] lg:-m-8 lg:h-[calc(100%+4rem)]">
      <aside className="hidden w-72 shrink-0 flex-col border-r border-border bg-card md:flex">
        <div className="p-3">
          <button type="button" onClick={() => open(null)} className={buttonStyles({ variant: "secondary", className: "w-full" })}>
            <Plus aria-hidden="true" className="size-4" />
            New conversation
          </button>
        </div>
        <nav aria-label="Conversations" className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {threads.data?.length === 0 && <p className="px-2 py-1 text-sm text-muted-foreground">Your conversations will be listed here.</p>}
          <ul className="space-y-0.5">
            {threads.data?.map((thread) => (
              <li key={thread.id} className="group relative">
                <button
                  type="button"
                  onClick={() => open(thread.id)}
                  aria-current={thread.id === threadId ? "page" : undefined}
                  className={cn(
                    "w-full rounded-lg px-3 py-2 pr-10 text-left transition-colors",
                    thread.id === threadId ? "bg-primary/10 text-primary" : "text-foreground hover:bg-secondary",
                  )}
                >
                  <span className="block truncate text-sm font-medium">{thread.title || "New conversation"}</span>
                  <span className="block text-xs text-muted-foreground">{formatDate(thread.updated_at)}</span>
                </button>
                <ConfirmDialog
                  trigger={
                    <button
                      type="button"
                      aria-label={`Delete “${thread.title || "New conversation"}”`}
                      className="absolute top-2 right-2 grid size-7 place-items-center rounded-md text-muted-foreground opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-secondary hover:text-red-600 focus-visible:opacity-100"
                    >
                      <Trash2 aria-hidden="true" className="size-3.5" />
                    </button>
                  }
                  title="Delete this conversation?"
                  description="Its messages go. Anything you applied from it stays applied."
                  confirmLabel="Delete"
                  onConfirm={() => remove.mutate(thread.id, { onSuccess: () => thread.id === threadId && open(null) })}
                />
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <section aria-label="Assistant" className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col">
        <div className="flex h-12 shrink-0 items-center gap-1 border-b border-border bg-card px-2 md:hidden">
          <h2 className="min-w-0 flex-1 truncate px-2 text-sm font-semibold text-foreground">{current?.title || "New conversation"}</h2>
          <button type="button" onClick={() => open(null)} aria-label="New conversation" title="New conversation" className={iconButton}>
            <Plus aria-hidden="true" className="size-5" />
          </button>
          <Menu.Root>
            <Menu.Trigger aria-label="Earlier conversations" title="Earlier conversations" className={iconButton}>
              <History aria-hidden="true" className="size-5" />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner side="bottom" align="end" sideOffset={6} className="z-50">
                <Menu.Popup className="max-h-96 w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-border bg-card py-1.5 shadow-lg outline-none">
                  {threads.data?.length ? (
                    threads.data.map((thread) => (
                      <Menu.Item key={thread.id} onClick={() => open(thread.id)} className={cn(itemClass, thread.id === threadId && "bg-primary/5")}>
                        <span className="w-full truncate font-medium">{thread.title || "New conversation"}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(thread.updated_at)}</span>
                      </Menu.Item>
                    ))
                  ) : (
                    <p className="px-3 py-2 text-sm text-muted-foreground">Your conversations will be listed here.</p>
                  )}
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
          {current && (
            <ConfirmDialog
              trigger={
                <button type="button" aria-label="Delete this conversation" title="Delete this conversation" className={cn(iconButton, "hover:text-red-600")}>
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              }
              title="Delete this conversation?"
              description="Its messages go. Anything you applied from it stays applied."
              confirmLabel="Delete"
              onConfirm={() => remove.mutate(current.id, { onSuccess: () => open(null) })}
            />
          )}
        </div>
        <AssistantChat threadId={threadId} onThreadCreated={open} />
      </section>
    </div>
  );
}
