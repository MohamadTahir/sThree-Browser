import { useEffect, useState } from "react";
import { Connection, createFolder, describeS3Error } from "@/services/s3Service";
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

export default function NewFolderDialog({
  open,
  connection,
  prefix,
  onClose,
  onCreated,
}: {
  open: boolean;
  connection: Connection;
  prefix: string;
  onClose: () => void;
  onCreated: (prefix: string) => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const clean = name.trim().replace(/^\/+|\/+$/g, "");
    if (!clean) return setError("Enter a folder name.");
    if (clean.split("/").some((part) => part === "" || part === "." || part === "..")) {
      return setError("Folder names can't be empty, “.” or “..”.");
    }
    setBusy(true);
    try {
      const full = `${prefix}${clean}/`;
      await createFolder(connection, full);
      onCreated(full);
      onClose();
    } catch (err) {
      setError(describeS3Error(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
            <DialogDescription>
              Creates <span className="font-mono text-xs">{prefix || "/"}</span>… as an empty
              folder marker.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Input
              label="Folder name"
              placeholder="reports"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              error={error ?? undefined}
              autoFocus
              spellCheck={false}
              className="font-mono"
            />
          </DialogBody>
          <DialogFooter>
            <Button onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={busy}>
              Create folder
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
