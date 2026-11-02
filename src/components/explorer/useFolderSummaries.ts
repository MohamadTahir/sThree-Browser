import { useCallback, useEffect, useRef, useState } from "react";
import { Connection, FolderSummary, summarizeFolder } from "@/services/s3Service";
import { connectionKey } from "./useObjectListing";

const CONCURRENCY = 3;

export type FolderState = FolderSummary | "loading" | "error";

/**
 * Size and last-modified for the folders on screen, computed in the
 * background a few at a time. Results are cached per connection until
 * `invalidate` is called (after uploads, deletes, or a refresh).
 */
export function useFolderSummaries(connection: Connection | null, prefixes: string[]) {
  const key = connectionKey(connection);
  const cache = useRef(new Map<string, FolderSummary>());
  const [states, setStates] = useState<Record<string, FolderState>>({});
  const [generation, setGeneration] = useState(0);

  // A different connection starts with an empty cache.
  useEffect(() => {
    cache.current = new Map();
    setStates({});
  }, [key]);

  const wanted = prefixes.join("\n");

  useEffect(() => {
    if (!connection || !wanted) return;
    const controller = new AbortController();
    const list = wanted.split("\n");

    const initial: Record<string, FolderState> = {};
    for (const prefix of list) initial[prefix] = cache.current.get(prefix) ?? "loading";
    setStates(initial);

    const queue = list.filter((p) => !cache.current.has(p));
    const worker = async () => {
      while (queue.length > 0 && !controller.signal.aborted) {
        const prefix = queue.shift()!;
        try {
          const summary = await summarizeFolder(connection, prefix, { signal: controller.signal });
          if (controller.signal.aborted) return;
          cache.current.set(prefix, summary);
          setStates((s) => ({ ...s, [prefix]: summary }));
        } catch {
          if (controller.signal.aborted) return;
          setStates((s) => ({ ...s, [prefix]: "error" }));
        }
      }
    };
    for (let i = 0; i < CONCURRENCY; i++) void worker();
    return () => controller.abort();
    // connection identity is covered by `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, wanted, generation]);

  const invalidate = useCallback(() => {
    cache.current = new Map();
    setGeneration((g) => g + 1);
  }, []);

  return { states, invalidate };
}
