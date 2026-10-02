export type GameOverReason = 'FALL' | 'ANCHORS_EXPIRED' | 'ACCURACY';

export interface GameOverInfo {
  reason: GameOverReason;
  title: string;
  detail: string;
}

export const DIFFICULTY_CONFIG = {
  accuracy: {
    minAttempts: 40, // Extended sample size (~8-10 words) before accuracy failure can trigger
    minCompletedWords: 5, // Must complete at least 5 words to establish full run rhythm
    failThreshold: 75.0, // Strictly < 75.0% fails
    warningThreshold: 80.0, // <= 80.0% shows subtle HUD warning
  },
  wpm: {
    minCharacters: 5, // Minimum correct characters before displaying live calculated WPM
  },
  speed: {
    lerpSpeed: 2.2, // Rate per second of smooth speed multiplier interpolation
    maxMultiplier: 2.0,
    tiers: [
      { minCompleted: 0, maxCompleted: 3, multiplier: 1.00, level: 1 },
      { minCompleted: 4, maxCompleted: 6, multiplier: 1.15, level: 2 },
      { minCompleted: 7, maxCompleted: 10, multiplier: 1.30, level: 3 },
      { minCompleted: 11, maxCompleted: 15, multiplier: 1.50, level: 4 },
      { minCompleted: 16, maxCompleted: 20, multiplier: 1.70, level: 5 },
      { minCompleted: 21, maxCompleted: Infinity, multiplier: 1.90, level: 6 },
    ],
  },
  challengeRules: {
    // Challenge anchor & word configuration based on level
    1: {
      minAnchors: 2,
      maxAnchors: 2,
      baseDistMin: 44,
      baseDistMax: 48,
      gapMin: 16,
      gapMax: 20,
      wordTiers: ['short', 'short', 'medium'] as ('short' | 'medium' | 'long')[],
    },
    2: {
      minAnchors: 2,
      maxAnchors: 3,
      baseDistMin: 44,
      baseDistMax: 48,
      gapMin: 15,
      gapMax: 19,
      wordTiers: ['short', 'medium', 'medium'] as ('short' | 'medium' | 'long')[],
    },
    3: {
      minAnchors: 3,
      maxAnchors: 3,
      baseDistMin: 46,
      baseDistMax: 50,
      gapMin: 15,
      gapMax: 18,
      wordTiers: ['medium', 'medium', 'long'] as ('short' | 'medium' | 'long')[],
    },
    4: {
      minAnchors: 3,
      maxAnchors: 4,
      baseDistMin: 48,
      baseDistMax: 54,
      gapMin: 16,
      gapMax: 19,
      wordTiers: ['medium', 'long', 'long'] as ('short' | 'medium' | 'long')[],
    },
    5: {
      minAnchors: 3,
      maxAnchors: 4,
      baseDistMin: 50,
      baseDistMax: 56,
      gapMin: 16,
      gapMax: 20,
      wordTiers: ['medium', 'long', 'long'] as ('short' | 'medium' | 'long')[],
    },
    6: {
      minAnchors: 3,
      maxAnchors: 4,
      baseDistMin: 52,
      baseDistMax: 58,
      gapMin: 17,
      gapMax: 21,
      wordTiers: ['long', 'long', 'long'] as ('short' | 'medium' | 'long')[],
    },
  },
};

export function getTargetSpeedMultiplier(completedCount: number): number {
  for (const tier of DIFFICULTY_CONFIG.speed.tiers) {
    if (completedCount >= tier.minCompleted && completedCount <= tier.maxCompleted) {
      return Math.min(DIFFICULTY_CONFIG.speed.maxMultiplier, tier.multiplier);
    }
  }
  return 1.90;
}

export function getDifficultyLevel(completedCount: number): number {
  for (const tier of DIFFICULTY_CONFIG.speed.tiers) {
    if (completedCount >= tier.minCompleted && completedCount <= tier.maxCompleted) {
      return tier.level;
    }
  }
  return 6;
}
