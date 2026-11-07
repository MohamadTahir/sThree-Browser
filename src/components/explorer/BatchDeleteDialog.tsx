import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import prettyBytes from "pretty-bytes";
import {
  Connection,
  deleteKeys,
  describeS3Error,
  listPrefixContents,
} from "@/services/s3Service";
import { S3Object } from "@/models/types";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

const CONFIRM_WORD = "delete";

interface Plan {
  keys: string[];
  totalBytes: number;
}

/**
 * Deletes several selected objects and folders at once. Folders are expanded
 * to every object under them first, so the user sees the real count and size.
 * When folders are included the user types "delete" to confirm, as deleting a
 * single folder already asks them to type its name.
 */
export default function BatchDeleteDialog({
  connection,
  items,
  onClose,
  onDeleted,
}: {
  connection: Connection;
  /** Items to delete, or null when closed. */
  items: S3Object[] | null;
  onClose: () => void;
  /** Called after a delete attempt; `complete` is false when some objects remain. */
  onDeleted: (complete: boolean) => void;
}) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState<number | null>(null);

  // While the dialog animates closed `items` is already null; keep showing
  // what it was opened with so the text doesn't flash to "0 items".
  const lastItems = useRef<S3Object[]>([]);
  if (items) lastItems.current = items;
  const shown = items ?? lastItems.current;

  const busy = deleted !== null;
  const folders = shown.filter((o) => o.isFolder);
  const files = shown.filter((o) => !o.isFolder);
  const needsTyping = folders.length > 0;

  useEffect(() => {
    if (!items) return;
    setPlan(null);
    setTyped("");
    setError(null);
    setDeleted(null);
    const fileKeys = items.filter((o) => !o.isFolder);
    const folderKeys = items.filter((o) => o.isFolder).map((o) => o.key);
    const controller = new AbortController();
    Promise.all(folderKeys.map((p) => listPrefixContents(connection, p, controller.signal)))
      .then((contents) => {
        if (controller.signal.aborted) return;
        const keys = new Set(fileKeys.map((o) => o.key));
        let totalBytes = fileKeys.reduce((sum, o) => sum + o.size, 0);
        for (const c of contents) {
          for (const key of c.keys) keys.add(key);
          totalBytes += c.totalBytes;
        }
        setPlan({ keys: [...keys], totalBytes });
      })
      .catch((err) => !controller.signal.aborted && setError(describeS3Error(err)));
    return () => controller.abort();
  }, [connection, items]);

  const handleDelete = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!plan || (needsTyping && typed !== CONFIRM_WORD)) return;
    setError(null);
    setDeleted(0);
    let reached = 0;
    try {
      await deleteKeys(connection, plan.keys, (n) => {
        reached = n;
        setDeleted(n);
      });
      onDeleted(true);
      onClose();
    } catch (err) {
      setError(
        reached > 0
          ? `Deleted ${reached.toLocaleString()} of ${plan.keys.length.toLocaleString()} objects, then stopped. ${describeS3Error(err)}`
          : describeS3Error(err),
      );
      setDeleted(null);
      // Some objects may already be gone; refresh so the listing stays honest.
      onDeleted(false);
    }
  };

  const count = plan?.keys.length ?? 0;
  const selection = [
    files.length > 0 && `${files.length.toLocaleString()} ${files.length === 1 ? "file" : "files"}`,
    folders.length > 0 &&
      `${folders.length.toLocaleString()} ${folders.length === 1 ? "folder" : "folders"}`,
  ]
    .filter(Boolean)
    .join(" and ");

  return (
    <Dialog open={items !== null} onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent role="alertdialog">
        <form onSubmit={handleDelete}>
          <DialogHeader>
            <DialogTitle>
              Delete {shown.length.toLocaleString()} {shown.length === 1 ? "item" : "items"}?
            </DialogTitle>
            <DialogDescription asChild>
              <div>
                {plan ? (
                  <>
                    The selected {selection}
                    {folders.length > 0 && (
                      <>
                        {" "}
                        ({count.toLocaleString()} {count === 1 ? "object" : "objects"} in all)
                      </>
                    )}
                    , {prettyBytes(plan.totalBytes)}, will be permanently deleted, unless the bucket
                    has versioning enabled.
                  </>
                ) : error ? (
                  folders.length === 1
                    ? "Couldn't read the selected folder's contents."
                    : "Couldn't read the selected folders' contents."
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" /> Counting objects in the selected{" "}
                    {folders.length === 1 ? "folder" : "folders"}…
                  </span>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {shown.length > 0 && (
              <ul className="max-h-36 overflow-auto rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
                {shown.map((o) => (
                  <li key={o.key} className="truncate" title={o.key}>
                    {o.key}
                  </li>
                ))}
              </ul>
            )}
            {plan && needsTyping && (
              <Input
                label={`Type ${CONFIRM_WORD} to confirm`}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                autoFocus
                disabled={busy}
                className="font-mono"
              />
            )}
            {busy && count > 0 && (
              <div aria-live="polite">
                <div className="mb-1.5 flex justify-between text-xs text-muted-foreground tabular">
                  <span>Deleting…</span>
                  <span>
                    {deleted!.toLocaleString()} of {count.toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-danger-solid transition-[width] duration-200"
                    style={{ width: `${Math.max(3, (deleted! / count) * 100)}%` }}
                  />
                </div>
              </div>
            )}
            {error && (
              <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}
          </DialogBody>
          <DialogFooter>
            <Button onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              loading={busy}
              disabled={!plan || (needsTyping && typed !== CONFIRM_WORD)}
            >
              Delete {shown.length.toLocaleString()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
