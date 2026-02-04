import { useEffect, useState } from "react";
import { X, File, FolderOpen } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

interface DownloadToastProps {
  fileName: string;
  filePath: string;
  onOpen: () => void;
  onOpenLocation: () => void;
  onClose: () => void;
  open: boolean;
}

export default function DownloadToast({
  fileName,
  filePath: _filePath, // Used by parent component but not displayed in UI
  onOpen,
  onOpenLocation,
  onClose,
  open,
}: DownloadToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for animation
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [open, onClose]);

  if (!open && !isVisible) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 flex w-[calc(100vw-2rem)] max-w-96 items-start gap-4 rounded-lg border border-border bg-card p-4 shadow-lg transition-all duration-300",
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      )}
    >
      <div className="flex-shrink-0">
        <File className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium">Download complete</p>
            <p className="text-xs text-muted-foreground truncate" title={fileName}>
              {fileName}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {isTauri && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onOpen}
              className="flex items-center gap-2 text-xs"
            >
              <File className="h-3 w-3" />
              Open file
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenLocation}
              className="flex items-center gap-2 text-xs"
            >
              <FolderOpen className="h-3 w-3" />
              Open location
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
