import { useState, useEffect, useRef } from "react";
import Sidebar from "./components/Sidebar";
import FileExplorer from "./components/FileExplorer";
import AddBucketModal from "./components/AddBucketModal";
import EditBucketModal from "./components/EditBucketModal";
import MasterPasswordModal from "./components/MasterPasswordModal";
import GroupManagementModal from "./components/GroupManagementModal";
import { Toaster } from "./components/ui/toaster";
import { BucketConfigs } from "./types";
import { loadConfigs, setActiveBucket, deleteBucketConfig } from "./services/storageService";
import {
  hasMasterPassword,
  isMasterPasswordUnlocked,
  isTauri,
} from "./services/encryptionService";
import { cn } from "./lib/utils";

function App() {
  const [configs, setConfigs] = useState<BucketConfigs | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBucketId, setEditingBucketId] = useState<string | null>(null);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [showMasterPasswordModal, setShowMasterPasswordModal] = useState(false);
  const [masterPasswordUnlocked, setMasterPasswordUnlocked] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  // Use ref to persist expanded groups across re-renders, but use state to trigger updates
  const expandedGroupsRef = useRef<Set<string>>(new Set());
  const [, setExpandedGroupsVersion] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Auto-collapse sidebar on mobile by default
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    
    // Set initial state
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Getter function for expanded groups
  const getExpandedGroups = () => expandedGroupsRef.current;
  
  // Setter function for expanded groups
  const setExpandedGroups = (updater: (prev: Set<string>) => Set<string>) => {
    expandedGroupsRef.current = updater(expandedGroupsRef.current);
    setExpandedGroupsVersion(v => v + 1); // Trigger re-render
  };

  useEffect(() => {
    checkMasterPasswordStatus();
  }, []);

  const checkMasterPasswordStatus = async () => {
    // For Tauri, skip master password (use OS keychain in future)
    if (isTauri()) {
      setMasterPasswordUnlocked(true);
      await loadConfigsData();
      return;
    }

    // For web, check if master password is needed
    const hasPassword = hasMasterPassword();
    const isUnlocked = isMasterPasswordUnlocked();

    if (!hasPassword) {
      // First time setup - show setup modal
      setShowMasterPasswordModal(true);
    } else if (!isUnlocked) {
      // Password exists but not unlocked - show unlock modal
      setShowMasterPasswordModal(true);
    } else {
      // Already unlocked
      setMasterPasswordUnlocked(true);
      await loadConfigsData();
    }
  };

  const handleMasterPasswordUnlocked = async () => {
    setMasterPasswordUnlocked(true);
    await loadConfigsData();
  };

  const loadConfigsData = async () => {
    try {
      const result = await loadConfigs();
      setConfigs(result);
      if (result.active_bucket) {
        setSelectedBucket(result.active_bucket);
      }
    } catch (error) {
      console.error("Failed to load configs:", error);
      // Set empty configs on error
      setConfigs({ buckets: {}, groups: {}, active_bucket: null });
    }
  };

  const handleAddBucket = async () => {
    await loadConfigsData();
    setShowAddModal(false);
  };

  const handleEditBucket = (bucketId: string) => {
    setEditingBucketId(bucketId);
    setShowEditModal(true);
  };

  const handleUpdateBucket = async () => {
    await loadConfigsData();
    setShowEditModal(false);
    setEditingBucketId(null);
  };

  const handleBucketSelect = async (bucketId: string) => {
    // Don't reload if clicking the same bucket
    if (selectedBucket === bucketId) {
      return;
    }
    
    try {
      await setActiveBucket(bucketId);
      setSelectedBucket(bucketId);
      await loadConfigsData();
    } catch (error) {
      console.error("Failed to set active bucket:", error);
    }
  };

  const handleDeleteBucket = async (bucketId: string) => {
    try {
      await deleteBucketConfig(bucketId);
      if (selectedBucket === bucketId) {
        setSelectedBucket(null);
      }
      await loadConfigsData();
    } catch (error) {
      console.error("Failed to delete bucket:", error);
    }
  };


  // Show master password modal if needed (even if loading is false)
  if (!masterPasswordUnlocked) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <MasterPasswordModal
          open={showMasterPasswordModal}
          onOpenChange={setShowMasterPasswordModal}
          onUnlocked={handleMasterPasswordUnlocked}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background relative">
      {/* Sidebar overlay backdrop on mobile - only show when sidebar is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 md:hidden transition-opacity duration-300 ease-in-out"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {/* Sidebar - fixed overlay on mobile, relative on desktop - always rendered */}
      <div
        className={cn(
          "flex flex-col border-r border-border overflow-hidden",
          "fixed md:relative z-50 md:z-auto",
          "left-0 top-0 bottom-0 h-full",
          // Fixed width on mobile, variable on desktop
          "w-64",
          // Smooth transitions - separate for mobile transform and desktop width
          "transition-transform duration-300 ease-in-out md:transition-all",
          // Mobile: slide in/out as overlay using transform
          sidebarOpen 
            ? "translate-x-0" 
            : "-translate-x-full md:translate-x-0",
          // Desktop width changes
          "md:w-64",
          !sidebarOpen && "md:w-16",
          // Background: always solid background, glass effect only on desktop
          "bg-background",
          "md:glass"
        )}
        style={{
          // Ensure smooth animation
          willChange: 'transform',
        }}
      >
        <Sidebar
          configs={configs}
          selectedBucket={selectedBucket}
          onBucketSelect={handleBucketSelect}
          onAddBucket={() => setShowAddModal(true)}
          onEditBucket={handleEditBucket}
          onDeleteBucket={handleDeleteBucket}
          onManageGroups={() => setShowGroupModal(true)}
          expandedGroups={getExpandedGroups()}
          onToggleGroup={(groupId) => {
            setExpandedGroups((prev) => {
              const next = new Set(prev);
              if (next.has(groupId)) {
                next.delete(groupId);
              } else {
                next.add(groupId);
              }
              return next;
            });
          }}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
      </div>
      {/* Main content - full width on mobile, flex-1 on desktop */}
      <div className="flex flex-1 flex-col overflow-hidden w-full md:w-auto bg-background">
        <FileExplorer 
          bucketId={selectedBucket}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
      </div>
      <AddBucketModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={handleAddBucket}
      />
      <EditBucketModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        bucketId={editingBucketId}
        config={
          editingBucketId && configs?.buckets[editingBucketId]
            ? configs.buckets[editingBucketId]
            : null
        }
        onSuccess={handleUpdateBucket}
      />
      <GroupManagementModal
        open={showGroupModal}
        onOpenChange={setShowGroupModal}
        onGroupsChanged={loadConfigsData}
      />
      <Toaster />
    </div>
  );
}

export default App;
