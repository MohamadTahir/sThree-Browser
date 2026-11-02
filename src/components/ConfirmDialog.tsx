import { useEffect, useState } from "react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { errorMessage } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  /** When set, the user must type this word before confirming. */
  typeToConfirm?: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

/** Confirmation for destructive actions. Errors stay in the dialog so the user can retry. */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  typeToConfirm,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (open) {
      setBusy(false);
      setError(null);
      setTyped("");
    }
  }, [open]);

  const handleConfirm = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const blocked = typeToConfirm !== undefined && typed !== typeToConfirm;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent role="alertdialog">
        <form onSubmit={handleConfirm}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription asChild>
              <div>{description}</div>
            </DialogDescription>
          </DialogHeader>
          {(typeToConfirm || error) && (
            <DialogBody>
              {typeToConfirm && (
                <Input
                  label={`Type ${typeToConfirm} to confirm`}
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  autoFocus
                />
              )}
              {error && (
                <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">
                  {error}
                </p>
              )}
            </DialogBody>
          )}
          <DialogFooter>
            <Button onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" loading={busy} disabled={blocked}>
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
