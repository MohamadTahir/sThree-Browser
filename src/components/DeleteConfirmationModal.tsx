import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";

interface DeleteConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  onConfirm: (deleteAllVersions: boolean) => Promise<void>;
}

export default function DeleteConfirmationModal({
  open,
  onOpenChange,
  fileName,
  onConfirm,
}: DeleteConfirmationModalProps) {
  const [deleteAllVersions, setDeleteAllVersions] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(deleteAllVersions);
      onOpenChange(false);
      setDeleteAllVersions(false);
    } catch (error) {
      // Error handling is done in parent component
      console.error("Delete error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (!loading) {
      setDeleteAllVersions(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Delete Object
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{fileName}"? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="delete-all-versions"
              checked={deleteAllVersions}
              onCheckedChange={(checked) => setDeleteAllVersions(checked === true)}
              disabled={loading}
            />
            <Label
              htmlFor="delete-all-versions"
              className="text-sm font-normal cursor-pointer"
            >
              Delete all versions of this object
            </Label>
          </div>
          <p className="text-xs text-muted-foreground mt-2 ml-6">
            If enabled, all versions and delete markers will be permanently deleted.
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
