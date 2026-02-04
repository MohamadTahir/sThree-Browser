import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { BucketConfig, Group } from "../types";
import { updateBucketConfig, loadConfigs } from "../services/storageService";
import { useToast } from "./ui/use-toast";

interface EditBucketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bucketId: string | null;
  config: BucketConfig | null;
  onSuccess: () => void;
}

export default function EditBucketModal({
  open,
  onOpenChange,
  bucketId,
  config,
  onSuccess,
}: EditBucketModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [formData, setFormData] = useState({
    nickname: "",
    bucket_name: "",
    access_key: "",
    secret_key: "",
    region: "us-east-1",
    endpoint: "",
    group_id: "",
  });

  useEffect(() => {
    if (open) {
      loadGroups();
    }
  }, [open]);

  const loadGroups = async () => {
    const configs = await loadConfigs();
    setGroups(Object.values(configs.groups || {}));
  };

  // Populate form when config changes or modal opens
  useEffect(() => {
    if (open && config) {
      setFormData({
        nickname: config.nickname,
        bucket_name: config.bucket_name,
        access_key: config.access_key,
        secret_key: config.secret_key,
        region: config.region,
        endpoint: config.endpoint || "",
        group_id: config.group_id || "",
      });
    }
  }, [config, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bucketId || !config) {
      console.error("Missing bucketId or config", { bucketId, config });
      return;
    }

    setLoading(true);

    try {
      // Check for duplicate connection names (excluding current bucket)
      const configs = await loadConfigs();
      const nicknameLower = formData.nickname.toLowerCase().trim();
      const existingBucket = Object.entries(configs.buckets).find(
        ([id, cfg]) => 
          id !== bucketId && 
          cfg.nickname.toLowerCase().trim() === nicknameLower
      );

      if (existingBucket) {
        toast({
          variant: "destructive",
          title: "Duplicate Connection Name",
          description: `A connection with the name "${formData.nickname}" already exists. Please use a different name.`,
        });
        setLoading(false);
        return;
      }

      console.log("Updating bucket:", bucketId, formData);
      await updateBucketConfig(bucketId, {
        nickname: formData.nickname,
        bucket_name: formData.bucket_name,
        access_key: formData.access_key,
        secret_key: formData.secret_key,
        region: formData.region,
        endpoint: formData.endpoint.trim() || undefined,
        group_id: formData.group_id || null,
      });

      console.log("Bucket updated successfully");
      toast({
        variant: "success",
        title: "Bucket Updated",
        description: `Connection "${formData.nickname}" has been updated successfully.`,
      });
      onSuccess();
    } catch (error) {
      console.error("Failed to update bucket:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        variant: "destructive",
        title: "Failed to Update Bucket",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!config) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit S3 Bucket</DialogTitle>
          <DialogDescription>
            Update the configuration for this S3 bucket or S3-compatible storage.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-nickname">Connection Name</Label>
              <Input
                id="edit-nickname"
                placeholder="My S3 Connection"
                value={formData.nickname}
                onChange={(e) =>
                  setFormData({ ...formData, nickname: e.target.value })
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-bucket_name">Bucket Name</Label>
              <Input
                id="edit-bucket_name"
                placeholder="my-bucket-name"
                value={formData.bucket_name}
                onChange={(e) =>
                  setFormData({ ...formData, bucket_name: e.target.value })
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-access_key">Access Key</Label>
              <Input
                id="edit-access_key"
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
              <Label htmlFor="edit-secret_key">Secret Key</Label>
              <Input
                id="edit-secret_key"
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
              <Label htmlFor="edit-region">Region</Label>
              <Input
                id="edit-region"
                placeholder="us-east-1"
                value={formData.region}
                onChange={(e) =>
                  setFormData({ ...formData, region: e.target.value })
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-endpoint">Endpoint (Optional)</Label>
              <Input
                id="edit-endpoint"
                placeholder="https://storage.example.com"
                value={formData.endpoint}
                onChange={(e) =>
                  setFormData({ ...formData, endpoint: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for AWS S3. For S3-compatible storage, enter the endpoint URL.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-group">Folder (Optional)</Label>
              <Select
                value={formData.group_id || "none"}
                onValueChange={(value) =>
                  setFormData({ ...formData, group_id: value === "none" ? "" : value })
                }
              >
                <SelectTrigger id="edit-group">
                  <SelectValue placeholder="No folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No folder</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: group.color || "#6b7280" }}
                        />
                        {group.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Optionally assign this bucket to a folder for better organization.
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
              {loading ? "Updating..." : "Update Bucket"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
