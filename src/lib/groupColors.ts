/**
 * Group dot colours: one OKLCH ramp (lightness 0.64, chroma 0.12), so the
 * hues sit together and each dot clears 3:1 on the sidebar in both themes.
 */
export const GROUP_COLORS = [
  { name: "Blue", value: "#638bd5" },
  { name: "Green", value: "#50a064" },
  { name: "Violet", value: "#987aca" },
  { name: "Amber", value: "#ba7e2d" },
  { name: "Red", value: "#cb6d67" },
  { name: "Pink", value: "#c26c96" },
  { name: "Teal", value: "#00a39c" },
  { name: "Grey", value: "#838d9c" },
] as const;

const DEFAULT_COLOR = "#838d9c";

/** The earlier palette, saved in existing vaults, mapped to its replacement. */
const LEGACY: Record<string, string> = {
  "#3b82f6": "#638bd5",
  "#16a34a": "#50a064",
  "#8b5cf6": "#987aca",
  "#f59e0b": "#ba7e2d",
  "#ef4444": "#cb6d67",
  "#ec4899": "#c26c96",
  "#14b8a6": "#00a39c",
  "#6b7280": "#838d9c",
};

/** The colour to draw for a group's stored colour. */
export function groupColor(color: string | undefined): string {
  if (!color) return DEFAULT_COLOR;
  return LEGACY[color.toLowerCase()] ?? color;
}
