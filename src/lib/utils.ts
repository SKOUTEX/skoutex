import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function extractSource(annotation: string): string {
  const pattern = /【(\d+):(\d+)†/;
  const match = annotation.match(pattern);

  if (match) {
    // const chapter = match[1];
    const verse = match[2];
    return `[${verse}]`;
  }

  return "Invalid annotation format";
}

export function removeFileExtensionAndAddLink(filename: string): string {
  const backUrl = filename.replace(/\.[^/.]+$/, "").split("__")[1];

  return `https://silvio.meira.com/${backUrl}`;
}
