import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";

import { useConfig } from "@/context/config";
import { Bucket } from "@/types";
import { toast } from "react-toastify";
import { useEffect } from "react";
import { Button } from "../ui/button";
import {
  DialogHeader,
  DialogFooter,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { v4 as uuidv4 } from "uuid";
import {
  BucketModalState,
  BucketFormSchema,
  DefaultBucketFormData,
  BucketFormData,
} from "./BucketSchema";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface BucketManagementModalProps {
  bucketModalState: BucketModalState;
  onClose: () => void;
}

export default function BucketManagementModal({
  bucketModalState,
  onClose,
}: BucketManagementModalProps) {
  const { configs, addBucket, updateBucket } = useConfig();

  const methods = useForm({
    resolver: zodResolver(BucketFormSchema),
    defaultValues: DefaultBucketFormData,
  });

  useEffect(() => {
    if (bucketModalState.open && bucketModalState.bucket) {
      methods.reset(bucketModalState.bucket as BucketFormData);
    }
  }, [bucketModalState.open, bucketModalState.bucket]);

  const handleSubmit = async (formBucketData: BucketFormData) => {
    if (bucketModalState.bucket) {
      await handlerUpdateBucket(formBucketData);
    } else {
      await handlerCreateBucket(formBucketData);
    }
  };

  const handleClose = () => {
    methods.reset(DefaultBucketFormData);
    onClose();
  };

  const handlerCreateBucket = async (formBucketData: BucketFormData) => {
    const nextBucket: Bucket = {
      id: uuidv4().toString(),
      nickname: formBucketData.nickname,
      bucketName: formBucketData.bucketName,
      region: formBucketData.region,
      endpoint: formBucketData.endpoint?.trim() || undefined,
      groupId: formBucketData.groupId || null,
      credentialId: formBucketData.credentialId,
      forcePathStyle: formBucketData.forcePathStyle,
    };
    await addBucket(nextBucket);
    handleClose();
    toast.success(`Bucket "${formBucketData.nickname}" added successfully`);
  };

  const handlerUpdateBucket = async (formBucketData: BucketFormData) => {
    const nextBucket: Bucket = {
      id: bucketModalState.bucket!.id,
      nickname: formBucketData.nickname,
      bucketName: formBucketData.bucketName,
      region: formBucketData.region,
      endpoint: formBucketData.endpoint?.trim() || undefined,
      groupId: formBucketData.groupId || null,
      credentialId: formBucketData.credentialId,
      forcePathStyle: formBucketData.forcePathStyle,
    };
    await updateBucket(nextBucket);
    handleClose();
    toast.success(`Bucket "${formBucketData.nickname}" updated successfully`);
  };

  function forcePathStyle() {
    return (
      <div className="flex flex-col gap-2">
        <Label htmlFor="credential">Force Path Style</Label>
        <Select
          value={methods.watch("forcePathStyle") ? "true" : "false"}
          onValueChange={(value) =>
            methods.setValue("forcePathStyle", value === "true" ? true : false)
          }
        >
          <SelectTrigger id="credential">
            <SelectValue placeholder="Force Path Style" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="true">True</SelectItem>
            <SelectItem value="false">False</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  const selectCredentials = () => {
    return (
      <div className="flex flex-col gap-2">
        <Label htmlFor="credential">Credentials (Optional)</Label>
        <Select
          value={methods.watch("credentialId") || "none"}
          onValueChange={(value) =>
            methods.setValue("credentialId", value === "none" ? "" : value)
          }
        >
          <SelectTrigger id="credential">
            <SelectValue placeholder="Select credentials" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {Object.values(configs.credentials).map((cred) => (
              <SelectItem key={cred.id} value={cred.id}>
                {cred.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <p className="text-xs text-muted-foreground">
          Choose reusable credentials to use for this bucket. (selecting None
          will prompt you to enter your credentials manually)
        </p>
      </div>
    );
  };

  const selectGroup = () => {
    return (
      <div className="grid gap-2">
        <Label htmlFor="group">Folder (Optional)</Label>
        <Select
          value={methods.watch("groupId") || "none"}
          onValueChange={(value) =>
            methods.setValue("groupId", value === "none" ? "" : value)
          }
        >
          <SelectTrigger id="group">
            <SelectValue placeholder="No folder" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No folder</SelectItem>
            {Object.values(configs.groups).map((group) => (
              <SelectItem key={group.id} value={group.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{
                      backgroundColor: group.color || "#6b7280",
                    }}
                  />
                  {group.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Optionally assign this bucket to a folder for better organization.
        </p>
      </div>
    );
  };

  return (
    <FormProvider {...methods}>
      <Dialog open={bucketModalState.open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {bucketModalState.bucket ? "Edit S3 Bucket" : "Add S3 Bucket"}
            </DialogTitle>
            <DialogDescription>
              Configure access to an S3 bucket or S3-compatible storage.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={methods.handleSubmit(handleSubmit)}>
            <div className="grid gap-4 py-4">
              <Input
                label="Connection Name"
                placeholder="My S3 Connection"
                error={methods.formState.errors.nickname?.message}
                {...methods.register("nickname")}
              />
              <Input
                label="Bucket Name"
                placeholder="my-bucket-name"
                error={methods.formState.errors.bucketName?.message?.toString()}
                {...methods.register("bucketName")}
              />
              <Input
                label="Region"
                placeholder="us-east-1"
                error={methods.formState.errors.region?.message?.toString()}
                {...methods.register("region")}
              />
              <Input
                label="Endpoint (Optional)"
                placeholder="https://storage.example.com"
                error={methods.formState.errors.endpoint?.message?.toString()}
                {...methods.register("endpoint")}
              />

              {forcePathStyle()}

              {selectCredentials()}

              {selectGroup()}
            </div>

            <DialogFooter className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={methods.formState.isLoading}>
                {methods.formState.isLoading
                  ? "Saving..."
                  : bucketModalState.bucket
                    ? "Save"
                    : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </FormProvider>
  );
}
