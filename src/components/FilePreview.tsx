import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Loader2, FileText, Image as ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { getFileType, getMimeType } from "../lib/fileUtils";
import { S3Object } from "../types";

interface FilePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: S3Object | null;
  bucketId: string | null;
  bucketName: string | null;
}

export default function FilePreview({
  open,
  onOpenChange,
  file,
  bucketId,
  bucketName,
}: FilePreviewProps) {
  const [content, setContent] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && file && bucketId && bucketName && !file.is_folder) {
      console.log("FilePreview: Opening preview for", file.key);
      loadFileContent();
    } else {
      // Reset state when modal closes
      console.log("FilePreview: Resetting state");
      setContent(null);
      setImageUrl(null);
      setError(null);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, file?.key, bucketId, bucketName]);

  const loadFileContent = async () => {
    if (!file || !bucketId || !bucketName) {
      console.log("loadFileContent: Missing required params", { file, bucketId, bucketName });
      return;
    }

    // Don't preview files larger than 50MB
    const MAX_PREVIEW_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_PREVIEW_SIZE) {
      setError(`File is too large to preview (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum preview size is 50MB.`);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setContent(null);
      setImageUrl(null);

      const fileType = getFileType(file.key);
      console.log("Loading file:", { key: file.key, fileType, size: file.size });

      const response = await invoke<{ data: string; size: number }>("get_object_content", {
        bucketId,
        bucketName,
        key: file.key,
      });

      console.log("Received response:", { size: response.size, dataLength: response.data.length });

      if (!response.data || response.size === 0) {
        setError("File is empty or could not be loaded");
        setLoading(false);
        return;
      }

      // Decode base64 to Uint8Array
      const binaryString = atob(response.data);
      const uint8Array = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
      }
      console.log("Decoded to Uint8Array:", uint8Array.length);

      if (fileType === 'image') {
        // Create blob URL for images
        const mimeType = getMimeType(file.key);
        console.log("Creating image blob with mime type:", mimeType);
        const blob = new Blob([uint8Array], { type: mimeType });
        const url = URL.createObjectURL(blob);
        console.log("Created blob URL:", url);
        setImageUrl(url);
      } else if (fileType === 'text') {
        // Decode as text
        const decoder = new TextDecoder('utf-8');
        try {
          const text = decoder.decode(uint8Array);
          console.log("Decoded text, length:", text.length);
          setContent(text);
        } catch (e) {
          console.error("Text decode error:", e);
          setContent('Unable to decode file as text. File may be binary.');
        }
      } else if (fileType === 'pdf') {
        // Create blob URL for PDF
        console.log("Creating PDF blob");
        const blob = new Blob([uint8Array], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        console.log("Created PDF blob URL:", url);
        setImageUrl(url); // Reuse imageUrl for PDF viewer
      } else {
        console.log("Unknown file type:", fileType);
        setError(`Preview not available for file type: ${fileType}`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("Preview error:", err);
      setError(`Failed to load file: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Clean up blob URLs
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
      setImageUrl(null);
    }
    onOpenChange(false);
  };


  if (!file) return null;

  const fileType = getFileType(file.key);
  const fileName = file.key.split('/').pop() || file.key;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {fileType === 'image' && <ImageIcon className="h-5 w-5" />}
            {fileType === 'text' && <FileText className="h-5 w-5" />}
            {fileType === 'pdf' && <FileText className="h-5 w-5" />}
            <span className="truncate">{fileName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-destructive">
              <p className="text-lg">{error}</p>
            </div>
          ) : fileType === 'image' && imageUrl ? (
            <div className="flex items-center justify-center">
              <img
                src={imageUrl}
                alt={fileName}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
                onError={(e) => {
                  console.error("Image load error:", e);
                  setError("Failed to display image");
                }}
                onLoad={() => {
                  console.log("Image loaded successfully");
                }}
              />
            </div>
          ) : fileType === 'pdf' && imageUrl ? (
            <div className="w-full h-[70vh]">
              <iframe
                src={imageUrl}
                className="w-full h-full border-0 rounded-lg"
                title={fileName}
              />
            </div>
          ) : fileType === 'text' && content !== null ? (
            <div className="rounded-lg border border-border bg-card p-4">
              <pre className="text-sm font-mono whitespace-pre-wrap break-words overflow-x-auto">
                {content}
              </pre>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mb-4 opacity-50" />
              <p>Preview not available for this file type</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
