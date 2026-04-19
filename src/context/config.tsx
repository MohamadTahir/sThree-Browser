"use client";

import React from "react";
import { createContext, useState, useContext, useEffect } from "react";
import { Configs } from "../types";
import { loadConfigs, saveConfigs as persistConfigsToStorage } from "../services/storageService";

const emptyConfig: Configs = { buckets: {}, credentials: {}, groups: {}, active_bucket: null };

type ConfigContextType = {
    configs: Configs;
    saveConfigs: (configs: Configs) => Promise<void>;
    deleteGroup: (groupId: string) => Promise<void>;
    setActiveBucket: (bucketId: string) => Promise<void>;
    deleteBucket: (bucketId: string) => Promise<void>;
};

const ConfigContext = createContext<ConfigContextType | null>(null);

export const ContextProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [configs, setConfigs] = useState<Configs>(emptyConfig);

    const init = async () => {
        try {
            const result = await loadConfigs();
            setConfigs(result);
        } catch (error) {
            console.error("Failed to load configs:", error);
            setConfigs(emptyConfig);
        }
    };

    useEffect(() => {
        init();
    }, []);

    const saveConfigs = async (next: Configs) => {
        try {
            await persistConfigsToStorage(next);
            setConfigs(next);
        } catch (error) {
            console.error("Failed to save configs:", error);
        }
    };

    const deleteGroup = async (groupId: string) => {
        if (!window.confirm("Are you sure you want to delete this folder? Buckets in this folder will be moved out.")) {
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
              groups: nextGroups
          };

          await persistConfigsToStorage(next);
          setConfigs(next);
    };

    const setActiveBucket = async (bucketId: string) => {
        const next = {
            ...configs,
            active_bucket: bucketId
        };
        await persistConfigsToStorage(next);
        setConfigs(next);
    };

    const deleteBucket = async (bucketId: string) => {
        if (!window.confirm("Are you sure you want to delete this bucket? All data will be lost.")) {
            return;
        }

        const nextBuckets = { ...configs.buckets };
        delete nextBuckets[bucketId];

        const next = {
            ...configs,
            buckets: nextBuckets,
            active_bucket: configs.active_bucket === bucketId ? null : configs.active_bucket
        };
        await persistConfigsToStorage(next);
        setConfigs(next);
    };

    return (
        <ConfigContext.Provider value= {{ configs, saveConfigs, deleteGroup, setActiveBucket, deleteBucket }}>
        { children }
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
