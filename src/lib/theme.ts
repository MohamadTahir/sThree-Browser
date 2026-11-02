export type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "sthree-theme";

export function getThemePreference(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

/** Apply a theme choice and remember it. "system" follows the OS setting. */
export function setThemePreference(theme: ThemePreference): void {
  const root = document.documentElement;
  if (theme === "system") {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = theme;
  }
  try {
    if (theme === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* storage unavailable: the choice lasts for this session only */
  }
}
