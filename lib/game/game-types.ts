export type GameStatus = 'loading' | 'menu' | 'intro' | 'falling' | 'traversing' | 'deathSequence' | 'dead';

export type ChallengeSide = 'left' | 'right';

export type AnchorFormation =
  | 'LEFT_ONLY'
  | 'RIGHT_ONLY'
  | 'BALANCED'
  | 'LEFT_HEAVY'
  | 'RIGHT_HEAVY'
  | 'ALTERNATING'
  | 'WIDE_SPLIT'
  | 'MIXED_RANDOM';

export type AnchorState = 'available' | 'selected' | 'expired' | 'completed';

export interface AnchorData {
  id: string;
  side: ChallengeSide;
  position: [number, number, number];
  word: string;
  distance: number;
  state: AnchorState;
}

export interface ActiveChallenge {
  id: string;
  anchors: AnchorData[];
  selectedAnchorId: string | null;
  typedIndex: number;
  isCompleted: boolean;
  hasError?: boolean;
  mistakeCount?: number;
  difficultyLevel?: number;
  completedCount?: number;
  typingEstimateSec?: number;
  availableTimeSec?: number;
  isFair?: boolean;
  formation?: AnchorFormation;
}

export interface TraversalData {
  side: ChallengeSide;
  startPos: [number, number, number];
  anchorPos: [number, number, number];
  targetPos: [number, number, number];
  elapsed: number;
  duration: number;
  progress: number;
  webAttached: boolean;
}

export type GameOverReason = 'FALL' | 'ANCHORS_EXPIRED' | 'ACCURACY';

export interface NewRecordsInfo {
  isNewHighScore: boolean;
  isNewBestWpm: boolean;
  isNewBestAccuracy: boolean;
  isNewLongestStreak: boolean;
  isNewLongestDistance: boolean;
  isNewMostWords: boolean;
  hasAnyRecord: boolean;
  achievedRecordLabels: string[];
}

export interface GameOverInfo {
  reason: GameOverReason;
  title: string;
  detail: string;
  newRecords?: NewRecordsInfo;
}

export interface TypingStats {
  score: number;
  lastScoreDelta: number;
  wpm: number;
  displayedWpm: string | number;
  accuracy: number;
  isAccuracyWarning: boolean;
  streak: number;
  maxStreak: number;
  completedWords: number;
  correctCharacters: number;
  incorrectCharacters: number;
  totalAttemptedCharacters: number;
  activeTypingTime: number;
  elapsedRunTime: number;
  currentSpeedMultiplier: number;
  maxSpeedReached: number;
  distanceTraveled: number;
  gameOverInfo: GameOverInfo | null;
  newRecords?: NewRecordsInfo;
  // Aliases
  totalCorrectChars: number;
  totalAttemptedChars: number;
}
