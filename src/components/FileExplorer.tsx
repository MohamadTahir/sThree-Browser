import { useState, useEffect, useRef, JSX } from "react";
import {
  Folder,
  File,
  AlertCircle,
  RefreshCw,
  Upload,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { Button } from "./ui/button";
import { Bucket, Configs, S3Object } from "../models/types";
import { useConfig } from "@/context/config";
import Breadcrumb from "./Breadcrumb";
import { toast } from "react-toastify";
import { ListObjectsRequest } from "@/models/dto/requests/ListObjectsRequest";
import { listObjects, uploadFile } from "@/services/s3Service";
import { formatDate } from "@/lib/utils";
import ObjectDetailsSidebar from "./ObjectDetailsSidebar";
import prettyBytes from "pretty-bytes";
import { InitUploadRequest } from "@/models/dto/requests/InitUploadRequest";

interface PageState {
  continuationToken: string | null | undefined;
  nextContinuationToken: string | null | undefined;
  isTruncated: boolean;
  pageHistory: string[];
  currentPrefix: string;
  objects: S3Object[];
  loading: boolean;
  error: string | null;
  selectedObject: S3Object | null;
}

const defaultPageState: PageState = {
  continuationToken: null,
  nextContinuationToken: null,
  isTruncated: false,
  pageHistory: [],
  currentPrefix: "",
  objects: [],
  loading: false,
  error: null,
  selectedObject: null,
};

export default function FileExplorer() {
  const { configs } = useConfig();

  const activeBucket = GetActiveBucket(configs);

  const [pageState, setPageState] = useState<PageState>(defaultPageState);

  // --- File Upload Logic ---
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadObjects = async () => {
    if (!activeBucket) {
      return;
    }

    setPageState((prev) => ({ ...prev, loading: true }));

    const listObjectsRequest: ListObjectsRequest = {
      bucketName: activeBucket.bucketName,
      region: activeBucket.region,
      endpoint: activeBucket.endpoint,
      forcePathStyle: activeBucket.forcePathStyle,
      accessKey: configs.credentials[activeBucket.credentialId].accessKey,
      secretKey: configs.credentials[activeBucket.credentialId].secretKey,
      prefix: pageState.currentPrefix,
      maxKeys: 100,
      continuationToken: pageState.continuationToken,
    };

    try {
      const response = await listObjects(listObjectsRequest);

      setPageState((prev) => ({
        ...prev,
        selectedObject: null,
        objects: response.objects,
        nextContinuationToken: response.nextContinuationToken,
        isTruncated: response.isTruncated,
        continuationToken: pageState.continuationToken,
        loading: false,
        error: response.error ? response.error : null,
      }));
    } catch (error: any) {
      console.error("Failed to load objects", error);
      toast.error("Failed to load objects");
      setPageState((prev) => ({
        ...prev,
        error: error.message,
        loading: false,
      }));
    }
  };

  useEffect(() => {
    loadObjects();
  }, [
    configs.activeBucket,
    pageState.currentPrefix,
    pageState.continuationToken,
    pageState.error,
  ]);

  if (!configs.activeBucket) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Folder className="mx-auto mb-4 h-16 w-16 opacity-50" />
          <p className="text-lg">Select a bucket to get started</p>
        </div>
      </div>
    );
  }

  if (pageState.error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center justify-center text-center">
          <AlertCircle className="h-24 w-24 text-destructive/60 mb-4" />
          <p className="text-sm text-muted-foreground mb-4">
            Unable to load content
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setPageState((prev) => ({ ...prev, error: null }));
            }}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reload
          </Button>
        </div>
      </div>
    );
  }

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    await processFiles(Array.from(files));
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const processFiles = async (files: File[]) => {
    if (!activeBucket) {
      toast.error("Select a bucket before uploading");
      return;
    }

    const credential = configs.credentials[activeBucket.credentialId];
    if (!credential) {
      toast.error("Missing credentials for this bucket");
      return;
    }

    try {
      for (const file of files) {
        const toastId = toast.loading(`Uploading ${file.name}...`, {
          hideProgressBar: false,
          closeOnClick: false,
          pauseOnHover: false,
          draggable: false,
          autoClose: false,
          isLoading: false,
          progress: 0,
        });

        try {
          const key = pageState.currentPrefix + file.name;

          const initUploadRequest: InitUploadRequest = {
            bucketName: activeBucket.bucketName,
            region: activeBucket.region,
            endpoint: activeBucket.endpoint,
            forcePathStyle: activeBucket.forcePathStyle,
            accessKey: credential.accessKey,
            secretKey: credential.secretKey,
            key,
            parts: 1,
            contentType: "",
          };

          await uploadFile(file, initUploadRequest, (progress) => {
            toast.update(toastId, {
              progress: progress,
            });
          });

          toast.update(toastId, {
            render: `Uploaded ${file.name}`,
            type: "success",
            isLoading: false,
            autoClose: 2000,
            hideProgressBar: true,
            closeOnClick: true,
            progress: 0,
          });
          await loadObjects();
        } catch (error: any) {
          console.error("Upload error:", error);
          toast.update(toastId, {
            render: `Failed to upload ${file.name}: ${error.message}`,
            type: "error",
            isLoading: false,
            autoClose: 2000,
            hideProgressBar: true,
            closeOnClick: true,
            progress: 0,
          });
        }
      }
    } catch (error: any) {
      console.error("Failed to upload files", error);
      toast.error("Failed to upload files");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleNextPage = () => {
    if (pageState.nextContinuationToken) {
      const newPageHistory = pageState.pageHistory
        ? [...pageState.pageHistory]
        : [];

      if (pageState.continuationToken) {
        newPageHistory.push(pageState.continuationToken);
      }

      setPageState((prev) => ({
        ...prev,
        pageHistory: newPageHistory,
        continuationToken: pageState.nextContinuationToken,
      }));
    }
  };

  const handlePreviousPage = () => {
    if (pageState.pageHistory.length > 0) {
      const previousTokens = [...pageState.pageHistory];
      const previousToken = previousTokens.pop() || null;
      setPageState((prev) => ({
        ...pageState,
        pageHistory: previousTokens,
        continuationToken: previousToken,
      }));
    } else {
      setPageState((prev) => ({
        ...prev,
        pageHistory: [],
        continuationToken: null,
      }));
    }
  };

  const handleObjectClick = (object: S3Object) => {
    if (object.isFolder) {
      setPageState((prev) => ({ ...prev, currentPrefix: object.key }));
    } else {
      setPageState((prev) => ({ ...prev, selectedObject: object }));
    }
  };

  const header = () => {
    return (
      <div className="border-b border-border p-3.5">
        <div className="flex sm:flex-row items-start items-center justify-between gap-2">
          {/* title and bucket name */}
          <div className="flex-1 min-w-0 flex flex-col gap-1 overflow-hidden">
            <h1 className="text-xl sm:text-2xl font-bold">
              {activeBucket?.nickname || ""}
            </h1>
            <p className="text-sm text-muted-foreground">
              {activeBucket?.bucketName || ""}
            </p>
          </div>

          {/* buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              title="Upload Files"
              className="h-8 w-8"
            >
              <Upload className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                loadObjects();
              }}
              title="Refresh"
              className="h-8 w-8"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const loadingBar = () => {
    if (pageState.loading) {
      return (
        <div className="h-1 w-full bg-muted overflow-hidden relative">
          <div className="h-full bg-primary loading-bar" />
        </div>
      );
    }

    return null;
  };

  const objectsList = () => {
    if (!pageState.objects || pageState.objects.length === 0) {
      return (
        <div className="flex flex-col h-full items-center justify-center text-center text-muted-foreground">
          <Folder className="mb-4 h-12 w-12 opacity-50" />
          <p>This folder is empty</p>
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-border bg-card mx-3">
        <div className="divide-y divide-border">
          {pageState.objects.map((object) =>
            objectItem(object, pageState.currentPrefix, handleObjectClick),
          )}
        </div>
      </div>
    );
  };

  const pagination = () => {
    if (pageState.continuationToken === null && !pageState.isTruncated) {
      return null;
    }

    return (
      <div className="flex m-3">
        <div className="flex flex-row w-full  items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={
                pageState.pageHistory.length === 0 &&
                pageState.continuationToken === null
              }
              className="flex-1 sm:flex-initial"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={
                !pageState.isTruncated || !pageState.nextContinuationToken
              }
              className="flex-1 sm:flex-initial"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-right">
            Showing {pageState.objects.length} item
            {pageState.objects.length !== 1 ? "s" : ""}
            {pageState.isTruncated && ` (more available)`}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="flex flex-1 flex-col md:flex-row overflow-hidden bg-background w-full md:w-auto"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        multiple
      />

      <div className="flex flex-1 flex-col overflow-y-auto min-w-0">
        {header()}
        {loadingBar()}

        <Breadcrumb
          prefix={pageState.currentPrefix}
          onNavigate={(prefix) => {
            setPageState((prev) => ({ ...prev, currentPrefix: prefix }));
          }}
        />

        {objectsList()}
        {pagination()}
      </div>

      <ObjectDetailsSidebar
        object={pageState.selectedObject}
        bucketId={activeBucket?.id || ""}
        onClose={(reload) => {
          if (reload) {
            loadObjects();
          } else {
            setPageState((prev) => ({ ...prev, selectedObject: null }));
          }
        }}
      />
    </div>
  );
}

function GetActiveBucket(configs: Configs): Bucket | null {
  if (!configs.activeBucket) {
    return null;
  }

  const activeBucket = configs.buckets[configs.activeBucket];
  if (!activeBucket) {
    return null;
  }

  return activeBucket;
}

function objectItem(
  object: S3Object,
  currentPrefix: string,
  handleObjectClick: (object: S3Object) => void,
) {
  let fileName: string;
  let fileSize: string | null = null;

  let leadingIcon: JSX.Element;
  let trailingIcon: JSX.Element | null = null;
  let lastModified: JSX.Element | null = null;

  if (object.isFolder) {
    leadingIcon = <Folder className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />;
    trailingIcon = (
      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    );
    fileName = object.key.replace(currentPrefix, "").replace(/\/$/, "");
  } else {
    leadingIcon = (
      <File className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
    );
    fileName = object.key.replace(currentPrefix, "");
    fileSize = prettyBytes(object.size);
    lastModified = object.lastModified ? (
      <span className="ml-2 sm:hidden">
        • {formatDate(object.lastModified)}
      </span>
    ) : null;
  }

  return (
    <div
      key={object.key}
      onClick={() => handleObjectClick(object)}
      className="group flex w-full cursor-pointer items-center gap-2 sm:gap-4 p-3 sm:p-4 transition-colors hover:bg-accent/50"
    >
      <div className="flex flex-1 items-center gap-2 sm:gap-4 min-w-0">
        {leadingIcon}

        <div className="flex flex-1 items-center justify-between gap-2 sm:gap-4 min-w-0">
          <div className="flex-1 text-left min-w-0">
            <div className="font-medium text-sm sm:text-base truncate">
              {fileName}
            </div>

            <div className="text-xs sm:text-sm text-muted-foreground">
              {fileSize}
              {lastModified}
            </div>
          </div>

          {lastModified}
          {trailingIcon}
        </div>
      </div>
    </div>
  );
}
