import {
  Trash2,
  Plus,
  Folder,
  Pencil,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Search,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  KeyRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Input } from "./ui/input";
import { Bucket, Group } from "../types";
import {
  setActiveBucket,
} from "../services/storageService";
import { twMerge } from "tailwind-merge";
import { useConfig } from "@/context/config";
import AddBucketModal from "./AddBucketModal";
import EditBucketModal from "./EditBucketModal";
import GroupManagementModal from "./GroupManagementModal";
import CredentialsModal from "./CredentialsModal";
import { Collapse } from "react-collapse";

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

export default function Sidebar() {
  const { configs } = useConfig();

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");

  const [editingBucketId, setEditingBucketId] = useState<string | null>(null);

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showAddBucketModal, setShowAddBucketModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);

  const bucketsFiltered = useMemo(() => {
    const grouped: Map<string, Bucket[]> = new Map([["ungrouped", []]]);

    Object.entries(configs.groups).forEach(([_, group]) => {
      grouped.set(group.id, []);
    });

    Object.entries(configs.buckets).forEach(([_, bucket]) => {
      if (
        !bucket.nickname
          .toLowerCase()
          .includes(searchQuery.toLowerCase().trim())
      ) {
        return;
      }

      if (!bucket.groupId) {
        grouped.get("ungrouped")?.push(bucket);
        return;
      }

      grouped.get(bucket.groupId)?.push(bucket);
    });
    return grouped;
  }, [configs.buckets, configs.groups, searchQuery]);

  return (
    <div
      className={twMerge(
        "flex flex-col border-r border-border overflow-hidden",
        "fixed md:relative z-50 md:z-auto",
        "left-0 top-0 bottom-0 h-full w-full",
        "w-64",
        "md:glass",
        "bg-background",
        sidebarOpen ? "md:w-64" : "md:w-16",
        sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
      )}
    >
      <SideBarHeader
        sidebarOpen={sidebarOpen}
        setShowCredentialsModal={setShowCredentialsModal}
        setShowGroupModal={setShowGroupModal}
        setShowAddBucketModal={setShowAddBucketModal}
      />

      <div className={sidebarOpen ? "opacity-100" : "opacity-0"}>
        <Separator />

        <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

        <Separator />

        <GroupsList
          buckets={bucketsFiltered}
          setShowAddBucketModal={setShowAddBucketModal}
        />
      </div>

      <OpenCloseSidebarSection
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      <AddBucketModal
        open={showAddBucketModal}
        onOpenChange={setShowAddBucketModal}
        onSuccess={() => {
          setShowAddBucketModal(false);
        }}
      />

      <EditBucketModal
        open={editingBucketId != null}
        bucketId={editingBucketId}
        bucket={editingBucketId ? configs?.buckets?.[editingBucketId] : null}
        onSuccess={() => {
          setEditingBucketId(null);
        }}
        onClose={() => setEditingBucketId(null)}
      />

      <GroupManagementModal
        open={showGroupModal}
        onOpenChange={setShowGroupModal}
        onGroupsChanged={() => {}}
      />

      <CredentialsModal
        open={showCredentialsModal}
        onOpenChange={setShowCredentialsModal}
        onChanged={() => {}}
      />
    </div>
  );
}

function SideBarHeader({
  sidebarOpen,
  setShowCredentialsModal,
  setShowGroupModal,
  setShowAddBucketModal,
}: {
  sidebarOpen: boolean;
  setShowCredentialsModal: (open: boolean) => void;
  setShowGroupModal: (open: boolean) => void;
  setShowAddBucketModal: (open: boolean) => void;
}) {
  return (
    <div className="flex flex-col items-start justify-start mx-2 my-2">
      <div className="flex flex-col w-full">
        <SideBarButton
          sidebarOpen={sidebarOpen}
          icon={<KeyRound className="h-4 w-4" />}
          label="Manage Credentials"
          onClick={() => setShowCredentialsModal(true)}
        />
        <SideBarButton
          sidebarOpen={sidebarOpen}
          icon={<FolderOpen className="h-4 w-4" />}
          label="Add Folders"
          onClick={() => setShowGroupModal(true)}
        />
        <SideBarButton
          sidebarOpen={sidebarOpen}
          icon={<Plus className="h-4 w-4" />}
          label="Add Bucket"
          onClick={() => setShowAddBucketModal(true)}
        />
      </div>
    </div>
  );
}

function SideBarButton({
  sidebarOpen,
  icon,
  label,
  onClick,
}: {
  sidebarOpen: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button variant="ghost" className="h-10 justify-start" onClick={onClick}>
      <div className="flex items-center gap-4">
        {icon}
        <span className={sidebarOpen ? "opacity-100" : "opacity-0"}>
          {label}
        </span>
      </div>
    </Button>
  );
}

function SearchBar({
  searchQuery,
  setSearchQuery,
}: {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}) {
  return (
    <div className="relative m-2">
      <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search buckets..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-8 pr-8"
      />
      <Button
        size="icon"
        variant="ghost"
        className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
        onClick={() => setSearchQuery("")}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

function GroupsList({
  buckets,
  setShowAddBucketModal,
}: {
  buckets: Map<string, Bucket[]>;
  setShowAddBucketModal: (open: boolean) => void;
}) {
  if (buckets.size === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground">
        <Folder className="mb-2 h-8 w-8 opacity-50" />
        <p>No buckets configured</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => setShowAddBucketModal(true)}
        >
          Add Bucket
        </Button>
      </div>
    );
  }

  const ungroupedBuckets = buckets.get("ungrouped") ?? [];
  const groupedBuckets = buckets.entries().filter(
    ([key]) => key !== "ungrouped",
  );
  const { configs } = useConfig();

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-3">
      <div className="space-y-2 p-3 rounded-lg border border-border/50 overflow-hidden">
        {groupedBuckets.map(([key, buckets]) =>  <GroupItem key={key} group={configs.groups[key]} buckets={buckets} />)}
        {ungroupedBuckets.length > 0 && <BucketsList child={false} isExpanded={true} key="ungrouped" buckets={ungroupedBuckets} />}
      </div>
    </div>
  );
}

function GroupItem({ group, buckets }: { group: Group; buckets: Bucket[] }) {
  const { configs, saveConfigs, deleteGroup } = useConfig();
    const isExpanded = group?.active ?? false;

  return (
    <div>
      <div
        className="group/folder relative flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent/50 cursor-pointer"
        onClick={() => {
          saveConfigs({
            ...configs,
            groups: {
              ...configs.groups,
              [group.id]: { ...group, active: !group.active },
            },
          });
        }}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <div
          className="h-3 w-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: group?.color || "#6b7280" }}
        />
        <span className="flex-1 truncate">{group.name}</span>
        <span className="text-xs opacity-50">({buckets.length})</span>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 rounded-md bg-background/95 shadow-sm border border-border/50 opacity-0 group-hover/folder:opacity-100 pointer-events-none group-hover/folder:pointer-events-auto py-0.5 px-0.5">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Edit group
            }}
          >
            <Pencil className="h-3 w-3" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={async (e) => {
              e.stopPropagation();
              await deleteGroup(group.id);
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <BucketsList isExpanded={isExpanded} child={true} buckets={buckets} />
    </div>
  );
}

function BucketsList({ isExpanded, child, buckets }: { isExpanded: boolean; child: boolean; buckets: Bucket[] }) {
  const {deleteBucket } = useConfig();
  if (buckets.length === 0) {
    return (
      <Collapse isOpened={isExpanded}>
        <div className={`${child ? "ml-4" : "ml-0"} space-y-1 rounded-lg min-h-[20px] mt-1`}>
          <div className="px-2 py-1 text-xs text-muted-foreground">
            No buckets in this folder
          </div>
        </div>
      </Collapse>
    )
  }

  return <Collapse isOpened={isExpanded}>
        <div className={`${child ? "ml-4" : "ml-0"} space-y-1 rounded-lg mt-1 overflow-hidden`}>
          {buckets.map((bucket) => (
            <div
              key={bucket.id}
              draggable
              className="group relative flex items-center justify-between rounded-lg hover:bg-accent/50"
              onClick={async () => await setActiveBucket(bucket.id)}
              title={bucket.nickname}
            >
              <div className="flex flex-1 items-center gap-2 p-2 min-w-0">
                <Folder className="h-4 w-4 flex-shrink-0" />
                <span className="truncate text-sm font-medium min-w-0">
                  {bucket.nickname}
                </span>
              </div>
              <div
                className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 rounded-md bg-background/95 shadow-sm border border-border/50 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto py-0.5 px-0.5"
              >
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Edit bucket
                  }}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={async (e) => {
                    e.stopPropagation();
                    await deleteBucket(bucket.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
      </div>
  </Collapse>
}
function OpenCloseSidebarSection({
  sidebarOpen,
  setSidebarOpen,
}: {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}) {
  return (
    <div className="border-t border-border p-2 mt-auto">
      <Button
        size="icon"
        variant="ghost"
        className="w-full h-10"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? (
          <PanelLeftClose className="h-4 w-4" />
        ) : (
          <PanelLeftOpen className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
