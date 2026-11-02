"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "react-toastify";
import { Bucket, Configs, Credential, Group, emptyConfigs } from "@/models/types";
import {
  changeVaultPassword,
  createVault,
  destroyVault,
  getVaultState,
  lockVault,
  saveVault,
  unlockVault,
} from "@/services/vault";
import { Connection } from "@/services/s3Service";

/** Lock automatically after this long without keyboard or pointer input. */
const AUTO_LOCK_MS = 15 * 60 * 1000;

export type VaultStatus = "loading" | "setup" | "locked" | "unlocked";

type ConfigContextType = {
  status: VaultStatus;
  configs: Configs;
  setup: (password: string) => Promise<void>;
  unlock: (password: string) => Promise<boolean>;
  lock: () => void;
  reset: () => void;
  /** Epoch ms at which the vault auto-locks, or null while locked. */
  getLockDeadline: () => number | null;
  /** Returns false when the current password is wrong. */
  changePassword: (current: string, next: string) => Promise<boolean>;
  toggleGroup: (groupId: string) => Promise<void>;
  saveGroup: (group: Group) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  setActiveBucket: (bucketId: string | null) => Promise<void>;
  saveBucket: (bucket: Bucket) => Promise<void>;
  deleteBucket: (bucketId: string) => Promise<void>;
  saveCredential: (credential: Credential) => Promise<void>;
  /** Throws if any bucket still uses the credential. */
  deleteCredential: (credentialId: string) => Promise<void>;
  getConnection: (bucketId: string | null) => Connection | null;
};

const ConfigContext = createContext<ConfigContextType | null>(null);

export const ContextProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [status, setStatus] = useState<VaultStatus>("loading");
  const [configs, setConfigs] = useState<Configs>(emptyConfigs);

  // Latest configs and a write queue, so quick successive edits build on each
  // other instead of on a stale render, and saves land in order.
  const configsRef = useRef<Configs>(configs);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const lockDeadline = useRef<number | null>(null);

  useEffect(() => {
    setStatus(getVaultState());
  }, []);

  const applyUnlocked = (next: Configs) => {
    configsRef.current = next;
    setConfigs(next);
    setStatus("unlocked");
  };

  const setup = async (password: string) => {
    applyUnlocked(await createVault(password));
  };

  const unlock = async (password: string) => {
    const result = await unlockVault(password);
    if (!result) {
      return false;
    }
    applyUnlocked(result);
    return true;
  };

  const lock = useCallback(() => {
    lockVault();
    // A reload drops every decrypted secret held in React state and caches.
    window.location.reload();
  }, []);

  const reset = () => {
    destroyVault();
    window.location.reload();
  };

  const update = (mutate: (current: Configs) => Configs): Promise<void> => {
    const next = mutate(configsRef.current);
    configsRef.current = next;
    setConfigs(next);
    const write = saveQueue.current.then(() => saveVault(next));
    saveQueue.current = write.catch(() => undefined);
    return write.catch((error) => {
      console.error("Failed to save vault", error);
      toast.error("Couldn't save your changes. They'll be lost when the app locks.");
      throw error;
    });
  };

  // Auto-lock after inactivity.
  useEffect(() => {
    if (status !== "unlocked") {
      return;
    }
    let timer = 0;
    const arm = () => {
      window.clearTimeout(timer);
      lockDeadline.current = Date.now() + AUTO_LOCK_MS;
      timer = window.setTimeout(lock, AUTO_LOCK_MS);
    };
    const onActivity = arm;
    arm();
    const events = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    events.forEach((event) =>
      window.addEventListener(event, onActivity, { passive: true }),
    );
    return () => {
      window.clearTimeout(timer);
      lockDeadline.current = null;
      events.forEach((event) => window.removeEventListener(event, onActivity));
    };
  }, [status, lock]);

  const getLockDeadline = useCallback(() => lockDeadline.current, []);

  const changePassword = (current: string, next: string) =>
    changeVaultPassword(current, next, configsRef.current);

  const toggleGroup = (groupId: string) =>
    update((c) => {
      const group = c.groups[groupId];
      if (!group) return c;
      return {
        ...c,
        groups: { ...c.groups, [groupId]: { ...group, active: !group.active } },
      };
    });

  const saveGroup = (group: Group) =>
    update((c) => ({ ...c, groups: { ...c.groups, [group.id]: group } }));

  const deleteGroup = (groupId: string) =>
    update((c) => {
      const buckets = { ...c.buckets };
      for (const id in buckets) {
        if (buckets[id].groupId === groupId) {
          buckets[id] = { ...buckets[id], groupId: null };
        }
      }
      const groups = { ...c.groups };
      delete groups[groupId];
      return { ...c, buckets, groups };
    });

  const setActiveBucket = (bucketId: string | null) => {
    if (configsRef.current.activeBucket === bucketId) {
      return Promise.resolve();
    }
    return update((c) => ({ ...c, activeBucket: bucketId }));
  };

  const saveBucket = (bucket: Bucket) =>
    update((c) => ({ ...c, buckets: { ...c.buckets, [bucket.id]: bucket } }));

  const deleteBucket = (bucketId: string) =>
    update((c) => {
      const buckets = { ...c.buckets };
      delete buckets[bucketId];
      return {
        ...c,
        buckets,
        activeBucket: c.activeBucket === bucketId ? null : c.activeBucket,
      };
    });

  const saveCredential = (credential: Credential) =>
    update((c) => ({
      ...c,
      credentials: { ...c.credentials, [credential.id]: credential },
    }));

  const deleteCredential = (credentialId: string) => {
    const users = Object.values(configsRef.current.buckets).filter(
      (bucket) => bucket.credentialId === credentialId,
    );
    if (users.length > 0) {
      const names = users.map((b) => `"${b.nickname}"`).join(", ");
      return Promise.reject(
        new Error(`Still used by ${names}. Move those connections to another credential first.`),
      );
    }
    return update((c) => {
      const credentials = { ...c.credentials };
      delete credentials[credentialId];
      return { ...c, credentials };
    });
  };

  const getConnection = useCallback(
    (bucketId: string | null): Connection | null => {
      const bucket = bucketId ? configs.buckets[bucketId] : undefined;
      const credential = bucket && configs.credentials[bucket.credentialId];
      return bucket && credential ? { bucket, credential } : null;
    },
    [configs.buckets, configs.credentials],
  );

  const value = useMemo(
    () => ({
      status,
      configs,
      setup,
      unlock,
      lock,
      reset,
      getLockDeadline,
      changePassword,
      toggleGroup,
      saveGroup,
      deleteGroup,
      setActiveBucket,
      saveBucket,
      deleteBucket,
      saveCredential,
      deleteCredential,
      getConnection,
    }),
    // The action functions only touch refs and stable setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [status, configs, lock, getConnection, getLockDeadline],
  );

  return (
    <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (context === null) {
    throw new Error("useConfig must be used within a ContextProvider");
  }
  return context;
};
