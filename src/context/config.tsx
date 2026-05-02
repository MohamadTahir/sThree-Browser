"use client";

import React from "react";
import { createContext, useState, useContext, useEffect } from "react";
import { Bucket, Configs, Group, Credential } from "../models/types";
import { toast } from "react-toastify";
import {
  loadConfigsFromStorage,
  persistConfigsToStorage,
} from "@/services/storage";

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
  addCredential: (credential: Credential) => Promise<void>;
  deleteCredential: (credentialId: string) => Promise<void>;
  updateCredential: (credential: Credential) => Promise<void>;
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
      toast.error("Failed to load configs");
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
    if (configs.active_bucket === bucketId) {
      return;
    }

    const next = {
      ...configs,
      active_bucket: bucketId,
    };
    await persistConfigsToStorage(next);
    setConfigs(next);
  };

  const deleteBucket = async (bucketId: string) => {
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

  const addCredential = async (credential: Credential) => {
    const nextCredentials = { ...configs.credentials };
    nextCredentials[credential.id] = credential;
    const next = {
      ...configs,
      credentials: nextCredentials,
    };
    await persistConfigsToStorage(next);
    setConfigs(next);
  };

  const deleteCredential = async (credentialId: string) => {
    const nextCredentials = { ...configs.credentials };
    delete nextCredentials[credentialId];
    const next = {
      ...configs,
      credentials: nextCredentials,
    };
    await persistConfigsToStorage(next);
    setConfigs(next);
  };

  const updateCredential = async (credential: Credential) => {
    const nextCredentials = { ...configs.credentials };
    nextCredentials[credential.id] = credential;
    const next = {
      ...configs,
      credentials: nextCredentials,
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
        addCredential,
        deleteCredential,
        updateCredential,
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
