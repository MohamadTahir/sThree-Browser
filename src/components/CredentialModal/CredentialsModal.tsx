import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Credential } from "../../models/types";
import { useConfig } from "@/context/config";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CredentialFormData,
  CredentialFormSchema,
  DefaultCredentialFormData,
} from "./CredentialsSchema";
import { toast } from "react-toastify";
import { v4 as uuidv4 } from "uuid";

interface CredentialsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CredentialsModal({
  open,
  onClose,
}: CredentialsModalProps) {
  const { configs, addCredential, deleteCredential, updateCredential } =
    useConfig();

  const methods = useForm({
    resolver: zodResolver(CredentialFormSchema),
    defaultValues: DefaultCredentialFormData,
  });

  const [selectedCredential, setSelectedCredential] =
    useState<Credential | null>(null);

  const handleSelect = (cred: Credential) => {
    setSelectedCredential(cred);
    methods.reset(cred);
  };

  const handleNew = () => {
    setSelectedCredential(null);
    methods.reset(DefaultCredentialFormData);
  };

  const handleClose = () => {
    methods.reset(DefaultCredentialFormData);
    onClose();
  };

  const handleSave = async (credentialData: CredentialFormData) => {
    if (selectedCredential) {
      await handleUpdateCredential(credentialData);
    } else {
      await handleCreateCredential(credentialData);
    }
  };

  const handleCreateCredential = async (credentialData: CredentialFormData) => {
    const nextCredential: Credential = {
      id: uuidv4(),
      name: credentialData.name,
      accessKey: credentialData.accessKey,
      secretKey: credentialData.secretKey,
    };
    await addCredential(nextCredential);
  };

  const handleUpdateCredential = async (credentialData: CredentialFormData) => {
    const nextCredential: Credential = {
      id: selectedCredential!.id,
      name: credentialData.name,
      accessKey: credentialData.accessKey,
      secretKey: credentialData.secretKey,
    };
    await updateCredential(nextCredential);
  };

  const handleDelete = async () => {
    await deleteCredential(selectedCredential!.id);
    handleNew();
  };

  const credentialList = Object.values(configs.credentials);

  return (
    <FormProvider {...methods}>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>Manage Credentials</DialogTitle>
            <DialogDescription>
              Create and manage reusable S3 credentials that can be shared
              across multiple buckets.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={methods.handleSubmit(handleSave)}>
            <div className="grid gap-6 py-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              <div className="space-y-2 border-r pr-4 max-h-[400px] overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium">Saved Credentials</h3>
                  <Button size="sm" variant="outline" onClick={handleNew}>
                    New
                  </Button>
                </div>
                {credentialList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No credentials yet. Create your first credentials on the
                    right.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {credentialList.map((cred) => (
                      <button
                        key={cred.id}
                        type="button"
                        onClick={() => handleSelect(cred)}
                        className={`w-full text-left px-2 py-1.5 rounded-md text-sm border ${
                          selectedCredential?.id === cred.id
                            ? "bg-accent text-accent-foreground border-border"
                            : "border-transparent hover:bg-accent/50"
                        }`}
                      >
                        <div className="font-medium truncate">{cred.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {/* Don't show region/endpoint here; credentials are just keys */}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="cred-name">Name</Label>
                  <Input
                    id="cred-name"
                    placeholder="Production account"
                    value={methods.watch("name")}
                    {...methods.register("name")}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cred-access">Access Key</Label>
                  <Input
                    id="cred-access"
                    type="password"
                    placeholder="AKIAIOSFODNN7EXAMPLE"
                    value={methods.watch("accessKey")}
                    {...methods.register("accessKey")}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cred-secret">Secret Key</Label>
                  <Input
                    id="cred-secret"
                    type="password"
                    placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                    value={methods.watch("secretKey")}
                    {...methods.register("secretKey")}
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="flex justify-between">
              <div>
                {selectedCredential && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                  >
                    Delete
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Close
                </Button>
                <Button type="submit" disabled={methods.formState.isLoading}>
                  {methods.formState.isLoading ? "Saving..." : "Save"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </FormProvider>
  );
}
