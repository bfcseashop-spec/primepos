import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Returns "Male" or "Female" for common inputs; otherwise capitalized first letter. */
export function capitalizeGender(g: string | null | undefined): string {
  if (!g) return "-";
  const s = String(g).toLowerCase();
  if (s === "male") return "Male";
  if (s === "female") return "Female";
  return s.charAt(0).toUpperCase() + s.slice(1);
}
