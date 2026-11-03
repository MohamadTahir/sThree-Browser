import { CheckCircle2, CircleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

export interface UploadItem {
  id: string;
  name: string;
  key: string;
  progress: number;
  status: "uploading" | "done" | "failed" | "cancelled";
  error?: string;
  cancel?: () => void;
}

/** Bottom-left upload tray. Failures stay until dismissed. */
export default function UploadQueue({
  items,
  onDismiss,
}: {
  items: UploadItem[];
  onDismiss: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div
      className="pointer-events-auto absolute bottom-12 left-3 z-20 w-[min(360px,calc(100%-1.5rem))] overflow-hidden rounded-xl border bg-background shadow-popover"
      role="status"
      aria-live="polite"
    >
      <ul className="max-h-64 divide-y overflow-y-auto">
        {items.map((item) => (
          <li key={item.id} className={cn("px-3 py-2.5", item.status === "failed" && "bg-danger-subtle")}>
            <div className="flex items-center gap-2">
              {item.status === "done" && <CheckCircle2 className="size-4 shrink-0 text-success" />}
              {item.status === "failed" && <CircleAlert className="size-4 shrink-0 text-danger" />}
              <span className="min-w-0 flex-1 truncate text-sm font-medium" title={item.key}>
                {item.name}
              </span>
              <span className="text-xs text-muted-foreground tabular">
                {item.status === "uploading"
                  ? `${Math.round(item.progress * 100)}%`
                  : item.status === "done"
                    ? "Uploaded"
                    : item.status === "cancelled"
                      ? "Cancelled"
                      : "Failed"}
              </span>
              {item.status === "uploading" ? (
                <Button
                  variant="quiet"
                  size="icon-sm"
                  className="size-6"
                  onClick={item.cancel}
                  aria-label={`Cancel upload of ${item.name}`}
                >
                  <X className="size-3.5!" />
                </Button>
              ) : (
                <Button
                  variant="quiet"
                  size="icon-sm"
                  className="size-6"
                  onClick={() => onDismiss(item.id)}
                  aria-label="Dismiss"
                >
                  <X className="size-3.5!" />
                </Button>
              )}
            </div>
            {item.status === "uploading" && (
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-200"
                  style={{ width: `${Math.max(2, item.progress * 100)}%` }}
                />
              </div>
            )}
            {item.status === "failed" && item.error && (
              <p className="mt-1 text-xs text-danger">{item.error}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
