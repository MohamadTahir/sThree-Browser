import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  Database,
  FolderPlus,
  KeyRound,
  Lock,
  Pencil,
  Plus,
  Search,
  Settings2,
  Trash2,
} from "lucide-react";
import { useConfig } from "@/context/config";
import { Bucket, Group } from "@/models/types";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import ConnectionDialog from "./dialogs/ConnectionDialog";
import CredentialsDialog from "./dialogs/CredentialsDialog";
import GroupDialog from "./dialogs/GroupDialog";
import ChangePasswordDialog from "./dialogs/ChangePasswordDialog";
import ExportDialog from "./dialogs/ExportDialog";
import ImportDialog from "./dialogs/ImportDialog";
import ConfirmDialog from "./ConfirmDialog";
import { ThemeToggle } from "./ui/theme-toggle";

type Pending =
  | { kind: "connection"; bucket: Bucket | null }
  | { kind: "group"; group: Group | null }
  | { kind: "credentials" }
  | { kind: "password" }
  | { kind: "export" }
  | { kind: "import" }
  | { kind: "delete-connection"; bucket: Bucket }
  | { kind: "delete-group"; group: Group }
  | null;

export default function Sidebar({ onNavigate }: { onNavigate: () => void }) {
  const { configs, setActiveBucket, toggleGroup, deleteBucket, deleteGroup } =
    useConfig();
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<Pending>(null);

  const buckets = Object.values(configs.buckets);
  const groups = useMemo(
    () =>
      Object.values(configs.groups).sort((a, b) => a.name.localeCompare(b.name)),
    [configs.groups],
  );

  const matches = (bucket: Bucket) => {
    const q = query.trim().toLowerCase();
    return (
      !q ||
      bucket.nickname.toLowerCase().includes(q) ||
      bucket.bucketName.toLowerCase().includes(q)
    );
  };
  const byName = (a: Bucket, b: Bucket) => a.nickname.localeCompare(b.nickname);
  const filtered = buckets.filter(matches).sort(byName);
  const ungrouped = filtered.filter((b) => !b.groupId || !configs.groups[b.groupId]);
  const searching = query.trim().length > 0;

  const select = async (bucketId: string) => {
    await setActiveBucket(bucketId).catch(() => undefined);
    onNavigate();
  };

  const row = (bucket: Bucket, nested: boolean) => (
    <ConnectionRow
      key={bucket.id}
      bucket={bucket}
      nested={nested}
      active={configs.activeBucket === bucket.id}
      missingCredential={!bucket.askForCredentials && !configs.credentials[bucket.credentialId]}
      onSelect={() => select(bucket.id)}
      onEdit={() => setPending({ kind: "connection", bucket })}
      onDelete={() => setPending({ kind: "delete-connection", bucket })}
    />
  );

  return (
    <aside className="flex h-full flex-col border-r bg-sidebar">
      <div className="flex h-16 shrink-0 items-center gap-2.5 px-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="" className="size-7" />
        <span className="text-base font-semibold tracking-[-0.01em]">sThree Browser</span>
      </div>

      <VaultStatus />

      <div className="flex items-center justify-between px-5 pb-1.5 pt-5">
        <h2 className="text-xs font-medium text-muted-foreground">Connections</h2>
        <Button
          variant="quiet"
          size="icon-sm"
          onClick={() => setPending({ kind: "connection", bucket: null })}
          aria-label="Add connection"
          title="Add connection"
        >
          <Plus />
        </Button>
      </div>

      {buckets.length > 6 && (
        <div className="relative px-3 pb-2">
          <Search className="pointer-events-none absolute left-6 top-1/2 size-4 -translate-y-[calc(50%+4px)] text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search connections"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 pl-9 text-[13px]"
            aria-label="Search connections"
          />
        </div>
      )}

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-3" aria-label="Connections">
        {buckets.length === 0 ? (
          <div className="mt-2 rounded-xl border border-dashed border-border-strong bg-background/60 p-5 text-center">
            <Database className="mx-auto size-5 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">No connections yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add a bucket from AWS S3, Cloudflare R2, MinIO, or any S3-compatible
              storage.
            </p>
            <Button
              variant="primary"
              size="sm"
              className="mt-3"
              onClick={() => setPending({ kind: "connection", bucket: null })}
            >
              <Plus /> Add connection
            </Button>
          </div>
        ) : (
          <ul className="grid gap-0.5">
            {groups.map((group) => {
              const members = filtered.filter((b) => b.groupId === group.id);
              if (searching && members.length === 0) return null;
              const expanded = searching || !!group.active;
              return (
                <li key={group.id}>
                  <GroupRow
                    group={group}
                    count={members.length}
                    expanded={expanded}
                    onToggle={() => toggleGroup(group.id).catch(() => undefined)}
                    onEdit={() => setPending({ kind: "group", group })}
                    onDelete={() => setPending({ kind: "delete-group", group })}
                  />
                  {expanded && (
                    <ul className="mt-0.5 grid gap-0.5">
                      {members.length === 0 ? (
                        <li className="py-1.5 pl-10 text-xs text-muted-foreground">Empty group</li>
                      ) : (
                        members.map((b) => <li key={b.id}>{row(b, true)}</li>)
                      )}
                    </ul>
                  )}
                </li>
              );
            })}
            {ungrouped.map((b) => (
              <li key={b.id}>{row(b, false)}</li>
            ))}
            {searching && filtered.length === 0 && (
              <li className="px-2 py-3 text-xs text-muted-foreground">
                No connections match “{query.trim()}”.
              </li>
            )}
          </ul>
        )}
      </nav>

      <div className="grid shrink-0 gap-0.5 border-t p-3">
        {buckets.length > 0 && (
          <FooterButton icon={<Plus />} onClick={() => setPending({ kind: "connection", bucket: null })}>
            Add connection
          </FooterButton>
        )}
        <FooterButton icon={<KeyRound />} onClick={() => setPending({ kind: "credentials" })}>
          Credentials
          <span className="ml-auto text-xs text-muted-foreground tabular">
            {Object.keys(configs.credentials).length}
          </span>
        </FooterButton>
        <FooterButton icon={<FolderPlus />} onClick={() => setPending({ kind: "group", group: null })}>
          New group
        </FooterButton>
        <FooterButton icon={<ArrowDownToLine />} onClick={() => setPending({ kind: "import" })}>
          Import settings
        </FooterButton>
        {buckets.length > 0 && (
          <FooterButton icon={<ArrowUpFromLine />} onClick={() => setPending({ kind: "export" })}>
            Export settings
          </FooterButton>
        )}
        <FooterButton icon={<Settings2 />} onClick={() => setPending({ kind: "password" })}>
          Change master password
        </FooterButton>
        <div className="mt-1 flex items-center justify-between pl-2.5">
          <span className="text-sm text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
      </div>

      <ConnectionDialog
        open={pending?.kind === "connection"}
        bucket={pending?.kind === "connection" ? pending.bucket : null}
        onClose={() => setPending(null)}
        onManageCredentials={() => setPending({ kind: "credentials" })}
      />
      <GroupDialog
        open={pending?.kind === "group"}
        group={pending?.kind === "group" ? pending.group : null}
        onClose={() => setPending(null)}
      />
      <CredentialsDialog
        open={pending?.kind === "credentials"}
        onClose={() => setPending(null)}
      />
      <ChangePasswordDialog
        open={pending?.kind === "password"}
        onClose={() => setPending(null)}
      />
      <ExportDialog
        open={pending?.kind === "export"}
        onClose={() => setPending(null)}
      />
      <ImportDialog
        open={pending?.kind === "import"}
        onClose={() => setPending(null)}
      />
      <ConfirmDialog
        open={pending?.kind === "delete-connection"}
        title="Remove connection?"
        description={
          pending?.kind === "delete-connection" && (
            <>
              <strong className="font-medium text-foreground">{pending.bucket.nickname}</strong>{" "}
              will be removed from this app. The bucket and its objects are not touched.
            </>
          )
        }
        confirmLabel="Remove"
        onConfirm={() =>
          pending?.kind === "delete-connection" ? deleteBucket(pending.bucket.id) : undefined
        }
        onClose={() => setPending(null)}
      />
      <ConfirmDialog
        open={pending?.kind === "delete-group"}
        title="Delete group?"
        description={
          pending?.kind === "delete-group" && (
            <>
              <strong className="font-medium text-foreground">{pending.group.name}</strong>{" "}
              will be deleted. Its connections stay and move out of the group.
            </>
          )
        }
        confirmLabel="Delete group"
        onConfirm={() =>
          pending?.kind === "delete-group" ? deleteGroup(pending.group.id) : undefined
        }
        onClose={() => setPending(null)}
      />
    </aside>
  );
}

function VaultStatus() {
  const { lock, getLockDeadline } = useConfig();
  const [minutes, setMinutes] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const deadline = getLockDeadline();
      setMinutes(deadline ? Math.max(1, Math.ceil((deadline - Date.now()) / 60000)) : null);
    };
    // First tick after the auto-lock timer (armed in a parent effect) has started.
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 10_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [getLockDeadline]);

  return (
    <div className="mx-3 flex items-center gap-3 rounded-xl border bg-background px-3.5 py-2.5 shadow-card">
      <span className="relative flex size-2 shrink-0" aria-hidden>
        <span className="absolute inset-0 rounded-full bg-success" />
        <span className="absolute -inset-1 rounded-full bg-success/20" />
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="text-sm font-medium">Vault unlocked</p>
        <p className="text-xs text-muted-foreground tabular">
          {minutes ? `Locks in ${minutes} min` : "Encrypted on this device"}
        </p>
      </div>
      <Button size="sm" variant="secondary" onClick={() => lock()} title="Lock now and clear decrypted keys from memory">
        <Lock /> Lock
      </Button>
    </div>
  );
}

function RowActions({
  label,
  onEdit,
  onDelete,
}: {
  label: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="absolute right-1 top-1/2 flex -translate-y-1/2 gap-px opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
      <Button variant="quiet" size="icon-sm" className="size-7" onClick={onEdit} aria-label={`Edit ${label}`}>
        <Pencil className="!size-3.5" />
      </Button>
      <Button variant="quiet" size="icon-sm" className="size-7 hover:text-danger" onClick={onDelete} aria-label={`Delete ${label}`}>
        <Trash2 className="!size-3.5" />
      </Button>
    </div>
  );
}

function GroupRow({
  group,
  count,
  expanded,
  onToggle,
  onEdit,
  onDelete,
}: {
  group: Group;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
      >
        <ChevronRight className={cn("size-3.5 shrink-0 transition-transform duration-150", expanded && "rotate-90")} />
        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: group.color || "#6b7280" }} />
        <span className="min-w-0 flex-1 truncate font-medium">{group.name}</span>
        <span className="text-xs tabular group-hover:invisible group-focus-within:invisible">{count}</span>
      </button>
      <RowActions label={group.name} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}

function ConnectionRow({
  bucket,
  nested,
  active,
  missingCredential,
  onSelect,
  onEdit,
  onDelete,
}: {
  bucket: Bucket;
  nested: boolean;
  active: boolean;
  missingCredential: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? "page" : undefined}
        title={`${bucket.bucketName} · ${bucket.region}`}
        className={cn(
          "flex h-9 w-full items-center gap-2.5 rounded-lg pr-16 text-left text-sm transition-colors duration-150",
          nested ? "pl-10" : "pl-2.5",
          active
            ? "bg-background font-medium text-foreground shadow-card ring-1 ring-border"
            : "text-foreground/90 hover:bg-muted",
        )}
      >
        {!nested && <Database className={cn("size-4 shrink-0", active ? "text-primary-text" : "text-muted-foreground")} aria-hidden />}
        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className="truncate">{bucket.nickname}</span>
          {bucket.askForCredentials && (
            <KeyRound
              className="size-3 shrink-0 text-muted-foreground"
              aria-label="Asks for keys when connecting"
            />
          )}
        </span>
        {missingCredential && (
          <span className="size-1.5 shrink-0 rounded-full bg-warning" title="No credential assigned" />
        )}
      </button>
      <RowActions label={bucket.nickname} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}

function FooterButton({
  icon,
  children,
  onClick,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-left text-sm text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground [&_svg]:size-4"
    >
      {icon}
      {children}
    </button>
  );
}
