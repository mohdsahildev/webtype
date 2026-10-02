/**
 * Personal Records Persistence Module for WebType
 *
 * Persists personal best records in localStorage under a versioned key.
 * Robust against SSR, corrupted data, restricted private modes, and schema evolution.
 */

import { TypingStats } from './game-types';

export const RECORDS_STORAGE_KEY = 'webtype-records-v1';

export interface PersonalRecords {
  highestScore: number;
  bestWpm: number;
  bestAccuracy: number;
  longestStreak: number;
  longestDistance: number;
  mostWordsCompleted: number;
  totalRuns: number;
  lastUpdated: number;
}

export interface NewRecordsAchieved {
  isNewHighScore: boolean;
  isNewBestWpm: boolean;
  isNewBestAccuracy: boolean;
  isNewLongestStreak: boolean;
  isNewLongestDistance: boolean;
  isNewMostWords: boolean;
  hasAnyRecord: boolean;
  achievedRecordLabels: string[];
}

export const DEFAULT_PERSONAL_RECORDS: PersonalRecords = {
  highestScore: 0,
  bestWpm: 0,
  bestAccuracy: 0,
  longestStreak: 0,
  longestDistance: 0,
  mostWordsCompleted: 0,
  totalRuns: 0,
  lastUpdated: 0,
};

/**
 * Safely retrieves personal records from localStorage with fallback.
 */
export function getPersonalRecords(): PersonalRecords {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULT_PERSONAL_RECORDS };
  }

  try {
    const raw = window.localStorage.getItem(RECORDS_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_PERSONAL_RECORDS };
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { ...DEFAULT_PERSONAL_RECORDS };
    }

    return {
      highestScore: Math.max(0, Number(parsed.highestScore) || 0),
      bestWpm: Math.max(0, Number(parsed.bestWpm) || 0),
      bestAccuracy: Math.max(0, Math.min(100, Number(parsed.bestAccuracy) || 0)),
      longestStreak: Math.max(0, Number(parsed.longestStreak) || 0),
      longestDistance: Math.max(0, Number(parsed.longestDistance) || 0),
      mostWordsCompleted: Math.max(0, Number(parsed.mostWordsCompleted) || 0),
      totalRuns: Math.max(0, Number(parsed.totalRuns) || 0),
      lastUpdated: Number(parsed.lastUpdated) || Date.now(),
    };
  } catch (err) {
    console.warn('[WebType Records] Failed to read personal records from localStorage:', err);
    return { ...DEFAULT_PERSONAL_RECORDS };
  }
}

/**
 * Safely saves personal records to localStorage.
 */
export function savePersonalRecords(records: PersonalRecords): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    const cleanRecords: PersonalRecords = {
      highestScore: Math.max(0, Math.floor(records.highestScore || 0)),
      bestWpm: Math.max(0, Math.round((records.bestWpm || 0) * 10) / 10),
      bestAccuracy: Math.max(0, Math.min(100, Math.round((records.bestAccuracy || 0) * 10) / 10)),
      longestStreak: Math.max(0, Math.floor(records.longestStreak || 0)),
      longestDistance: Math.max(0, Math.floor(records.longestDistance || 0)),
      mostWordsCompleted: Math.max(0, Math.floor(records.mostWordsCompleted || 0)),
      totalRuns: Math.max(1, Math.floor(records.totalRuns || 1)),
      lastUpdated: Date.now(),
    };

    window.localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(cleanRecords));
    return true;
  } catch (err) {
    console.warn('[WebType Records] Failed to save personal records to localStorage:', err);
    return false;
  }
}

/**
 * Evaluates current run stats against existing personal records,
 * identifies all newly broken records, and writes updated records to storage.
 */
export function evaluateAndSaveRunRecords(
  stats: TypingStats,
  currentScore: number
): {
  previousRecords: PersonalRecords;
  updatedRecords: PersonalRecords;
  newRecords: NewRecordsAchieved;
} {
  const previous = getPersonalRecords();
  const updated = { ...previous };

  const finalScore = Math.max(0, Math.floor(currentScore || 0));
  const finalWpm = typeof stats.wpm === 'number' && Number.isFinite(stats.wpm) ? stats.wpm : 0;
  const finalAccuracy = Math.max(0, Math.min(100, stats.accuracy || 0));
  const finalStreak = Math.max(0, stats.maxStreak || 0);
  const finalDistance = Math.max(0, Math.floor(stats.distanceTraveled || 0));
  const finalWords = Math.max(0, stats.completedWords || 0);

  const labels: string[] = [];

  // 1. High Score Check
  const isNewHighScore = finalScore > previous.highestScore && finalScore > 0;
  if (isNewHighScore) {
    updated.highestScore = finalScore;
    labels.push('HIGH SCORE');
  }

  // 2. Best WPM Check (requires at least 1 completed word and valid WPM calculation)
  const isNewBestWpm = finalWords >= 1 && finalWpm > previous.bestWpm && finalWpm > 0;
  if (isNewBestWpm) {
    updated.bestWpm = Math.round(finalWpm * 10) / 10;
    labels.push('BEST WPM');
  }

  // 3. Best Accuracy Check (requires at least 3 completed words so 1-word 100% does not lock the record forever)
  const isNewBestAccuracy = finalWords >= 3 && finalAccuracy > previous.bestAccuracy && finalAccuracy > 0;
  if (isNewBestAccuracy) {
    updated.bestAccuracy = Math.round(finalAccuracy * 10) / 10;
    labels.push('BEST ACCURACY');
  }

  // 4. Longest Streak Check
  const isNewLongestStreak = finalStreak > previous.longestStreak && finalStreak > 0;
  if (isNewLongestStreak) {
    updated.longestStreak = finalStreak;
    labels.push('LONGEST STREAK');
  }

  // 5. Longest Distance Check
  const isNewLongestDistance = finalDistance > previous.longestDistance && finalDistance > 0;
  if (isNewLongestDistance) {
    updated.longestDistance = finalDistance;
    labels.push('LONGEST DISTANCE');
  }

  // 6. Most Words Completed Check
  const isNewMostWords = finalWords > previous.mostWordsCompleted && finalWords > 0;
  if (isNewMostWords) {
    updated.mostWordsCompleted = finalWords;
    labels.push('MOST WORDS');
  }

  updated.totalRuns = previous.totalRuns + 1;
  updated.lastUpdated = Date.now();

  const newRecords: NewRecordsAchieved = {
    isNewHighScore,
    isNewBestWpm,
    isNewBestAccuracy,
    isNewLongestStreak,
    isNewLongestDistance,
    isNewMostWords,
    hasAnyRecord: labels.length > 0,
    achievedRecordLabels: labels,
  };

  savePersonalRecords(updated);

  return {
    previousRecords: previous,
    updatedRecords: updated,
    newRecords,
  };
}
