import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Database,
  File as FileIcon,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileText,
  FileVideo,
  Folder,
  FolderPlus,
  KeyRound,
  Menu,
  RefreshCw,
  Copy,
  Download,
  Link2,
  Search,
  Trash2,
  Upload,
  UploadCloud,
} from "lucide-react";
import prettyBytes from "pretty-bytes";
import { useConfig } from "@/context/config";
import { S3Object } from "@/models/types";
import { deleteObject, describeS3Error, uploadFile } from "@/services/s3Service";
import { baseName, cn, formatDate, parentPrefix } from "@/lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import ConfirmDialog from "./ConfirmDialog";
import ObjectPanel from "./explorer/ObjectPanel";
import NewFolderDialog from "./explorer/NewFolderDialog";
import ListingError from "./explorer/ListingError";
import CredentialPrompt from "./explorer/CredentialPrompt";
import DeleteFolderDialog from "./explorer/DeleteFolderDialog";
import ShareDialog from "./explorer/ShareDialog";
import { copyToClipboard, downloadObject } from "./explorer/objectActions";
import { toast } from "react-toastify";
import UploadQueue, { UploadItem } from "./explorer/UploadQueue";
import { useObjectListing } from "./explorer/useObjectListing";
import { FolderState, useFolderSummaries } from "./explorer/useFolderSummaries";

type SortKey = "name" | "size" | "modified";
type Sort = { key: SortKey; dir: 1 | -1 };

function iconFor(key: string) {
  const ext = key.slice(key.lastIndexOf(".") + 1).toLowerCase();
  if (/^(png|jpe?g|gif|webp|avif|svg|bmp|ico|heic|tiff?)$/.test(ext)) return FileImage;
  if (/^(mp4|mov|webm|mkv|avi|m4v)$/.test(ext)) return FileVideo;
  if (/^(mp3|wav|flac|ogg|m4a|aac)$/.test(ext)) return FileAudio;
  if (/^(zip|gz|tgz|tar|7z|rar|bz2|xz|zst)$/.test(ext)) return FileArchive;
  if (/^(js|mjs|ts|tsx|jsx|json|ya?ml|xml|html?|css|py|go|rs|java|sh|sql|toml)$/.test(ext)) return FileCode;
  if (/^(txt|md|pdf|csv|log|docx?|rtf)$/.test(ext)) return FileText;
  return FileIcon;
}

/** Files from a drop, skipping directories (which browsers expose as empty "files"). */
function droppedFiles(transfer: DataTransfer): File[] {
  const files: File[] = [];
  const items = Array.from(transfer.items ?? []);
  if (items.length > 0) {
    for (const item of items) {
      if (item.kind !== "file") continue;
      const entry = item.webkitGetAsEntry?.();
      if (entry?.isDirectory) continue;
      const file = item.getAsFile();
      if (file) files.push(file);
    }
    return files;
  }
  return Array.from(transfer.files ?? []);
}

/** Live width of an element; 0 until it has rendered. */
function useElementWidth(ref: React.RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  });
  return width;
}

/** List widths at which columns and row actions start to crowd the name. */
const SHOW_MODIFIED_FROM = 720;
const SHOW_ACTIONS_FROM = 520;

export default function FileExplorer({ onOpenNav }: { onOpenNav: () => void }) {
  const { configs, getConnection, keepAlive, sessionCredentials, setSessionCredential } =
    useConfig();
  const activeId = configs.activeBucket;
  const bucket = activeId ? configs.buckets[activeId] : undefined;
  const credential = bucket
    ? bucket.askForCredentials
      ? sessionCredentials[bucket.id]
      : configs.credentials[bucket.credentialId]
    : undefined;
  // Stable identity unless the bucket or credential themselves change.
  const connection = useMemo(
    () => getConnection(activeId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bucket, credential],
  );

  const listing = useObjectListing(connection);
  // Columns follow the list's own width, which shrinks when the sidebar and
  // details panel are open, not the window's.
  const listRef = useRef<HTMLDivElement>(null);
  const listWidth = useElementWidth(listRef);
  const showModified = listWidth === 0 || listWidth >= SHOW_MODIFIED_FROM;
  const showActions = listWidth === 0 || listWidth >= SHOW_ACTIONS_FROM;
  const columns = showModified ? 3 : 2;
  const { prefix, setPrefix, objects, loading, error, reload } = listing;

  const folderPrefixes = useMemo(
    () => objects.filter((o) => o.isFolder).map((o) => o.key),
    [objects],
  );
  const { states: folderStats, invalidate: invalidateFolders } = useFolderSummaries(
    connection,
    folderPrefixes,
  );
  const refresh = useCallback(() => {
    invalidateFolders();
    reload();
  }, [invalidateFolders, reload]);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<Sort>({ key: "name", dir: 1 });
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [replacePrompt, setReplacePrompt] = useState<File[] | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  const [objectToShare, setObjectToShare] = useState<string | null>(null);
  const [objectToDelete, setObjectToDelete] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLTableSectionElement>(null);

  // Clear selection and filter when the folder or connection changes.
  useEffect(() => {
    setSelectedKey(null);
    setFilter("");
  }, [prefix, connection]);

  const rows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const visible = q
      ? objects.filter((o) => baseName(o.key).toLowerCase().includes(q))
      : objects;
    const compare = (a: S3Object, b: S3Object) => {
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
      // Folders sort by their computed summary once it has loaded.
      const size = (o: S3Object) => {
        const stat = folderStats[o.key];
        return o.isFolder ? (typeof stat === "object" ? stat.bytes : -1) : o.size;
      };
      const modified = (o: S3Object) => {
        const stat = folderStats[o.key];
        return (o.isFolder ? (typeof stat === "object" ? stat.lastModified : null) : o.lastModified) ?? "";
      };
      let result = 0;
      if (sort.key === "size") result = size(a) - size(b);
      else if (sort.key === "modified") result = modified(a).localeCompare(modified(b));
      if (result === 0)
        result = baseName(a.key).localeCompare(baseName(b.key), undefined, { numeric: true });
      return result * sort.dir;
    };
    return [...visible].sort(compare);
  }, [objects, filter, sort, folderStats]);

  const selected = rows.find((o) => o.key === selectedKey && !o.isFolder) ?? null;

  // ---- uploads ----------------------------------------------------------

  const patchUpload = useCallback((id: string, patch: Partial<UploadItem>) => {
    setUploads((list) => list.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }, []);

  // Uploads in flight. They hold signed credentials, so they stop as soon as
  // the explorer unmounts (the vault locked or the app is going away).
  const activeUploads = useRef(new Map<string, () => Promise<void>>());
  useEffect(() => {
    const uploadsAtUnmount = activeUploads.current;
    return () => uploadsAtUnmount.forEach((abort) => void abort());
  }, []);

  const startUploads = useCallback(
    (files: File[]) => {
      if (!connection) return;
      const target = prefix;
      for (const file of files) {
        const id = crypto.randomUUID();
        const key = target + file.name;
        const handle = uploadFile(connection, key, file, (progress) => {
          patchUpload(id, { progress });
          // A running upload counts as activity, so auto-lock waits for it.
          keepAlive();
        });
        activeUploads.current.set(id, handle.abort);
        setUploads((list) => [
          ...list,
          { id, name: file.name, key, progress: 0, status: "uploading", cancel: () => void handle.abort() },
        ]);
        handle.done
          .finally(() => activeUploads.current.delete(id))
          .then(() => {
            patchUpload(id, { status: "done", progress: 1, cancel: undefined });
            window.setTimeout(() => setUploads((l) => l.filter((u) => u.id !== id)), 4000);
            reload();
          })
          .catch((err) => {
            const cancelled = (err as Error)?.name === "AbortError";
            patchUpload(id, {
              status: cancelled ? "cancelled" : "failed",
              error: cancelled ? undefined : describeS3Error(err),
              cancel: undefined,
            });
            if (cancelled) {
              window.setTimeout(() => setUploads((l) => l.filter((u) => u.id !== id)), 3000);
            }
          });
      }
    },
    [connection, prefix, patchUpload, reload, keepAlive],
  );

  const requestUpload = (files: File[]) => {
    if (files.length === 0) return;
    const existing = new Set(objects.map((o) => o.key));
    if (files.some((f) => existing.has(prefix + f.name))) {
      setReplacePrompt(files);
    } else {
      startUploads(files);
    }
  };

  // Warn before closing the tab mid-upload.
  const uploading = uploads.some((u) => u.status === "uploading");
  useEffect(() => {
    if (!uploading) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [uploading]);

  // ---- keyboard ---------------------------------------------------------

  const openRow = (object: S3Object) => {
    if (object.isFolder) setPrefix(object.key);
    else setSelectedKey(object.key);
  };

  const onTableKeyDown = (event: React.KeyboardEvent) => {
    const buttons = Array.from(
      tableRef.current?.querySelectorAll<HTMLButtonElement>("button[data-row]") ?? [],
    );
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next = buttons[Math.min(buttons.length - 1, Math.max(0, index + (event.key === "ArrowDown" ? 1 : -1)))];
      next?.focus();
      const row = rows[buttons.indexOf(next!)];
      if (row && !row.isFolder && selectedKey) setSelectedKey(row.key);
    } else if (event.key === "Backspace" && prefix) {
      event.preventDefault();
      setPrefix(parentPrefix(prefix));
    }
  };

  /** Drop keys typed in for this connection; running uploads stop with them. */
  const forgetKeys = () => {
    if (!activeId) return;
    activeUploads.current.forEach((abort) => void abort());
    setSessionCredential(activeId, null);
  };

  // ---- render -----------------------------------------------------------

  if (!bucket) {
    return (
      <main className="flex flex-1 flex-col">
        <MobileBar onOpenNav={onOpenNav} title="sThree Browser" />
        <EmptyState
          icon={<Database />}
          title={Object.keys(configs.buckets).length ? "Choose a connection" : "Add your first connection"}
          body={
            Object.keys(configs.buckets).length
              ? "Pick a bucket from the sidebar to browse it."
              : "Use the + next to Connections in the sidebar. Your keys are encrypted in the vault on this device."
          }
        />
      </main>
    );
  }

  const endpointHost = bucket.endpoint
    ? (() => {
        try {
          return new URL(bucket.endpoint).host;
        } catch {
          return bucket.endpoint;
        }
      })()
    : "AWS S3";

  const titleBlock = (
    <div className="min-w-0 flex-1">
      <h1 className="truncate text-[22px] leading-7 font-[680] tracking-[-0.025em] [font-stretch:112%] sm:text-[26px] sm:leading-8">
        {bucket.nickname}
      </h1>
      <p className="mt-1.5 flex min-w-0 flex-wrap gap-1.5 text-xs">
        <IdentityChip label="Bucket" value={bucket.bucketName} mono />
        <IdentityChip label="Region" value={bucket.region} mono className="max-sm:hidden" />
        <IdentityChip label="Endpoint" value={endpointHost} className="max-md:hidden" />
      </p>
    </div>
  );

  if (!connection && bucket.askForCredentials) {
    return (
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-2 border-b px-4 pb-3.5 pt-5 sm:px-7">
          <Button variant="quiet" size="icon" className="-ml-1 md:hidden" onClick={onOpenNav} aria-label="Open sidebar">
            <Menu />
          </Button>
          {titleBlock}
        </header>
        <CredentialPrompt
          bucket={bucket}
          onConnect={(entered) => setSessionCredential(bucket.id, entered)}
        />
      </main>
    );
  }

  if (!connection) {
    return (
      <main className="flex flex-1 flex-col">
        <MobileBar onOpenNav={onOpenNav} title={bucket.nickname} />
        <EmptyState
          icon={<Database />}
          title="This connection has no credential"
          body="Edit the connection in the sidebar and choose a credential to use."
        />
      </main>
    );
  }

  const crumbs = prefix
    .split("/")
    .filter(Boolean)
    .map((part, i, all) => ({ name: part, prefix: all.slice(0, i + 1).join("/") + "/" }));

  const sortHeader = (
    key: SortKey,
    label: string,
    align: "left" | "right" = "left",
    className?: string,
  ) => {
    const active = sort.key === key;
    return (
      <th
        scope="col"
        aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
        className={cn(
          "h-9 px-3.5 font-medium",
          align === "right" && "text-right",
          className,
        )}
      >
        <button
          type="button"
          onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }))}
          className={cn(
            "-mx-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5 transition-colors hover:bg-muted hover:text-foreground",
            active && "text-foreground",
          )}
        >
          {label}
          {active &&
            (sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
        </button>
      </th>
    );
  };

  return (
    <div className="flex min-w-0 flex-1">
      <main
        className="relative flex min-w-0 flex-1 flex-col"
        onDragEnter={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          dragDepth.current += 1;
          setDragging(true);
        }}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) e.preventDefault();
        }}
        onDragLeave={() => {
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          dragDepth.current = 0;
          setDragging(false);
          requestUpload(droppedFiles(e.dataTransfer));
        }}
      >
        <input
          ref={fileInput}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            requestUpload(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />

        <header className="flex shrink-0 items-center gap-2 px-4 pb-3.5 pt-5 sm:px-7">
          <Button variant="quiet" size="icon" className="-ml-1 md:hidden" onClick={onOpenNav} aria-label="Open sidebar">
            <Menu />
          </Button>
          {titleBlock}
          {bucket.askForCredentials && (
            <Button
              variant="quiet"
              onClick={forgetKeys}
              aria-label="Forget keys"
              title="Forget the keys entered for this session"
              className="max-lg:w-9 max-lg:px-0"
            >
              <KeyRound /> <span className="hidden lg:inline">Forget keys</span>
            </Button>
          )}
          <Button variant="quiet" size="icon" onClick={refresh} aria-label="Refresh" title="Refresh">
            <RefreshCw className={cn(loading && "animate-spin")} />
          </Button>
          <Button onClick={() => setNewFolderOpen(true)} aria-label="New folder" title="New folder">
            <FolderPlus /> <span className="hidden sm:inline">New folder</span>
          </Button>
          <Button variant="primary" onClick={() => fileInput.current?.click()} aria-label="Upload" title="Upload files">
            <Upload /> <span className="hidden sm:inline">Upload</span>
          </Button>
        </header>

        <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 pb-3.5 sm:px-7">
          <nav aria-label="Folder path" className="min-w-0 flex-1">
            <ol className="-ml-2.5 flex min-w-0 items-center gap-0.5 text-[13.5px]">
              <li className="shrink-0">
                <button
                  type="button"
                  onClick={() => setPrefix("")}
                  className={cn(
                    "flex h-[30px] items-center rounded-full px-2.5 transition-colors hover:bg-foreground/5",
                    crumbs.length === 0 ? "bg-muted font-semibold" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {bucket.bucketName}
                </button>
              </li>
              {crumbs.map((crumb, i) => (
                <li key={crumb.prefix} className="flex min-w-0 items-center">
                  <span className="px-0.5 text-muted-foreground/60" aria-hidden>/</span>
                  <button
                    type="button"
                    onClick={() => setPrefix(crumb.prefix)}
                    aria-current={i === crumbs.length - 1 ? "location" : undefined}
                    className={cn(
                      "flex h-[30px] min-w-0 items-center rounded-full px-2.5 transition-colors hover:bg-foreground/5",
                      i === crumbs.length - 1 ? "bg-muted font-semibold" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {crumb.name}
                  </button>
                </li>
              ))}
            </ol>
          </nav>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Filter this page"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-[34px] rounded-full pl-9 text-[13px]"
              aria-label="Filter this page"
            />
          </div>
        </div>

        <div ref={listRef} className="relative min-h-0 flex-1 overflow-auto">
          {loading && objects.length > 0 && (
            <div className="absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden bg-primary/15">
              <div className="h-full w-1/3 animate-shimmer bg-primary" style={{ transform: "translateX(-100%)" }} />
            </div>
          )}

          {error ? (
            <ListingError message={error} errorName={listing.errorName} onRetry={refresh} />
          ) : (
            <div className="px-2 pb-3 sm:px-3.5">
            <table className="w-full table-fixed border-separate border-spacing-x-0 border-spacing-y-[2px] text-sm">
              <thead className="sticky top-0 z-5 bg-background/95 text-left text-xs text-muted-foreground backdrop-blur-sm supports-backdrop-filter:bg-background/80">
                <tr>
                  {sortHeader("name", "Name")}
                  {sortHeader("size", "Size", "right", "w-24 sm:w-28")}
                  {showModified && sortHeader("modified", "Modified", "left", "w-52")}
                </tr>
              </thead>
              <tbody ref={tableRef} onKeyDown={onTableKeyDown}>
                {prefix && !filter && (
                  <tr className="group">
                    <td colSpan={columns} className="rounded-[12px] p-0 transition-colors group-hover:bg-foreground/[0.045]">
                      <button
                        type="button"
                        data-row
                        onClick={() => setPrefix(parentPrefix(prefix))}
                        className="flex h-11 w-full items-center gap-3 rounded-[12px] px-3.5 text-left text-muted-foreground"
                      >
                        <Folder className="size-[18px] shrink-0" strokeWidth={1.75} /> ..
                      </button>
                    </td>
                  </tr>
                )}
                {loading && objects.length === 0
                  ? Array.from({ length: 8 }, (_, i) => <SkeletonRow key={i} showModified={showModified} />)
                  : rows.map((object) => (
                      <ObjectRow
                        key={object.key}
                        object={object}
                        selected={object.key === selected?.key}
                        showModified={showModified}
                        showActions={showActions}
                        folder={object.isFolder ? folderStats[object.key] : undefined}
                        onOpen={() => openRow(object)}
                        onFocus={() => {
                          if (!object.isFolder && selectedKey) setSelectedKey(object.key);
                        }}
                        actions={{
                          download: () => downloadObject(connection, object.key),
                          share: () => setObjectToShare(object.key),
                          copy: () =>
                            copyToClipboard(object.key, object.isFolder ? "Folder path" : "Key"),
                          remove: () =>
                            object.isFolder
                              ? setFolderToDelete(object.key)
                              : setObjectToDelete(object.key),
                        }}
                      />
                    ))}
              </tbody>
            </table>
            </div>
          )}

          {!error && !loading && rows.length === 0 && (
            filter ? (
              <EmptyState
                icon={<Search />}
                title="No matches"
                body={`Nothing on this page matches “${filter.trim()}”.`}
              />
            ) : (
              <EmptyState
                icon={<UploadCloud />}
                title="This folder is empty"
                body="Drop files here or use Upload."
                action={
                  <Button variant="primary" onClick={() => fileInput.current?.click()}>
                    <Upload /> Upload files
                  </Button>
                }
              />
            )
          )}
        </div>

        {!error && (objects.length > 0 || listing.page > 0) && (
          <footer className="flex h-12 shrink-0 items-center justify-between gap-2 border-t px-4 text-xs text-muted-foreground sm:px-7">
            <span className="tabular">
              {filter ? `${rows.length} of ${objects.length}` : objects.length}{" "}
              {objects.length === 1 ? "item" : "items"}
              {listing.page > 0 || listing.hasNextPage ? ` · page ${listing.page + 1}` : ""}
            </span>
            {(listing.page > 0 || listing.hasNextPage) && (
              <div className="flex gap-1">
                <Button size="sm" variant="secondary" className="h-[30px]" onClick={listing.previousPage} disabled={listing.page === 0 || loading}>
                  <ChevronLeft /> Previous
                </Button>
                <Button size="sm" variant="secondary" className="h-[30px]" onClick={listing.nextPage} disabled={!listing.hasNextPage || loading}>
                  Next <ChevronRight />
                </Button>
              </div>
            )}
          </footer>
        )}

        {dragging && (
          <div className="pointer-events-none absolute inset-2 z-20 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary-subtle/90">
            <div className="text-center">
              <UploadCloud className="mx-auto size-8 text-primary-text" />
              <p className="mt-2 font-medium text-primary-text">Drop to upload</p>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                {bucket.bucketName}/{prefix}
              </p>
            </div>
          </div>
        )}

        <UploadQueue
          items={uploads}
          onDismiss={(id) => setUploads((l) => l.filter((u) => u.id !== id))}
        />
      </main>

      {selected && (
        <ObjectPanel
          key={selected.key}
          connection={connection}
          object={selected}
          onClose={() => setSelectedKey(null)}
          onDeleted={() => {
            setSelectedKey(null);
            reload();
          }}
        />
      )}

      <ShareDialog
        open={objectToShare !== null}
        connection={connection}
        objectKey={objectToShare ?? ""}
        onClose={() => setObjectToShare(null)}
      />
      <ConfirmDialog
        open={objectToDelete !== null}
        title="Delete object?"
        description={
          <>
            <span className="break-all font-medium text-foreground">{objectToDelete}</span> will
            be permanently deleted from{" "}
            <span className="font-medium text-foreground">{bucket.bucketName}</span>, unless the
            bucket has versioning enabled.
          </>
        }
        confirmLabel="Delete"
        onConfirm={async () => {
          const key = objectToDelete!;
          await deleteObject(connection, key).catch((err) => {
            throw new Error(describeS3Error(err));
          });
          toast.success(`Deleted ${baseName(key)}`);
          if (selectedKey === key) setSelectedKey(null);
          reload();
        }}
        onClose={() => setObjectToDelete(null)}
      />
      <DeleteFolderDialog
        connection={connection}
        prefix={folderToDelete}
        onClose={() => setFolderToDelete(null)}
        onDeleted={refresh}
      />
      <NewFolderDialog
        open={newFolderOpen}
        connection={connection}
        prefix={prefix}
        onClose={() => setNewFolderOpen(false)}
        onCreated={(p) => setPrefix(p)}
      />
      <ConfirmDialog
        open={replacePrompt !== null}
        title="Replace existing files?"
        description={
          replacePrompt && (
            <>
              {replacePrompt.filter((f) => objects.some((o) => o.key === prefix + f.name)).length} of
              the {replacePrompt.length} files already exist in this folder and will be overwritten.
            </>
          )
        }
        confirmLabel="Replace"
        onConfirm={() => {
          if (replacePrompt) startUploads(replacePrompt);
        }}
        onClose={() => setReplacePrompt(null)}
      />
    </div>
  );
}

const cell = "transition-colors duration-100 first:rounded-l-[12px] last:rounded-r-[12px]";
// A selected row is a blue wash with a fine outline, drawn per cell so the
// whole row reads as one rounded pill.
// (Written out in full: Tailwind only generates classes it can read literally.)
const selectedTone =
  "bg-primary-subtle shadow-[inset_0_1px_0_hsl(var(--accent)/0.32),inset_0_-1px_0_hsl(var(--accent)/0.32)] first:shadow-[inset_1px_0_0_hsl(var(--accent)/0.32),inset_0_1px_0_hsl(var(--accent)/0.32),inset_0_-1px_0_hsl(var(--accent)/0.32)] last:shadow-[inset_-1px_0_0_hsl(var(--accent)/0.32),inset_0_1px_0_hsl(var(--accent)/0.32),inset_0_-1px_0_hsl(var(--accent)/0.32)]";

function ObjectRow({
  object,
  selected,
  showModified,
  showActions,
  folder,
  onOpen,
  onFocus,
  actions,
}: {
  object: S3Object;
  selected: boolean;
  showModified: boolean;
  showActions: boolean;
  folder?: FolderState;
  onOpen: () => void;
  onFocus: () => void;
  actions: RowActionHandlers;
}) {
  const Icon = object.isFolder ? Folder : iconFor(object.key);
  const tone = selected ? selectedTone : "group-hover:bg-foreground/[0.045]";
  const name = baseName(object.key);
  const summary = typeof folder === "object" ? folder : null;
  return (
    <tr className="group">
      <td className={cn(cell, tone, "relative p-0")}>
        <button
          type="button"
          data-row
          onClick={onOpen}
          onFocus={onFocus}
          aria-pressed={object.isFolder ? undefined : selected}
          className={cn(
            "flex h-11 w-full min-w-0 items-center gap-3 rounded-[12px] px-3.5 text-left",
            object.isFolder ? (showActions ? "pr-24" : "pr-12") : showActions && "pr-40",
          )}
          title={name}
        >
          <Icon
            className={cn(
              "size-[18px] shrink-0",
              object.isFolder
                ? "fill-primary/15 text-primary-text"
                : selected
                  ? "text-primary-text"
                  : "text-muted-foreground",
            )}
            strokeWidth={1.75}
          />
          <span className={cn("truncate", object.isFolder && "font-medium", selected && "font-medium text-primary-text")}>
            {name}
          </span>
        </button>
        <RowActions isFolder={object.isFolder} name={name} actions={actions} full={showActions} />
      </td>
      <td
        className={cn(cell, tone, "px-3.5 text-right text-muted-foreground tabular")}
        title={summary ? folderTitle(summary) : undefined}
      >
        {object.isFolder
          ? folder === "loading"
            ? <Pending />
            : summary
              ? `${prettyBytes(summary.bytes)}${summary.partial ? "+" : ""}`
              : "—"
          : prettyBytes(object.size)}
      </td>
      {showModified && (
        <td className={cn(cell, tone, "truncate px-3.5 text-muted-foreground tabular")}>
          {object.isFolder
            ? folder === "loading"
              ? <Pending />
              : formatDate(summary?.lastModified)
            : formatDate(object.lastModified)}
        </td>
      )}
    </tr>
  );
}

interface RowActionHandlers {
  download: () => void;
  share: () => void;
  copy: () => void;
  remove: () => void;
}

/**
 * Quick actions at the end of every row. When the list is too narrow for
 * them (phones, or sidebar and details panel both open) a tap opens the
 * details instead; only folder delete stays, since folders have no details.
 */
function RowActions({
  isFolder,
  name,
  actions,
  full,
}: {
  isFolder: boolean;
  name: string;
  actions: RowActionHandlers;
  full: boolean;
}) {
  const action = (
    label: string,
    icon: React.ReactNode,
    onClick: () => void,
    className?: string,
  ) => (
    <Button
      variant="quiet"
      size="icon-sm"
      onClick={onClick}
      aria-label={`${label}: ${name}`}
      title={label}
      className={className}
    >
      {icon}
    </Button>
  );

  return (
    <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
      {isFolder ? (
        <>
          {full && action("Copy path", <Copy />, actions.copy)}
          {action("Delete folder", <Trash2 />, actions.remove, "hover:text-danger")}
        </>
      ) : (
        full && (
        <div className="flex items-center gap-0.5">
          {action("Download", <Download />, actions.download)}
          {action("Share link", <Link2 />, actions.share)}
          {action("Copy key", <Copy />, actions.copy)}
          {action("Delete", <Trash2 />, actions.remove, "hover:text-danger")}
        </div>
        )
      )}
    </div>
  );
}

function folderTitle(summary: { objects: number; partial: boolean }): string {
  const count = summary.objects.toLocaleString();
  return summary.partial
    ? `More than ${count} objects; totals cover the first ${count}`
    : `${count} ${summary.objects === 1 ? "object" : "objects"}`;
}

function Pending() {
  return (
    <span
      className="inline-block h-2.5 w-12 animate-pulse rounded-full bg-muted align-middle"
      aria-label="Calculating"
    />
  );
}

function SkeletonRow({ showModified }: { showModified: boolean }) {
  return (
    <tr>
      <td className="h-10 px-3">
        <div className="flex items-center gap-3">
          <div className="size-[18px] rounded-md bg-muted" />
          <div className="h-3 w-2/5 rounded-full bg-muted" />
        </div>
      </td>
      <td className="px-3">
        <div className="ml-auto h-3 w-12 rounded-full bg-muted" />
      </td>
      {showModified && (
        <td className="px-3">
          <div className="h-3 w-28 rounded-full bg-muted" />
        </td>
      )}
    </tr>
  );
}

function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mx-auto mt-20 flex max-w-sm flex-col items-center px-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl border bg-subtle text-muted-foreground shadow-xs [&_svg]:size-6">
        {icon}
      </div>
      <h2 className="mt-4 text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function MobileBar({ onOpenNav, title }: { onOpenNav: () => void; title: string }) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 md:hidden">
      <Button variant="quiet" size="icon" className="-ml-1" onClick={onOpenNav} aria-label="Open sidebar">
        <Menu />
      </Button>
      <span className="truncate font-semibold">{title}</span>
    </header>
  );
}

/** One fact about the connection (bucket, region, endpoint) as a small chip. */
function IdentityChip({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 min-w-0 max-w-full items-center gap-1.5 rounded-full bg-muted px-2.5 text-muted-foreground",
        className,
      )}
    >
      <span className="shrink-0 text-muted-foreground/80">{label}</span>
      <span className={cn("truncate text-foreground/85", mono && "font-mono text-[11.5px]")}>{value}</span>
    </span>
  );
}
