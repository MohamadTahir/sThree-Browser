import { Trash2, Plus, Folder, Pencil, FolderOpen, ChevronDown, ChevronRight, Search, X, PanelLeftClose, PanelLeftOpen, Check, Database, GripVertical } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Input } from "./ui/input";
import { BucketConfigs, Group } from "../types";
import { cn } from "../lib/utils";
import { updateGroup, deleteGroup, addBucketToGroup } from "../services/storageService";
import { useToast } from "./ui/use-toast";

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

interface SidebarProps {
  configs: BucketConfigs | null;
  selectedBucket: string | null;
  onBucketSelect: (bucketId: string) => void;
  onAddBucket: () => void;
  onEditBucket: (bucketId: string) => void;
  onDeleteBucket: (bucketId: string) => void;
  onManageGroups: () => void;
  onGroupsChanged: () => void;
  expandedGroups: Set<string>;
  onToggleGroup: (groupId: string) => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export default function Sidebar({
  configs,
  selectedBucket,
  onBucketSelect,
  onAddBucket,
  onEditBucket,
  onDeleteBucket,
  onManageGroups,
  onGroupsChanged,
  expandedGroups,
  onToggleGroup,
  sidebarOpen,
  onToggleSidebar,
}: SidebarProps) {
  const { toast } = useToast();
  const buckets = configs?.buckets || {};
  const groups = configs?.groups || {};
  const [searchQuery, setSearchQuery] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [editingGroupColor, setEditingGroupColor] = useState("");
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);
  const [draggedBucketId, setDraggedBucketId] = useState<string | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);

  // Create a stable sorted list of bucket entries to prevent reordering
  // Include group_id in the key to detect when buckets move between folders
  const bucketsKey = useMemo(() => {
    return Object.entries(buckets)
      .sort(([idA], [idB]) => idA.localeCompare(idB))
      .map(([id, config]) => `${id}:${config.group_id || 'none'}`)
      .join(',');
  }, [buckets]);

  const sortedBuckets = useMemo(() => {
    const entries = Object.entries(buckets);
    // Sort by bucketId to ensure consistent alphabetical order
    return entries.sort(([idA], [idB]) => idA.localeCompare(idB));
  }, [bucketsKey, buckets]);

  // Filter buckets by search query
  const filteredBuckets = useMemo(() => {
    if (!searchQuery.trim()) {
      return sortedBuckets;
    }
    const query = searchQuery.toLowerCase().trim();
    return sortedBuckets.filter(([bucketId, config]) => {
      const nickname = config.nickname.toLowerCase();
      const bucketName = config.bucket_name.toLowerCase();
      return nickname.includes(query) || bucketName.includes(query) || bucketId.toLowerCase().includes(query);
    });
  }, [sortedBuckets, searchQuery]);

  // Organize buckets by group (using filtered buckets)
  const bucketsByGroup = useMemo(() => {
    const grouped: Record<string, Array<[string, typeof buckets[string]]>> = {};
    const ungrouped: Array<[string, typeof buckets[string]]> = [];

    filteredBuckets.forEach(([bucketId, config]) => {
      if (config.group_id && groups[config.group_id]) {
        if (!grouped[config.group_id]) {
          grouped[config.group_id] = [];
        }
        grouped[config.group_id].push([bucketId, config]);
      } else {
        ungrouped.push([bucketId, config]);
      }
    });

    return { grouped, ungrouped };
  }, [filteredBuckets, groups]);

  // Sort groups alphabetically
  const sortedGroups = useMemo(() => {
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [groups]);

  const handleStartEditGroup = (group: Group) => {
    setEditingGroupId(group.id);
    setEditingGroupName(group.name);
    setEditingGroupColor(group.color || GROUP_COLORS[0].value);
    setShowColorPicker(null);
  };

  const handleCancelEditGroup = () => {
    setEditingGroupId(null);
    setEditingGroupName("");
    setEditingGroupColor("");
    setShowColorPicker(null);
  };

  const handleSaveGroup = async (groupId: string) => {
    if (!editingGroupName.trim()) return;

    try {
      await updateGroup(groupId, editingGroupName.trim(), editingGroupColor);
      toast({
        variant: "success",
        title: "Folder Updated",
        description: `Folder has been updated successfully.`,
      });
      handleCancelEditGroup();
      // Trigger parent to refresh configs
      onGroupsChanged();
    } catch (error) {
      console.error("Failed to update group:", error);
      toast({
        variant: "destructive",
        title: "Failed to Update Folder",
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm("Are you sure you want to delete this folder? Buckets in this folder will be moved out.")) {
      return;
    }

    try {
      await deleteGroup(groupId);
      toast({
        variant: "success",
        title: "Folder Deleted",
        description: `Folder has been deleted successfully.`,
      });
      // Trigger parent to refresh configs
      onGroupsChanged();
    } catch (error) {
      console.error("Failed to delete group:", error);
      toast({
        variant: "destructive",
        title: "Failed to Delete Folder",
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleDragStart = (e: React.DragEvent, bucketId: string) => {
    setDraggedBucketId(bucketId);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", bucketId);
      // Also set as application/json for better compatibility
      e.dataTransfer.setData("application/json", JSON.stringify({ bucketId }));
    }
    // Prevent click event during drag
    e.stopPropagation();
    // Set drag image to a custom element for better visual feedback
    const dragElement = e.currentTarget as HTMLElement;
    if (dragElement) {
      dragElement.style.opacity = "0.5";
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Reset opacity
    const dragElement = e.currentTarget as HTMLElement;
    if (dragElement) {
      dragElement.style.opacity = "1";
    }
    setDraggedBucketId(null);
    setDragOverGroupId(null);
    e.stopPropagation();
  };

  const handleDragOver = (e: React.DragEvent, groupId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move";
    }
    setDragOverGroupId(groupId);
  };

  const handleDragLeave = (e?: React.DragEvent) => {
    // Small delay to prevent flickering when moving between drop zones
    // Only clear if we're actually leaving (not just moving to a child element)
    if (e) {
      const rect = e.currentTarget?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX;
        const y = e.clientY;
        // If still within bounds, don't clear
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          return;
        }
      }
    }
    setTimeout(() => {
      setDragOverGroupId(null);
    }, 50);
  };

  const handleDrop = async (e: React.DragEvent, targetGroupId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Use draggedBucketId from state first, then fallback to dataTransfer
    const bucketId = draggedBucketId || (e.dataTransfer ? e.dataTransfer.getData("text/plain") : null);

    if (!bucketId) {
      console.warn("No bucket ID found in drop event");
      setDraggedBucketId(null);
      setDragOverGroupId(null);
      return;
    }

    // Get current group_id for this bucket
    const currentConfig = buckets[bucketId];
    if (!currentConfig) {
      setDraggedBucketId(null);
      setDragOverGroupId(null);
      return;
    }

    // If dropping on the same group, do nothing
    if (currentConfig.group_id === targetGroupId) {
      setDraggedBucketId(null);
      setDragOverGroupId(null);
      return;
    }

    try {
      await addBucketToGroup(bucketId, targetGroupId);
      toast({
        variant: "success",
        title: "Bucket Moved",
        description: targetGroupId
          ? `Bucket moved to folder successfully.`
          : `Bucket removed from folder.`,
      });
      // Trigger parent to refresh configs
      onGroupsChanged();
    } catch (error) {
      console.error("Failed to move bucket:", error);
      toast({
        variant: "destructive",
        title: "Failed to Move Bucket",
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setDraggedBucketId(null);
      setDragOverGroupId(null);
    }
  };

  return (
    <div className="flex w-full flex-col h-full">
      {/* Header - show compact version when collapsed on desktop */}
      <div className={cn(
        "flex items-center justify-between transition-all duration-300",
        sidebarOpen
          ? "p-3 sm:p-4 mt-2"
          : "p-2 md:justify-center md:mt-2",
        sidebarOpen ? "opacity-100" : "opacity-0 md:opacity-100 pointer-events-none md:pointer-events-auto"
      )}>
        {sidebarOpen ? (
          <>
            <h2 className="text-base sm:text-lg font-semibold">Buckets</h2>
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={onManageGroups}
                className="h-8 w-8"
                title="Manage Folders"
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={onAddBucket}
                className="h-8 w-8"
                title="Add Bucket"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          // Collapsed header - show icon only
          <div className="hidden md:flex items-center justify-center">
            <Database className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
      </div>
      {/* Collapsed icons - only on desktop when closed */}
      {!sidebarOpen && (
        <div className="hidden md:flex flex-col items-center gap-2 p-2 flex-1 overflow-y-auto">
          <Button
            size="icon"
            variant="ghost"
            onClick={onAddBucket}
            className="h-8 w-8"
            title="Add Bucket"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onManageGroups}
            className="h-8 w-8"
            title="Manage Folders"
          >
            <FolderOpen className="h-4 w-4" />
          </Button>
        </div>
      )}
      {sidebarOpen && (
        <>
          <Separator />
          {/* Search input */}
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search buckets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-8"
              />
              {searchQuery && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          <Separator />
          <div className="flex-1 overflow-y-auto p-2 space-y-3">
            {Object.keys(buckets).length === 0 && sortedGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground">
                <Folder className="mb-2 h-8 w-8 opacity-50" />
                <p>No buckets configured</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={onAddBucket}
                >
                  Add Bucket
                </Button>
              </div>
            ) : (
              <>
                {/* Folders Section */}
                {sortedGroups.length > 0 && (
                  <div
                    className={cn(
                      "space-y-2 p-3 rounded-lg border transition-all",
                      draggedBucketId ? "border-border" : "border-border/30"
                    )}
                  >
                    <div className="space-y-1">
                      {sortedGroups.map((group) => {
                        const groupBuckets = bucketsByGroup.grouped[group.id] || [];
                        const isExpanded = expandedGroups.has(group.id);

                        // Always show the folder, even if it has no buckets

                        const isEditing = editingGroupId === group.id;

                        return (
                          <div key={group.id} className="space-y-1">
                            {isEditing ? (
                              <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 bg-accent/50">
                                <div className="relative">
                                  <div
                                    className="h-3 w-3 rounded-full flex-shrink-0 cursor-pointer"
                                    style={{ backgroundColor: editingGroupColor }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowColorPicker(showColorPicker === group.id ? null : group.id);
                                    }}
                                  />
                                  {showColorPicker === group.id && (
                                    <div className="absolute left-0 top-6 z-50 flex flex-wrap gap-2 p-2 rounded-lg border bg-popover shadow-lg" onClick={(e) => e.stopPropagation()}>
                                      {GROUP_COLORS.map((color) => (
                                        <button
                                          key={color.value}
                                          type="button"
                                          onClick={() => {
                                            setEditingGroupColor(color.value);
                                            setShowColorPicker(null);
                                          }}
                                          className={`h-6 w-6 rounded-full border-2 transition-all ${editingGroupColor === color.value
                                            ? "border-foreground scale-110"
                                            : "border-border hover:border-foreground/50"
                                            }`}
                                          style={{ backgroundColor: color.value }}
                                          title={color.name}
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <Input
                                  value={editingGroupName}
                                  onChange={(e) => setEditingGroupName(e.target.value)}
                                  className="flex-1 h-7 text-sm"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleSaveGroup(group.id);
                                    } else if (e.key === "Escape") {
                                      handleCancelEditGroup();
                                    }
                                  }}
                                  autoFocus
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSaveGroup(group.id);
                                  }}
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancelEditGroup();
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <div
                                className={cn(
                                  "group/folder flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent/50 cursor-pointer transition-all",
                                  dragOverGroupId === group.id && draggedBucketId
                                    ? "bg-blue-500/20 border-2 border-blue-500 border-solid shadow-lg rounded-lg"
                                    : ""
                                )}
                                onClick={() => onToggleGroup(group.id)}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  // Only handle if dragging a bucket
                                  if (draggedBucketId) {
                                    handleDragOver(e, group.id);
                                  }
                                }}
                                onDragLeave={(e) => {
                                  // Only clear if we're actually leaving this element
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const x = e.clientX;
                                  const y = e.clientY;
                                  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                                    handleDragLeave();
                                  }
                                }}
                                onDrop={(e) => handleDrop(e, group.id)}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                                <div
                                  className="h-3 w-3 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: group.color || "#6b7280" }}
                                />
                                <span className="flex-1 truncate">{group.name}</span>
                                <span className="text-xs opacity-50">({groupBuckets.length})</span>
                                <div
                                  className="flex items-center gap-1 opacity-0 transition-opacity group-hover/folder:opacity-100"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartEditGroup(group);
                                    }}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteGroup(group.id);
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            )}
                            {isExpanded && (
                              <div
                                className={cn(
                                  "ml-4 space-y-1 transition-all rounded-lg min-h-[20px] mt-1",
                                  dragOverGroupId === group.id && draggedBucketId && "bg-blue-500/20 border-2 border-blue-500 border-dashed p-2"
                                )}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  // Only handle if dragging a bucket
                                  if (draggedBucketId) {
                                    handleDragOver(e, group.id);
                                  }
                                }}
                                onDragLeave={(e) => {
                                  // Only clear if we're actually leaving this element
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const x = e.clientX;
                                  const y = e.clientY;
                                  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                                    handleDragLeave();
                                  }
                                }}
                                onDrop={(e) => handleDrop(e, group.id)}
                              >
                                {groupBuckets.length === 0 ? (
                                  <div className={cn(
                                    "px-2 py-1 text-xs text-muted-foreground transition-all",
                                    dragOverGroupId === group.id && draggedBucketId && "text-blue-600 dark:text-blue-400 font-medium"
                                  )}>
                                    {dragOverGroupId === group.id && draggedBucketId ? "Drop here to add bucket" : "No buckets in this folder"}
                                  </div>
                                ) : (
                                  groupBuckets.map(([bucketId, config]) => (
                                    <div
                                      key={bucketId}
                                      draggable
                                      onDragStart={(e) => handleDragStart(e, bucketId)}
                                      onDragEnd={handleDragEnd}
                                      className={cn(
                                        "group relative flex items-center justify-between rounded-lg transition-colors hover:bg-accent/50",
                                        selectedBucket === bucketId
                                          ? "bg-accent text-accent-foreground"
                                          : "",
                                        draggedBucketId === bucketId && "opacity-50"
                                      )}
                                      onClick={(e) => {
                                        // Don't select if we just finished dragging
                                        if (draggedBucketId !== bucketId) {
                                          onBucketSelect(bucketId);
                                        }
                                      }}
                                      title={config.nickname}
                                    >
                                      <div className="flex flex-1 items-center gap-2 p-2 min-w-0">
                                        <GripVertical
                                          className="h-4 w-4 flex-shrink-0 text-muted-foreground opacity-60 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                                          onMouseDown={(e) => {
                                            e.stopPropagation();
                                            // Start drag from grip icon
                                            const bucketElement = e.currentTarget.closest('[draggable="true"]') as HTMLElement;
                                            if (bucketElement) {
                                              // Trigger drag start manually if needed
                                            }
                                          }}
                                        />
                                        <Folder className="h-4 w-4 flex-shrink-0" />
                                        <span className="truncate text-sm font-medium min-w-0">
                                          {config.nickname}
                                        </span>
                                      </div>
                                      <div
                                        className="flex items-center gap-1 p-1 opacity-0 transition-opacity group-hover:opacity-100"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-6 w-6"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onEditBucket(bucketId);
                                          }}
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-6 w-6"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteBucket(bucketId);
                                          }}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Ungrouped Buckets Section - Always show when dragging */}
                {(bucketsByGroup.ungrouped.length > 0 || draggedBucketId) && (
                  <div
                    className={cn(
                      "space-y-1 p-3 rounded-lg border transition-all",
                      dragOverGroupId === null && draggedBucketId
                        ? "border-blue-500 bg-blue-500/10 border-2 border-dashed"
                        : draggedBucketId ? "border-border" : "border-border/30",
                      bucketsByGroup.ungrouped.length === 0 && draggedBucketId && "min-h-[60px] flex items-center justify-center"
                    )}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (draggedBucketId) {
                        handleDragOver(e, null);
                      } else {
                        // Still need to prevent default even if no bucket is being dragged
                        // to allow the drop zone to be active
                      }
                    }}
                    onDragLeave={(e) => {
                      // Only clear if we're actually leaving this element
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX;
                      const y = e.clientY;
                      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                        handleDragLeave();
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDrop(e, null);
                    }}
                  >
                    {bucketsByGroup.ungrouped.length === 0 && draggedBucketId ? (
                      <div className="text-xs text-muted-foreground text-center py-4">
                        Drop here to remove from folder
                      </div>
                    ) : (
                      bucketsByGroup.ungrouped.map(([bucketId, config]) => (
                        <div
                          key={bucketId}
                          draggable
                          onDragStart={(e) => handleDragStart(e, bucketId)}
                          onDragEnd={handleDragEnd}
                          className={cn(
                            "group relative flex items-center justify-between rounded-lg transition-colors hover:bg-accent/50",
                            selectedBucket === bucketId
                              ? "bg-accent text-accent-foreground"
                              : "",
                            draggedBucketId === bucketId && "opacity-50"
                          )}
                          onClick={(e) => {
                            // Don't select if we just finished dragging
                            if (draggedBucketId !== bucketId) {
                              onBucketSelect(bucketId);
                            }
                          }}
                          title={config.nickname}
                        >
                          <div className="flex flex-1 items-center gap-2 p-2 min-w-0">
                            <GripVertical
                              className="h-4 w-4 flex-shrink-0 text-muted-foreground opacity-60 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                              }}
                            />
                            <Folder className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate text-sm font-medium min-w-0">
                              {config.nickname}
                            </span>
                          </div>
                          <div
                            className="flex items-center gap-1 p-1 opacity-0 transition-opacity group-hover:opacity-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditBucket(bucketId);
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteBucket(bucketId);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Show "No buckets found" message only if searching and no buckets match AND no folders exist */}
                {filteredBuckets.length === 0 && sortedGroups.length === 0 && searchQuery.trim() && (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground">
                    <Search className="mb-2 h-8 w-8 opacity-50" />
                    <p>No buckets found</p>
                    <p className="text-xs">Try a different search term</p>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
      {/* Toggle button at bottom */}
      <div className="border-t border-border p-2 mt-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className={cn(
            "w-full h-10",
            !sidebarOpen && "flex flex-col items-center justify-center"
          )}
          title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
