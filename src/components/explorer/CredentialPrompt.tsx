import { useEffect, useRef, useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { Bucket, Credential } from "@/models/types";
import { describeS3Error, listObjects } from "@/services/s3Service";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { PasswordInput } from "../ui/password-input";

type Errors = Partial<Record<"accessKey" | "secretKey" | "form", string>>;

/**
 * Asks for the keys of a connection that doesn't save them. The keys are
 * checked against the bucket first, then handed back to be held in memory.
 */
export default function CredentialPrompt({
  bucket,
  onConnect,
}: {
  bucket: Bucket;
  onConnect: (credential: Credential) => void;
}) {
  const [accessKey, setAccessKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [connecting, setConnecting] = useState(false);
  const accessRef = useRef<HTMLInputElement>(null);

  // Never carry typed keys over to another connection.
  useEffect(() => {
    setAccessKey("");
    setSecretKey("");
    setErrors({});
    accessRef.current?.focus();
  }, [bucket.id]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const credential: Credential = {
      id: `session:${bucket.id}`,
      name: "Entered for this session",
      accessKey: accessKey.trim(),
      secretKey: secretKey.trim(),
    };
    const found: Errors = {};
    if (!credential.accessKey) found.accessKey = "Enter the access key ID.";
    if (!credential.secretKey) found.secretKey = "Enter the secret access key.";
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }
    setConnecting(true);
    setErrors({});
    try {
      await listObjects({ bucket, credential }, { prefix: "", maxKeys: 1 });
      onConnect(credential);
    } catch (err) {
      setErrors({ form: describeS3Error(err) });
      setConnecting(false);
    }
  };

  return (
    <div className="flex flex-1 items-start justify-center overflow-y-auto bg-subtle px-4 py-10 sm:items-center sm:py-12">
      <div className="w-full max-w-[400px]">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="rounded-xl border bg-raised gloss p-6 shadow-card"
        >
          <div className="mb-5 flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-subtle text-foreground">
              <KeyRound className="size-[18px]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold">Enter keys to connect</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{bucket.nickname}</span> asks for
                its keys each time instead of saving them.
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            <Input
              ref={accessRef}
              label="Access key ID"
              placeholder="AKIA…"
              value={accessKey}
              onChange={(e) => {
                setAccessKey(e.target.value);
                setErrors((x) => ({ ...x, accessKey: undefined, form: undefined }));
              }}
              error={errors.accessKey}
              autoComplete="off"
              spellCheck={false}
              autoCapitalize="off"
              className="font-mono"
              autoFocus
            />
            <PasswordInput
              label="Secret access key"
              value={secretKey}
              onChange={(e) => {
                setSecretKey(e.target.value);
                setErrors((x) => ({ ...x, secretKey: undefined, form: undefined }));
              }}
              error={errors.secretKey}
              autoComplete="off"
            />
            {errors.form && (
              <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">
                {errors.form}
              </p>
            )}
            <Button type="submit" variant="primary" size="lg" loading={connecting} className="mt-1 w-full">
              {connecting ? "Checking keys…" : "Connect"}
            </Button>
          </div>
        </form>

        <p className="mt-4 flex items-start gap-2 px-1 text-xs text-muted-foreground">
          <ShieldCheck className="mt-px size-4 shrink-0" aria-hidden />
          Held in memory only, never written to the vault. Forgotten when the vault locks or the
          app closes.
        </p>
      </div>
    </div>
  );
}
