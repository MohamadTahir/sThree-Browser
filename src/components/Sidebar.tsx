import { Trash2, Plus, Folder, Pencil, FolderOpen, ChevronDown, ChevronRight, Search, X, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Input } from "./ui/input";
import { BucketConfigs } from "../types";
import { cn } from "../lib/utils";

interface SidebarProps {
  configs: BucketConfigs | null;
  selectedBucket: string | null;
  onBucketSelect: (bucketId: string) => void;
  onAddBucket: () => void;
  onEditBucket: (bucketId: string) => void;
  onDeleteBucket: (bucketId: string) => void;
  onManageGroups: () => void;
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
  expandedGroups,
  onToggleGroup,
  sidebarOpen,
  onToggleSidebar,
}: SidebarProps) {
  const buckets = configs?.buckets || {};
  const groups = configs?.groups || {};
  const [searchQuery, setSearchQuery] = useState("");

  // Create a stable sorted list of bucket entries to prevent reordering
  const bucketsKey = useMemo(() => {
    return Object.keys(buckets).sort().join(',');
  }, [buckets]);

  const sortedBuckets = useMemo(() => {
    const entries = Object.entries(buckets);
    // Sort by bucketId to ensure consistent alphabetical order
    return entries.sort(([idA], [idB]) => idA.localeCompare(idB));
  }, [bucketsKey]);

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

  return (
    <div className="flex w-full flex-col h-full">
      {/* Header - always rendered, hidden on mobile when closed */}
      <div className={cn(
        "flex items-center justify-between p-3 sm:p-4 transition-opacity duration-300",
        sidebarOpen ? "opacity-100" : "opacity-0 md:opacity-100 pointer-events-none md:pointer-events-auto"
      )}>
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
      </div>
      {/* Collapsed icons - only on desktop */}
      {!sidebarOpen && (
        <div className="hidden md:flex flex-col items-center gap-2 p-2 flex-1">
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
          <div className="flex-1 overflow-y-auto p-2">
            {Object.keys(buckets).length === 0 ? (
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
            ) : filteredBuckets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground">
                <Search className="mb-2 h-8 w-8 opacity-50" />
                <p>No buckets found</p>
                <p className="text-xs">Try a different search term</p>
              </div>
            ) : (
              <div className="space-y-1">
                {/* Grouped buckets */}
                {sortedGroups.map((group) => {
                  const groupBuckets = bucketsByGroup.grouped[group.id] || [];
                  // Show folder even if empty
                  const isExpanded = expandedGroups.has(group.id);

                  return (
                    <div key={group.id} className="space-y-1">
                      <div
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent/50 cursor-pointer"
                        onClick={() => onToggleGroup(group.id)}
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
                      </div>
                      {isExpanded && (
                        <div className="ml-4 space-y-1">
                          {groupBuckets.length === 0 ? (
                            <div className="px-2 py-1 text-xs text-muted-foreground">
                              No buckets in this folder
                            </div>
                          ) : (
                            groupBuckets.map(([bucketId, config]) => (
                              <div
                                key={bucketId}
                                className={cn(
                                  "group relative flex items-center justify-between rounded-lg transition-colors hover:bg-accent/50 cursor-pointer",
                                  selectedBucket === bucketId
                                    ? "bg-accent text-accent-foreground"
                                    : ""
                                )}
                                onClick={() => onBucketSelect(bucketId)}
                                title={config.nickname}
                              >
                                <div className="flex flex-1 items-center gap-2 p-2 min-w-0">
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

                {/* Ungrouped buckets */}
                {bucketsByGroup.ungrouped.length > 0 && (
                  <>
                    {sortedGroups.length > 0 && Object.keys(bucketsByGroup.grouped).length > 0 && (
                      <div className="my-2 border-t border-border" />
                    )}
                    {bucketsByGroup.ungrouped.map(([bucketId, config]) => (
                      <div
                        key={bucketId}
                        className={cn(
                          "group relative flex items-center justify-between rounded-lg transition-colors hover:bg-accent/50 cursor-pointer",
                          selectedBucket === bucketId
                            ? "bg-accent text-accent-foreground"
                            : ""
                        )}
                        onClick={() => onBucketSelect(bucketId)}
                        title={config.nickname}
                      >
                        <div className="flex flex-1 items-center gap-2 p-2 min-w-0">
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
                    ))}
                  </>
                )}
              </div>
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
