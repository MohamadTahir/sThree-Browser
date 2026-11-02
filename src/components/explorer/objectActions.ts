import { toast } from "react-toastify";
import { Connection, describeS3Error, getPresignedUrl } from "@/services/s3Service";
import { baseName } from "@/lib/utils";
import { isTauri, openExternal } from "@/lib/tauri";

/**
 * Download through a short-lived presigned URL. S3 serves it as an
 * attachment, so the browser saves it directly and nothing is buffered here.
 */
export async function downloadObject(connection: Connection, key: string): Promise<void> {
  try {
    const url = await getPresignedUrl(connection, key, 5 * 60, baseName(key));
    if (isTauri()) {
      await openExternal(url);
      return;
    }
    const link = document.createElement("a");
    link.href = url;
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    toast.error(describeS3Error(error));
  }
}

/** Copy text, reporting the outcome with a toast. */
export async function copyToClipboard(text: string, label: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`, { autoClose: 1500 });
  } catch {
    toast.error("Couldn't copy to the clipboard.");
  }
}
