import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface AddBucketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function AddBucketModal({
  open,
  onOpenChange,
  onSuccess,
}: AddBucketModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nickname: "",
    bucket_name: "",
    access_key: "",
    secret_key: "",
    region: "us-east-1",
    endpoint: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await invoke("add_bucket_config", {
        nickname: formData.nickname,
        bucketName: formData.bucket_name,
        accessKey: formData.access_key,
        secretKey: formData.secret_key,
        region: formData.region,
        endpoint: formData.endpoint.trim() ? formData.endpoint.trim() : null,
      });

      setFormData({
        nickname: "",
        bucket_name: "",
        access_key: "",
        secret_key: "",
        region: "us-east-1",
        endpoint: "",
      });
      onSuccess();
    } catch (error) {
      console.error("Failed to add bucket:", error);
      alert(`Failed to add bucket: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add S3 Bucket</DialogTitle>
          <DialogDescription>
            Configure access to an S3 bucket or S3-compatible storage (MinIO, AWS S3, etc.).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nickname">Account Nickname</Label>
              <Input
                id="nickname"
                placeholder="My AWS Account"
                value={formData.nickname}
                onChange={(e) =>
                  setFormData({ ...formData, nickname: e.target.value })
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bucket_name">Bucket Name</Label>
              <Input
                id="bucket_name"
                placeholder="my-bucket-name"
                value={formData.bucket_name}
                onChange={(e) =>
                  setFormData({ ...formData, bucket_name: e.target.value })
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="access_key">Access Key</Label>
              <Input
                id="access_key"
                type="password"
                placeholder="AKIAIOSFODNN7EXAMPLE"
                value={formData.access_key}
                onChange={(e) =>
                  setFormData({ ...formData, access_key: e.target.value })
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="secret_key">Secret Key</Label>
              <Input
                id="secret_key"
                type="password"
                placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                value={formData.secret_key}
                onChange={(e) =>
                  setFormData({ ...formData, secret_key: e.target.value })
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="region">Region</Label>
              <Input
                id="region"
                placeholder="us-east-1"
                value={formData.region}
                onChange={(e) =>
                  setFormData({ ...formData, region: e.target.value })
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endpoint">Endpoint (Optional)</Label>
              <Input
                id="endpoint"
                placeholder="s3.dev.krd or https://s3.dev.krd"
                value={formData.endpoint}
                onChange={(e) =>
                  setFormData({ ...formData, endpoint: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                S3-compatible endpoint (e.g., s3.dev.krd or https://s3.dev.krd for MinIO).
                Leave empty for AWS S3 (will auto-detect from region).
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Bucket"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
