import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const dateFormat = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormat.format(date);
}

/** Last path segment of an S3 key, ignoring a trailing slash. */
export function baseName(key: string): string {
  const trimmed = key.endsWith("/") ? key.slice(0, -1) : key;
  return trimmed.slice(trimmed.lastIndexOf("/") + 1) || trimmed;
}

/** Parent prefix of a prefix or key ("a/b/c/" → "a/b/"). */
export function parentPrefix(prefix: string): string {
  const trimmed = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
  const index = trimmed.lastIndexOf("/");
  return index === -1 ? "" : trimmed.slice(0, index + 1);
}

export function errorMessage(error: unknown, fallback = "Something went wrong."): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
