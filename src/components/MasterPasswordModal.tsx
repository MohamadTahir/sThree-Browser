import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  setMasterPassword,
  verifyMasterPassword,
  hasMasterPassword,
  clearAllData,
} from "../services/encryptionService";
import { toast } from "react-toastify";

interface MasterPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnlocked: () => void;
  mode?: "setup" | "unlock";
}

export default function MasterPasswordModal({
  open,
  onOpenChange,
  onUnlocked,
  mode: initialMode,
}: MasterPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"setup" | "unlock">(initialMode || "unlock");

  useEffect(() => {
    if (open) {
      // Check if master password is already set
      const hasPassword = hasMasterPassword();
      setMode(hasPassword ? "unlock" : "setup");
      setPassword("");
      setConfirmPassword("");
      setError(null);
    }
  }, [open]);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (!/[A-Z]/.test(pwd)) {
      return "Password must contain at least one capital letter";
    }
    if (!/[a-z]/.test(pwd)) {
      return "Password must contain at least one small letter";
    }
    if (!/[0-9]/.test(pwd)) {
      return "Password must contain at least one number";
    }
    if (!/[^A-Za-z0-9]/.test(pwd)) {
      return "Password must contain at least one special character";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "setup") {
        // Setup mode: create new master password
        const passwordError = validatePassword(password);
        if (passwordError) {
          setError(passwordError);
          setLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          setError("Passwords do not match");
          setLoading(false);
          return;
        }

        await setMasterPassword(password);
        onUnlocked();
        onOpenChange(false);
      } else {
        // Unlock mode: verify existing password
        const isValid = await verifyMasterPassword(password);
        if (!isValid) {
          setError("Incorrect password");
          setLoading(false);
          return;
        }

        await setMasterPassword(password); // Store in memory
        onUnlocked();
        onOpenChange(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleForgetPassword = async () => {
    try {
      await clearAllData();
      // Reload the page to reset everything
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to clear data",
      );
    }
  };

  // Prevent closing the dialog when setting up or unlocking password
  const handleOpenChange = (newOpen: boolean) => {
    // Don't allow closing - this is a required step
    // The dialog can only be closed programmatically after successful unlock
    if (!newOpen) {
      return;
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[425px] [&>button]:hidden"
        onInteractOutside={(e) => {
          // Prevent closing by clicking outside
          e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          // Prevent closing by pressing ESC
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {mode === "setup" ? "Set Master Password" : "Unlock Credentials"}
          </DialogTitle>
          <DialogDescription>
            {mode === "setup"
              ? "Create a master password to encrypt your bucket credentials. Password must contain at least 8 characters, including uppercase, lowercase, number, and special character."
              : "Enter your master password to decrypt and access your bucket credentials."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="password">Master Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter master password"
                autoFocus
                required
              />
              {mode === "setup" && (
                <p className="text-xs text-muted-foreground">
                  Password must contain at least 8 characters, including
                  uppercase, lowercase, number, and special character.
                </p>
              )}
            </div>
            {mode === "setup" && (
              <div className="grid gap-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm master password"
                  required
                />
              </div>
            )}
            {error && <div className="text-sm text-destructive">{error}</div>}
          </div>
          <DialogFooter className="gap-2">
            {mode === "unlock" && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleForgetPassword}
              >
                Forget Password
              </Button>
            )}
            <Button type="submit" disabled={loading}>
              {loading
                ? "Processing..."
                : mode === "setup"
                  ? "Set Password"
                  : "Unlock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
