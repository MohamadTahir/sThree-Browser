import { useState, useEffect } from "react";
import { X, Download, File, Folder, Calendar, HardDrive, FileText, Image as ImageIcon, FileCode, Loader2, Share2, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { S3Object } from "../types";
import { formatBytes, formatDate } from "../lib/utils";
import { isPreviewableFileType, getFileType, getMimeType } from "../lib/fileUtils";
import { getObjectContent, deleteObject } from "../services/s3Service";
import { loadConfigs } from "../services/storageService";
import { cn } from "../lib/utils";
import ShareModal from "./ShareModal";
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import { useToast } from "./ui/use-toast";

interface ObjectDetailsSidebarProps {
  object: S3Object | null;
  currentPrefix: string;
  bucketId: string | null;
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
  const { toast } = useToast();
  const [content, setContent] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (open && object && bucketId && bucketName && !object.is_folder && isPreviewableFileType(object.key)) {
      loadFileContent();
    } else {
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

    // Don't preview files larger than 50MB
    const MAX_PREVIEW_SIZE = 50 * 1024 * 1024; // 50MB
    if (object.size > MAX_PREVIEW_SIZE) {
      setError(`File is too large to preview (${(object.size / 1024 / 1024).toFixed(1)}MB). Maximum preview size is 50MB.`);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setContent(null);
      setImageUrl(null);

      const fileType = getFileType(object.key);

      // Get config to use with S3 service
      const configs = await loadConfigs();
      const config = configs.buckets[bucketId];

      if (!config) {
        setError("Bucket configuration not found");
        setLoading(false);
        return;
      }

      // Get file content using client-side S3 SDK
      const uint8Array = await getObjectContent(config, bucketName, object.key);

      if (fileType === 'image') {
        // Create blob URL for images
        const mimeType = getMimeType(object.key);
        const dataCopy = new Uint8Array(uint8Array);
        const blob = new Blob([dataCopy], { type: mimeType });
        const url = URL.createObjectURL(blob);
        setImageUrl(url);
      } else if (fileType === 'text') {
        // Decode as text
        const decoder = new TextDecoder('utf-8');
        try {
          const text = decoder.decode(uint8Array);
          setContent(text);
        } catch (e) {
          setContent('Unable to decode file as text. File may be binary.');
        }
      } else if (fileType === 'pdf') {
        // Create blob URL for PDF
        const dataCopy = new Uint8Array(uint8Array);
        const blob = new Blob([dataCopy], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setImageUrl(url);
      } else {
        setError(`Preview not available for file type: ${fileType}`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(`Failed to load file: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  if (!object) return null;

  const fileName = object.is_folder
    ? object.key.replace(currentPrefix, "").replace(/\/$/, "")
    : object.key.split("/").pop() || object.key.replace(currentPrefix, "");

  const getFileIcon = () => {
    if (object.is_folder) {
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
    if (["js", "ts", "jsx", "tsx", "html", "css", "py", "java", "cpp", "c"].includes(extension)) {
      return <FileCode className="h-8 w-8 text-primary" />;
    }
    return <File className="h-8 w-8 text-muted-foreground" />;
  };

  const getFileTypeLabel = () => {
    if (object.is_folder) return "Folder";
    const extension = object.key.split(".").pop()?.toLowerCase() || "";
    if (!extension) return "File";
    return extension.toUpperCase() + " File";
  };

  const canPreview = !object.is_folder && isPreviewableFileType(object.key);
  const previewFileType = !object.is_folder ? getFileType(object.key) : null;

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
          open 
            ? "translate-x-0" 
            : "translate-x-full md:translate-x-0",
          // Desktop: hide by setting width to 0 when closed
          !open && "md:w-0 md:border-0 md:overflow-hidden",
          open && "md:w-full md:max-w-md"
        )}
        style={{
          // Ensure smooth animation
          willChange: 'transform',
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
              <p className="text-sm text-muted-foreground mt-1">{getFileTypeLabel()}</p>
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
                <p className="text-sm break-all font-mono bg-muted/50 p-2 rounded">{object.key}</p>
              </div>

              {/* Size */}
              {!object.is_folder && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Size</span>
                  </div>
                  <span className="text-sm font-medium">{formatBytes(object.size)}</span>
                </div>
              )}

              {/* Last Modified */}
              {object.last_modified && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Last Modified</span>
                  </div>
                  <span className="text-sm font-medium">{formatDate(object.last_modified)}</span>
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
                  ) : previewFileType === 'image' && imageUrl ? (
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
                  ) : previewFileType === 'pdf' && imageUrl ? (
                    <div className="w-full h-[400px] bg-background">
                      <iframe
                        src={imageUrl}
                        className="w-full h-full border-0"
                        title={fileName}
                      />
                    </div>
                  ) : previewFileType === 'text' && content !== null ? (
                    <div className="bg-background p-4 max-h-[400px] overflow-auto">
                      <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                        {content}
                      </pre>
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
              {object.is_folder ? (
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
        onOpenChange={setShowShareModal}
        object={object}
        bucketId={bucketId}
        bucketName={bucketName}
      />

      {/* Delete Confirmation Modal */}
      {object && !object.is_folder && (
        <DeleteConfirmationModal
          open={showDeleteModal}
          onOpenChange={setShowDeleteModal}
          fileName={object.key.split("/").pop() || object.key}
          onConfirm={async (deleteAllVersions) => {
            if (!bucketId || !bucketName) return;

            try {
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

              await deleteObject(config, bucketName, object.key, deleteAllVersions);
              
              toast({
                variant: "success",
                title: "Object Deleted",
                description: deleteAllVersions 
                  ? "All versions of the object have been deleted." 
                  : "Object has been deleted successfully.",
              });

              // Close sidebar and refresh file list
              onClose();
              onObjectDeleted();
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              toast({
                variant: "destructive",
                title: "Failed to Delete Object",
                description: errorMsg,
              });
              throw error; // Re-throw to prevent modal from closing
            }
          }}
        />
      )}
    </>
  );
}
