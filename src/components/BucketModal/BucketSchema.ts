import { Bucket } from "@/models/types";
import { z } from "zod";

export const BucketFormSchema = z.object({
  nickname: z.string().min(1, "Nickname is required"),
  bucketName: z.string().min(1, "Bucket name is required"),
  region: z.string().min(1, "Region is required"),
  endpoint: z.url().or(z.literal("")),
  credentialId: z.string().min(1, "Credential is required"),
  groupId: z.string().optional().nullable(),
  forcePathStyle: z.boolean(),
});

export type BucketFormData = z.infer<typeof BucketFormSchema>;

export const DefaultBucketFormData: BucketFormData = {
  nickname: "",
  bucketName: "",
  region: "us-east-1",
  endpoint: "",
  credentialId: "",
  groupId: "",
  forcePathStyle: true,
};

export type BucketModalState = {
  open: boolean;
  bucket: Bucket | null;
};

export const DefaultBucketModalState: BucketModalState = {
  open: false,
  bucket: null,
};
