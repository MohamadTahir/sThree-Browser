import { useEffect, useState } from "react";
import { Check, Copy, TriangleAlert } from "lucide-react";
import { Connection, describeS3Error, getPresignedUrl, MAX_PRESIGN_SECONDS } from "@/services/s3Service";
import { baseName, cn, formatDate } from "@/lib/utils";
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
import { controlClass } from "../ui/input";

const PRESETS = [
  { label: "15 minutes", seconds: 15 * 60 },
  { label: "1 hour", seconds: 60 * 60 },
  { label: "1 day", seconds: 24 * 60 * 60 },
  { label: "7 days", seconds: MAX_PRESIGN_SECONDS },
];

export default function ShareDialog({
  open,
  connection,
  objectKey,
  onClose,
}: {
  open: boolean;
  connection: Connection;
  objectKey: string;
  onClose: () => void;
}) {
  const [seconds, setSeconds] = useState(PRESETS[1].seconds);
  const [link, setLink] = useState<{ url: string; expires: Date } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setSeconds(PRESETS[1].seconds);
      setLink(null);
      setError(null);
      setCopied(false);
    }
  }, [open, objectKey]);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const url = await getPresignedUrl(connection, objectKey, seconds);
      setLink({ url, expires: new Date(Date.now() + seconds * 1000) });
      setCopied(false);
    } catch (err) {
      setError(describeS3Error(err));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy to the clipboard. Select the link and copy it manually.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share link</DialogTitle>
          <DialogDescription>
            Create a temporary download link for{" "}
            <span className="break-all font-medium text-foreground">{baseName(objectKey)}</span>.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Link expires after</legend>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4" role="radiogroup">
              {PRESETS.map((preset) => (
                <button
                  key={preset.seconds}
                  type="button"
                  role="radio"
                  aria-checked={seconds === preset.seconds}
                  onClick={() => {
                    setSeconds(preset.seconds);
                    setLink(null);
                  }}
                  className={cn(
                    "h-8 rounded-md border text-sm transition-colors",
                    seconds === preset.seconds
                      ? "border-primary bg-primary-subtle font-medium text-primary-text"
                      : "border-border-strong hover:bg-muted",
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </fieldset>

          {link && (
            <div className="grid gap-1.5">
              <div className="flex gap-1.5">
                <input
                  readOnly
                  value={link.url}
                  onFocus={(e) => e.currentTarget.select()}
                  className={cn(controlClass, "font-mono text-xs")}
                  aria-label="Share link"
                />
                <Button onClick={copy} className="w-24">
                  {copied ? <Check /> : <Copy />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground tabular">
                Valid until {formatDate(link.expires.toISOString())}
              </p>
            </div>
          )}

          <p className="flex items-start gap-2 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">
            <TriangleAlert className="mt-px size-3.5 shrink-0 text-warning" />
            Anyone with the link can download this file until it expires. A link can&apos;t
            be revoked early except by disabling the access key that signed it.
          </p>

          {error && (
            <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}
        </DialogBody>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
          <Button variant="primary" onClick={create} loading={busy}>
            {link ? "Create new link" : "Create link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
