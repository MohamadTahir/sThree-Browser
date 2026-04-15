import { useEffect, useState } from "react";
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
import { Configs, CredentialConfig } from "../types";
import { loadConfigs, saveConfigs } from "../services/storageService";
import { useToast } from "./ui/use-toast";

interface CredentialsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

export default function CredentialsModal({
  open,
  onOpenChange,
  onChanged,
}: CredentialsModalProps) {
  const { toast } = useToast();
  const [configs, setConfigs] = useState<Configs | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    id: string | null;
    name: string;
    access_key: string;
    secret_key: string;
  }>({
    id: null,
    name: "",
    access_key: "",
    secret_key: "",
  });

  useEffect(() => {
    if (open) {
      load();
    }
  }, [open]);

  const load = async () => {
    try {
      const loaded = await loadConfigs();
      // Ensure credentials map exists
      if (!loaded.credentials) {
        loaded.credentials = {};
      }
      setConfigs(loaded);
      // Reset selection/form when opening
      setSelectedId(null);
      setFormData({
        id: null,
        name: "",
        access_key: "",
        secret_key: "",
      });
    } catch (error) {
      console.error("Failed to load credentials:", error);
      toast({
        variant: "destructive",
        title: "Failed to Load Credentials",
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleSelect = (id: string, cred: CredentialConfig) => {
    setSelectedId(id);
    setFormData({
      id,
      name: cred.name,
      access_key: cred.access_key,
      secret_key: cred.secret_key,
    });
  };

  const handleNew = () => {
    setSelectedId(null);
    setFormData({
      id: null,
      name: "",
      access_key: "",
      secret_key: "",
    });
  };

  const handleSave = async () => {
    if (!configs) return;

    if (!formData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Missing Name",
        description: "Please provide a name for these credentials.",
      });
      return;
    }

    const next: Configs = {
      ...configs,
      buckets: { ...configs.buckets },
      credentials: { ...(configs.credentials || {}) },
      groups: { ...configs.groups },
    };

    const id =
      formData.id ||
      `cred_${formData.name.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`;

    next.credentials[id] = {
      id,
      name: formData.name.trim(),
      access_key: formData.access_key,
      secret_key: formData.secret_key,
    };

    try {
      await saveConfigs(next);
      setConfigs(next);
      setSelectedId(id);
      setFormData((prev) => ({ ...prev, id }));
      toast({
        variant: "success",
        title: "Credentials Saved",
        description: "Your credentials have been saved.",
      });
      onChanged();
    } catch (error) {
      console.error("Failed to save credentials:", error);
      toast({
        variant: "destructive",
        title: "Failed to Save Credentials",
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleDelete = async () => {
    if (!configs || !selectedId) return;

    // Prevent deleting credentials in use
    const inUse = Object.values(configs.buckets).some(
      (b) => b.credential_id === selectedId
    );
    if (inUse) {
      toast({
        variant: "destructive",
        title: "Credentials In Use",
        description:
          "These credentials are currently used by one or more buckets. Reassign those buckets before deleting.",
      });
      return;
    }

    const next: Configs = {
      ...configs,
      buckets: { ...configs.buckets },
      credentials: { ...(configs.credentials || {}) },
      groups: { ...configs.groups },
    };
    delete next.credentials[selectedId];

    try {
      await saveConfigs(next);
      setConfigs(next);
      handleNew();
      toast({
        variant: "success",
        title: "Credentials Deleted",
        description: "The credentials have been deleted.",
      });
      onChanged();
    } catch (error) {
      console.error("Failed to delete credentials:", error);
      toast({
        variant: "destructive",
        title: "Failed to Delete Credentials",
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const credentialList = configs ? Object.values(configs.credentials || {}) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Manage Credentials</DialogTitle>
          <DialogDescription>
            Create and manage reusable S3 credentials that can be shared across multiple buckets.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="space-y-2 border-r pr-4 max-h-[400px] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">Saved Credentials</h3>
              <Button size="sm" variant="outline" onClick={handleNew}>
                New
              </Button>
            </div>
            {credentialList.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No credentials yet. Create your first credentials on the right.
              </p>
            ) : (
              <div className="space-y-1">
                {credentialList.map((cred) => (
                  <button
                    key={cred.id}
                    type="button"
                    onClick={() => handleSelect(cred.id, cred)}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-sm border ${selectedId === cred.id
                        ? "bg-accent text-accent-foreground border-border"
                        : "border-transparent hover:bg-accent/50"
                      }`}
                  >
                    <div className="font-medium truncate">{cred.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {/* Don't show region/endpoint here; credentials are just keys */}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="cred-name">Name</Label>
              <Input
                id="cred-name"
                placeholder="Production account"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cred-access">Access Key</Label>
              <Input
                id="cred-access"
                type="password"
                placeholder="AKIAIOSFODNN7EXAMPLE"
                value={formData.access_key}
                onChange={(e) =>
                  setFormData({ ...formData, access_key: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cred-secret">Secret Key</Label>
              <Input
                id="cred-secret"
                type="password"
                placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                value={formData.secret_key}
                onChange={(e) =>
                  setFormData({ ...formData, secret_key: e.target.value })
                }
              />
            </div>
          </div>
        </div>
        <DialogFooter className="flex justify-between">
          <div>
            {selectedId && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
              >
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button type="button" onClick={handleSave}>
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

