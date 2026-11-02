import { useState } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { useConfig } from "@/context/config";
import { MIN_PASSWORD_LENGTH, validateNewPassword } from "@/services/vault";
import { errorMessage } from "@/lib/utils";
import { Button } from "./ui/button";
import { PasswordInput } from "./ui/password-input";
import ConfirmDialog from "./ConfirmDialog";
import { ThemeToggle } from "./ui/theme-toggle";

/** Full-screen gate: create the vault on first run, unlock it afterwards. */
export default function VaultGate() {
  const { status, setup, unlock, reset } = useConfig();
  const isSetup = status === "setup";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (isSetup) {
      const problem = validateNewPassword(password);
      if (problem) {
        setError(problem);
        return;
      }
      if (password !== confirm) {
        setError("The passwords don't match.");
        return;
      }
    }

    setBusy(true);
    try {
      if (isSetup) {
        await setup(password);
      } else if (!(await unlock(password))) {
        setError("That password didn't unlock the vault.");
        setPassword("");
      }
    } catch (err) {
      setError(errorMessage(err, "Couldn't open the vault."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative flex h-full items-center justify-center overflow-y-auto bg-sidebar p-4">
      <ThemeToggle className="absolute right-4 top-4" />
      <div className="w-full max-w-[380px]">
        <div className="mb-6 flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" className="size-8" />
          <span className="text-lg font-semibold">sThree Browser</span>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border bg-background p-6 shadow-card"
        >
          <div className="mb-5 flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-subtle text-foreground">
              <LockKeyhole className="size-[18px]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">
                {isSetup ? "Create a master password" : "Unlock your vault"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {isSetup
                  ? "It encrypts your credentials and connections on this device. It can't be recovered, so keep it somewhere safe."
                  : "Enter your master password to decrypt your connections."}
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            <PasswordInput
              label="Master password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSetup ? "new-password" : "current-password"}
              autoFocus
              required
              hint={isSetup ? `At least ${MIN_PASSWORD_LENGTH} characters. A few unrelated words work well.` : undefined}
            />
            {isSetup && (
              <>
                <StrengthMeter password={password} />
                <PasswordInput
                  label="Confirm password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </>
            )}

            {error && (
              <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}

            <Button type="submit" variant="primary" size="lg" loading={busy} className="w-full">
              {busy
                ? isSetup
                  ? "Creating vault…"
                  : "Unlocking…"
                : isSetup
                  ? "Create vault"
                  : "Unlock"}
            </Button>
          </div>
        </form>

        <div className="mt-4 flex items-start gap-2 px-1 text-xs text-muted-foreground">
          <ShieldCheck className="mt-px size-4 shrink-0" aria-hidden />
          <p>
            Encrypted with AES-256-GCM and a scrypt-derived key. Your keys stay on this
            device and requests go straight to your storage provider. The vault locks
            after 15 minutes of inactivity.
          </p>
        </div>

        {!isSetup && (
          <div className="mt-6 px-1 text-xs text-muted-foreground">
            Forgot the password?{" "}
            <Button variant="link" className="text-xs" onClick={() => setConfirmReset(true)}>
              Reset the vault
            </Button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reset the vault?"
        description="This permanently deletes every saved connection, credential, and group on this device. Your buckets and their contents are not affected."
        confirmLabel="Delete everything"
        typeToConfirm="RESET"
        onConfirm={reset}
        onClose={() => setConfirmReset(false)}
      />
    </main>
  );
}

function StrengthMeter({ password }: { password: string }) {
  // Rough guide only: length and variety. The hard rule is enforced on submit.
  const variety = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) =>
    r.test(password),
  ).length;
  const score =
    password.length === 0
      ? 0
      : password.length < MIN_PASSWORD_LENGTH
        ? 1
        : password.length >= 20 || (password.length >= 14 && variety >= 3)
          ? 3
          : 2;
  const labels = ["", "Too short", "Good", "Strong"];
  const colors = ["bg-border", "bg-danger", "bg-warning", "bg-success"];

  return (
    <div className="-mt-2 flex items-center gap-2" aria-live="polite">
      <div className="flex flex-1 gap-1">
        {[1, 2, 3].map((step) => (
          <span
            key={step}
            className={`h-1 flex-1 rounded-full transition-colors ${score >= step ? colors[score] : "bg-border"}`}
          />
        ))}
      </div>
      <span className="w-16 text-right text-xs text-muted-foreground">{labels[score]}</span>
    </div>
  );
}
