import assert from 'node:assert';
import { calculateWordScore, calculateDistanceScore, formatScore, formatDistance } from '../lib/game/scoring.ts';
import {
  DEFAULT_PERSONAL_RECORDS,
  evaluateAndSaveRunRecords,
  getPersonalRecords,
  savePersonalRecords,
  RECORDS_STORAGE_KEY,
} from '../lib/game/records.ts';
import { GameRuntime } from '../lib/game/game-state.ts';

console.log('=== RUNNING WEBTYPE SCORING & PERSONAL RECORDS TEST SUITE ===\n');

// Mock localStorage for Node environment testing
const storage = new Map();
global.window = {
  localStorage: {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, val) => storage.set(key, String(val)),
    removeItem: (key) => storage.delete(key),
    clear: () => storage.clear(),
  },
};

// =========================================================================
// TEST 1: Deterministic Word Scoring Calculation
// =========================================================================
console.log('[Test 1] Testing Deterministic Scoring Formulas...');
{
  // 4-letter word at streak 1, speed 1.0, 100% accuracy
  // Base: 100, Char: 4*15=60, Subtotal: 160. Streak bonus: 1.0x, Speed bonus: 1.0x, Acc factor: 1.05x -> 160 * 1.05 = 168
  const score1 = calculateWordScore(4, 1, 1.0, 100);
  assert.strictEqual(score1.baseWordScore, 100);
  assert.strictEqual(score1.charScore, 60);
  assert.strictEqual(score1.totalWordPoints, 168);

  // 6-letter word at streak 6 (+50% streak bonus), speed 1.5 (+25% speed bonus), 100% accuracy
  // Subtotal: 100 + 90 = 190. Streak: 1.5x, Speed: 1.25x, Acc: 1.05x -> 190 * 1.5 * 1.25 * 1.05 = 374.06 -> 374
  const score2 = calculateWordScore(6, 6, 1.5, 100);
  assert.strictEqual(score2.totalWordPoints, 374);

  // High streak cap test (streak 20 -> capped at 2.0x)
  const scoreCap = calculateWordScore(5, 20, 2.0, 100);
  assert.strictEqual(scoreCap.streakBonus, 2.0);

  // Distance scoring: 500m -> 250 pts, 1200m -> 600 pts
  assert.strictEqual(calculateDistanceScore(500), 250);
  assert.strictEqual(calculateDistanceScore(1200), 600);
  assert.strictEqual(calculateDistanceScore(0), 0);
  assert.strictEqual(calculateDistanceScore(-50), 0);

  // Formatting helpers
  assert.strictEqual(formatScore(12450), '12,450');
  assert.strictEqual(formatDistance(450), '450m');
  assert.strictEqual(formatDistance(18400), '18.4K');

  console.log('✓ Scoring mathematics verified.\n');
}

// =========================================================================
// TEST 2: Personal Records Persistence & Evaluation
// =========================================================================
console.log('[Test 2] Testing Personal Records Persistence & Evaluation...');
{
  global.window.localStorage.clear();

  // Run 1: 500 score, 65 WPM, 95% Acc, Streak 4, Dist 300m, 5 Words
  const stats1 = {
    wpm: 65,
    displayedWpm: 65,
    accuracy: 95,
    isAccuracyWarning: false,
    streak: 4,
    maxStreak: 4,
    completedWords: 5,
    correctCharacters: 25,
    incorrectCharacters: 1,
    totalAttemptedCharacters: 26,
    activeTypingTime: 4.5,
    elapsedRunTime: 12.0,
    currentSpeedMultiplier: 1.0,
    maxSpeedReached: 1.1,
    distanceTraveled: 300,
    gameOverInfo: null,
    totalCorrectChars: 25,
    totalAttemptedChars: 26,
    score: 500,
    lastScoreDelta: 100,
  };

  const res1 = evaluateAndSaveRunRecords(stats1, 500);
  assert.strictEqual(res1.newRecords.isNewHighScore, true);
  assert.strictEqual(res1.newRecords.isNewBestWpm, true);
  assert.strictEqual(res1.newRecords.isNewBestAccuracy, true);
  assert.strictEqual(res1.newRecords.isNewLongestStreak, true);
  assert.strictEqual(res1.newRecords.isNewLongestDistance, true);
  assert.strictEqual(res1.newRecords.isNewMostWords, true);
  assert.strictEqual(res1.newRecords.hasAnyRecord, true);
  assert.strictEqual(res1.updatedRecords.highestScore, 500);
  assert.strictEqual(res1.updatedRecords.bestWpm, 65);
  assert.strictEqual(res1.updatedRecords.totalRuns, 1);

  // Run 2: Higher score (800) and higher streak (7), but lower WPM (55)
  const stats2 = {
    ...stats1,
    wpm: 55,
    accuracy: 92,
    maxStreak: 7,
    completedWords: 8,
    distanceTraveled: 250,
  };

  const res2 = evaluateAndSaveRunRecords(stats2, 800);
  assert.strictEqual(res2.newRecords.isNewHighScore, true, 'High score broken');
  assert.strictEqual(res2.newRecords.isNewBestWpm, false, 'WPM not broken');
  assert.strictEqual(res2.newRecords.isNewLongestStreak, true, 'Streak broken');
  assert.strictEqual(res2.newRecords.isNewLongestDistance, false, 'Distance not broken');
  assert.strictEqual(res2.newRecords.isNewMostWords, true, 'Words broken');
  assert.strictEqual(res2.updatedRecords.highestScore, 800);
  assert.strictEqual(res2.updatedRecords.bestWpm, 65, 'Best WPM retained from Run 1');
  assert.strictEqual(res2.updatedRecords.longestStreak, 7);
  assert.strictEqual(res2.updatedRecords.totalRuns, 2);

  console.log('✓ Multi-record evaluation and selective updates verified.\n');
}

// =========================================================================
// TEST 3: Corrupted LocalStorage & SSR Fallback Safety
// =========================================================================
console.log('[Test 3] Testing Storage Error & Corrupted Data Handling...');
{
  // Malformed JSON in localStorage
  storage.set(RECORDS_STORAGE_KEY, '{ invalid_json_syntax: [');
  const fallbackRecords = getPersonalRecords();
  assert.strictEqual(fallbackRecords.highestScore, 0);
  assert.strictEqual(fallbackRecords.totalRuns, 0);

  // SSR Environment (window = undefined)
  const backup = global.window;
  delete global.window;
  const ssrRecords = getPersonalRecords();
  assert.strictEqual(ssrRecords.highestScore, 0);
  global.window = backup;

  console.log('✓ Storage failure resistance and fallback safety verified.\n');
}

// =========================================================================
// TEST 4: Full GameRuntime Integration & Reset Lifecycle
// =========================================================================
console.log('[Test 4] Testing GameRuntime Live Scoring & Reset Lifecycle...');
{
  const runtime = new GameRuntime();
  runtime.status = 'falling';
  runtime.spawnNextChallenge();

  const challenge = runtime.currentChallenge;
  assert.ok(challenge, 'Active challenge exists');
  const anchor = challenge.anchors[0];

  assert.strictEqual(runtime.score, 0, 'Initial score must be 0');

  // Complete first word challenge
  for (const char of anchor.word) {
    runtime.handleKeyPress(char);
  }

  assert.ok(runtime.score > 100, 'Score should increase after word completion');
  assert.ok(runtime.lastScoreDelta > 100, 'Last score delta should reflect word score');
  assert.strictEqual(runtime.completedCount, 1);
  assert.strictEqual(runtime.streak, 1);

  // Trigger game over and verify record persistence
  runtime.triggerGameOver('FALL', 'ALTITUDE LOSS', 'Descended below city');
  assert.ok(runtime.gameOverInfo.newRecords, 'New records info attached to game over info');
  assert.strictEqual(runtime.gameOverInfo.newRecords.hasAnyRecord, true);

  // Restart game: score resets to 0, records persist
  runtime.reset();
  assert.strictEqual(runtime.score, 0, 'Score must reset to 0 upon game restart');
  assert.strictEqual(runtime.completedCount, 0);
  assert.strictEqual(runtime.streak, 0);

  const persisted = getPersonalRecords();
  assert.ok(persisted.highestScore > 0, 'Persisted high score must survive runtime reset');

  console.log('✓ GameRuntime live scoring and safe reset verified.\n');
}

console.log('=== ALL SCORING & PERSONAL RECORDS TESTS PASSED! ===');
