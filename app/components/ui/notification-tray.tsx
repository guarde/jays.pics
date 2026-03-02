import { useFetcher } from "@remix-run/react";
import { Bell, X } from "lucide-react";

import { cn } from "~/lib/utils";

interface Notification {
  id: string;
  content: string;
  created_at: string;
}

export function NotificationTray({
  notifications,
  onRemove,
  className,
}: Readonly<{
  notifications: Notification[];
  onRemove?: (id: string) => void;
  className?: string;
}>) {
  const fetcher = useFetcher();

  const markSeen = (id: string) => {
    fetcher.submit(null, {
      method: "post",
      action: `/api/notification/${id}/seen`,
    });
    onRemove?.(id);
  };

  return (
    <div
      className={cn(
        "w-80 rounded-lg border border-border bg-background shadow-xl overflow-hidden",
        className,
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Bell className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Notifications
          </span>
        </div>
        {notifications.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {notifications.length}
          </span>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center px-4">
          <Bell className="h-8 w-8 text-muted-foreground/20 mb-2" />
          <p className="text-sm text-muted-foreground">All caught up</p>
          <p className="text-xs text-muted-foreground/60 mt-0.5">
            No new notifications
          </p>
        </div>
      ) : (
        <ul className="max-h-72 overflow-y-auto divide-y divide-border">
          {notifications.map((n) => (
            <li
              key={n.id}
              className="flex items-start gap-3 px-4 py-3 hover:bg-accent/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-snug">{n.content}</p>
              </div>
              <button
                aria-label="Dismiss notification"
                className="shrink-0 p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors mt-0.5"
                onClick={() => markSeen(n.id)}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
