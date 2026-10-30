import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Cleans up a tag name typed by the user. A leading "@" is dropped since
 * export adds it; whitespace and inner "@" are rejected because Gherkin
 * would read "@smoke test" or "@a@b" back as two tags.
 */
export function normalizeTagName(raw: string): {
  name: string;
  error?: string;
} {
  const name = raw.trim().replace(/^@+/, "");
  if (!name) return { name, error: "Tag name can't be empty" };
  if (/\s/.test(name)) {
    return { name, error: "Tag names can't contain spaces" };
  }
  if (name.includes("@")) {
    return { name, error: "Only a leading @ is allowed" };
  }
  return { name };
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}
