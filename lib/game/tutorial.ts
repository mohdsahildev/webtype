/**
 * Tutorial State & Persistence Module for WebType
 *
 * Manages first-time player detection, contextual hints, step tracking,
 * and localStorage persistence ('webtype-tutorial-v1').
 */

export const TUTORIAL_STORAGE_KEY = 'webtype-tutorial-v1';

export type TutorialStep =
  | 'INACTIVE'
  | 'FIRST_WORD'
  | 'FIRST_LOCKED'
  | 'FIRST_TRAVERSING'
  | 'MULTI_ANCHOR'
  | 'MULTI_LOCKED'
  | 'EXPIRATION'
  | 'ACCURACY'
  | 'SPEED'
  | 'COMPLETED';

export interface TutorialHintData {
  title: string;
  subtitle?: string;
  badge?: string;
  durationMs?: number;
}

export interface TutorialStorageData {
  completed: boolean;
  lastCompletedAt?: number;
}

/**
 * Safely checks if player has completed the interactive tutorial.
 */
export function getTutorialCompleted(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    const raw = window.localStorage.getItem(TUTORIAL_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Boolean(parsed?.completed);
  } catch (err) {
    console.warn('[WebType Tutorial] Failed to read tutorial storage:', err);
    return false;
  }
}

/**
 * Safely stores tutorial completion state in localStorage.
 */
export function setTutorialCompleted(completed: boolean): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    const data: TutorialStorageData = {
      completed,
      lastCompletedAt: completed ? Date.now() : undefined,
    };
    window.localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    console.warn('[WebType Tutorial] Failed to save tutorial storage:', err);
    return false;
  }
}
