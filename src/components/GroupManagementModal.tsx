import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Plus } from "lucide-react";
import { createGroup } from "../services/storageService";

interface GroupManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupsChanged: () => void;
}

const GROUP_COLORS = [
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
  open,
  onOpenChange,
  onGroupsChanged,
}: GroupManagementModalProps) {
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState(GROUP_COLORS[0].value);
  const [loading, setLoading] = useState(false);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;

    setLoading(true);
    try {
      await createGroup(newGroupName.trim(), newGroupColor);
      const createdName = newGroupName.trim();
      setNewGroupName("");
      setNewGroupColor(GROUP_COLORS[0].value);
      // toast({
      //   variant: "success",
      //   title: "Folder Created",
      //   description: `Folder "${createdName}" has been created successfully.`,
      // });
      // Immediately refresh the sidebar state
      onGroupsChanged();
      // Close the modal after successful creation
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to create group:", error);
      // toast({
      //   variant: "destructive",
      //   title: "Failed to Create Folder",
      //   description: error instanceof Error ? error.message : String(error),
      // });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Folder</DialogTitle>
          <DialogDescription>
            Create a new folder to organize your buckets. You can edit folders directly from the sidebar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="group-name">Folder Name</Label>
            <Input
              id="group-name"
              placeholder="e.g., Production, Development"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreateGroup();
                }
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="group-color">Color</Label>
            <div className="flex flex-wrap gap-2">
              {GROUP_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setNewGroupColor(color.value)}
                  className={`h-8 w-8 rounded-full border-2 transition-all ${newGroupColor === color.value
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
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleCreateGroup} disabled={loading || !newGroupName.trim()}>
            <Plus className="mr-2 h-4 w-4" />
            Create Folder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
