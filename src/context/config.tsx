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
import { flushSync } from "react-dom";
import { toast } from "react-toastify";
import { Bucket, Configs, Credential, Group, emptyConfigs } from "@/models/types";
import {
  changeVaultPassword,
  createVault,
  destroyVault,
  getVaultState,
  lockVault,
  saveVault,
  syncVault,
  unlockVault,
  VAULT_STORAGE_KEY,
  VaultConflictError,
} from "@/services/vault";
import { Connection } from "@/services/s3Service";
import { ExportPayload, mergeImport } from "@/services/configTransfer";

/** Lock automatically after this long without keyboard or pointer input. */
const AUTO_LOCK_MS = 15 * 60 * 1000;

/** Key for connections outside any group in `arrangeSidebar`. */
export const UNGROUPED = "";

/** Why the vault last locked, shown once on the unlock screen. */
export const LOCK_NOTICE_KEY = "sthree-lock-notice";
const NOTICE_IDLE = "Locked after 15 minutes of inactivity.";
const NOTICE_EXTERNAL =
  "The vault was changed in another window (password change or reset). Unlock it again to continue.";

export type VaultStatus = "loading" | "setup" | "locked" | "unlocked";

type ConfigContextType = {
  status: VaultStatus;
  configs: Configs;
  setup: (password: string) => Promise<void>;
  unlock: (password: string) => Promise<boolean>;
  /** Lock now; `notice` is shown on the unlock screen. */
  lock: (notice?: string) => void;
  reset: () => void;
  /** Count as user activity for auto-lock (e.g. while an upload runs). */
  keepAlive: () => void;
  /** Epoch ms at which the vault auto-locks, or null while locked. */
  getLockDeadline: () => number | null;
  /** Returns false when the current password is wrong. */
  changePassword: (current: string, next: string) => Promise<boolean>;
  toggleGroup: (groupId: string) => Promise<void>;
  saveGroup: (group: Group) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  /**
   * Save the sidebar arrangement: the order of groups, and for each listed
   * group (or `UNGROUPED`) the connections it holds, in order.
   */
  arrangeSidebar: (groupOrder: string[] | null, members: Record<string, string[]>) => Promise<void>;
  setActiveBucket: (bucketId: string | null) => Promise<void>;
  saveBucket: (bucket: Bucket) => Promise<void>;
  deleteBucket: (bucketId: string) => Promise<void>;
  saveCredential: (credential: Credential) => Promise<void>;
  /** Throws if any bucket still uses the credential. */
  deleteCredential: (credentialId: string) => Promise<void>;
  getConnection: (bucketId: string | null) => Connection | null;
  /**
   * Keys typed in for a connection set to ask for them. Held in memory only:
   * never written to the vault, and gone when the app locks or reloads.
   */
  sessionCredentials: Record<string, Credential>;
  setSessionCredential: (bucketId: string, credential: Credential | null) => void;
  /** Merge settings from an export file; items with the same id are replaced. */
  importConfigs: (payload: ExportPayload) => Promise<void>;
};

const ConfigContext = createContext<ConfigContextType | null>(null);

export const ContextProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [status, setStatus] = useState<VaultStatus>("loading");
  const [configs, setConfigs] = useState<Configs>(emptyConfigs);
  const [sessionCredentials, setSessionCredentials] = useState<
    Record<string, Credential>
  >({});

  // Latest configs and a write queue, so quick successive edits build on each
  // other instead of on a stale render, and saves land in order.
  const configsRef = useRef<Configs>(configs);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const lockDeadline = useRef<number | null>(null);
  const armAutoLock = useRef<() => void>(() => undefined);

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

  const lock = useCallback((notice?: string) => {
    lockVault();
    // Drop decrypted state before anything else. If the reload below is
    // cancelled (an upload's "leave page?" prompt), the app is already locked
    // instead of staying usable with credentials in memory.
    flushSync(() => {
      configsRef.current = emptyConfigs();
      setConfigs(configsRef.current);
      setSessionCredentials({});
      setStatus("locked");
    });
    if (notice) {
      try {
        sessionStorage.setItem(LOCK_NOTICE_KEY, notice);
      } catch {
        /* storage unavailable: lock without the notice */
      }
    }
    // A reload also clears SDK clients, caches and anything else in memory.
    window.setTimeout(() => window.location.reload(), 0);
  }, []);

  const applyExternal = (fresh: Configs | null) => {
    if (!fresh) {
      lock(NOTICE_EXTERNAL);
      return;
    }
    configsRef.current = fresh;
    setConfigs(fresh);
  };

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
    return write.catch(async (error) => {
      if (error instanceof VaultConflictError) {
        // Never overwrite what another window wrote: re-read it instead, or
        // lock if this tab's key is no longer valid.
        if (error.kind === "rekeyed") {
          lock(NOTICE_EXTERNAL);
        } else {
          applyExternal(await syncVault());
          toast.warning(
            "Another window changed your settings, so your last change wasn't saved. Please try again.",
          );
        }
      } else {
        console.error("Failed to save vault", error);
        toast.error("Couldn't save your changes. They'll be lost when the app locks.");
      }
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
      timer = window.setTimeout(() => lock(NOTICE_IDLE), AUTO_LOCK_MS);
    };
    const onActivity = arm;
    armAutoLock.current = arm;
    arm();
    const events = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    events.forEach((event) =>
      window.addEventListener(event, onActivity, { passive: true }),
    );
    return () => {
      window.clearTimeout(timer);
      lockDeadline.current = null;
      armAutoLock.current = () => undefined;
      events.forEach((event) => window.removeEventListener(event, onActivity));
    };
  }, [status, lock]);

  // Another window wrote the vault (settings, password change, or reset):
  // pick up its settings, or lock if this tab's key no longer opens it.
  useEffect(() => {
    if (status !== "unlocked") {
      return;
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key !== VAULT_STORAGE_KEY && event.key !== null) return;
      void syncVault().then(applyExternal);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
    // applyExternal only touches refs, setters and lock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, lock]);

  const keepAlive = useCallback(() => armAutoLock.current(), []);

  const getLockDeadline = useCallback(() => lockDeadline.current, []);

  const changePassword = async (current: string, next: string) => {
    try {
      const fresh = await changeVaultPassword(current, next);
      if (!fresh) return false;
      configsRef.current = fresh;
      setConfigs(fresh);
      return true;
    } catch (error) {
      if (error instanceof VaultConflictError) lock(NOTICE_EXTERNAL);
      throw error;
    }
  };

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

  const arrangeSidebar = (groupOrder: string[] | null, members: Record<string, string[]>) =>
    update((c) => {
      const groups = { ...c.groups };
      groupOrder?.forEach((id, order) => {
        if (groups[id]) groups[id] = { ...groups[id], order };
      });
      const buckets = { ...c.buckets };
      for (const [groupId, ids] of Object.entries(members)) {
        ids.forEach((id, order) => {
          if (!buckets[id]) return;
          buckets[id] = {
            ...buckets[id],
            groupId: groupId === UNGROUPED || !groups[groupId] ? null : groupId,
            order,
          };
        });
      }
      return { ...c, groups, buckets };
    });

  const setActiveBucket = (bucketId: string | null) => {
    if (configsRef.current.activeBucket === bucketId) {
      return Promise.resolve();
    }
    return update((c) => ({ ...c, activeBucket: bucketId }));
  };

  const saveBucket = (bucket: Bucket) =>
    update((c) => {
      // A connection moved to another group in the dialog goes to its end.
      const previous = c.buckets[bucket.id];
      const moved = previous && (previous.groupId ?? null) !== (bucket.groupId ?? null);
      const next = moved ? { ...bucket, order: undefined } : bucket;
      return { ...c, buckets: { ...c.buckets, [bucket.id]: next } };
    });

  const deleteBucket = (bucketId: string) => {
    setSessionCredential(bucketId, null);
    return update((c) => {
      const buckets = { ...c.buckets };
      delete buckets[bucketId];
      return {
        ...c,
        buckets,
        activeBucket: c.activeBucket === bucketId ? null : c.activeBucket,
      };
    });
  };

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

  const importConfigs = (payload: ExportPayload) =>
    update((c) => mergeImport(c, payload));

  const setSessionCredential = useCallback(
    (bucketId: string, credential: Credential | null) =>
      setSessionCredentials((current) => {
        const next = { ...current };
        if (credential) next[bucketId] = credential;
        else delete next[bucketId];
        return next;
      }),
    [],
  );

  const getConnection = useCallback(
    (bucketId: string | null): Connection | null => {
      const bucket = bucketId ? configs.buckets[bucketId] : undefined;
      const credential =
        bucket &&
        (bucket.askForCredentials
          ? sessionCredentials[bucket.id]
          : configs.credentials[bucket.credentialId]);
      return bucket && credential ? { bucket, credential } : null;
    },
    [configs.buckets, configs.credentials, sessionCredentials],
  );

  const value = useMemo(
    () => ({
      status,
      configs,
      setup,
      unlock,
      lock,
      reset,
      keepAlive,
      getLockDeadline,
      changePassword,
      toggleGroup,
      saveGroup,
      deleteGroup,
      arrangeSidebar,
      setActiveBucket,
      saveBucket,
      deleteBucket,
      saveCredential,
      deleteCredential,
      getConnection,
      sessionCredentials,
      setSessionCredential,
      importConfigs,
    }),
    // The action functions only touch refs and stable setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      status,
      configs,
      lock,
      keepAlive,
      getConnection,
      getLockDeadline,
      sessionCredentials,
      setSessionCredential,
    ],
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
