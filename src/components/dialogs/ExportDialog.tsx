import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useConfig } from "@/context/config";
import { createExport, exportFileName } from "@/services/configTransfer";
import { MIN_PASSWORD_LENGTH, validateNewPassword } from "@/services/vault";
import { saveTextFile } from "@/lib/tauri";
import { errorMessage } from "@/lib/utils";
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
import { Checkbox } from "../ui/checkbox";
import { PasswordInput } from "../ui/password-input";

export default function ExportDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { configs } = useConfig();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [includeCredentials, setIncludeCredentials] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setPassword("");
      setConfirm("");
      setIncludeCredentials(true);
      setError(null);
    }
  }, [open]);

  const connections = Object.keys(configs.buckets).length;
  const credentials = Object.keys(configs.credentials).length;
  const groups = Object.keys(configs.groups).length;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const problem = validateNewPassword(password);
    if (problem) return setError(problem);
    if (password !== confirm) return setError("The passwords don't match.");

    setSaving(true);
    setError(null);
    try {
      const contents = await createExport(configs, password, includeCredentials);
      if (!(await saveTextFile(exportFileName(), contents))) return;
      toast.success("Settings exported");
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>Export settings</DialogTitle>
            <DialogDescription>
              Saves {connections} {connections === 1 ? "connection" : "connections"} and{" "}
              {groups} {groups === 1 ? "group" : "groups"} to an encrypted file. Choose a
              password for the file; you&apos;ll need it to import.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Checkbox
              checked={includeCredentials}
              onCheckedChange={setIncludeCredentials}
              label={`Include credentials (${credentials})`}
              description="Access and secret keys. Leave out to share connection settings without keys."
              disabled={saving}
            />
            <PasswordInput
              label="File password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              hint={`At least ${MIN_PASSWORD_LENGTH} characters. It can differ from your master password.`}
              autoFocus
            />
            <PasswordInput
              label="Confirm file password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
            {error && (
              <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}
          </DialogBody>
          <DialogFooter>
            <Button onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              Export
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
