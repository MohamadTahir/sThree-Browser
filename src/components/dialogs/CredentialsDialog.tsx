import { useEffect, useState } from "react";
import { KeyRound, Plus } from "lucide-react";
import { toast } from "react-toastify";
import { useConfig } from "@/context/config";
import { Credential } from "@/models/types";
import { cn, errorMessage } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { PasswordInput } from "../ui/password-input";

interface Draft {
  name: string;
  accessKey: string;
  secretKey: string;
}

const EMPTY: Draft = { name: "", accessKey: "", secretKey: "" };

/** Show only the start and end of an access key ID in lists. */
function maskKey(key: string): string {
  return key.length <= 8 ? "••••" : `${key.slice(0, 4)}…${key.slice(-4)}`;
}

export default function CredentialsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { configs, saveCredential, deleteCredential } = useConfig();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Draft | "form", string>>>({});
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const credentials = Object.values(configs.credentials).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const selected = selectedId ? configs.credentials[selectedId] : null;
  const usedBy = selected
    ? Object.values(configs.buckets).filter((b) => b.credentialId === selected.id)
    : [];

  const load = (credential: Credential | null) => {
    setSelectedId(credential?.id ?? null);
    setDraft(credential ? { ...credential } : EMPTY);
    setErrors({});
    setConfirmingDelete(false);
  };

  useEffect(() => {
    if (open) load(null);
  }, [open]);

  const set = (key: keyof Draft, value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined, form: undefined }));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const next = {
      name: draft.name.trim(),
      accessKey: draft.accessKey.trim(),
      secretKey: draft.secretKey.trim(),
    };
    const found: typeof errors = {};
    if (!next.name) found.name = "Give the credential a name.";
    if (!next.accessKey) found.accessKey = "Enter the access key ID.";
    if (!next.secretKey) found.secretKey = "Enter the secret access key.";
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }

    setBusy("save");
    try {
      const credential: Credential = { id: selected?.id ?? crypto.randomUUID(), ...next };
      await saveCredential(credential);
      toast.success(selected ? "Credential updated" : "Credential saved");
      load(credential);
    } catch (error) {
      setErrors({ form: errorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setBusy("delete");
    try {
      await deleteCredential(selected.id);
      toast.success("Credential deleted");
      load(null);
    } catch (error) {
      setErrors({ form: errorMessage(error) });
      setConfirmingDelete(false);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Credentials</DialogTitle>
          <DialogDescription>
            Access keys are encrypted in your vault and only used to sign requests on this
            device.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-0 border-t sm:grid-cols-[220px_1fr]">
          <div className="flex min-h-0 flex-col border-b bg-subtle sm:border-b-0 sm:border-r">
            <div className="p-2">
              <Button
                variant={selected ? "ghost" : "secondary"}
                className="w-full justify-start"
                onClick={() => load(null)}
                aria-pressed={!selected}
              >
                <Plus /> New credential
              </Button>
            </div>
            <ul className="max-h-40 overflow-y-auto px-2 pb-2 sm:max-h-80">
              {credentials.map((c) => {
                const uses = Object.values(configs.buckets).filter((b) => b.credentialId === c.id).length;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => load(c)}
                      aria-current={selectedId === c.id || undefined}
                      className={cn(
                        "flex w-full flex-col rounded-md px-2.5 py-1.5 text-left transition-colors",
                        selectedId === c.id
                          ? "bg-primary-subtle text-primary-text"
                          : "hover:bg-muted",
                      )}
                    >
                      <span className="truncate text-sm font-medium">{c.name}</span>
                      <span className="truncate font-mono text-xs text-muted-foreground">
                        {maskKey(c.accessKey)} · {uses} {uses === 1 ? "connection" : "connections"}
                      </span>
                    </button>
                  </li>
                );
              })}
              {credentials.length === 0 && (
                <li className="flex items-center gap-2 px-2.5 py-2 text-xs text-muted-foreground">
                  <KeyRound className="size-3.5" /> None saved yet
                </li>
              )}
            </ul>
          </div>

          <form onSubmit={handleSave} noValidate className="flex min-h-0 flex-col">
            <div className="grid gap-4 overflow-y-auto p-5">
              <Input
                label="Name"
                placeholder="Production account"
                value={draft.name}
                onChange={(e) => set("name", e.target.value)}
                error={errors.name}
              />
              <Input
                label="Access key ID"
                placeholder="AKIA…"
                value={draft.accessKey}
                onChange={(e) => set("accessKey", e.target.value)}
                error={errors.accessKey}
                autoComplete="off"
                spellCheck={false}
                autoCapitalize="off"
                className="font-mono"
              />
              <PasswordInput
                label="Secret access key"
                value={draft.secretKey}
                onChange={(e) => set("secretKey", e.target.value)}
                error={errors.secretKey}
                autoComplete="off"
              />
              {selected && usedBy.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Used by {usedBy.map((b) => b.nickname).join(", ")}.
                </p>
              )}
              {errors.form && (
                <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">
                  {errors.form}
                </p>
              )}
            </div>

            <DialogFooter className="mt-auto justify-between">
              <div>
                {selected &&
                  (confirmingDelete ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Delete?</span>
                      <Button size="sm" variant="danger" loading={busy === "delete"} onClick={handleDelete}>
                        Delete
                      </Button>
                      <Button size="sm" onClick={() => setConfirmingDelete(false)}>
                        Keep
                      </Button>
                    </div>
                  ) : (
                    <Button variant="danger-outline" onClick={() => setConfirmingDelete(true)}>
                      Delete
                    </Button>
                  ))}
              </div>
              <div className="flex gap-2">
                <Button onClick={onClose}>Close</Button>
                <Button type="submit" variant="primary" loading={busy === "save"}>
                  {selected ? "Save changes" : "Save credential"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
