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
import { Bucket, Group } from "../models/types";
import { twMerge } from "tailwind-merge";
import { useConfig } from "@/context/config";
import CredentialsModal from "./CredentialModal/CredentialsModal";
import { Collapse } from "react-collapse";
import {
  BucketModalState,
  DefaultBucketModalState,
} from "./BucketModal/BucketSchema";
import {
  DefaultGroupModalState,
  GroupModalState,
} from "./GroupModal/GroupSchema";
import GroupManagementModal from "./GroupModal/GroupManagementModal";
import BucketManagementModal from "./BucketModal/BucketManagementModal";

export default function Sidebar() {
  const { configs } = useConfig();
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [groupModalState, setGroupModalState] = useState<GroupModalState>(
    DefaultGroupModalState,
  );

  const [bucketModalState, setBucketModalState] = useState<BucketModalState>(
    DefaultBucketModalState,
  );

  const [showCredentialsModal, setShowCredentialsModal] = useState(false);

  const bucketsFiltered = useMemo(() => {
    const grouped: Bucket[] = [];

    Object.values(configs.buckets).forEach((bucket) => {
      if (
        !bucket.nickname
          .toLowerCase()
          .includes(searchQuery.toLowerCase().trim())
      ) {
        return;
      }

      grouped.push(bucket);
    });

    return grouped;
  }, [configs.buckets, searchQuery]);

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
        setGroupModalState={setGroupModalState}
        setBucketModalState={setBucketModalState}
        setShowCredentialsModal={setShowCredentialsModal}
      />

      <div className={sidebarOpen ? "opacity-100" : "opacity-0"}>
        <Separator />

        <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

        <Separator />

        <GroupsList
          buckets={bucketsFiltered}
          groups={Object.values(configs.groups)}
          setGroupModalState={setGroupModalState}
          setBucketModalState={setBucketModalState}
        />
      </div>

      <OpenCloseSidebarSection
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      <BucketManagementModal
        bucketModalState={bucketModalState}
        onClose={() => setBucketModalState({ open: false, bucket: null })}
      />

      <GroupManagementModal
        groupModalState={groupModalState}
        onClose={() => setGroupModalState({ open: false, group: null })}
      />

      <CredentialsModal
        open={showCredentialsModal}
        onClose={() => setShowCredentialsModal(false)}
      />
    </div>
  );
}

function SideBarHeader({
  sidebarOpen,
  setGroupModalState,
  setBucketModalState,
  setShowCredentialsModal,
}: {
  sidebarOpen: boolean;
  setGroupModalState: (groupModalState: GroupModalState) => void;
  setBucketModalState: (bucketModalState: BucketModalState) => void;
  setShowCredentialsModal: (open: boolean) => void;
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
          onClick={() => setGroupModalState({ open: true, group: null })}
        />
        <SideBarButton
          sidebarOpen={sidebarOpen}
          icon={<Plus className="h-4 w-4" />}
          label="Add Bucket"
          onClick={() => setBucketModalState({ open: true, bucket: null })}
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
  groups,
  setBucketModalState,
  setGroupModalState,
}: {
  buckets: Bucket[];
  groups: Group[];
  setBucketModalState: (bucketModalState: BucketModalState) => void;
  setGroupModalState: (groupModalState: GroupModalState) => void;
}) {
  if (buckets.length === 0 && groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground">
        <Folder className="mb-2 h-8 w-8 opacity-50" />
        <p>No buckets configured</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => setBucketModalState({ open: true, bucket: null })}
        >
          Add Bucket
        </Button>
      </div>
    );
  }

  const ungroupedBuckets = buckets.filter((bucket) => bucket.groupId === null);

  groups = groups.sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-3">
      <div className="space-y-2 p-3 rounded-lg border border-border/50 overflow-hidden">
        {groups.map((group) => (
          <GroupItem
            key={group.id}
            group={group}
            buckets={buckets.filter((bucket) => bucket.groupId === group.id)}
            setBucketModalState={setBucketModalState}
            setGroupModalState={setGroupModalState}
          />
        ))}

        {ungroupedBuckets.length > 0 && (
          <BucketsList
            child={false}
            isExpanded={true}
            key="ungrouped"
            buckets={ungroupedBuckets}
            setBucketModalState={setBucketModalState}
          />
        )}
      </div>
    </div>
  );
}

function GroupItem({
  group,
  buckets,
  setBucketModalState,
  setGroupModalState,
}: {
  group: Group;
  buckets: Bucket[];
  setBucketModalState: (bucketModalState: BucketModalState) => void;
  setGroupModalState: (groupModalState: GroupModalState) => void;
}) {
  const { setActiveGroup, deleteGroup } = useConfig();
  const isExpanded = group?.active ?? false;
  return (
    <div>
      <div
        className="group/folder relative flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent/50 cursor-pointer"
        onClick={() => {
          setActiveGroup(group.id);
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
              setGroupModalState({ open: true, group: group });
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
      <BucketsList
        isExpanded={isExpanded}
        child={true}
        buckets={buckets}
        setBucketModalState={setBucketModalState}
      />
    </div>
  );
}

function BucketsList({
  isExpanded,
  child,
  buckets,
  setBucketModalState,
}: {
  isExpanded: boolean;
  child: boolean;
  buckets: Bucket[];
  setBucketModalState: (bucketModalState: BucketModalState) => void;
}) {
  const { deleteBucket, setActiveBucket } = useConfig();
  if (buckets.length === 0) {
    return (
      <Collapse isOpened={isExpanded}>
        <div
          className={`${child ? "ml-4" : "ml-0"} space-y-1 rounded-lg min-h-[20px] mt-1`}
        >
          <div className="px-2 py-1 text-xs text-muted-foreground">
            No buckets in this folder
          </div>
        </div>
      </Collapse>
    );
  }

  return (
    <Collapse isOpened={isExpanded}>
      <div
        className={`${child ? "ml-4" : "ml-0"} space-y-1 rounded-lg mt-1 overflow-hidden`}
      >
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
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 rounded-md bg-background/95 shadow-sm border border-border/50 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto py-0.5 px-0.5">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  setBucketModalState({ open: true, bucket: bucket });
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
  );
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
