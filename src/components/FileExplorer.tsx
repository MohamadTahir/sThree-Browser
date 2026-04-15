import { useState, useEffect, useMemo, useRef } from "react";
import { Folder, File, ChevronRight, Loader2, ChevronDown, Check, ChevronLeft, AlertCircle, PanelLeftOpen, RefreshCw, Upload } from "lucide-react";
import { Button } from "./ui/button";
import { S3Object } from "../types";
import { formatBytes, formatDate } from "../lib/utils";
import { listBuckets, listObjects, getObjectContent, uploadFile } from "../services/s3Service";
import { loadConfigs } from "../services/storageService";
import Breadcrumb from "./Breadcrumb";
import DownloadToast from "./DownloadToast";
import ObjectDetailsSidebar from "./ObjectDetailsSidebar";
import { cn } from "../lib/utils";
import { useToast } from "./ui/use-toast";

interface FileExplorerProps {
  bucketId: string | null;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export default function FileExplorer({ bucketId, sidebarOpen, onToggleSidebar }: FileExplorerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [objects, setObjects] = useState<S3Object[]>([]);
  const [currentPrefix, setCurrentPrefix] = useState("");
  const [bucketName, setBucketName] = useState<string | null>(null);
  const [accountNickname, setAccountNickname] = useState<string | null>(null);
  const [availableBuckets, setAvailableBuckets] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Track the bucketId when errors occur to prevent showing stale error toasts
  const errorBucketIdRef = useRef<string | null>(null);
  // Track loading start time to ensure minimum display duration
  const loadingStartTimeRef = useRef<number | null>(null);
  const MIN_LOADING_DURATION = 300; // Minimum 300ms display time
  // Track previous bucketId to detect bucket switches
  const prevBucketIdRef = useRef<string | null>(null);
  // Track if we're currently switching buckets (to show loading immediately)
  const isSwitchingBucketsRef = useRef(false);
  // Track the current request ID to cancel stale requests
  const currentRequestIdRef = useRef<number>(0);

  // Helper function to set error with minimum loading duration
  const setErrorWithDelay = (errorMessage: string | null) => {
    if (errorMessage === null) {
      setError(null);
      return;
    }

    const elapsed = loadingStartTimeRef.current ? Date.now() - loadingStartTimeRef.current : 0;
    const remaining = Math.max(0, MIN_LOADING_DURATION - elapsed);

    setTimeout(() => {
      setError(errorMessage);
    }, remaining);
  };

  const finishLoading = () => {
    const elapsed = loadingStartTimeRef.current ? Date.now() - loadingStartTimeRef.current : 0;
    const remaining = Math.max(0, MIN_LOADING_DURATION - elapsed);

    setTimeout(() => {
      setLoading(false);
      setInitialLoading(false);
      loadingStartTimeRef.current = null;
    }, remaining);
  };
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Pagination state
  const [continuationToken, setContinuationToken] = useState<string | null>(null);
  const [nextContinuationToken, setNextContinuationToken] = useState<string | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const [pageSize] = useState(100); // Items per page
  const [pageHistory, setPageHistory] = useState<string[]>([]); // Stack of continuation tokens for "Previous"
  // Download toast state
  const [downloadToast, setDownloadToast] = useState<{
    fileName: string;
    filePath: string;
    open: boolean;
  } | null>(null);
  // Object details sidebar state
  const [selectedObject, setSelectedObject] = useState<S3Object | null>(null);
  const [isDetailsSidebarOpen, setIsDetailsSidebarOpen] = useState(false);

  useEffect(() => {
    // Detect bucket switch
    const wasBucketSwitch = prevBucketIdRef.current !== null && prevBucketIdRef.current !== bucketId;

    if (bucketId) {
      // If switching buckets, mark it immediately so render can detect it
      if (wasBucketSwitch) {
        isSwitchingBucketsRef.current = true;
        // Increment request ID to invalidate any in-flight requests
        currentRequestIdRef.current++;
        // Immediately clear bucketName and accountNickname to trigger loading state
        // This prevents using stale bucket names from previous buckets
        setBucketName(null);
        setAccountNickname(null);
        setAvailableBuckets([]);
        setCurrentPrefix(""); // Also clear prefix when switching buckets
        setObjects([]); // Clear objects immediately
      }

      prevBucketIdRef.current = bucketId;

      // Clear any previous errors when switching buckets
      setError(null);
      errorBucketIdRef.current = null;

      // Set loading state FIRST before clearing objects to prevent empty state flash
      setInitialLoading(true);
      loadingStartTimeRef.current = Date.now();
      setLoading(true);
      // Clear objects and error after setting loading state
      setError(null);
      setObjects([]);
      loadBuckets();
    } else {
      prevBucketIdRef.current = null;
      isSwitchingBucketsRef.current = false;
      setObjects([]);
      setBucketName(null);
      setAccountNickname(null);
      setAvailableBuckets([]);
      setCurrentPrefix("");
      setInitialLoading(false);
      setLoading(false);
      loadingStartTimeRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucketId]); // Only depend on bucketId, not bucketName

  useEffect(() => {
    if (bucketId && bucketName) {
      // Clear any previous errors when loading new bucket content
      setError(null);
      errorBucketIdRef.current = null;
      // Reset pagination when prefix or bucket changes
      setContinuationToken(null);
      setNextContinuationToken(null);
      setPageHistory([]);
      // Keep initialLoading true until objects are loaded
      loadObjects(null);
    }
  }, [bucketId, bucketName, currentPrefix]);

  const loadBuckets = async () => {
    // Capture current bucketId at the start
    const requestBucketId = bucketId;

    if (!requestBucketId) {
      return;
    }

    const requestId = ++currentRequestIdRef.current;

    try {
      setLoading(true);
      if (!loadingStartTimeRef.current) {
        loadingStartTimeRef.current = Date.now();
      }
      setError(null);

      // Get the config - always fetch fresh
      const configs = await loadConfigs();

      // Validate bucketId hasn't changed
      if (bucketId !== requestBucketId) {
        return;
      }

      const config = configs.buckets[requestBucketId];

      if (!config) {
        console.error('loadBuckets: Config not found', { requestId, requestBucketId });
        setErrorWithDelay("Bucket configuration not found");
        // Clear initial loading even on early return, but ensure minimum display duration
        const elapsed = loadingStartTimeRef.current ? Date.now() - loadingStartTimeRef.current : 0;
        const remaining = Math.max(0, MIN_LOADING_DURATION - elapsed);
        setTimeout(() => {
          setInitialLoading(false);
          loadingStartTimeRef.current = null;
        }, remaining);
        return;
      }

      // Final validation before updating state
      if (bucketId !== requestBucketId) {
        return;
      }

      // Store account nickname
      setAccountNickname(config.nickname);
      // Clear switching flag once we have the nickname
      isSwitchingBucketsRef.current = false;

      if (config.bucket_name) {
        // Always use the bucket_name from config, not the previous state
        // This ensures we use the correct bucket when switching between accounts
        const currentBucket = config.bucket_name;

        // Final check before setting state
        if (bucketId === requestBucketId) {
          setBucketName(currentBucket);
          // Maintain stable order - always show configured bucket first
          setAvailableBuckets([config.bucket_name]);
        }
      } else {
        // Fallback: try to list buckets if bucket_name is not set
        const buckets = await listBuckets(config, requestBucketId);

        // Validate bucketId hasn't changed
        if (bucketId !== requestBucketId) {
          return;
        }

        setAvailableBuckets(buckets);
        if (buckets.length > 0) {
          // Use first bucket from list (don't preserve old bucketName)
          const currentBucket = buckets[0];

          // Final check before setting state
          if (bucketId === requestBucketId) {
            setBucketName(currentBucket);
            setCurrentPrefix("");
          }
        } else {
          setErrorWithDelay("No bucket name configured and no buckets found");
          // Clear initial loading even on error, but ensure minimum display duration
          const elapsed = loadingStartTimeRef.current ? Date.now() - loadingStartTimeRef.current : 0;
          const remaining = Math.max(0, MIN_LOADING_DURATION - elapsed);
          setTimeout(() => {
            setInitialLoading(false);
            loadingStartTimeRef.current = null;
          }, remaining);
        }
      }

    } catch (err) {
      // Check if this error is for a stale request
      if (bucketId !== requestBucketId) {
        return;
      }

      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('loadBuckets: Error occurred', {
        requestId,
        bucketId: requestBucketId,
        error: errorMsg,
      });

      // Only show toast if this error is for the current bucketId
      errorBucketIdRef.current = requestBucketId;
      setErrorWithDelay(`Failed to load bucket: ${errorMsg}`);

      // Use setTimeout to ensure bucketId hasn't changed by the time toast is shown
      setTimeout(() => {
        if (bucketId === requestBucketId && errorBucketIdRef.current === requestBucketId) {
          toast({
            variant: "destructive",
            title: "Failed to Load Bucket",
            description: errorMsg,
          });
        }
      }, 0);
      // Clear initial loading even on error, but ensure minimum display duration
    } finally {
      // Only clear loading if this is still the current request
      if (bucketId === requestBucketId) {
      }
    }
  };

  // --- File Upload Logic ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<{ fileName: string; progress: number } | null>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    await processFiles(Array.from(files));
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processFiles = async (files: File[]) => {
    if (!bucketId) return;

    try {
      // Fetch fresh config
      const configs = await loadConfigs();
      const config = configs.buckets[bucketId];
      if (!config) {
        throw new Error("Bucket configuration not found");
      }

      for (const file of files) {
        try {
          const key = currentPrefix + file.name;

          setUploadProgress({ fileName: file.name, progress: 0 });

          await uploadFile(
            config,
            config.bucket_name,
            key,
            file,
            (progress) => {
              setUploadProgress({ fileName: file.name, progress });
            },
            bucketId
          );

          toast({
            title: "Upload Successful",
            description: `Uploaded ${file.name}`,
          });

          loadObjects(null);

        } catch (error: any) {
          console.error("Upload error:", error);
          toast({
            variant: "destructive",
            title: "Upload Failed",
            description: error.message || `Failed to upload ${file.name}`,
          });
        } finally {
          setUploadProgress(null);
        }
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Configuration Error",
        description: "Could not load bucket configuration for upload.",
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(Array.from(e.dataTransfer.files));
    }
  };



  // -------------------------

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
    // Capture current values at the start of the function
    const requestBucketId = bucketId;
    const requestBucketName = bucketName;

    if (!requestBucketId || !requestBucketName) {
      return;
    }

    // Generate a unique request ID for this call
    const requestId = ++currentRequestIdRef.current;

    try {
      setLoading(true);
      if (!loadingStartTimeRef.current) {
        loadingStartTimeRef.current = Date.now();
      }
      setError(null);

      // Get config to use with S3 service - always fetch fresh config
      const configs = await loadConfigs();

      // Validate that bucketId hasn't changed during the async operation
      if (bucketId !== requestBucketId) {
        return;
      }

      const config = configs.buckets[requestBucketId];

      if (!config) {
        console.error('loadObjects: Config not found', { requestId, requestBucketId });
        setErrorWithDelay("Bucket configuration not found");
        // Clear initial loading even on early return, but ensure minimum display duration
        const elapsed = loadingStartTimeRef.current ? Date.now() - loadingStartTimeRef.current : 0;
        const remaining = Math.max(0, MIN_LOADING_DURATION - elapsed);
        setTimeout(() => {
          setInitialLoading(false);
          loadingStartTimeRef.current = null;
        }, remaining);
        return;
      }

      // Validate bucketName matches config
      if (requestBucketName !== config.bucket_name && config.bucket_name) {
        // Use config's bucket name if it's different
        const correctBucketName = config.bucket_name;

        // Double-check bucketId hasn't changed
        if (bucketId !== requestBucketId) {
          return;
        }

        // Update bucketName state and retry with correct name
        setBucketName(correctBucketName);
        // Don't proceed with wrong bucket name
        return;
      }

      // Validate one more time before making the request
      if (bucketId !== requestBucketId) {
        return;
      }

      const response = await listObjects(config, {
        bucketName: requestBucketName,
        prefix: currentPrefix || undefined,
        maxKeys: pageSize,
        continuationToken: token || undefined,
      }, requestBucketId);

      // Final validation - check if this request is still valid
      if (bucketId !== requestBucketId || bucketName !== requestBucketName) {
        return;
      }

      // Convert to S3Object format
      const s3Objects: S3Object[] = response.objects.map(obj => ({
        key: obj.key,
        size: obj.size,
        last_modified: obj.lastModified,
        is_folder: obj.isFolder,
      }));

      setObjects(s3Objects);
      setNextContinuationToken(response.nextContinuationToken || null);
      setIsTruncated(response.isTruncated);
      setContinuationToken(token);
      // Clear initial loading once objects are loaded, but ensure minimum display duration
      const elapsed = loadingStartTimeRef.current ? Date.now() - loadingStartTimeRef.current : 0;
      const remaining = Math.max(0, MIN_LOADING_DURATION - elapsed);
      setTimeout(() => {
        setInitialLoading(false);
        loadingStartTimeRef.current = null;
      }, remaining);
    } catch (err) {
      // Check if this error is for a stale request
      if (bucketId !== requestBucketId || bucketName !== requestBucketName) {
        return;
      }

      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('loadObjects: Error occurred', {
        requestId,
        bucketId: requestBucketId,
        bucketName: requestBucketName,
        error: errorMsg,
      });

      // Only show toast if this error is for the current bucketId
      errorBucketIdRef.current = requestBucketId;
      setErrorWithDelay(`Failed to load objects: ${errorMsg}`);

      // Use setTimeout to ensure bucketId hasn't changed by the time toast is shown
      setTimeout(() => {
        if (bucketId === requestBucketId && bucketName === requestBucketName && errorBucketIdRef.current === requestBucketId) {
          toast({
            variant: "destructive",
            title: "Failed to Load Objects",
            description: errorMsg,
          });
        }
      }, 0);
      // Clear initial loading even on error, but ensure minimum display duration
    } finally {
      // Only clear loading if this is still the current request
      if (bucketId === requestBucketId) {
        finishLoading();
      }
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
    // Folders navigate on single click
    if (object.is_folder) {
      setCurrentPrefix(object.key);
    } else {
      // Files open sidebar
      setSelectedObject(object);
      setIsDetailsSidebarOpen(true);
    }
  };

  const handleDownload = async (object: S3Object, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent triggering the file click handler
    }

    if (!bucketId || !bucketName) return;

    try {
      setLoading(true);

      // Get config to use with S3 service
      const configs = await loadConfigs();
      const config = configs.buckets[bucketId];

      if (!config) {
        setError("Bucket configuration not found");
        return;
      }

      // Get file content using client-side S3 SDK
      const uint8Array = await getObjectContent(config, bucketName, object.key, bucketId);

      // Get file name
      const fileName = object.key.split('/').pop() || object.key;

      // Check if we're in Tauri (desktop) or browser (web)
      const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

      if (isTauri) {
        // Desktop: Save to downloads folder using Tauri
        const { invoke } = await import("@tauri-apps/api/core");
        const fileData = Array.from(uint8Array);
        const filePath = await invoke<string>("save_file_to_downloads", {
          fileName,
          fileData,
        });

        // Show download toast with the actual file path
        setDownloadToast({
          fileName,
          filePath,
          open: true,
        });
      } else {
        // Web: Use browser download
        // Create a new Uint8Array copy to ensure proper typing
        const dataCopy = new Uint8Array(uint8Array);
        const blob = new Blob([dataCopy]);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Show toast (web version could show a simple notification)
        setDownloadToast({
          fileName,
          filePath: fileName, // Web doesn't have a file path
          open: true,
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: errorMsg,
      });
      console.error("Download error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFile = async () => {
    if (!downloadToast) return;

    const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

    if (!isTauri) {
      // Web: Can't open files directly, show message
      toast({
        variant: "warning",
        title: "Desktop Only",
        description: "File opening is only available in the desktop app",
      });
      return;
    }

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("open_file", {
        path: downloadToast.filePath,
      });
    } catch (err) {
      console.error("Failed to open file:", err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      toast({
        variant: "destructive",
        title: "Failed to Open File",
        description: errorMsg,
      });
    }
  };

  const handleOpenFileLocation = async () => {
    if (!downloadToast) return;

    const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

    if (!isTauri) {
      // Web: Can't open folders directly, show message
      toast({
        variant: "warning",
        title: "Desktop Only",
        description: "Opening file location is only available in the desktop app",
      });
      return;
    }

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("open_folder", {
        path: downloadToast.filePath,
      });
    } catch (err) {
      console.error("Failed to open file location:", err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      toast({
        variant: "destructive",
        title: "Failed to Open File Location",
        description: errorMsg,
      });
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

  // Show loading state if:
  // 1. Loading states are true, OR
  // 2. We have a bucketId but no bucketName yet (initial load - haven't loaded bucket config), OR
  // 3. We're currently switching buckets (detected by ref)
  const shouldShowLoading = loading || initialLoading ||
    (bucketId && !bucketName) ||
    isSwitchingBucketsRef.current;

  if (shouldShowLoading) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden bg-background">
        {/* Loading bar */}
        {(initialLoading || loading) && (
          <div className="h-1 w-full bg-muted overflow-hidden relative">
            <div className="h-full bg-primary loading-bar" />
          </div>
        )}
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center justify-center text-center">
          <AlertCircle className="h-24 w-24 text-destructive/60 mb-4" />
          <p className="text-sm text-muted-foreground mb-4">Unable to load content</p>
          <Button
            variant="outline"
            onClick={() => {
              setError(null);
              // Retry loading based on what was missing
              if (bucketId && !bucketName) {
                loadBuckets();
              } else {
                loadObjects(continuationToken);
              }
            }}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reload
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-1 flex-col md:flex-row overflow-hidden bg-background"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        multiple
      />

      {/* Upload Progress Toast */}
      {uploadProgress && (
        <div className="fixed bottom-4 right-4 z-50 w-80 rounded-lg border bg-background p-4 shadow-lg animate-in slide-in-from-bottom-5">
          <div className="mb-2 flex items-center justify-between text-sm font-medium">
            <span className="truncate max-w-[200px]">{uploadProgress.fileName}</span>
            <span>{Math.round(uploadProgress.progress)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress.progress}%` }}
            />
          </div>
        </div>
      )}
      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <div className="border-b border-border p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
              {/* Sidebar toggle button - only show on mobile when sidebar is closed */}
              {!sidebarOpen && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={onToggleSidebar}
                  className="md:hidden h-9 w-9 shrink-0"
                  title="Open sidebar"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </Button>
              )}
              <div className="flex-1 min-w-0">
                {availableBuckets.length > 1 ? (
                  <>
                    <h1 className="text-xl sm:text-2xl font-bold mb-2">{accountNickname || ""}</h1>
                    <div className="mb-2 relative" ref={dropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex h-10 w-full max-w-[300px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className="truncate">{bucketName || "Select a bucket"}</span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </button>
                      {isDropdownOpen && sortedBuckets.length > 0 && (
                        <div
                          className="absolute z-50 mt-1 w-full max-w-[300px] rounded-md border bg-popover text-popover-foreground shadow-md"
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
                  </>
                ) : (
                  <>
                    <h1 className="text-xl sm:text-2xl font-bold">{accountNickname || ""}</h1>
                    <p className="text-sm text-muted-foreground">
                      {bucketName || ""}
                    </p>
                  </>
                )}
                {availableBuckets.length > 1 && (
                  <p className="text-sm text-muted-foreground">
                    {bucketId ? `Account: ${bucketId}` : ""}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleUploadClick}
                title="Upload Files"
                className="h-8 w-8"
              >
                <Upload className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (bucketId && bucketName) {
                    loadObjects(continuationToken);
                  } else {
                    loadBuckets();
                  }
                }}
                title="Refresh"
                className="h-8 w-8"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <Breadcrumb
          prefix={currentPrefix}
          onNavigate={handleBreadcrumbClick}
        />

        <div className="flex-1 overflow-y-auto p-2 sm:p-4 md:min-w-0">
          {!error && objects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Folder className="mb-4 h-12 w-12 opacity-50" />
              <p>This folder is empty</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card">
              <div className="divide-y divide-border">
                {objects.map((object) => (
                  <div
                    key={object.key}
                    onClick={() => handleObjectClick(object)}
                    className="group flex w-full cursor-pointer items-center gap-2 sm:gap-4 p-3 sm:p-4 transition-colors hover:bg-accent/50"
                  >
                    <div className="flex flex-1 items-center gap-2 sm:gap-4 min-w-0">
                      <div className="flex-shrink-0">
                        {object.is_folder ? (
                          <Folder className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        ) : (
                          <File className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex flex-1 items-center justify-between gap-2 sm:gap-4 min-w-0">
                        <div className="flex-1 text-left min-w-0">
                          <div className="font-medium text-sm sm:text-base truncate">
                            {object.is_folder
                              ? object.key
                                .replace(currentPrefix, "")
                                .replace(/\/$/, "")
                              : object.key.replace(currentPrefix, "")}
                          </div>
                          {!object.is_folder && (
                            <div className="text-xs sm:text-sm text-muted-foreground">
                              {formatBytes(object.size)}
                              {object.last_modified && (
                                <span className="ml-2 sm:hidden">• {formatDate(object.last_modified)}</span>
                              )}
                            </div>
                          )}
                        </div>
                        {!object.is_folder && object.last_modified && (
                          <div className="hidden sm:block text-sm text-muted-foreground flex-shrink-0">
                            {formatDate(object.last_modified)}
                          </div>
                        )}
                        {object.is_folder && (
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pagination Controls */}
          {(continuationToken !== null || isTruncated) && (
            <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={pageHistory.length === 0 && continuationToken === null}
                  className="flex-1 sm:flex-initial"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={!isTruncated || !nextContinuationToken}
                  className="flex-1 sm:flex-initial"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-right">
                Showing {objects.length} item{objects.length !== 1 ? 's' : ''}
                {isTruncated && ` (more available)`}
              </div>
            </div>
          )}
        </div>

        {/* Download Toast */}
        {downloadToast && (
          <DownloadToast
            fileName={downloadToast.fileName}
            filePath={downloadToast.filePath}
            onOpen={handleOpenFile}
            onOpenLocation={handleOpenFileLocation}
            onClose={() => setDownloadToast(null)}
            open={downloadToast.open}
          />
        )}
      </div>

      {/* Object Details Sidebar */}
      <ObjectDetailsSidebar
        object={selectedObject}
        currentPrefix={currentPrefix}
        bucketId={bucketId}
        bucketName={bucketName}
        open={isDetailsSidebarOpen}
        onClose={() => {
          setIsDetailsSidebarOpen(false);
          setSelectedObject(null);
        }}
        onDownload={(object) => {
          handleDownload(object, { stopPropagation: () => { } } as React.MouseEvent);
        }}
        onNavigate={(prefix) => {
          setCurrentPrefix(prefix);
        }}
        onObjectDeleted={() => {
          // Reload objects after deletion
          if (bucketId && bucketName) {
            loadObjects(null);
          }
        }}
      />
    </div>
  );
}



