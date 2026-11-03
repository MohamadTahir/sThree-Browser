/** Group dot colours, as chosen in the group dialog. */
export const GROUP_COLORS = [
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#16a34a" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Red", value: "#ef4444" },
  { name: "Pink", value: "#ec4899" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Grey", value: "#6b7280" },
] as const;

const DEFAULT_COLOR = "#6b7280";

/** A short-lived muted palette (Nov 2026), mapped back to the colours above. */
const MUTED: Record<string, string> = {
  "#638bd5": "#3b82f6",
  "#50a064": "#16a34a",
  "#987aca": "#8b5cf6",
  "#ba7e2d": "#f59e0b",
  "#cb6d67": "#ef4444",
  "#c26c96": "#ec4899",
  "#00a39c": "#14b8a6",
  "#838d9c": "#6b7280",
};

/** The colour to draw for a group's stored colour. */
export function groupColor(color: string | undefined): string {
  if (!color) return DEFAULT_COLOR;
  return MUTED[color.toLowerCase()] ?? color;
}
