import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useConfig } from "@/context/config";
import { MIN_PASSWORD_LENGTH, validateNewPassword } from "@/services/vault";
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
import { PasswordInput } from "../ui/password-input";

export default function ChangePasswordDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { changePassword } = useConfig();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setCurrent("");
      setNext("");
      setConfirm("");
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const problem = validateNewPassword(next);
    if (problem) return setError(problem);
    if (next !== confirm) return setError("The new passwords don't match.");

    setSaving(true);
    setError(null);
    try {
      if (!(await changePassword(current, next))) {
        setError("The current password is wrong.");
        return;
      }
      toast.success("Master password changed");
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
            <DialogTitle>Change master password</DialogTitle>
            <DialogDescription>
              Your vault is re-encrypted with a key derived from the new password.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <PasswordInput
              label="Current password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              autoFocus
            />
            <PasswordInput
              label="New password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
            />
            <PasswordInput
              label="Confirm new password"
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
              Change password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
