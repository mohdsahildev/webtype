/**
 * Scoring Module for WebType
 *
 * Scoring Philosophy:
 * 1. Base Word Score: 100 points per successfully completed word challenge.
 * 2. Character Score: 15 points per character in the completed word.
 * 3. Streak Multiplier: Consecutive words increase score reward (+10% per streak level, capped at 2.0x / +100%).
 * 4. Speed Multiplier: Running at higher speed tiers gives a bonus (1.0 + (speedMult - 1.0) * 0.5).
 * 5. Accuracy Factor: High accuracy provides up to +5% bonus, while low accuracy scales down to 0.75x.
 * 6. Distance Points: 1 point per 2 meters traveled (0.5 pts/m).
 *
 * All formulas are deterministic and produce safe integer results.
 */

export interface ScoreBreakdown {
  baseWordScore: number;
  charScore: number;
  streakBonus: number;
  speedMultiplier: number;
  accuracyFactor: number;
  totalWordPoints: number;
}

/**
 * Calculates the score awarded for completing a single word challenge.
 */
export function calculateWordScore(
  wordLength: number,
  currentStreak: number,
  speedMultiplier: number,
  currentAccuracy: number
): ScoreBreakdown {
  const BASE_WORD_POINTS = 100;
  const CHAR_POINTS = 15;

  const rawBase = BASE_WORD_POINTS;
  const rawChar = Math.max(0, wordLength) * CHAR_POINTS;
  const subtotal = rawBase + rawChar;

  // Streak bonus: 1.0x at 0-1 streak, up to 2.0x at 10+ streak
  const streakBonus = Math.min(2.0, Math.max(1.0, 1.0 + Math.max(0, currentStreak - 1) * 0.10));

  // Speed bonus: 1.0x at 1.0 speed, 1.25x at 1.5 speed, 1.5x at 2.0 speed
  const safeSpeed = Math.max(1.0, speedMultiplier || 1.0);
  const speedBonus = 1.0 + (safeSpeed - 1.0) * 0.5;

  // Accuracy factor: 75% -> 0.75x, 90% -> 0.95x, 100% -> 1.05x
  const safeAcc = Math.max(0, Math.min(100, currentAccuracy || 100));
  const accuracyFactor = Math.max(0.75, Math.min(1.05, 0.75 + (safeAcc - 75) * (0.30 / 25)));

  const total = Math.round(subtotal * streakBonus * speedBonus * accuracyFactor);

  return {
    baseWordScore: rawBase,
    charScore: rawChar,
    streakBonus: Math.round(streakBonus * 100) / 100,
    speedMultiplier: Math.round(speedBonus * 100) / 100,
    accuracyFactor: Math.round(accuracyFactor * 100) / 100,
    totalWordPoints: Math.max(10, total),
  };
}

/**
 * Calculates distance points (1 point per 2 meters traveled).
 */
export function calculateDistanceScore(distanceMeters: number): number {
  if (!distanceMeters || distanceMeters <= 0 || !Number.isFinite(distanceMeters)) {
    return 0;
  }
  return Math.floor(distanceMeters * 0.5);
}

/**
 * Formats a score with comma separators (e.g. 1,240).
 */
export function formatScore(score: number): string {
  if (!score || !Number.isFinite(score)) return '0';
  return Math.floor(score).toLocaleString('en-US');
}

/**
 * Formats distance meters into readable units (e.g. 450m, 1.2K, 18.4K).
 */
export function formatDistance(meters: number): string {
  if (!meters || !Number.isFinite(meters) || meters <= 0) return '0m';
  const m = Math.floor(meters);
  if (m < 1000) {
    return `${m}m`;
  }
  const km = (m / 1000).toFixed(1);
  return `${km}K`;
}
