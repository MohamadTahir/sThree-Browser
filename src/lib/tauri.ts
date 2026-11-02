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
