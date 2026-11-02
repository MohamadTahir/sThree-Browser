import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import prettyBytes from "pretty-bytes";
import {
  Connection,
  deleteKeys,
  describeS3Error,
  listPrefixContents,
  PrefixContents,
} from "@/services/s3Service";
import { baseName } from "@/lib/utils";
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

/**
 * Deletes a folder and everything under it. The user sees how many objects
 * and bytes will go, and types the folder name before anything is removed.
 */
export default function DeleteFolderDialog({
  connection,
  prefix,
  onClose,
  onDeleted,
}: {
  connection: Connection;
  /** Folder to delete, or null when closed. */
  prefix: string | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [contents, setContents] = useState<PrefixContents | null>(null);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState<number | null>(null);

  const name = prefix ? baseName(prefix) : "";
  const busy = deleted !== null;

  useEffect(() => {
    if (!prefix) return;
    setContents(null);
    setTyped("");
    setError(null);
    setDeleted(null);
    const controller = new AbortController();
    listPrefixContents(connection, prefix, controller.signal)
      .then((result) => !controller.signal.aborted && setContents(result))
      .catch((err) => !controller.signal.aborted && setError(describeS3Error(err)));
    return () => controller.abort();
  }, [connection, prefix]);

  const handleDelete = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!contents || typed !== name) return;
    setError(null);
    setDeleted(0);
    try {
      await deleteKeys(connection, contents.keys, setDeleted);
      onDeleted();
      onClose();
    } catch (err) {
      setError(describeS3Error(err));
      setDeleted(null);
      // Some objects may already be gone; refresh so the listing stays honest.
      onDeleted();
    }
  };

  const count = contents?.keys.length ?? 0;

  return (
    <Dialog open={prefix !== null} onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent role="alertdialog">
        <form onSubmit={handleDelete}>
          <DialogHeader>
            <DialogTitle>Delete folder?</DialogTitle>
            <DialogDescription asChild>
              <div>
                {contents ? (
                  <>
                    <span className="break-all font-medium text-foreground">{prefix}</span> and{" "}
                    {count === 1 ? "the 1 object" : `all ${count.toLocaleString()} objects`} in it
                    ({prettyBytes(contents.totalBytes)}) will be permanently deleted, unless the
                    bucket has versioning enabled.
                  </>
                ) : error ? (
                  "Couldn't read the folder's contents."
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" /> Counting objects in{" "}
                    <span className="break-all font-medium text-foreground">{prefix}</span>…
                  </span>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {contents && (
              <Input
                label={`Type ${name} to confirm`}
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
              disabled={!contents || typed !== name}
            >
              Delete folder
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
