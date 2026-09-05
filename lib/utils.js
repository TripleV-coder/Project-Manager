// @ts-nocheck -- TODO(S2-#11): migrate to .ts with proper types
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS class names with conflict resolution.
 * @param {...(string | undefined | null | false | Record<string, boolean>)} inputs - Class values or conditional objects
 * @returns {string} Merged class string
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Safely extract array data from an API response.
 * Handles multiple response formats: raw array, { data: [...] }, { tasks: [...] }, etc.
 * @param {any} response - The parsed JSON response
 * @param {string[]} keys - Property names to check, in order of preference
 * @returns {any[]} The extracted array, or empty array if not found
 */
export function extractApiData(response, keys = ['data']) {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  const lookupKeys = Array.isArray(keys) ? [...keys] : [keys];
  if (!lookupKeys.includes('data')) lookupKeys.push('data');
  for (const key of lookupKeys) {
    if (key && response[key] && Array.isArray(response[key])) {
      return response[key];
    }
  }
  return [];
}

/**
 * Extract a single record from mixed API envelopes ({ project }, { data }, raw doc).
 * @param {any} response
 * @param {string[]} keys
 * @returns {object|null}
 */
export function extractApiRecord(response, keys = ['data']) {
  if (!response || typeof response !== 'object' || Array.isArray(response)) return null;
  if (response._id || response.id) return response;
  const lookupKeys = Array.isArray(keys) ? [...keys] : [keys];
  if (!lookupKeys.includes('data')) lookupKeys.push('data');
  for (const key of lookupKeys) {
    const value = key && response[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value;
    }
  }
  return null;
}
