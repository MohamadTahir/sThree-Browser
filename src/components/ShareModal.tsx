import { useState } from "react";
import { Copy, Check, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { S3Object } from "../types";
import { getPresignedUrl } from "../services/s3Service";
import { loadConfigs } from "../services/storageService";
import { useToast } from "./ui/use-toast";

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  object: S3Object | null;
  bucketId: string | null;
  bucketName: string | null;
}

const DURATION_OPTIONS = [
  { label: "1 hour", value: 3600 },
  { label: "6 hours", value: 21600 },
  { label: "24 hours", value: 86400 },
  { label: "7 days", value: 604800 },
  { label: "30 days", value: 2592000 },
];

export default function ShareModal({
  open,
  onOpenChange,
  object,
  bucketId,
  bucketName,
}: ShareModalProps) {
  const { toast } = useToast();
  const [duration, setDuration] = useState(3600); // Default 1 hour
  const [customDuration, setCustomDuration] = useState("");
  const [useCustomDuration, setUseCustomDuration] = useState(false);
  const [presignedUrl, setPresignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerateUrl = async () => {
    if (!object || !bucketId || !bucketName) return;

    const expiresIn = useCustomDuration
      ? parseInt(customDuration, 10)
      : duration;

    if (isNaN(expiresIn) || expiresIn <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Duration",
        description: "Please enter a valid duration in seconds (greater than 0).",
      });
      return;
    }

    // Maximum 7 days (604800 seconds) for security
    const MAX_DURATION = 604800;
    if (expiresIn > MAX_DURATION) {
      toast({
        variant: "destructive",
        title: "Duration Too Long",
        description: `Maximum duration is ${MAX_DURATION / 86400} days (${MAX_DURATION} seconds).`,
      });
      return;
    }

    try {
      setLoading(true);
      setPresignedUrl(null);

      const configs = await loadConfigs();
      const config = configs.buckets[bucketId];

      if (!config) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Bucket configuration not found.",
        });
        return;
      }

      const url = await getPresignedUrl(config, bucketName, object.key, expiresIn);
      setPresignedUrl(url);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      toast({
        variant: "destructive",
        title: "Failed to Generate Link",
        description: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!presignedUrl) return;

    try {
      await navigator.clipboard.writeText(presignedUrl);
      setCopied(true);
      toast({
        variant: "success",
        title: "Copied",
        description: "Link copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to Copy",
        description: "Could not copy to clipboard.",
      });
    }
  };

  const handleClose = () => {
    setPresignedUrl(null);
    setDuration(3600);
    setCustomDuration("");
    setUseCustomDuration(false);
    setCopied(false);
    onOpenChange(false);
  };

  if (!object) return null;

  const fileName = object.key.split("/").pop() || object.key;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Share File</DialogTitle>
          <DialogDescription>
            Generate a temporary link to share "{fileName}". Configure how long the link should remain valid.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Duration Selection */}
          <div className="space-y-2">
            <Label>Link Validity Duration</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DURATION_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={duration === option.value && !useCustomDuration ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setDuration(option.value);
                    setUseCustomDuration(false);
                  }}
                  disabled={loading}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={useCustomDuration ? "default" : "outline"}
                size="sm"
                onClick={() => setUseCustomDuration(true)}
                disabled={loading}
              >
                Custom
              </Button>
              {useCustomDuration && (
                <div className="flex-1 flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Seconds"
                    value={customDuration}
                    onChange={(e) => setCustomDuration(e.target.value)}
                    min="1"
                    max="604800"
                    disabled={loading}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">seconds</span>
                </div>
              )}
            </div>
          </div>

          {/* Generated URL */}
          {presignedUrl && (
            <div className="space-y-2">
              <Label>Shareable Link</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={presignedUrl}
                  readOnly
                  className="flex-1 font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  title="Copy link"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This link will expire in {useCustomDuration ? customDuration : DURATION_OPTIONS.find(o => o.value === duration)?.label || `${duration} seconds`}.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Close
          </Button>
          <Button
            type="button"
            onClick={handleGenerateUrl}
            disabled={loading || (useCustomDuration && (!customDuration || parseInt(customDuration, 10) <= 0))}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : presignedUrl ? (
              "Regenerate Link"
            ) : (
              "Generate Link"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
