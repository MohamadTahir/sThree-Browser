import { useMemo, useState, useEffect, useCallback } from "react";
import { Copy, Check, Share2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Bucket, S3Object } from "../types";
import { getPresignedUrl } from "../services/s3Service";
import { PreSignUrlRequest } from "@/models/dto/requests/PreSignUrl";
import { toast } from "react-toastify";

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  object: S3Object;
  bucket: Bucket;
}

const REGENERATE_DEBOUNCE_MS = 200;

function formatLinkExpiry(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).format(d);
}

export default function ShareModal({
  open,
  object,
  bucket,
  onClose,
}: ShareModalProps) {
  const [days, setDays] = useState(0);
  const [hours, setHours] = useState(12);
  const [minutes, setMinutes] = useState(0);

  const [presignedUrl, setPresignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const totalSeconds = useMemo(() => {
    return days * 86400 + hours * 3600 + minutes * 60;
  }, [days, hours, minutes]);

  const expiryDate = useMemo(() => {
    const now = new Date();
    now.setSeconds(now.getSeconds() + totalSeconds);
    return now;
  }, [totalSeconds]);

  const resetState = () => {
    setPresignedUrl(null);
    setDays(0);
    setHours(12);
    setMinutes(0);
    setCopied(false);
    setLoading(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) return;
    resetState();
    onClose();
  };

  const fetchPresigned = useCallback(async () => {
    if (!object || !bucket) {
      setPresignedUrl(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const getPresignedUrlRequest: PreSignUrlRequest = {
        bucket: bucket,
        key: object.key,
        expiresIn: totalSeconds,
      };

      const response = await getPresignedUrl(getPresignedUrlRequest);
      setPresignedUrl(response.url);
    } catch {
      toast.error("Failed to generate presigned URL");
      setPresignedUrl(null);
    } finally {
      setLoading(false);
    }
  }, [object, bucket, totalSeconds]);

  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => {
      void fetchPresigned();
    }, REGENERATE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [open, fetchPresigned, totalSeconds]);

  const handleCopy = async () => {
    if (!presignedUrl) return;

    try {
      await navigator.clipboard.writeText(presignedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  if (!object) return null;

  const fileName = object.key.split("/").pop() || object.key;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="overflow-hidden sm:max-w-[620px]">
        <Header />

        <Description fileName={fileName} />

        <LinkDurationPreview expiryPreview={expiryDate} />

        <Duration
          days={days}
          hours={hours}
          minutes={minutes}
          setDays={setDays}
          setHours={setHours}
          setMinutes={setMinutes}
        />

        <ShareLink
          loading={loading}
          presignedUrl={presignedUrl}
          copied={copied}
          handleCopy={handleCopy}
        />
      </DialogContent>
    </Dialog>
  );
}

function Header() {
  return (
    <DialogHeader>
      <div className="flex flex-col items-start">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Share2 className="h-[1.125rem] w-[1.125rem]" strokeWidth={2} />
          </div>
          <DialogTitle className="text-left text-lg font-semibold leading-tight tracking-tight">
            Share File
          </DialogTitle>
        </div>
      </div>
    </DialogHeader>
  );
}

function Description({ fileName }: { fileName: string }) {
  return (
    <DialogDescription className="flex flex-col gap-1 text-left text-sm">
      <span className="block">
        The following URL lets you share{" "}
        <span className="font-medium text-foreground">{fileName}</span> without
        requiring a login.
      </span>
      <span className="block">
        The URL expires automatically at the earlier of your configured time or
        the maximum allowed duration (7 days).
      </span>
    </DialogDescription>
  );
}

function LinkDurationPreview({ expiryPreview }: { expiryPreview: Date }) {
  return (
    <p className="leading-snug text-muted-foreground text-sm">
      Link will be available until:{" "}
      <span className="font-medium text-foreground">
        {formatLinkExpiry(expiryPreview)}
      </span>
    </p>
  );
}

function Duration({
  days,
  hours,
  minutes,
  setDays,
  setHours,
  setMinutes,
}: {
  days: number;
  hours: number;
  minutes: number;
  setDays: (days: number) => void;
  setHours: (hours: number) => void;
  setMinutes: (minutes: number) => void;
}) {
  const durationInput = (
    value: number,
    description: string,
    max: number,
    onChange: (value: number) => void,
  ) => (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        value={value}
        onChange={(e) => {
          let value = Number.parseInt(e.target.value, 10) || 0;
          value = Math.max(0, value);
          value = Math.min(value, max);
          onChange(value);
        }}
        className="h-9 w-20 tabular-nums"
      />
      <span className="text-sm text-muted-foreground">{description}</span>
    </div>
  );

  const isValid =
    days * 86400 + hours * 3600 + minutes * 60 <= 60 * 60 * 24 * 7;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">Active for</p>

      <div className="flex flex-row items-center justify-between gap-x-5">
        {durationInput(days, "Days", 7, setDays)}
        {durationInput(hours, "Hours", 23, setHours)}
        {durationInput(minutes, "Minutes", 59, setMinutes)}
      </div>

      {!isValid && (
        <p className="text-sm text-destructive">
          The total duration cannot exceed 7 days.
        </p>
      )}
    </div>
  );
}

function ShareLink({
  loading,
  presignedUrl,
  copied,
  handleCopy,
}: {
  loading: boolean;
  presignedUrl: string | null;
  copied: boolean;
  handleCopy: () => void;
}) {
  const placeholder = loading
    ? "Generating link…"
    : "Your share link will appear here";

  return (
    <div className="flex flex-row gap-1">
      <Input
        readOnly
        value={presignedUrl ?? ""}
        placeholder={placeholder}
        className="font-mono text-xs"
      />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-muted-foreground hover:text-foreground"
        onClick={handleCopy}
        disabled={loading}
        title="Copy link"
      >
        {copied ? (
          <Check className="h-4 w-4 text-primary" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
