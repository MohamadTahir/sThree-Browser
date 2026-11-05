import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import prettyBytes from "pretty-bytes";
import { toast } from "react-toastify";
import {
  Connection,
  deleteObject,
  describeS3Error,
  getPresignedUrl,
  headObject,
  ObjectHead,
  readTextPreview,
  TEXT_PREVIEW_BYTES,
} from "@/services/s3Service";
import { S3Object } from "@/models/types";
import { baseName, formatDate } from "@/lib/utils";
import { openExternal } from "@/lib/tauri";
import { Button } from "../ui/button";
import ConfirmDialog from "../ConfirmDialog";
import ShareDialog from "./ShareDialog";
import { downloadObject } from "./objectActions";

const TEXT_TYPES = /^(text\/|application\/(json|xml|yaml|x-yaml|javascript|typescript|x-sh|toml|sql|graphql|ld\+json))/;
const TEXT_EXTENSIONS = /\.(txt|md|markdown|json|ya?ml|xml|csv|tsv|log|ini|conf|cfg|toml|env|sh|js|mjs|ts|tsx|jsx|css|scss|html?|py|rb|go|rs|java|kt|c|h|cpp|hpp|cs|php|sql|graphql|dockerfile)$/i;
const PREVIEW_URL_SECONDS = 15 * 60;

type Preview =
  | { kind: "none" }
  | { kind: "loading" }
  | { kind: "image" | "video" | "audio"; url: string }
  | { kind: "pdf" }
  | { kind: "text"; text: string; truncated: boolean }
  | { kind: "error"; message: string };

function previewKind(head: ObjectHead, key: string): Preview["kind"] {
  const type = head.contentType.toLowerCase();
  if (/^image\/(png|jpe?g|gif|webp|avif|bmp|svg\+xml)$/.test(type)) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  if (type === "application/pdf") return "pdf";
  if (TEXT_TYPES.test(type) || TEXT_EXTENSIONS.test(key)) return "text";
  return "none";
}

export default function ObjectPanel({
  connection,
  object,
  onClose,
  onDeleted,
}: {
  connection: Connection;
  object: S3Object;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [head, setHead] = useState<ObjectHead | null>(null);
  const [headError, setHeadError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview>({ kind: "loading" });
  const [sharing, setSharing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load metadata and a preview for the selected object; drop stale results.
  useEffect(() => {
    const controller = new AbortController();
    setHead(null);
    setHeadError(null);
    setPreview({ kind: "loading" });

    (async () => {
      let info: ObjectHead;
      try {
        info = await headObject(connection, object.key, controller.signal);
      } catch (error) {
        if (controller.signal.aborted) return;
        setHeadError(describeS3Error(error));
        setPreview({ kind: "none" });
        return;
      }
      if (controller.signal.aborted) return;
      setHead(info);

      const kind = previewKind(info, object.key);
      try {
        if (kind === "image" || kind === "video" || kind === "audio") {
          const url = await getPresignedUrl(connection, object.key, PREVIEW_URL_SECONDS);
          if (!controller.signal.aborted) setPreview({ kind, url });
        } else if (kind === "text") {
          const text = await readTextPreview(connection, object.key, controller.signal);
          if (!controller.signal.aborted) {
            setPreview({ kind, text, truncated: info.contentLength > TEXT_PREVIEW_BYTES });
          }
        } else {
          setPreview({ kind } as Preview);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setPreview({ kind: "error", message: describeS3Error(error) });
        }
      }
    })();

    return () => controller.abort();
  }, [connection, object.key]);

  const name = baseName(object.key);

  const download = async () => {
    setDownloading(true);
    await downloadObject(connection, object.key);
    setDownloading(false);
  };

  const openPdf = async () => {
    try {
      await openExternal(await getPresignedUrl(connection, object.key, PREVIEW_URL_SECONDS));
    } catch (error) {
      toast.error(describeS3Error(error));
    }
  };

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(object.key);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy to the clipboard.");
    }
  };

  const remove = async () => {
    await deleteObject(connection, object.key).catch((error) => {
      throw new Error(describeS3Error(error));
    });
    toast.success(`Deleted ${name}`);
    onDeleted();
  };

  return (
    <aside
      className="fixed inset-0 z-30 flex flex-col bg-sidebar lg:static lg:z-auto lg:w-[360px] lg:shrink-0 lg:border-l"
      aria-label="Object details"
    >
      <div className="flex h-16 shrink-0 items-center gap-2 px-4 lg:px-5">
        <Button variant="quiet" size="icon" className="lg:hidden" onClick={onClose} aria-label="Back to list">
          <ArrowLeft />
        </Button>
        <h2 className="min-w-0 flex-1 truncate text-base font-semibold [font-stretch:106%]" title={name}>
          {name}
        </h2>
        <Button variant="quiet" size="icon" className="hidden lg:inline-flex" onClick={onClose} aria-label="Close details">
          <X />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <PreviewArea preview={preview} name={name} onOpenPdf={openPdf} />

        <div className="grid gap-2 px-5 pb-5">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="primary" onClick={download} loading={downloading}>
              {!downloading && <Download />} Download
            </Button>
            <Button onClick={() => setSharing(true)}>
              <Link2 /> Share link
            </Button>
          </div>
        </div>

        <dl className="mx-5 mb-5 grid grid-cols-[112px_1fr] gap-y-2.5 rounded-2xl border bg-raised gloss p-4 text-sm">
          <dt className="text-muted-foreground">Size</dt>
          <dd className="tabular">
            {prettyBytes(head?.contentLength ?? object.size)}
          </dd>
          <dt className="text-muted-foreground">Type</dt>
          <dd className="break-all">{head?.contentType ?? "…"}</dd>
          <dt className="text-muted-foreground">Modified</dt>
          <dd className="tabular">{formatDate(head?.lastModified ?? object.lastModified)}</dd>
          <dt className="text-muted-foreground">Storage class</dt>
          <dd>{head ? (head.storageClass ?? "STANDARD") : "…"}</dd>
          {head?.etag && (
            <>
              <dt className="text-muted-foreground">ETag</dt>
              <dd className="truncate tabular" title={head.etag}>
                {head.etag.replace(/"/g, "")}
              </dd>
            </>
          )}
        </dl>
        {headError && (
          <p className="mx-5 mb-5 rounded-md bg-danger-subtle px-3 py-2 text-xs text-danger">{headError}</p>
        )}

        <div className="mx-5 border-t py-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Key</span>
            <Button variant="quiet" size="sm" onClick={copyKey}>
              {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="break-all rounded-lg border bg-subtle px-3 py-2.5 font-mono text-xs leading-5">
            {object.key}
          </p>
        </div>

        <div className="mx-5 border-t py-5">
          <Button variant="danger-outline" className="w-full" onClick={() => setDeleting(true)}>
            <Trash2 /> Delete object
          </Button>
        </div>
      </div>

      <ShareDialog
        open={sharing}
        connection={connection}
        objectKey={object.key}
        onClose={() => setSharing(false)}
      />
      <ConfirmDialog
        open={deleting}
        title="Delete object?"
        description={
          <>
            <span className="break-all font-medium text-foreground">{object.key}</span> will be
            permanently deleted from{" "}
            <span className="font-medium text-foreground">{connection.bucket.bucketName}</span>
            , unless the bucket has versioning enabled.
          </>
        }
        confirmLabel="Delete"
        onConfirm={remove}
        onClose={() => setDeleting(false)}
      />
    </aside>
  );
}

function PreviewArea({
  preview,
  name,
  onOpenPdf,
}: {
  preview: Preview;
  name: string;
  onOpenPdf: () => void;
}) {
  const frame = "mx-5 mb-5 flex min-h-44 items-center justify-center overflow-hidden rounded-[18px] border bg-subtle shadow-[0_20px_40px_-24px_rgb(0_0_0/0.45)]";

  switch (preview.kind) {
    case "loading":
      return (
        <div className={frame}>
          <Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Loading preview" />
        </div>
      );
    case "image":
      return (
        <div className={`${frame} bg-[repeating-conic-gradient(hsl(var(--muted))_0_25%,transparent_0_50%)] bg-size-[16px_16px]`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview.url} alt={name} className="max-h-72 w-auto object-contain" referrerPolicy="no-referrer" />
        </div>
      );
    case "video":
      return (
        <div className={frame}>
          <video src={preview.url} controls preload="metadata" className="max-h-72 w-full bg-black" />
        </div>
      );
    case "audio":
      return (
        <div className={`${frame} p-3`}>
          <audio src={preview.url} controls preload="metadata" className="w-full" />
        </div>
      );
    case "text":
      return (
        <div className="mx-5 mb-5 overflow-hidden rounded-[18px] border bg-subtle">
          <pre className="max-h-72 overflow-auto p-3 font-mono text-xs leading-5">
            {preview.text || <span className="text-muted-foreground">Empty file</span>}
          </pre>
          {preview.truncated && (
            <p className="border-t px-3 py-1.5 text-xs text-muted-foreground">
              Showing the first {prettyBytes(TEXT_PREVIEW_BYTES)}.
            </p>
          )}
        </div>
      );
    case "pdf":
      return (
        <div className={`${frame} flex-col gap-2 p-4`}>
          <FileText className="size-6 text-muted-foreground" />
          <Button size="sm" onClick={onOpenPdf}>
            <ExternalLink /> Open PDF
          </Button>
        </div>
      );
    case "error":
      return (
        <div className={`${frame} p-4 text-center text-xs text-muted-foreground`}>
          Preview unavailable. {preview.message}
        </div>
      );
    default:
      return (
        <div className={`${frame} text-xs text-muted-foreground`}>No preview for this file type</div>
      );
  }
}
