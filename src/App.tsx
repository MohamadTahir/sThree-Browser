import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import Sidebar from "./components/Sidebar";
import FileExplorer from "./components/FileExplorer";
import AddBucketModal from "./components/AddBucketModal";
import EditBucketModal from "./components/EditBucketModal";
import { BucketConfigs } from "./types";

function App() {
  const [configs, setConfigs] = useState<BucketConfigs | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBucketId, setEditingBucketId] = useState<string | null>(null);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const result = await invoke<BucketConfigs>("get_bucket_configs");
      setConfigs(result);
      if (result.active_bucket) {
        setSelectedBucket(result.active_bucket);
      }
    } catch (error) {
      console.error("Failed to load configs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBucket = async () => {
    await loadConfigs();
    setShowAddModal(false);
  };

  const handleEditBucket = (bucketId: string) => {
    setEditingBucketId(bucketId);
    setShowEditModal(true);
  };

  const handleUpdateBucket = async () => {
    await loadConfigs();
    setShowEditModal(false);
    setEditingBucketId(null);
  };

  const handleBucketSelect = async (bucketId: string) => {
    try {
      await invoke("set_active_bucket", { bucketId });
      setSelectedBucket(bucketId);
      await loadConfigs();
    } catch (error) {
      console.error("Failed to set active bucket:", error);
    }
  };

  const handleDeleteBucket = async (bucketId: string) => {
    try {
      await invoke("delete_bucket_config", { bucketId });
      if (selectedBucket === bucketId) {
        setSelectedBucket(null);
      }
      await loadConfigs();
    } catch (error) {
      console.error("Failed to delete bucket:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        configs={configs}
        selectedBucket={selectedBucket}
        onBucketSelect={handleBucketSelect}
        onAddBucket={() => setShowAddModal(true)}
        onEditBucket={handleEditBucket}
        onDeleteBucket={handleDeleteBucket}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <FileExplorer bucketId={selectedBucket} />
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
    </div>
  );
}

export default App;
