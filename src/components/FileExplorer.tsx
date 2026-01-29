import { useState, useEffect, useMemo, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Folder, File, ChevronRight, Loader2, ChevronDown, Check, ChevronLeft } from "lucide-react";
import { Button } from "./ui/button";
import { S3Object, ListObjectsResponse, BucketConfigs } from "../types";
import { formatBytes, formatDate } from "../lib/utils";
import Breadcrumb from "./Breadcrumb";
import { cn } from "../lib/utils";

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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Pagination state
  const [continuationToken, setContinuationToken] = useState<string | null>(null);
  const [nextContinuationToken, setNextContinuationToken] = useState<string | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const [pageSize] = useState(100); // Items per page
  const [pageHistory, setPageHistory] = useState<string[]>([]); // Stack of continuation tokens for "Previous"

  useEffect(() => {
    if (bucketId) {
      loadBuckets();
    } else {
      setObjects([]);
      setBucketName(null);
      setAvailableBuckets([]);
      setCurrentPrefix("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucketId]); // Only depend on bucketId, not bucketName

  useEffect(() => {
    if (bucketId && bucketName) {
      // Reset pagination when prefix or bucket changes
      setContinuationToken(null);
      setNextContinuationToken(null);
      setPageHistory([]);
      loadObjects(null);
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
        const currentBucket = bucketName || config.bucket_name;
        setBucketName(currentBucket);
        // Maintain stable order - always show configured bucket first
        setAvailableBuckets([config.bucket_name]);
      } else {
        // Fallback: try to list buckets if bucket_name is not set
        const buckets = await invoke<string[]>("list_buckets", { bucketId });
        setAvailableBuckets(buckets);
        if (buckets.length > 0) {
          // Preserve current selection if it exists, otherwise use first
          const currentBucket = bucketName && buckets.includes(bucketName) 
            ? bucketName 
            : buckets[0];
          setBucketName(currentBucket);
          setCurrentPrefix("");
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

  // Create a stable sorted array that only changes when availableBuckets changes
  // Use a ref to store the previous sorted array and key
  const prevSortedRef = useRef<string[]>([]);
  const prevBucketsKeyRef = useRef<string>('');
  
  const sortedBuckets = useMemo(() => {
    if (availableBuckets.length === 0) {
      prevBucketsKeyRef.current = '';
      prevSortedRef.current = [];
      return [];
    }
    
    // Create a stable sorted key
    const sorted = [...availableBuckets].sort((a, b) => a.localeCompare(b));
    const currentKey = sorted.join('|');
    
    // Only return a new array if the buckets actually changed
    if (prevBucketsKeyRef.current === currentKey && prevSortedRef.current.length > 0) {
      // Return the previous sorted array to maintain reference stability
      return prevSortedRef.current;
    }
    
    prevBucketsKeyRef.current = currentKey;
    prevSortedRef.current = sorted;
    return sorted;
  }, [availableBuckets]); // Depend on the array itself, but use ref to prevent unnecessary updates

  const handleBucketChange = (newBucketName: string) => {
    // Prevent unnecessary updates if selecting the same bucket
    if (newBucketName === bucketName) {
      setIsDropdownOpen(false);
      return;
    }
    // Close dropdown first to prevent re-render issues
    setIsDropdownOpen(false);
    // Use setTimeout to ensure dropdown closes before state updates
    setTimeout(() => {
      setBucketName(newBucketName);
      setCurrentPrefix(""); // Reset prefix when switching buckets
    }, 0);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isDropdownOpen]);

  const loadObjects = async (token: string | null = null) => {
    if (!bucketId || !bucketName) return;

    try {
      setLoading(true);
      setError(null);
      const response = await invoke<ListObjectsResponse>("list_objects", {
        bucketId,
        bucketName,
        prefix: currentPrefix || null,
        maxKeys: pageSize,
        continuationToken: token || null,
      });
      setObjects(response.objects);
      setNextContinuationToken(response.next_continuation_token || null);
      setIsTruncated(response.is_truncated);
      setContinuationToken(token);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(`Failed to load objects: ${errorMsg}`);
      console.error("Full error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleNextPage = () => {
    if (nextContinuationToken) {
      // Add current token to history for "Previous" functionality
      if (continuationToken) {
        setPageHistory([...pageHistory, continuationToken]);
      }
      loadObjects(nextContinuationToken);
    }
  };

  const handlePreviousPage = () => {
    if (pageHistory.length > 0) {
      const previousTokens = [...pageHistory];
      const previousToken = previousTokens.pop() || null;
      setPageHistory(previousTokens);
      loadObjects(previousToken);
    } else {
      // Go back to first page
      setPageHistory([]);
      loadObjects(null);
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
              <div className="mb-2 relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex h-10 w-[300px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="truncate">{bucketName || "Select a bucket"}</span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </button>
                {isDropdownOpen && sortedBuckets.length > 0 && (
                  <div 
                    className="absolute z-50 mt-1 w-[300px] rounded-md border bg-popover text-popover-foreground shadow-md"
                    key={`dropdown-${prevBucketsKeyRef.current}`}
                  >
                    <div className="max-h-[300px] overflow-auto p-1">
                      {sortedBuckets.map((bucket) => {
                        const isSelected = bucketName === bucket;
                        return (
                          <button
                            key={`${bucket}`}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleBucketChange(bucket);
                            }}
                            className={cn(
                              "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                              isSelected && "bg-accent text-accent-foreground"
                            )}
                          >
                            {isSelected && (
                              <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                                <Check className="h-4 w-4" />
                              </span>
                            )}
                            <span>{bucket}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
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
        
        {/* Pagination Controls */}
        {(pageHistory.length > 0 || isTruncated) && (
          <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={pageHistory.length === 0 && continuationToken === null}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={!isTruncated || !nextContinuationToken}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              Showing {objects.length} item{objects.length !== 1 ? 's' : ''}
              {isTruncated && ` (more available)`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
