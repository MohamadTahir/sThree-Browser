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

    const encryptedConfigs: Configs = JSON.parse(stored);

    const masterPassword = getMasterPasswordFromMemory();
    if (!masterPassword) {
      return { buckets: {}, credentials: {}, groups: {}, active_bucket: null };
    }

    // Decrypt all credential configs
    const decryptedConfigs = { ...encryptedConfigs };

    for (const [credId, encryptedConfig] of Object.entries(
      encryptedConfigs.credentials || {},
    )) {
      try {
        const decryptedAccessKey = await decrypt(
          encryptedConfig.access_key,
          masterPassword,
        );

        const decryptedSecretKey = await decrypt(
          encryptedConfig.secret_key,
          masterPassword,
        );

        decryptedConfigs.credentials[credId] = {
          id: encryptedConfig.id,
          name: encryptedConfig.name,
          access_key: decryptedAccessKey,
          secret_key: decryptedSecretKey,
        };
      } catch (error) {
        console.error(`Failed to decrypt credential for ${credId}:`, error);
      }
    }

    return decryptedConfigs;
  } catch (error) {
    console.error("Error loading configs:", error);
    // Fallback to empty configs if there's an error
    return { buckets: {}, credentials: {}, groups: {}, active_bucket: null };
  }
}

// TODO: the below function should only be used by the context provider.
async function persistConfigsToStorage(configs: Configs): Promise<void> {
  const masterPassword = getMasterPasswordFromMemory();
  if (!masterPassword) {
    throw new Error("Master password not unlocked. Please unlock first.");
  }

  // Encrypt all credential configs
  const encryptedConfigs: Configs = {
    buckets: configs.buckets || {},
    credentials: {},
    groups: configs.groups || {},
    active_bucket: configs.active_bucket,
  };

  for (const [credId, cred] of Object.entries(configs.credentials || {})) {
    const encryptedAccessKey = await encrypt(cred.access_key, masterPassword);
    const encryptedSecretKey = await encrypt(cred.secret_key, masterPassword);

    encryptedConfigs.credentials[credId] = {
      id: cred.id,
      name: cred.name,
      access_key: encryptedAccessKey,
      secret_key: encryptedSecretKey,
    };
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(encryptedConfigs));
}

const STORAGE_KEY = "bucket-configs";

const emptyConfig: Configs = {
  buckets: {},
  credentials: {},
  groups: {},
  active_bucket: null,
};

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
  const [configs, setConfigs] = useState<Configs>(emptyConfig);

  const init = async () => {
    try {
      const result = await loadConfigsFromStorage();
      setConfigs(result);
    } catch (error) {
      console.error("Failed to load configs:", error);
      setConfigs(emptyConfig);
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

    console.log("nextGroups", nextGroups);

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
