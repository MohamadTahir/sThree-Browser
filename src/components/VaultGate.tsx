import { useRef, useState } from "react";
import { ChevronRight, TriangleAlert } from "lucide-react";
import { LOCK_NOTICE_KEY, useConfig } from "@/context/config";
import { MIN_PASSWORD_LENGTH, validateNewPassword } from "@/services/vault";
import { errorMessage } from "@/lib/utils";
import { isTauri, openExternal, PRIVACY_URL } from "@/lib/tauri";
import { Button } from "./ui/button";
import { PasswordInput } from "./ui/password-input";
import ConfirmDialog from "./ConfirmDialog";
import { ThemeToggle } from "./ui/theme-toggle";
import VaultBackdrop, { VaultTiers } from "./vault/VaultBackdrop";

/** Where an error belongs: under a field, or as a note for the whole form. */
type FormError = { field: "password" | "confirm" | "form"; message: string };

/** Full-screen gate: create the vault on first run, unlock it afterwards. */
export default function VaultGate() {
  const { status, setup, unlock, reset } = useConfig();
  const isSetup = status === "setup";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<FormError | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  // Why the vault locked (idle timeout, change in another window), shown once.
  const [notice] = useState<string | null>(() => {
    try {
      const value = sessionStorage.getItem(LOCK_NOTICE_KEY);
      sessionStorage.removeItem(LOCK_NOTICE_KEY);
      return value;
    } catch {
      return null;
    }
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (isSetup) {
      const problem = validateNewPassword(password);
      if (problem) {
        setError({ field: "password", message: problem });
        return;
      }
      if (password !== confirm) {
        setError({ field: "confirm", message: "The passwords don't match." });
        return;
      }
    }

    setBusy(true);
    let failed = false;
    try {
      if (isSetup) {
        await setup(password);
      } else if (!(await unlock(password))) {
        failed = true;
        setError({ field: "password", message: "That password didn't unlock the vault." });
      }
    } catch (err) {
      failed = true;
      setError({ field: "form", message: errorMessage(err, "Couldn't open the vault.") });
    } finally {
      setBusy(false);
    }
    if (failed) {
      // Keep what was typed, so a one-character slip is quick to fix, and
      // put focus back (the busy button had taken it).
      requestAnimationFrame(() => passwordRef.current?.select());
    }
  };

  const fieldError = (field: FormError["field"]) =>
    error?.field === field ? error.message : undefined;

  return (
    <main className="relative isolate flex h-full flex-col overflow-y-auto bg-sidebar px-4 py-12">
      <VaultBackdrop />
      <ThemeToggle className="absolute right-4 top-4 z-10" />
      <div className="relative z-10 m-auto w-full max-w-[400px]">
        <div className="mb-6 flex flex-col items-center">
          <VaultTiers />
          <span className="-mt-2 text-lg font-semibold tracking-[-0.015em] [font-stretch:110%]">sThree Browser</span>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="grid gap-5 rounded-2xl border bg-raised/80 gloss p-7 shadow-dialog backdrop-blur-xl"
        >
          <div>
            <p className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="size-2 rounded-full bg-muted-foreground/60" aria-hidden />
              {isSetup ? "New vault" : "Vault locked"}
            </p>
            <h1 className="text-2xl font-semibold">
              {isSetup ? "Create a master password" : "Unlock your vault"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isSetup
                ? "It encrypts your connections and keys on this device. Requests go straight to your storage provider."
                : "Your connections and keys are encrypted on this device and never leave it."}
            </p>
          </div>

          {notice && !isSetup && (
            <p role="status" className="rounded-md border bg-subtle px-3 py-2 text-sm text-muted-foreground">
              {notice}
            </p>
          )}

          <div className="grid gap-2">
            <PasswordInput
              ref={passwordRef}
              label="Master password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSetup ? "new-password" : "current-password"}
              autoFocus
              required
              className="h-10"
              error={fieldError("password")}
              hint={isSetup ? `At least ${MIN_PASSWORD_LENGTH} characters. A few unrelated words work well.` : undefined}
            />
            {isSetup && <StrengthMeter password={password} />}
          </div>

          {isSetup && (
            <>
              <PasswordInput
                label="Confirm password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
                className="h-10"
                error={fieldError("confirm")}
              />
              <p className="flex gap-2.5 rounded-md border bg-subtle px-3 py-2.5 text-sm">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
                <span>
                  <span className="font-medium">This password can't be recovered.</span>{" "}
                  <span className="text-muted-foreground">
                    Keep it in a password manager. Without it, the vault can only be reset.
                  </span>
                </span>
              </p>
            </>
          )}

          {error?.field === "form" && (
            <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">
              {error.message}
            </p>
          )}

          <Button type="submit" variant="primary" loading={busy} className="h-10 w-full">
            {busy
              ? isSetup
                ? "Creating vault…"
                : "Unlocking…"
              : isSetup
                ? "Create vault"
                : "Unlock"}
          </Button>
        </form>

        <div className="mt-6 grid justify-items-center gap-3 text-center text-xs text-foreground/75">
          <details className="group w-full">
            <summary className="mx-auto flex w-fit cursor-pointer list-none items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
              <ChevronRight className="size-3.5 transition-transform duration-150 group-open:rotate-90" aria-hidden />
              How your vault is protected
            </summary>
            <p className="mt-2 text-balance">
              Connections and keys are encrypted with AES-256-GCM under a key derived from
              your password with scrypt
              {isTauri() && ", and bound to a device key in your system keychain"}. Every
              request is signed here and sent straight to your storage provider. The vault
              locks after 15 minutes of inactivity.
            </p>
          </details>

          {!isSetup && (
            <p className="text-balance">
              Forgot your password? It can't be recovered, but you can{" "}
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="rounded-sm text-foreground underline underline-offset-2 transition-colors hover:text-danger"
              >
                reset the vault
              </button>{" "}
              and add your connections again.
            </p>
          )}

          <a
            href={PRIVACY_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => {
              event.preventDefault();
              void openExternal(PRIVACY_URL);
            }}
            className="rounded-sm underline-offset-2 transition-colors hover:text-foreground hover:underline"
          >
            Privacy &amp; terms
          </a>
        </div>
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
    <div className="flex items-center gap-2">
      <div className="flex flex-1 gap-1" aria-hidden>
        {[1, 2, 3].map((step) => (
          <span
            key={step}
            className={`h-1 flex-1 rounded-full transition-colors ${score >= step ? colors[score] : "bg-border"}`}
          />
        ))}
      </div>
      <span className="w-16 text-right text-xs text-muted-foreground">
        {score > 0 && <span className="sr-only">Password strength: </span>}
        {labels[score]}
      </span>
    </div>
  );
}
