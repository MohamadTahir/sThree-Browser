import { useState, useEffect } from "react";
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
import { S3Object } from "../models/types";
import { formatDate } from "../lib/utils";
import prettyBytes from "pretty-bytes";
import ShareModal from "./ShareModal";
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import { useConfig } from "@/context/config";
import { twMerge } from "tailwind-merge";
import { getMimeType, getPresignedUrl } from "@/services/s3Service";
import { toast } from "react-toastify";
import dynamic from "next/dynamic";

const FilePreview = dynamic(() => import("reactjs-file-preview"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

const supportedImageMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

const imageExtensions = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const textExtensions = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/json",
  "application/xml",
  "application/yaml",
  "application/yml",
];

const codeExtensions = [
  "application/javascript",
  "application/typescript",
  "text/javascript",
  "text/javascript",
  "text/html",
  "text/css",
  "text/x-scss",
  "text/x-sass",
  "text/x-python",
  "text/x-java-source",
  "text/x-c++src",
  "text/x-csrc",
  "text/x-chdr",
  "text/x-c++hdr",
  "text/x-go",
  "text/x-rust",
  "text/x-ruby",
  "application/x-httpd-php",
  "application/x-sh",
  "application/x-sh",
  "application/x-sh",
  "application/x-sh",
  "text/plain",
];

interface ObjectDetailsSidebarProps {
  object: S3Object | null;
  bucketId: string;
  onClose: (reload?: boolean) => void;
}

export default function ObjectDetailsSidebar({
  object,
  bucketId,
  onClose,
}: ObjectDetailsSidebarProps) {
  const { configs } = useConfig();
  const bucket = configs.buckets[bucketId];

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    preparePreSignedUrlForPreview();
  }, [object?.key]);

  const preparePreSignedUrlForPreview = async () => {
    if (!object) {
      return;
    }

    const credentials = configs.credentials[bucket.credentialId];

    if (!credentials) {
      toast.error("Failed to preview image");
      return;
    }

    try {
      const response = await getMimeType({
        key: object.key,
        bucketName: bucket.bucketName,
        region: bucket.region,
        endpoint: bucket.endpoint,
        forcePathStyle: bucket.forcePathStyle,
        accessKey: credentials.accessKey,
        secretKey: credentials.secretKey,
      });

      if (response.error) {
        toast.error("Failed to get mime type");
        return;
      }

      setMimeType(response.mimeType);

      if (!supportedImageMimeTypes.includes(response.mimeType)) {
        return;
      }

      const presignedUrl = await getPresignedUrl({
        key: object.key,
        expiresIn: 3600,
        bucketName: bucket.bucketName,
        region: bucket.region,
        endpoint: bucket.endpoint,
        forcePathStyle: bucket.forcePathStyle,
        accessKey: credentials.accessKey,
        secretKey: credentials.secretKey,
      });

      setPreviewUrl(presignedUrl.url);
    } catch (err) {
      toast.error("Failed to preview image");
      console.error("Failed to preview image", err);
      setPreviewUrl(null);
    }
  };

  if (!bucket || !object) {
    return;
  }

  const handleDownload = async (object: S3Object, e?: React.MouseEvent) => {
    // if (e) {
    //   e.stopPropagation(); // Prevent triggering the file click handler
    // }
    // try {
    //   setLoading(true);
    //   // Get config to use with S3 service
    //   const configs = await loadConfigsFromStorage();
    //   const config = configs.buckets[bucketId];
    //   if (!config) {
    //     setError("Bucket configuration not found");
    //     return;
    //   }
    //   let getObjectContentRequest: GetObjectRequest = {
    //     bucket: config,
    //     key: object.key,
    //   };
    //   const uint8Array = await getObjectContent(getObjectContentRequest);
    //   // Get file name
    //   const fileName = object.key.split("/").pop() || object.key;
    //   // Check if we're in Tauri (desktop) or browser (web)
    //   const isTauri =
    //     typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
    //   if (isTauri) {
    //     // Desktop: Save to downloads folder using Tauri
    //     const { invoke } = await import("@tauri-apps/api/core");
    //     const fileData = Array.from(uint8Array);
    //     const filePath = await invoke<string>("save_file_to_downloads", {
    //       fileName,
    //       fileData,
    //     });
    //     // Show download toast with the actual file path
    //     setDownloadToast({
    //       fileName,
    //       filePath,
    //       open: true,
    //     });
    //   } else {
    //     // Web: Use browser download
    //     // Create a new Uint8Array copy to ensure proper typing
    //     const dataCopy = new Uint8Array(uint8Array);
    //     const blob = new Blob([dataCopy]);
    //     const url = URL.createObjectURL(blob);
    //     const link = document.createElement("a");
    //     link.href = url;
    //     link.download = fileName;
    //     document.body.appendChild(link);
    //     link.click();
    //     document.body.removeChild(link);
    //     URL.revokeObjectURL(url);
    //     // Show toast (web version could show a simple notification)
    //     setDownloadToast({
    //       fileName,
    //       filePath: fileName, // Web doesn't have a file path
    //       open: true,
    //     });
    //   }
    // } catch (err) {
    //   const errorMsg = err instanceof Error ? err.message : String(err);
    //   // toast({
    //   //   variant: "destructive",
    //   //   title: "Download Failed",
    //   //   description: errorMsg,
    //   // });
    //   console.error("Download error:", err);
    // } finally {
    //   setLoading(false);
    // }
  };

  // const handleDownload = (fileUrl, fileName) => {
  //   const link = document.createElement("a");
  //   link.href = fileUrl;
  //   link.setAttribute("download", fileName);
  //   document.body.appendChild(link);
  //   link.click();
  //   link.parentNode.removeChild(link);
  // };

  const handleOpenFile = async () => {
    // if (!downloadToast) return;
    // const isTauri =
    //   typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
    // if (!isTauri) {
    //   // Web: Can't open files directly, show message
    //   // toast({
    //   //   variant: "warning",
    //   //   title: "Desktop Only",
    //   //   description: "File opening is only available in the desktop app",
    //   // });
    //   return;
    // }
    // try {
    //   const { invoke } = await import("@tauri-apps/api/core");
    //   await invoke("open_file", {
    //     path: downloadToast.filePath,
    //   });
    // } catch (err) {
    //   console.error("Failed to open file:", err);
    //   const errorMsg = err instanceof Error ? err.message : String(err);
    //   // toast({
    //   //   variant: "destructive",
    //   //   title: "Failed to Open File",
    //   //   description: errorMsg,
    //   // });
    // }
  };

  const handleOpenFileLocation = async () => {
    // if (!downloadToast) return;
    // const isTauri =
    //   typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
    // if (!isTauri) {
    //   // Web: Can't open folders directly, show message
    //   // toast({
    //   //   variant: "warning",
    //   //   title: "Desktop Only",
    //   //   description: "Opening file location is only available in the desktop app",
    //   // });
    //   return;
    // }
    // try {
    //   const { invoke } = await import("@tauri-apps/api/core");
    //   await invoke("open_folder", {
    //     path: downloadToast.filePath,
    //   });
    // } catch (err) {
    //   console.error("Failed to open file location:", err);
    //   const errorMsg = err instanceof Error ? err.message : String(err);
    //   // toast({
    //   //   variant: "destructive",
    //   //   title: "Failed to Open File Location",
    //   //   description: errorMsg,
    //   // });
    // }
  };

  const fileName = object.key.split("/").pop();

  const fileNameAndIcon = () => {
    let icon: React.ReactNode;
    switch (true) {
      case imageExtensions.includes(mimeType):
        icon = <ImageIcon className="h-8 w-8 text-primary" />;
        break;
      case textExtensions.includes(mimeType):
        icon = <FileText className="h-8 w-8 text-primary" />;
        break;
      case codeExtensions.includes(mimeType):
        icon = <FileCode className="h-8 w-8 text-primary" />;
        break;
      default:
        icon = <File className="h-8 w-8 text-muted-foreground" />;
        break;
    }

    return (
      <div className="flex flex-col items-center gap-3">
        {icon}
        <div className="text-center">
          <h3 className="text-lg font-semibold break-words">{fileName}</h3>
        </div>
      </div>
    );
  };

  const fullPath = () => {
    return (
      <div>
        <p className="text-xs text-muted-foreground mb-1">Full Path</p>
        <p className="text-sm break-all font-mono bg-muted/50 p-2 rounded">
          {object.key}
        </p>
      </div>
    );
  };

  const size = () => {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Size</span>
        </div>
        <span className="text-sm font-medium">{prettyBytes(object.size)}</span>
      </div>
    );
  };

  const lastModified = () => {
    if (!object.lastModified) return null;
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Last Modified</span>
        </div>
        <span className="text-sm font-medium">
          {formatDate(object.lastModified)}
        </span>
      </div>
    );
  };

  const preview = () => {
    if (!supportedImageMimeTypes.includes(mimeType)) return null;

    return (
      <>
        <Separator />
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Preview</h4>
          <FilePreview
            preview={previewUrl}
            // placeHolderImage="https://example.com/placeholder.png"
            // errorImage="https://example.com/error.png"
          />
        </div>
      </>
    );
  };

  const actions = () => {
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Actions</h4>

        <div className="flex flex-col gap-2">
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
            onClick={
              () => {}
              // onDownload(object)
            }
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
        </div>
      </div>
    );
  };

  const sidebarOpen = object != null;

  return (
    <>
      {/* Sidebar */}
      <div
        className={twMerge(
          "flex flex-col border-l border-border overflow-hidden",
          "fixed md:relative z-50 md:z-auto",
          "right-0 top-0 bottom-0 h-full",
          "w-full max-w-md",
          "bg-background md:bg-card",
          "shadow-lg md:shadow-none",
          // Mobile: slide in/out as overlay using transform
          sidebarOpen ? "translate-x-0" : "translate-x-full md:translate-x-0",
          // Desktop: hide by setting width to 0 when closed
          !sidebarOpen && "md:w-0 md:border-0 md:overflow-hidden",
          sidebarOpen && "md:w-full md:max-w-md",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Object Details</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onClose(false)}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Icon and Name */}
          {fileNameAndIcon()}

          <Separator />

          <div className="space-y-4">
            <h4 className="text-sm font-medium">Information</h4>

            <div className="space-y-3">
              {fullPath()}
              {size()}
              {lastModified()}
            </div>
          </div>

          {preview()}

          <Separator />

          {actions()}
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
      <DeleteConfirmationModal
        open={showDeleteModal}
        objectKey={object?.key}
        bucketId={bucketId}
        onClose={(deleted) => {
          if (deleted) {
            setShowDeleteModal(false);
            onClose(true);
          } else {
            setShowDeleteModal(false);
          }
        }}
      />
    </>
  );
}
