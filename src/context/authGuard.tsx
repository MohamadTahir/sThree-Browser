import MasterPasswordModal from "@/components/MasterPasswordModal";
import {
  hasMasterPassword,
  isMasterPasswordUnlocked,
} from "@/services/encryptionService";
import { useEffect, useState } from "react";

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [showMasterPasswordModal, setShowMasterPasswordModal] = useState(true);

  useEffect(() => {
    checkMasterPasswordStatus();
  }, []);

  const checkMasterPasswordStatus = async () => {
    if (!hasMasterPassword() || !isMasterPasswordUnlocked()) {
      setShowMasterPasswordModal(true);
      return;
    }

    setShowMasterPasswordModal(false);
  };

  if (showMasterPasswordModal) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <MasterPasswordModal
          open={showMasterPasswordModal}
          onOpenChange={setShowMasterPasswordModal}
          onUnlocked={() => {
            setShowMasterPasswordModal(false);
          }}
        />
      </div>
    );
  }

  return <>{children}</>;
};
