import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Backend API base URL
export const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
