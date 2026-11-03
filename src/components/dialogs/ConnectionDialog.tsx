import { useEffect, useRef, useState } from "react";
import { CheckCircle2, CircleAlert, TriangleAlert } from "lucide-react";
import { z } from "zod";
import { useConfig } from "@/context/config";
import { Bucket } from "@/models/types";
import { describeS3Error, listObjects } from "@/services/s3Service";
import { errorMessage, parseEndpoint } from "@/lib/utils";
import { groupColor } from "@/lib/groupColors";
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
import { Select } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { ChoiceGroup } from "../ui/choice-group";

const LOCAL_HOST = /^(localhost|127\.\d+\.\d+\.\d+|\[::1\]|.*\.localhost)$/i;

/** Credential choice for "ask for keys when connecting"; not a real credential id. */
const ASK = "__ask__";

const schema = z.object({
  nickname: z.string().trim().min(1, "Give the connection a name."),
  bucketName: z
    .string()
    .trim()
    .min(1, "Enter the bucket name.")
    .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, "Bucket names use letters, numbers, dots, hyphens, and underscores."),
  region: z.string().trim().min(1, "Enter a region, for example us-east-1 or auto."),
  endpoint: z
    .string()
    .trim()
    .refine((v) => v === "" || parseEndpoint(v) !== null, "Enter a full http:// or https:// URL."),
  credentialId: z.string().min(1, "Choose a credential."),
  groupId: z.string(),
  forcePathStyle: z.boolean(),
});

type FormState = z.infer<typeof schema>;
type Errors = Partial<Record<keyof FormState, string>>;

const EMPTY: FormState = {
  nickname: "",
  bucketName: "",
  region: "us-east-1",
  endpoint: "",
  credentialId: "",
  groupId: "",
  forcePathStyle: false,
};

type TestResult = { ok: true } | { ok: false; message: string } | null;

interface ConnectionDialogProps {
  open: boolean;
  bucket: Bucket | null;
  onClose: () => void;
  onManageCredentials: () => void;
}

export default function ConnectionDialog({
  open,
  bucket,
  onClose,
  onManageCredentials,
}: ConnectionDialogProps) {
  const { configs, saveBucket, setActiveBucket, setSessionCredential } = useConfig();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState<TestResult>(null);
  /** Saved credential to return to when switching back from "ask". */
  const lastSaved = useRef("");

  const credentials = Object.values(configs.credentials).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const groups = Object.values(configs.groups).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setTest(null);
    lastSaved.current =
      bucket && configs.credentials[bucket.credentialId]
        ? bucket.credentialId
        : credentials.length === 1
          ? credentials[0].id
          : "";
    setForm(
      bucket
        ? {
            nickname: bucket.nickname,
            bucketName: bucket.bucketName,
            region: bucket.region,
            endpoint: bucket.endpoint ?? "",
            credentialId: bucket.askForCredentials
              ? ASK
              : configs.credentials[bucket.credentialId]
                ? bucket.credentialId
                : "",
            groupId: bucket.groupId && configs.groups[bucket.groupId] ? bucket.groupId : "",
            forcePathStyle: bucket.forcePathStyle,
          }
        : { ...EMPTY, credentialId: lastSaved.current },
    );
    // Only reset when the dialog opens or switches target.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, bucket]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setTest(null);
  };

  const validate = (): FormState | null => {
    const result = schema.safeParse(form);
    if (result.success) return result.data;
    const next: Errors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof FormState;
      next[key] ??= issue.message;
    }
    setErrors(next);
    return null;
  };

  const toBucket = (data: FormState): Bucket => ({
    id: bucket?.id ?? crypto.randomUUID(),
    nickname: data.nickname,
    bucketName: data.bucketName,
    region: data.region,
    endpoint: data.endpoint ? data.endpoint.replace(/\/+$/, "") : undefined,
    credentialId: data.credentialId === ASK ? "" : data.credentialId,
    askForCredentials: data.credentialId === ASK || undefined,
    groupId: data.groupId || null,
    forcePathStyle: data.forcePathStyle,
  });

  const handleTest = async () => {
    const data = validate();
    if (!data) return;
    const credential = configs.credentials[data.credentialId];
    setTesting(true);
    setTest(null);
    try {
      await listObjects({ bucket: toBucket(data), credential }, { prefix: "", maxKeys: 1 });
      setTest({ ok: true });
    } catch (error) {
      setTest({ ok: false, message: describeS3Error(error) });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const data = validate();
    if (!data) return;
    setSaving(true);
    try {
      const next = toBucket(data);
      await saveBucket(next);
      // Switching to a saved credential: drop any keys typed in this session.
      if (!next.askForCredentials) setSessionCredential(next.id, null);
      if (!bucket) {
        await setActiveBucket(next.id);
      }
      onClose();
    } catch (error) {
      setErrors({ nickname: errorMessage(error, "Couldn't save the connection.") });
    } finally {
      setSaving(false);
    }
  };

  const asking = form.credentialId === ASK;
  const endpointUrl = parseEndpoint(form.endpoint.trim());
  const insecure =
    endpointUrl?.protocol === "http:" && !LOCAL_HOST.test(endpointUrl.hostname);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-col">
          <DialogHeader>
            <DialogTitle>{bucket ? "Edit connection" : "Add connection"}</DialogTitle>
            <DialogDescription>
              Connect to a bucket on AWS S3 or any S3-compatible service.
            </DialogDescription>
          </DialogHeader>

          <DialogBody>
            <div className="grid items-start gap-4 sm:grid-cols-[1fr_180px]">
              <Input
                label="Name"
                placeholder="Production media"
                value={form.nickname}
                onChange={(e) => set("nickname", e.target.value)}
                error={errors.nickname}
                autoFocus
              />
              <Select
                label="Group"
                value={form.groupId}
                onChange={(value) => set("groupId", value)}
                options={[
                  { value: "", label: "None" },
                  ...groups.map((g) => ({
                    value: g.id,
                    label: g.name,
                    icon: (
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: groupColor(g.color) }}
                        aria-hidden
                      />
                    ),
                  })),
                ]}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
              <Input
                label="Bucket"
                placeholder="my-bucket"
                value={form.bucketName}
                onChange={(e) => set("bucketName", e.target.value)}
                error={errors.bucketName}
                spellCheck={false}
                autoCapitalize="off"
                className="font-mono"
              />
              <Input
                label="Region"
                placeholder="us-east-1"
                value={form.region}
                onChange={(e) => set("region", e.target.value)}
                error={errors.region}
                spellCheck={false}
                autoCapitalize="off"
                className="font-mono"
              />
            </div>
            <div className="grid gap-1.5">
              <Input
                label="Endpoint"
                placeholder="Leave empty for AWS S3"
                value={form.endpoint}
                onChange={(e) => set("endpoint", e.target.value)}
                error={errors.endpoint}
                hint="For R2, MinIO, Wasabi, and others, for example https://<account>.r2.cloudflarestorage.com"
                spellCheck={false}
                autoCapitalize="off"
                inputMode="url"
                className="font-mono"
              />
              {insecure && (
                <p className="flex items-start gap-1.5 text-xs text-warning">
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                  Plain HTTP sends requests and file contents unencrypted over the network.
                </p>
              )}
            </div>
            <Checkbox
              checked={form.forcePathStyle}
              onCheckedChange={(checked) => set("forcePathStyle", checked)}
              label="Use path-style URLs"
              description="Needed by MinIO and some self-hosted services."
            />

            <div className="grid gap-3">
              <ChoiceGroup
                label="Access keys"
                value={asking ? "ask" : "saved"}
                onChange={(mode) => {
                  if (mode === "ask") {
                    if (!asking) lastSaved.current = form.credentialId;
                    set("credentialId", ASK);
                  } else if (asking) {
                    set("credentialId", lastSaved.current);
                  }
                }}
                choices={[
                  {
                    value: "saved",
                    label: "Saved credential",
                    description: "Encrypted in your vault and used automatically.",
                  },
                  {
                    value: "ask",
                    label: "Ask when connecting",
                    description: "Typed in each session and never saved.",
                  },
                ]}
              />
              {!asking &&
                (credentials.length === 0 ? (
                  <div className="grid gap-1.5">
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border-strong px-3 py-2.5 text-sm text-muted-foreground">
                      No credentials saved yet.
                      <Button size="sm" onClick={onManageCredentials}>
                        Add credential
                      </Button>
                    </div>
                    {errors.credentialId && (
                      <p className="text-xs text-danger">{errors.credentialId}</p>
                    )}
                  </div>
                ) : (
                  <Select
                    label="Credential"
                    value={form.credentialId}
                    onChange={(value) => set("credentialId", value)}
                    error={errors.credentialId}
                    options={credentials.map((c) => ({ value: c.id, label: c.name }))}
                  />
                ))}
            </div>

            {test && (
              <p
                role="status"
                className={
                  test.ok
                    ? "flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-sm text-success"
                    : "flex items-start gap-2 rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger"
                }
              >
                {test.ok ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                ) : (
                  <CircleAlert className="mt-0.5 size-4 shrink-0" />
                )}
                {test.ok ? "Connected. The bucket is reachable with this credential." : test.message}
              </p>
            )}
          </DialogBody>

          <DialogFooter className="justify-between">
            {asking ? (
              <span />
            ) : (
              <Button onClick={handleTest} loading={testing} disabled={credentials.length === 0}>
                Test connection
              </Button>
            )}
            <div className="flex gap-2">
              <Button onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="primary" loading={saving}>
                {bucket ? "Save" : "Add connection"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
