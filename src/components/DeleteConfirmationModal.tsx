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
import { useConfig } from "@/context/config";
import { toast } from "react-toastify";
import { DeleteObjectRequest } from "@/models/dto/requests/DeleteObjectRequest";
import { deleteObject } from "@/services/s3Service";

interface DeleteConfirmationModalProps {
  open: boolean;
  objectKey: string;
  bucketId: string;
  onClose: (deleted?: boolean) => void;
}

export default function DeleteConfirmationModal({
  open,
  objectKey,
  bucketId,
  onClose,
}: DeleteConfirmationModalProps) {
  const [loading, setLoading] = useState(false);
  const { configs } = useConfig();
  const bucket = configs.buckets[bucketId];

  const handleDelete = async () => {
    const credentials = configs.credentials[bucket.credentialId];

    if (!credentials) {
      toast.error("Failed to delete object");
      return;
    }

    setLoading(true);

    try {
      const deleteObjectRequest: DeleteObjectRequest = {
        bucketName: bucket.bucketName,
        region: bucket.region,
        endpoint: bucket.endpoint,
        forcePathStyle: bucket.forcePathStyle,
        accessKey: credentials.accessKey,
        secretKey: credentials.secretKey,
        key: objectKey,
      };
      await deleteObject(deleteObjectRequest);
      toast.success("Object deleted successfully");
      onClose(true);
    } catch (err) {
      console.error("Failed to delete object", err);
      toast.error("Failed to delete object");
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (!loading) {
      onClose(false);
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
            Are you sure you want to delete{" "}
            <span className="font-bold text-foreground break-all">
              {objectKey}
            </span>
            ? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

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
            onClick={handleDelete}
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
