import { useState } from "react";
import { Database, FolderPlus, KeyRound, Plus, Search } from "lucide-react";
import { useConfig } from "@/context/config";
import { Bucket, Group } from "@/models/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "./ui/menu";
import ConnectionTree from "./sidebar/ConnectionTree";
import SidebarFooter from "./sidebar/SidebarFooter";
import ConnectionDialog from "./dialogs/ConnectionDialog";
import CredentialsDialog from "./dialogs/CredentialsDialog";
import GroupDialog from "./dialogs/GroupDialog";
import ChangePasswordDialog from "./dialogs/ChangePasswordDialog";
import ExportDialog from "./dialogs/ExportDialog";
import ImportDialog from "./dialogs/ImportDialog";
import ConfirmDialog from "./ConfirmDialog";

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
  const { configs, setActiveBucket, deleteBucket, deleteGroup } = useConfig();
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<Pending>(null);

  const bucketCount = Object.keys(configs.buckets).length;

  const select = async (bucketId: string) => {
    await setActiveBucket(bucketId).catch(() => undefined);
    onNavigate();
  };

  return (
    <aside className="flex h-full flex-col border-r bg-sidebar">
      <div className="flex h-16 shrink-0 items-center gap-2.5 pl-4 pr-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="" className="size-6" />
        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-[-0.01em]">
          sThree Browser
        </span>
        <Menu>
          <MenuTrigger asChild>
            <Button variant="quiet" size="icon-sm" aria-label="New connection, group, or credentials" title="New">
              <Plus />
            </Button>
          </MenuTrigger>
          <MenuContent align="end">
            <MenuItem onSelect={() => setPending({ kind: "connection", bucket: null })}>
              <Database /> New connection…
            </MenuItem>
            <MenuItem onSelect={() => setPending({ kind: "group", group: null })}>
              <FolderPlus /> New group…
            </MenuItem>
            <MenuSeparator />
            <MenuItem onSelect={() => setPending({ kind: "credentials" })}>
              <KeyRound /> Credentials
              <span className="ml-auto text-xs text-muted-foreground tabular">
                {Object.keys(configs.credentials).length}
              </span>
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>

      {bucketCount > 6 && (
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

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-3" aria-label="Connections">
        {bucketCount === 0 && Object.keys(configs.groups).length === 0 ? (
          <div className="mx-1 mt-2 rounded-xl border border-dashed border-border-strong bg-background/60 p-5 text-center">
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
          <ConnectionTree
            query={query}
            onSelect={select}
            onEditConnection={(bucket) => setPending({ kind: "connection", bucket })}
            onDeleteConnection={(bucket) => setPending({ kind: "delete-connection", bucket })}
            onEditGroup={(group) => setPending({ kind: "group", group })}
            onDeleteGroup={(group) => setPending({ kind: "delete-group", group })}
          />
        )}
      </nav>

      <SidebarFooter onAction={(kind) => setPending({ kind })} />

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
