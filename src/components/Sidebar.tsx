import { Trash2, Plus, Folder, Pencil } from "lucide-react";
import { useMemo } from "react";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { BucketConfigs } from "../types";

interface SidebarProps {
  configs: BucketConfigs | null;
  selectedBucket: string | null;
  onBucketSelect: (bucketId: string) => void;
  onAddBucket: () => void;
  onEditBucket: (bucketId: string) => void;
  onDeleteBucket: (bucketId: string) => void;
}

export default function Sidebar({
  configs,
  selectedBucket,
  onBucketSelect,
  onAddBucket,
  onEditBucket,
  onDeleteBucket,
}: SidebarProps) {
  const buckets = configs?.buckets || {};

  // Create a stable sorted list of bucket entries to prevent reordering
  // Use a stable key based on bucket IDs to prevent unnecessary recalculations
  const bucketsKey = useMemo(() => {
    return Object.keys(buckets).sort().join(',');
  }, [buckets]);

  const sortedBuckets = useMemo(() => {
    const entries = Object.entries(buckets);
    // Sort by bucketId to ensure consistent alphabetical order
    return entries.sort(([idA], [idB]) => idA.localeCompare(idB));
  }, [bucketsKey]); // Only recalculate when bucket IDs actually change

  return (
    <div className="glass flex w-64 flex-col border-r border-border">
      <div className="flex items-center justify-between p-4">
        <h2 className="text-lg font-semibold">Buckets</h2>
        <Button
          size="icon"
          variant="ghost"
          onClick={onAddBucket}
          className="h-8 w-8"
        >
          <Plus className="h-4 w-4" />
        </Button>
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
        ) : (
          <div className="space-y-1">
            {sortedBuckets.map(([bucketId, config]) => (
              <div
                key={bucketId}
                className={`group relative flex items-center justify-between rounded-lg transition-colors hover:bg-accent/50 cursor-pointer ${
                  selectedBucket === bucketId
                    ? "bg-accent text-accent-foreground"
                    : ""
                }`}
                onClick={() => onBucketSelect(bucketId)}
              >
                <div className="flex flex-1 items-center gap-2 p-2">
                  <Folder className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate text-sm font-medium">
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
          </div>
        )}
      </div>
    </div>
  );
}
