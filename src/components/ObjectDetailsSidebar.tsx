import { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  Download,
  File,
  Folder,
  Calendar,
  HardDrive,
  FileText,
  Image as ImageIcon,
  FileCode,
  Loader2,
  Share2,
  Trash2,
} from "lucide-react";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { S3Object } from "../types";
import { formatBytes, formatDate } from "../lib/utils";
import { canPreviewFile, getFileType, getMimeType } from "../lib/fileUtils";
import { getObjectContent, deleteObject } from "../services/s3Service";
import { cn } from "../lib/utils";
import ShareModal from "./ShareModal";
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import { GetObjectRequest } from "@/models/dto/requests/GetObjectRequest";
import { DeleteObjectRequest } from "@/models/dto/requests/DeleteObjectRequest";
import { useConfig } from "@/context/config";
import { loadConfigsFromStorage } from "@/context/config";

// Constants for preview limits
const MAX_PREVIEW_CHARS = 500000; // Max characters to render (prevents DOM freeze)

interface ObjectDetailsSidebarProps {
  object: S3Object | null;
  currentPrefix: string;
  bucketId: string;
  bucketName: string | null;
  open: boolean;
  onClose: () => void;
  onDownload: (object: S3Object) => void;
  onNavigate: (prefix: string) => void;
  onObjectDeleted: () => void;
}

export default function ObjectDetailsSidebar({
  object,
  currentPrefix,
  bucketId,
  bucketName,
  open,
  onClose,
  onDownload,
  onNavigate,
  onObjectDeleted,
}: ObjectDetailsSidebarProps) {
  const [content, setContent] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { configs } = useConfig();
  const bucket = configs.buckets[bucketId];

  useEffect(() => {
    if (
      open &&
      object &&
      bucketId &&
      bucketName &&
      !object.isFolder &&
      canPreviewFile(object.key)
    ) {
      loadFileContent();
    } else {
      // Cancel any in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      // Reset state when sidebar closes or object changes
      setContent(null);
      setImageUrl(null);
      setError(null);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, object?.key, bucketId, bucketName]);

  useEffect(() => {
    // Cleanup blob URLs on unmount
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  const loadFileContent = async () => {
    if (!object || !bucketId || !bucketName) return;

    const fileType = getFileType(object.key);

    // Different size limits for different file types
    const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB for images
    const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50MB for PDFs
    const MAX_TEXT_SIZE = 5 * 1024 * 1024; // 5MB for text/JSON files (smaller to prevent UI freeze)

    // Check size limits based on file type
    if (fileType === "image" && object.size > MAX_IMAGE_SIZE) {
      setError(
        `Image is too large to preview (${(object.size / 1024 / 1024).toFixed(1)}MB). Maximum preview size is ${MAX_IMAGE_SIZE / 1024 / 1024}MB.`,
      );
      setLoading(false);
      return;
    }

    if (fileType === "pdf" && object.size > MAX_PDF_SIZE) {
      setError(
        `PDF is too large to preview (${(object.size / 1024 / 1024).toFixed(1)}MB). Maximum preview size is ${MAX_PDF_SIZE / 1024 / 1024}MB.`,
      );
      setLoading(false);
      return;
    }

    if (fileType === "text" && object.size > MAX_TEXT_SIZE) {
      setError(
        `File is too large to preview (${(object.size / 1024 / 1024).toFixed(1)}MB). Maximum preview size for text files is ${MAX_TEXT_SIZE / 1024 / 1024}MB. Please download the file to view it.`,
      );
      setLoading(false);
      return;
    }

    // Create abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      setLoading(true);
      setError(null);
      setContent(null);
      setImageUrl(null);

      // Get config to use with S3 service
      const configs = await loadConfigsFromStorage();

      // Check if cancelled
      if (abortController.signal.aborted) {
        return;
      }

      const config = configs.buckets[bucketId];

      if (!config) {
        setError("Bucket configuration not found");
        setLoading(false);
        return;
      }

      // Get file content using client-side S3 SDK
      // Use setTimeout to yield to the browser and prevent UI freeze
      const uint8Array = await new Promise<Uint8Array>((resolve, reject) => {
        setTimeout(async () => {
          try {
            if (abortController.signal.aborted) {
              reject(new Error("Cancelled"));
              return;
            }

            let getObjectContentRequest: GetObjectRequest = {
              bucket: config,
              key: object.key,
            };

            const data = await getObjectContent(getObjectContentRequest);
            resolve(data);
          } catch (err) {
            reject(err);
          }
        }, 0);
      });

      // Check if cancelled after loading
      if (abortController.signal.aborted) {
        return;
      }

      if (fileType === "image") {
        // Create blob URL for images
        const mimeType = getMimeType(object.key);
        const dataCopy = new Uint8Array(uint8Array);
        const blob = new Blob([dataCopy], { type: mimeType });
        const url = URL.createObjectURL(blob);
        setImageUrl(url);
      } else if (fileType === "text") {
        // Decode as text - use setTimeout to yield to browser and prevent blocking
        try {
          // For large files, decode in a way that doesn't block the UI
          let text: string;

          if (uint8Array.length > 1000000) {
            // For files > 1MB, decode in chunks with yields
            const decoder = new TextDecoder("utf-8");
            let decoded = "";
            const chunkSize = 500000; // Process 500KB at a time

            for (let i = 0; i < uint8Array.length; i += chunkSize) {
              // Check if cancelled
              if (abortControllerRef.current?.signal.aborted) {
                return;
              }

              const chunk = uint8Array.slice(
                i,
                Math.min(i + chunkSize, uint8Array.length),
              );
              decoded += decoder.decode(chunk, {
                stream: i + chunkSize < uint8Array.length,
              });

              // Yield to browser every chunk to prevent freezing
              if (i + chunkSize < uint8Array.length) {
                await new Promise((resolve) => setTimeout(resolve, 0));
              }
            }
            text = decoded;
          } else {
            // For smaller files, decode normally but still yield
            await new Promise((resolve) => setTimeout(resolve, 0));
            const decoder = new TextDecoder("utf-8");
            text = decoder.decode(uint8Array);
          }

          // Truncate if too long to prevent DOM rendering freeze
          if (text.length > MAX_PREVIEW_CHARS) {
            const truncated = text.substring(0, MAX_PREVIEW_CHARS);
            const remaining = text.length - MAX_PREVIEW_CHARS;
            setContent(
              truncated +
                `\n\n... (${remaining.toLocaleString()} more characters - file truncated for preview)`,
            );
          } else {
            setContent(text);
          }
        } catch (e) {
          if (abortControllerRef.current?.signal.aborted) {
            return; // Don't set error if cancelled
          }
          setContent("Unable to decode file as text. File may be binary.");
        }
      } else if (fileType === "pdf") {
        // Create blob URL for PDF
        const dataCopy = new Uint8Array(uint8Array);
        const blob = new Blob([dataCopy], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        setImageUrl(url);
      } else {
        setError(`Preview not available for file type: ${fileType}`);
      }
    } catch (err) {
      // Don't show error if request was cancelled
      if (abortController.signal.aborted) {
        return;
      }
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(`Failed to load file: ${errorMsg}`);
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
      abortControllerRef.current = null;
    }
  };

  // Memoize content to prevent re-rendering large text blocks
  // MUST be called before any early returns to follow Rules of Hooks
  const displayContent = useMemo(() => {
    if (!content) return null;

    // For very large content, we've already truncated it during loading
    // But we can add additional optimizations here if needed
    return content;
  }, [content]);

  if (!object) return null;

  const fileName = object.isFolder
    ? object.key.replace(currentPrefix, "").replace(/\/$/, "")
    : object.key.split("/").pop() || object.key.replace(currentPrefix, "");

  const getFileIcon = () => {
    if (object.isFolder) {
      return <Folder className="h-8 w-8 text-primary" />;
    }

    const extension = object.key.split(".").pop()?.toLowerCase() || "";
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension)) {
      return <ImageIcon className="h-8 w-8 text-primary" />;
    }
    if (["pdf"].includes(extension)) {
      return <FileText className="h-8 w-8 text-primary" />;
    }
    if (["txt", "md", "json", "xml", "yaml", "yml"].includes(extension)) {
      return <FileText className="h-8 w-8 text-primary" />;
    }
    if (
      [
        "js",
        "ts",
        "jsx",
        "tsx",
        "html",
        "css",
        "py",
        "java",
        "cpp",
        "c",
      ].includes(extension)
    ) {
      return <FileCode className="h-8 w-8 text-primary" />;
    }
    return <File className="h-8 w-8 text-muted-foreground" />;
  };

  const getFileTypeLabel = () => {
    if (object.isFolder) return "Folder";
    const extension = object.key.split(".").pop()?.toLowerCase() || "";
    if (!extension) return "File";
    return extension.toUpperCase() + " File";
  };

  const canPreview = !object.isFolder && canPreviewFile(object.key);
  const previewFileType = !object.isFolder ? getFileType(object.key) : null;

  return (
    <>
      {/* Backdrop - only on mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-background/80 z-40 md:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "flex flex-col border-l border-border overflow-hidden",
          "fixed md:relative z-50 md:z-auto",
          "right-0 top-0 bottom-0 h-full",
          "w-full max-w-md",
          "bg-background md:bg-card",
          "shadow-lg md:shadow-none",
          "transition-transform duration-300 ease-in-out md:transition-all",
          // Mobile: slide in/out as overlay using transform
          open ? "translate-x-0" : "translate-x-full md:translate-x-0",
          // Desktop: hide by setting width to 0 when closed
          !open && "md:w-0 md:border-0 md:overflow-hidden",
          open && "md:w-full md:max-w-md",
        )}
        style={{
          // Ensure smooth animation
          willChange: "transform",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Object Details</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Icon and Name */}
          <div className="flex flex-col items-center gap-3">
            {getFileIcon()}
            <div className="text-center">
              <h3 className="text-lg font-semibold break-words">{fileName}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {getFileTypeLabel()}
              </p>
            </div>
          </div>

          <Separator />

          {/* Object Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Information</h4>

            <div className="space-y-3">
              {/* Full Path */}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Full Path</p>
                <p className="text-sm break-all font-mono bg-muted/50 p-2 rounded">
                  {object.key}
                </p>
              </div>

              {/* Size */}
              {!object.isFolder && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Size</span>
                  </div>
                  <span className="text-sm font-medium">
                    {formatBytes(object.size)}
                  </span>
                </div>
              )}

              {/* Last Modified */}
              {object.lastModified && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Last Modified
                    </span>
                  </div>
                  <span className="text-sm font-medium">
                    {formatDate(object.lastModified)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Preview Section - only for previewable files */}
          {canPreview && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Preview</h4>

                <div className="rounded-lg border border-border bg-muted/30 overflow-hidden">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : error ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-destructive px-4">
                      <p className="text-sm">{error}</p>
                    </div>
                  ) : previewFileType === "image" && imageUrl ? (
                    <div className="flex items-center justify-center bg-background p-4">
                      <img
                        src={imageUrl}
                        alt={fileName}
                        className="max-w-full max-h-[400px] object-contain rounded-lg"
                        onError={() => {
                          setError("Failed to display image");
                        }}
                      />
                    </div>
                  ) : previewFileType === "pdf" && imageUrl ? (
                    <div className="w-full h-[400px] bg-background">
                      <iframe
                        src={imageUrl}
                        className="w-full h-full border-0"
                        title={fileName}
                      />
                    </div>
                  ) : previewFileType === "text" && displayContent !== null ? (
                    <div className="bg-background p-4 max-h-[400px] overflow-auto">
                      <pre
                        className="text-xs font-mono whitespace-pre-wrap break-words"
                        style={{
                          // Optimize rendering for large content
                          contain: "layout style paint",
                          willChange: "scroll-position",
                        }}
                      >
                        {displayContent}
                      </pre>
                      {displayContent &&
                        displayContent.length >= MAX_PREVIEW_CHARS && (
                          <div className="mt-2 p-2 bg-muted rounded text-xs text-muted-foreground">
                            File preview truncated to{" "}
                            {MAX_PREVIEW_CHARS.toLocaleString()} characters.
                            Download the file to view the complete content.
                          </div>
                        )}
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Actions */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Actions</h4>

            <div className="flex flex-col gap-2">
              {object.isFolder ? (
                <Button
                  variant="default"
                  className="w-full"
                  onClick={() => {
                    onNavigate(object.key);
                    onClose();
                  }}
                >
                  <Folder className="mr-2 h-4 w-4" />
                  Open Folder
                </Button>
              ) : (
                <>
                  <Button
                    variant="default"
                    className="w-full"
                    onClick={() => setShowShareModal(true)}
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => onDownload(object)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => setShowDeleteModal(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        object={object}
        bucket={bucket}
      />

      {/* Delete Confirmation Modal */}
      {object && !object.isFolder && (
        <DeleteConfirmationModal
          open={showDeleteModal}
          onOpenChange={setShowDeleteModal}
          fileName={object.key.split("/").pop() || object.key}
          onConfirm={async (deleteAllVersions) => {
            if (!bucketId || !bucketName) return;

            try {
              const configs = await loadConfigsFromStorage();
              const config = configs.buckets[bucketId];

              if (!config) {
                // toast({
                //   variant: "destructive",
                //   title: "Error",
                //   description: "Bucket configuration not found.",
                // });
                return;
              }

              let deleteObjectRequest: DeleteObjectRequest = {
                bucket: config,
                key: object.key,
              };

              await deleteObject(deleteObjectRequest);

              // toast({
              //   variant: "success",
              //   title: "Object Deleted",
              //   description: deleteAllVersions
              //     ? "All versions of the object have been deleted."
              //     : "Object has been deleted successfully.",
              // });

              // Close sidebar and refresh file list
              onClose();
              onObjectDeleted();
            } catch (error) {
              const errorMsg =
                error instanceof Error ? error.message : String(error);
              // toast({
              //   variant: "destructive",
              //   title: "Failed to Delete Object",
              //   description: errorMsg,
              // });
              throw error; // Re-throw to prevent modal from closing
            }
          }}
        />
      )}
    </>
  );
}
