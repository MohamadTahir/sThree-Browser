import { useCallback, useEffect, useRef, useState } from "react";
import { Connection, describeS3Error, listObjects } from "@/services/s3Service";
import { S3Object } from "@/models/types";

const PAGE_SIZE = 200;

/** Identity of a connection's settings; any change starts browsing afresh. */
export function connectionKey(connection: Connection | null): string {
  if (!connection) return "";
  const { bucket, credential } = connection;
  return [
    bucket.id,
    bucket.bucketName,
    bucket.region,
    bucket.endpoint ?? "",
    bucket.forcePathStyle,
    credential.id,
    credential.accessKey,
  ].join("|");
}

interface ListingState {
  objects: S3Object[];
  loading: boolean;
  error: string | null;
  /** Raw error, kept to tell network/CORS failures apart. */
  errorName: string | null;
}

/**
 * Lists one prefix of the active connection, page by page. Navigating or
 * switching connection resets paging, and responses that arrive after the
 * user moved on are dropped.
 */
export function useObjectListing(connection: Connection | null) {
  const key = connectionKey(connection);
  const [prefix, setPrefixState] = useState("");
  // tokens[i] is the continuation token for page i (page 0 has none).
  const [tokens, setTokens] = useState<(string | null)[]>([null]);
  const [page, setPage] = useState(0);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const [state, setState] = useState<ListingState>({
    objects: [],
    loading: false,
    error: null,
    errorName: null,
  });

  const connectionRef = useRef(connection);
  connectionRef.current = connection;

  // New connection: back to the bucket root.
  useEffect(() => {
    setPrefixState("");
    setTokens([null]);
    setPage(0);
    setState({ objects: [], loading: false, error: null, errorName: null });
  }, [key]);

  const token = tokens[page] ?? null;

  useEffect(() => {
    const current = connectionRef.current;
    if (!current) return;
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null, errorName: null }));

    listObjects(current, {
      prefix,
      continuationToken: token,
      maxKeys: PAGE_SIZE,
      signal: controller.signal,
    })
      .then((result) => {
        if (controller.signal.aborted) return;
        setNextToken(result.nextContinuationToken);
        setState({ objects: result.objects, loading: false, error: null, errorName: null });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setState({
          objects: [],
          loading: false,
          error: describeS3Error(error),
          errorName: (error as Error)?.name ?? null,
        });
      });

    return () => controller.abort();
  }, [key, prefix, token, reloadCount]);

  const setPrefix = useCallback((next: string) => {
    setPrefixState(next);
    setTokens([null]);
    setPage(0);
  }, []);

  const nextPage = useCallback(() => {
    if (!nextToken) return;
    setTokens((t) => [...t.slice(0, page + 1), nextToken]);
    setPage((p) => p + 1);
  }, [nextToken, page]);

  const previousPage = useCallback(() => {
    setPage((p) => Math.max(0, p - 1));
  }, []);

  const reload = useCallback(() => setReloadCount((n) => n + 1), []);

  return {
    prefix,
    setPrefix,
    page,
    hasNextPage: nextToken !== null,
    nextPage,
    previousPage,
    reload,
    ...state,
  };
}
