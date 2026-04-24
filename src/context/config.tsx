"use client";

import React from "react";
import { createContext, useState, useContext, useEffect } from "react";
import { Bucket, Configs, Group } from "../types";
import { encrypt, decrypt } from "@/services/encryptionService";
import { getMasterPasswordFromMemory } from "@/services/encryptionService";

export async function loadConfigsFromStorage(): Promise<Configs> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { buckets: {}, credentials: {}, groups: {}, active_bucket: null };
    }

    const masterPassword = getMasterPasswordFromMemory();
    if (!masterPassword) {
      return { buckets: {}, credentials: {}, groups: {}, active_bucket: null };
    }

    const decryptedConfigs = await decrypt(stored, masterPassword);
    return decryptedConfigs;
  } catch (error) {
    console.error("Error loading configs:", error);
    return { buckets: {}, credentials: {}, groups: {}, active_bucket: null };
  }
}

async function persistConfigsToStorage(configs: Configs): Promise<void> {
  const masterPassword = getMasterPasswordFromMemory();

  if (!masterPassword) {
    throw new Error("Master password not unlocked. Please unlock first.");
  }

  const encryptedConfigs = await encrypt(configs, masterPassword);
  localStorage.setItem(STORAGE_KEY, encryptedConfigs);
}

const STORAGE_KEY = "bucket-configs";

type ConfigContextType = {
  configs: Configs;
  setActiveGroup: (groupId: string) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  addGroup: (group: Group) => Promise<void>;
  updateGroup: (group: Group) => Promise<void>;
  setActiveBucket: (bucketId: string) => Promise<void>;
  deleteBucket: (bucketId: string) => Promise<void>;
  addBucket: (bucket: Bucket) => Promise<void>;
  updateBucket: (bucket: Bucket) => Promise<void>;
};

const ConfigContext = createContext<ConfigContextType | null>(null);

export const ContextProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [configs, setConfigs] = useState<Configs>({
    buckets: {},
    credentials: {},
    groups: {},
    active_bucket: null,
  });

  const init = async () => {
    try {
      const result = await loadConfigsFromStorage();
      setConfigs(result);
    } catch (error) {
      console.error("Failed to load configs:", error);
    }
  };

  useEffect(() => {
    init();
  }, []);

  const setActiveGroup = async (groupId: string) => {
    const group = configs.groups[groupId];
    const next = {
      ...configs,
      groups: {
        ...configs.groups,
        [groupId]: {
          ...configs.groups[groupId],
          active: !group?.active,
        },
      },
    };
    await persistConfigsToStorage(next);
    setConfigs(next);
  };

  const deleteGroup = async (groupId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this folder? Buckets in this folder will be moved out.",
      )
    ) {
      return;
    }

    const nextBuckets = { ...configs.buckets };

    for (const id in nextBuckets) {
      if (nextBuckets[id].groupId === groupId) {
        nextBuckets[id] = { ...nextBuckets[id], groupId: null };
      }
    }

    const nextGroups = { ...configs.groups };
    delete nextGroups[groupId];

    const next = {
      ...configs,
      buckets: nextBuckets,
      groups: nextGroups,
    };

    await persistConfigsToStorage(next);
    setConfigs(next);
  };

  const addGroup = async (group: Group) => {
    const nextGroups = { ...configs.groups };
    nextGroups[group.id] = group;

    const next = {
      ...configs,
      groups: nextGroups,
    };
    await persistConfigsToStorage(next);
    setConfigs(next);
  };

  const updateGroup = async (group: Group) => {
    const nextGroups = { ...configs.groups };
    nextGroups[group.id] = group;
    const next = {
      ...configs,
      groups: nextGroups,
    };
    await persistConfigsToStorage(next);
    setConfigs(next);
  };

  const setActiveBucket = async (bucketId: string) => {
    const next = {
      ...configs,
      active_bucket: bucketId,
    };
    await persistConfigsToStorage(next);
    setConfigs(next);
  };

  const deleteBucket = async (bucketId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this bucket? All data will be lost.",
      )
    ) {
      return;
    }

    const nextBuckets = { ...configs.buckets };
    delete nextBuckets[bucketId];

    const next = {
      ...configs,
      buckets: nextBuckets,
      active_bucket:
        configs.active_bucket === bucketId ? null : configs.active_bucket,
    };
    await persistConfigsToStorage(next);
    setConfigs(next);
  };

  const addBucket = async (bucket: Bucket) => {
    const nextBuckets = { ...configs.buckets, [bucket.id]: bucket };
    const next = {
      ...configs,
      buckets: nextBuckets,
    };
    await persistConfigsToStorage(next);
    setConfigs(next);
  };

  const updateBucket = async (bucket: Bucket) => {
    const nextBuckets = { ...configs.buckets };
    nextBuckets[bucket.id] = bucket;
    const next = {
      ...configs,
      buckets: nextBuckets,
    };
    await persistConfigsToStorage(next);
    setConfigs(next);
  };

  return (
    <ConfigContext.Provider
      value={{
        configs,
        setActiveGroup,
        deleteGroup,
        addGroup,
        updateGroup,
        setActiveBucket,
        deleteBucket,
        addBucket,
        updateBucket,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (context === null) {
    throw new Error("useConfig must be used within a ContextProvider");
  }
  return context;
};
