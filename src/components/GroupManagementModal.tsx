import { useState, useEffect } from "react";
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
import { Trash2, Plus } from "lucide-react";
import { Group } from "../types";
import { createGroup, updateGroup, deleteGroup, loadConfigs } from "../services/storageService";
import { useToast } from "./ui/use-toast";

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
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState(GROUP_COLORS[0].value);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadGroups();
    }
  }, [open]);

  const loadGroups = async () => {
    const configs = await loadConfigs();
    setGroups(Object.values(configs.groups || {}));
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;

    setLoading(true);
    try {
      await createGroup(newGroupName.trim(), newGroupColor);
      setNewGroupName("");
      setNewGroupColor(GROUP_COLORS[0].value);
      await loadGroups();
      toast({
        variant: "success",
        title: "Folder Created",
        description: `Folder "${newGroupName.trim()}" has been created successfully.`,
      });
      // Don't call onGroupsChanged here - it might cause the modal to reopen
      // The parent will refresh when the modal is closed
    } catch (error) {
      console.error("Failed to create group:", error);
      toast({
        variant: "destructive",
        title: "Failed to Create Folder",
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGroup = async () => {
    if (!editingGroup || !editingGroup.name.trim()) return;

    setLoading(true);
    try {
      await updateGroup(editingGroup.id, editingGroup.name.trim(), editingGroup.color);
      setEditingGroup(null);
      await loadGroups();
      toast({
        variant: "success",
        title: "Folder Updated",
        description: `Folder has been updated successfully.`,
      });
      // Don't call onGroupsChanged here - refresh when modal closes
    } catch (error) {
      console.error("Failed to update group:", error);
      toast({
        variant: "destructive",
        title: "Failed to Update Folder",
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm("Are you sure you want to delete this folder? Buckets in this folder will be moved out.")) {
      return;
    }

    setLoading(true);
    try {
      await deleteGroup(groupId);
      await loadGroups();
      toast({
        variant: "success",
        title: "Folder Deleted",
        description: `Folder has been deleted successfully.`,
      });
      // Don't call onGroupsChanged here - refresh when modal closes
    } catch (error) {
      console.error("Failed to delete group:", error);
      toast({
        variant: "destructive",
        title: "Failed to Delete Folder",
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Refresh configs when closing the modal
    onGroupsChanged();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Folders</DialogTitle>
          <DialogDescription>
            Create folders to organize your buckets. You can assign buckets to folders when adding or editing them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Create new folder */}
          <div className="space-y-2 rounded-lg border p-4">
            <h3 className="text-sm font-medium">Create New Folder</h3>
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
            <Button onClick={handleCreateGroup} disabled={loading || !newGroupName.trim()}>
              <Plus className="mr-2 h-4 w-4" />
              Create Folder
            </Button>
          </div>

          {/* Existing folders */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Existing Folders</h3>
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No folders created yet</p>
            ) : (
              <div className="space-y-2">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center gap-2 rounded-lg border p-3"
                  >
                    {editingGroup?.id === group.id ? (
                      <>
                        <div
                          className="h-4 w-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: editingGroup.color || GROUP_COLORS[0].value }}
                        />
                        <Input
                          value={editingGroup.name}
                          onChange={(e) =>
                            setEditingGroup({ ...editingGroup, name: e.target.value })
                          }
                          className="flex-1"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleUpdateGroup();
                            } else if (e.key === "Escape") {
                              setEditingGroup(null);
                            }
                          }}
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={handleUpdateGroup}
                          disabled={loading}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingGroup(null)}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <div
                          className="h-4 w-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: group.color || GROUP_COLORS[0].value }}
                        />
                        <span className="flex-1 text-sm font-medium">{group.name}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingGroup(group)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteGroup(group.id)}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button 
            onClick={() => {
              onOpenChange(false);
              // Refresh configs when closing the modal
              onGroupsChanged();
            }}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
