/** The privacy notice and terms, linked from the unlock screen and Settings. */
export const PRIVACY_URL = "https://sthree.motahir.dev/legal";

/** True when running inside the Tauri desktop shell. */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * Open a URL outside the app: the system browser on desktop, a new tab on the
 * web. `noopener`/`noreferrer` keep the opened page from reaching back.
 */
export async function openExternal(url: string): Promise<void> {
  if (isTauri()) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Save a text file the user names. Desktop shows a native Save dialog; the
 * web build downloads it. Returns false when the user cancels (desktop only).
 */
export async function saveTextFile(fileName: string, contents: string): Promise<boolean> {
  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<boolean>("save_export", { fileName, contents });
  }
  const url = URL.createObjectURL(new Blob([contents], { type: "application/json" }));
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return true;
}

/**
 * The vault's device key from the OS keychain, or null on the web build and
 * when none exists yet (`create` false). With `create`, a missing key is
 * generated and stored first. Throws when the keychain can't be used.
 */
export async function vaultDeviceKey(create: boolean): Promise<Uint8Array<ArrayBuffer> | null> {
  if (!isTauri()) {
    return null;
  }
  const { invoke } = await import("@tauri-apps/api/core");
  const bytes = await invoke<number[] | null>("vault_device_key", { create });
  return bytes ? new Uint8Array(bytes) : null;
}
