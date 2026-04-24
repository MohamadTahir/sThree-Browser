import z from "zod";

export const CredentialFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  accessKey: z.string().min(1, "Access Key is required"),
  secretKey: z.string().min(1, "Secret Key is required"),
});

export type CredentialFormData = z.infer<typeof CredentialFormSchema>;

export const DefaultCredentialFormData: CredentialFormData = {
  name: "",
  accessKey: "",
  secretKey: "",
};
