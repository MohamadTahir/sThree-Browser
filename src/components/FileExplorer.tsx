import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Folder, File, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { S3Object, ListObjectsResponse, BucketConfigs } from "../types";
import { formatBytes, formatDate } from "../lib/utils";
import Breadcrumb from "./Breadcrumb";

interface FileExplorerProps {
  bucketId: string | null;
}

export default function FileExplorer({ bucketId }: FileExplorerProps) {
  const [loading, setLoading] = useState(false);
  const [objects, setObjects] = useState<S3Object[]>([]);
  const [currentPrefix, setCurrentPrefix] = useState("");
  const [bucketName, setBucketName] = useState<string | null>(null);
  const [availableBuckets, setAvailableBuckets] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (bucketId) {
      loadBuckets();
    } else {
      setObjects([]);
      setBucketName(null);
      setAvailableBuckets([]);
      setCurrentPrefix("");
    }
  }, [bucketId]);

  useEffect(() => {
    if (bucketId && bucketName) {
      loadObjects();
    }
  }, [bucketId, bucketName, currentPrefix]);

  const loadBuckets = async () => {
    if (!bucketId) return;

    try {
      setLoading(true);
      setError(null);
      // Get the bucket name from the config
      const configs = await invoke<BucketConfigs>("get_bucket_configs");
      const config = configs.buckets[bucketId];
      
      if (config && config.bucket_name) {
        setBucketName(config.bucket_name);
        setAvailableBuckets([config.bucket_name]);
      } else {
        // Fallback: try to list buckets if bucket_name is not set
        const buckets = await invoke<string[]>("list_buckets", { bucketId });
        setAvailableBuckets(buckets);
        if (buckets.length > 0) {
          if (!bucketName || !buckets.includes(bucketName)) {
            setBucketName(buckets[0]);
            setCurrentPrefix("");
          }
        } else {
          setError("No bucket name configured and no buckets found");
        }
      }
    } catch (err) {
      setError(`Failed to load bucket: ${err}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBucketChange = (newBucketName: string) => {
    setBucketName(newBucketName);
    setCurrentPrefix(""); // Reset prefix when switching buckets
  };

  const loadObjects = async () => {
    if (!bucketId || !bucketName) return;

    try {
      setLoading(true);
      setError(null);
      const response = await invoke<ListObjectsResponse>("list_objects", {
        bucketId,
        bucketName,
        prefix: currentPrefix || null,
      });
      setObjects(response.objects);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(`Failed to load objects: ${errorMsg}`);
      console.error("Full error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleObjectClick = (object: S3Object) => {
    if (object.is_folder) {
      setCurrentPrefix(object.key);
    }
  };

  const handleBreadcrumbClick = (prefix: string) => {
    setCurrentPrefix(prefix);
  };

  if (!bucketId) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Folder className="mx-auto mb-4 h-16 w-16 opacity-50" />
          <p className="text-lg">Select a bucket to get started</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center text-destructive">
          <p className="text-lg">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {availableBuckets.length > 1 ? (
              <div className="mb-2">
                <Select value={bucketName || ""} onValueChange={handleBucketChange}>
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="Select a bucket" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBuckets.map((bucket) => (
                      <SelectItem key={bucket} value={bucket}>
                        {bucket}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <h1 className="text-2xl font-bold">{bucketName || "Loading..."}</h1>
            )}
            <p className="text-sm text-muted-foreground">
              {bucketId ? `Account: ${bucketId}` : ""}
            </p>
          </div>
        </div>
        <Breadcrumb
          prefix={currentPrefix}
          onNavigate={handleBreadcrumbClick}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : objects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Folder className="mb-4 h-12 w-12 opacity-50" />
            <p>This folder is empty</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card">
            <div className="divide-y divide-border">
              {objects.map((object) => (
                <button
                  key={object.key}
                  onClick={() => handleObjectClick(object)}
                  className="flex w-full items-center gap-4 p-4 transition-colors hover:bg-accent/50"
                >
                  <div className="flex-shrink-0">
                    {object.is_folder ? (
                      <Folder className="h-5 w-5 text-primary" />
                    ) : (
                      <File className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex flex-1 items-center justify-between gap-4">
                    <div className="flex-1 text-left">
                      <div className="font-medium">
                        {object.is_folder
                          ? object.key
                              .replace(currentPrefix, "")
                              .replace(/\/$/, "")
                          : object.key.replace(currentPrefix, "")}
                      </div>
                      {!object.is_folder && (
                        <div className="text-sm text-muted-foreground">
                          {formatBytes(object.size)}
                        </div>
                      )}
                    </div>
                    {!object.is_folder && object.last_modified && (
                      <div className="text-sm text-muted-foreground">
                        {formatDate(object.last_modified)}
                      </div>
                    )}
                    {object.is_folder && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
