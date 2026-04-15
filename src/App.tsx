import { useState, useEffect, useRef } from "react";
import Sidebar from "./components/Sidebar";
import FileExplorer from "./components/FileExplorer";
import AddBucketModal from "./components/AddBucketModal";
import EditBucketModal from "./components/EditBucketModal";
import CredentialsModal from "./components/CredentialsModal";
import MasterPasswordModal from "./components/MasterPasswordModal";
import GroupManagementModal from "./components/GroupManagementModal";
import { Toaster } from "./components/ui/toaster";
import { Configs, Group } from "./types";
import { loadConfigs, setActiveBucket, deleteBucket } from "./services/storageService";
import { hasMasterPassword, isMasterPasswordUnlocked } from "./services/encryptionService";

function App() {
  const [configs, setConfigs] = useState<Configs | null>(null);

  const [showMasterPasswordModal, setShowMasterPasswordModal] = useState(false);


  const [editingBucketId, setEditingBucketId] = useState<string | null>(null);

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showAddBucketModal, setShowAddBucketModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);

  useEffect(() => {
    checkMasterPasswordStatus();
  }, []);

  const loadConfigsData = async () => {
    try {
      const result = await loadConfigs();
      // Always create new object references to force React to detect changes
      setConfigs({
        buckets: { ...result.buckets },
        credentials: { ...result.credentials },
        groups: { ...result.groups },
        active_bucket: result.active_bucket,
      });

    } catch (error) {
      console.error("Failed to load configs:", error);
      setConfigs({ buckets: {}, credentials: {}, groups: {}, active_bucket: null });
    }
  };

  const checkMasterPasswordStatus = async () => {
    if (!hasMasterPassword() || !isMasterPasswordUnlocked()) {
      setShowMasterPasswordModal(true);
      return;
    }

    await loadConfigsData();
  };

  const handleOnUnlockMasterPassword = async () => {
    await loadConfigsData();
  };

  const handleOnAddBucket = async () => {
    await loadConfigsData();
    setShowAddBucketModal(false);
  };

  const handleOnUpdateBucket = async () => {
    await loadConfigsData();
    setEditingBucketId(null);
  };

  const handleOnSelectBucket = async (bucketId: string) => {
    // Don't reload if clicking the same bucket
    if (configs?.active_bucket === bucketId) {
      return;
    }

    try {
      await setActiveBucket(bucketId);
      await loadConfigsData();
    } catch (error) {
      console.error("Failed to set active bucket:", error);
    }
  };

  const handleDeleteBucket = async (bucketId: string) => {
    try {
      await deleteBucket(bucketId);
      await loadConfigsData();
    } catch (error) {
      console.error("Failed to delete bucket:", error);
    }
  };

  const handleExpandGroup = (groupId: string) => {
    const prev = configs?.groups?.[groupId];
    if (!configs || !prev) return;

    const updated: Group = { ...prev, active: !prev.active };

    setConfigs({
      buckets: { ...configs.buckets },
      credentials: { ...configs.credentials },
      groups: { ...configs.groups, [groupId]: updated },
      active_bucket: configs.active_bucket ?? null,
    });
  };


  // Show master password modal if needed (even if loading is false)
  if (configs == null) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <MasterPasswordModal
          open={showMasterPasswordModal}
          onOpenChange={setShowMasterPasswordModal}
          onUnlocked={handleOnUnlockMasterPassword}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background relative">

      <Sidebar
        configs={configs}
        onBucketSelect={handleOnSelectBucket}
        onAddBucket={() => setShowAddBucketModal(true)}
        onManageCredentials={() => setShowCredentialsModal(true)}
        onEditBucket={setEditingBucketId}
        onDeleteBucket={handleDeleteBucket}
        onManageGroups={() => setShowGroupModal(true)}
        onGroupsChanged={loadConfigsData}
        onExpandGroup={handleExpandGroup}
      />

      <FileExplorer
        bucketId={configs.active_bucket}
      />

      <AddBucketModal
        open={showAddBucketModal}
        onOpenChange={setShowAddBucketModal}
        onSuccess={handleOnAddBucket}
      />

      <EditBucketModal
        open={editingBucketId != null}
        bucketId={editingBucketId}
        bucket={editingBucketId ? configs?.buckets?.[editingBucketId] : null}
        onSuccess={handleOnUpdateBucket}
        onClose={() => setEditingBucketId(null)}
      />

      <GroupManagementModal
        open={showGroupModal}
        onOpenChange={setShowGroupModal}
        onGroupsChanged={loadConfigsData}
      />

      <CredentialsModal
        open={showCredentialsModal}
        onOpenChange={setShowCredentialsModal}
        onChanged={loadConfigsData}
      />

      <Toaster />

    </div>
  );
}

export default App;
