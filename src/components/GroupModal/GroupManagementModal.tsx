import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Group } from "@/types";
import { useConfig } from "@/context/config";
import { toast } from "react-toastify";
import { useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  DefaultGroupFormData,
  GroupFormData,
  GroupFormSchema,
  GroupModalState,
} from "./GroupSchema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

interface GroupManagementModalProps {
  groupModalState: GroupModalState;
  onClose: () => void;
}

export const GROUP_COLORS = [
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#10b981" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Orange", value: "#f59e0b" },
  { name: "Red", value: "#ef4444" },
  { name: "Pink", value: "#ec4899" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Gray", value: "#6b7280" },
];

export default function GroupManagementModal({
  groupModalState,
  onClose,
}: GroupManagementModalProps) {
  const { addGroup, updateGroup } = useConfig();

  const methods = useForm({
    resolver: zodResolver(GroupFormSchema),
    defaultValues: DefaultGroupFormData,
  });

  useEffect(() => {
    if (groupModalState.open && groupModalState.group) {
      console.log("useEffect reset", groupModalState.group);
      methods.reset(groupModalState.group as GroupFormData);
    }
  }, [groupModalState.open, groupModalState.group]);

  const handleSubmit = async (formGroupData: GroupFormData) => {
    if (groupModalState.group) {
      await handleUpdateGroup(formGroupData);
    } else {
      await handleCreateGroup(formGroupData);
    }
  };

  const handleClose = () => {
    methods.reset(DefaultGroupFormData);
    onClose();
  };

  async function handleCreateGroup(formGroupData: GroupFormData) {
    console.log("handleCreateGroup", formGroupData);
    try {
      const nextGroup: Group = {
        id: uuidv4(),
        name: formGroupData.name,
        color: formGroupData.color,
      };
      await addGroup(nextGroup);
      handleClose();
      toast.success(`Folder "${nextGroup.name}" created successfully`);
    } catch (error) {
      console.error("Failed to create group:", error);
      toast.error("Failed to create group");
    }
  }

  async function handleUpdateGroup(formGroupData: GroupFormData) {
    console.log("handleUpdateGroup", formGroupData);
    try {
      const nextGroup: Group = {
        id: groupModalState.group!.id,
        name: formGroupData.name,
        color: formGroupData.color,
      };
      await updateGroup(nextGroup);
      handleClose();
      toast.success(`Folder "${nextGroup.name}" updated successfully`);
    } catch (error) {
      console.error("Failed to update group:", error);
      toast.error(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <FormProvider {...methods}>
      <Dialog open={groupModalState.open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Folder</DialogTitle>
            <DialogDescription>
              Create a new folder to organize your buckets. You can edit folders
              directly from the sidebar.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={methods.handleSubmit(handleSubmit)}>
            <div className="space-y-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="group-name">Folder Name</Label>
                <Input
                  id="group-name"
                  placeholder="e.g., Production, Development"
                  error={methods.formState.errors.name?.message}
                  {...methods.register("name")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="group-color">Color</Label>
                <div className="flex flex-wrap gap-2">
                  {GROUP_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => methods.setValue("color", color.value)}
                      className={`h-8 w-8 rounded-full border-2 transition-all ${
                        methods.watch("color") === color.value
                          ? "border-foreground scale-110"
                          : "border-border hover:border-foreground/50"
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={methods.formState.isLoading}>
                {methods.formState.isLoading ? "Creating..." : "Create Folder"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </FormProvider>
  );
}
