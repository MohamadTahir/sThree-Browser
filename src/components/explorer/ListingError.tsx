import { useState } from "react";
import { Check, CircleAlert, Copy, RefreshCw } from "lucide-react";
import { isTauri } from "@/lib/tauri";
import { Button } from "../ui/button";

function corsRule(origin: string): string {
  return JSON.stringify(
    [
      {
        AllowedOrigins: [origin],
        AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
        AllowedHeaders: ["*"],
        ExposeHeaders: ["ETag", "Content-Length", "Content-Type", "Last-Modified"],
        MaxAgeSeconds: 3600,
      },
    ],
    null,
    2,
  );
}

/** Listing failure, with the bucket CORS rule to add when the browser was blocked. */
export default function ListingError({
  message,
  errorName,
  onRetry,
}: {
  message: string;
  errorName: string | null;
  onRetry: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const network = !isTauri() && (errorName === "TypeError" || errorName === "NetworkError");
  const rule = network ? corsRule(window.location.origin) : "";

  const copy = async () => {
    await navigator.clipboard.writeText(rule).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="mx-auto mt-10 w-full max-w-lg px-4">
      <div className="flex items-start gap-3">
        <CircleAlert className="mt-0.5 size-5 shrink-0 text-danger" />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Couldn&apos;t load this folder</h2>
          <p className="mt-1 text-sm text-muted-foreground">{message}</p>
          {network && (
            <div className="mt-4">
              <p className="text-sm">
                In the browser, the bucket must allow this site. Add this CORS rule to the
                bucket (S3 console → Permissions → CORS, or your provider&apos;s equivalent):
              </p>
              <div className="relative mt-2">
                <pre className="max-h-56 overflow-auto rounded-md border bg-subtle p-3 font-mono text-xs leading-5">
                  {rule}
                </pre>
                <Button size="sm" className="absolute right-2 top-2" onClick={copy}>
                  {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                The desktop app doesn&apos;t need this.
              </p>
            </div>
          )}
          <Button className="mt-4" onClick={onRetry}>
            <RefreshCw /> Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
