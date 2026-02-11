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
import { addBucketConfig, loadConfigs } from "../services/storageService";
import { CredentialConfig, Group } from "../types";
import { useToast } from "./ui/use-toast";

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
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [credentials, setCredentials] = useState<CredentialConfig[]>([]);
  const [formData, setFormData] = useState({
    nickname: "",
    bucket_name: "",
    credential_id: "",
    region: "us-east-1",
    endpoint: "",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check for duplicate connection names
      const configs = await loadConfigs();
      const nicknameLower = formData.nickname.toLowerCase().trim();
      const existingBucket = Object.entries(configs.buckets).find(
        ([_, config]) => config.nickname.toLowerCase().trim() === nicknameLower
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

      if (!formData.credential_id) {
        throw new Error("Please select credentials for this bucket.");
      }

      await addBucketConfig({
        nickname: formData.nickname,
        bucket_name: formData.bucket_name,
        credential_id: formData.credential_id,
        region: formData.region,
        endpoint: formData.endpoint.trim() || undefined,
        group_id: formData.group_id || null,
      });

      const addedNickname = formData.nickname;
      setFormData({
        nickname: "",
        bucket_name: "",
        credential_id: "",
        region: "us-east-1",
        endpoint: "",
        group_id: "",
      });
      toast({
        variant: "success",
        title: "Bucket Added",
        description: `Connection "${addedNickname}" has been added successfully.`,
      });
      // Refresh groups list in case a new folder was created elsewhere
      await loadInitialData();
      onSuccess();
    } catch (error) {
      console.error("Failed to add bucket:", error);
      toast({
        variant: "destructive",
        title: "Failed to Add Bucket",
        description: error instanceof Error ? error.message : String(error),
      });
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
            Configure access to an S3 bucket or S3-compatible storage.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nickname">Connection Name</Label>
              <Input
                id="nickname"
                placeholder="My S3 Connection"
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
              <Label htmlFor="credential">Credentials</Label>
              <Select
                value={formData.credential_id || "none"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    credential_id: value === "none" ? "" : value,
                  })
                }
              >
                <SelectTrigger id="credential">
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
                Choose reusable credentials to use for this bucket.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="group">Folder (Optional)</Label>
              <Select
                value={formData.group_id || "none"}
                onValueChange={(value) =>
                  setFormData({ ...formData, group_id: value === "none" ? "" : value })
                }
              >
                <SelectTrigger id="group">
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
              {loading ? "Adding..." : "Add Bucket"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
