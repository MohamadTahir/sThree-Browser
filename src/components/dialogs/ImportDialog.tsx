import { useEffect, useMemo, useRef, useState } from "react";
import { FileUp, TriangleAlert } from "lucide-react";
import { toast } from "react-toastify";
import { useConfig } from "@/context/config";
import {
  EXPORT_EXTENSION,
  ExportPayload,
  openExport,
  readExportFile,
  summarizeImport,
} from "@/services/configTransfer";
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

export default function ImportDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { configs, importConfigs } = useConfig();
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<{ name: string; contents: string } | null>(null);
  const [password, setPassword] = useState("");
  const [opened, setOpened] = useState<ExportPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setFile(null);
      setPassword("");
      setOpened(null);
      setError(null);
    }
  }, [open]);

  const pickFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0];
    event.target.value = "";
    if (!picked) return;
    setOpened(null);
    setError(null);
    try {
      setFile({ name: picked.name, contents: await readExportFile(picked) });
    } catch (err) {
      setFile(null);
      setError(errorMessage(err));
    }
  };

  const decrypt = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) return setError("Choose an export file.");
    if (!password) return setError("Enter the file's password.");
    setBusy(true);
    setError(null);
    try {
      const payload = await openExport(file.contents, password);
      if (!payload) {
        setError("The password is wrong, or the file has been changed since it was exported.");
        return;
      }
      setOpened(payload);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const confirmImport = async () => {
    if (!opened) return;
    setBusy(true);
    setError(null);
    try {
      await importConfigs(opened);
      toast.success("Settings imported");
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  // Recomputed from live settings, which another window may change meanwhile.
  const summary = useMemo(
    () => opened && summarizeImport(configs, opened),
    [configs, opened],
  );
  const counts = opened && {
    connections: Object.keys(opened.buckets).length,
    credentials: Object.keys(opened.credentials).length,
    groups: Object.keys(opened.groups).length,
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent>
        <form onSubmit={opened ? (e) => (e.preventDefault(), confirmImport()) : decrypt} noValidate>
          <DialogHeader>
            <DialogTitle>Import settings</DialogTitle>
            <DialogDescription>
              Adds connections, groups and credentials from an export file to this vault.
              Nothing is removed.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {!opened ? (
              <>
                <input
                  ref={fileInput}
                  type="file"
                  accept={`${EXPORT_EXTENSION},application/json`}
                  className="hidden"
                  onChange={pickFile}
                />
                <div className="grid gap-1.5">
                  <span className="text-sm font-medium">Export file</span>
                  <Button
                    onClick={() => fileInput.current?.click()}
                    disabled={busy}
                    className="justify-start"
                  >
                    <FileUp />
                    <span className="min-w-0 truncate">{file ? file.name : "Choose file…"}</span>
                  </Button>
                </div>
                <PasswordInput
                  label="File password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="off"
                  disabled={!file}
                />
              </>
            ) : (
              <div className="grid gap-3 text-sm">
                <p>
                  <strong className="font-medium">{file?.name}</strong> contains{" "}
                  {counts!.connections} {counts!.connections === 1 ? "connection" : "connections"},{" "}
                  {counts!.credentials} {counts!.credentials === 1 ? "credential" : "credentials"} and{" "}
                  {counts!.groups} {counts!.groups === 1 ? "group" : "groups"}.
                </p>
                <ul className="grid gap-1 rounded-md border bg-muted/40 px-3 py-2 tabular">
                  <li>{summary!.added} new</li>
                  <li>
                    {summary!.updated} already here
                    {summary!.updated > 0 && " — will be replaced by the file's version"}
                  </li>
                </ul>
                {summary!.missingCredentials > 0 && (
                  <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <TriangleAlert className="mt-px size-3.5 shrink-0 text-warning" />
                    {summary!.missingCredentials}{" "}
                    {summary!.missingCredentials === 1 ? "connection has" : "connections have"} no
                    credential in the file or this vault. Assign one after importing.
                  </p>
                )}
              </div>
            )}
            {error && (
              <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}
          </DialogBody>
          <DialogFooter>
            <Button onClick={opened ? () => setOpened(null) : onClose} disabled={busy}>
              {opened ? "Back" : "Cancel"}
            </Button>
            <Button type="submit" variant="primary" loading={busy} disabled={!opened && !file}>
              {opened ? "Import" : "Continue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
