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
import { Bucket, Credential, Group } from "../types";
import { updateBucket, loadConfigs } from "../services/storageService";
import { useToast } from "./ui/use-toast";

interface EditBucketModalProps {
  open: boolean;
  bucketId: string | null;
  bucket: Bucket | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditBucketModal({
  open,
  bucketId,
  bucket,
  onClose,
  onSuccess,
}: EditBucketModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [formData, setFormData] = useState({
    nickname: "",
    bucket_name: "",
    region: "us-east-1",
    endpoint: "",
    credential_id: "",
    group_id: "",
  });

  useEffect(() => {
    if (open) {
      loadInitialData();
    }
  }, [open]);

  const loadInitialData = async () => {
    const configs = await loadConfigs();
    setGroups(Object.values(configs.groups || {}));
    setCredentials(Object.values(configs.credentials || {}));
  };

  // Populate form when config changes or modal opens
  useEffect(() => {
    if (open && bucket) {
      setFormData({
        nickname: bucket.nickname,
        bucket_name: bucket.bucket_name,
        region: bucket.region,
        endpoint: bucket.endpoint || "",
        credential_id: bucket.credential_id,
        group_id: bucket.group_id || "",
      });
    }
  }, [bucket, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bucketId || !bucket) {
      console.error("Missing bucketId or config", { bucketId, config: bucket });
      return;
    }

    setLoading(true);

    try {
      await updateBucket(bucketId, {
        nickname: formData.nickname,
        bucket_name: formData.bucket_name,
        region: formData.region,
        endpoint: formData.endpoint.trim() || undefined,
        credential_id: formData.credential_id,
        group_id: formData.group_id || null,
      });

      // Refresh groups list in case a new folder was created elsewhere
      await loadInitialData();
      // Call onSuccess to refresh the sidebar immediately - this will reload configs
      // Use setTimeout to ensure the save operation completes before reloading
      await new Promise(resolve => setTimeout(resolve, 0));
      onSuccess();
      toast({
        variant: "success",
        title: "Bucket Updated",
        description: `Connection "${formData.nickname}" has been updated successfully.`,
      });
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

  if (!bucket) return null;

  return (
    <Dialog open={open}>
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
              <Label htmlFor="edit-credential">Credentials</Label>
              <Select
                value={formData.credential_id || "none"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    credential_id: value === "none" ? "" : value,
                  })
                }
              >
                <SelectTrigger id="edit-credential">
                  <SelectValue placeholder="Select credentials" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select credentials</SelectItem>
                  {credentials.map((cred) => (
                    <SelectItem key={cred.id} value={cred.id}>
                      {cred.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose which reusable credentials this bucket should use.
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
              onClick={onClose}
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
