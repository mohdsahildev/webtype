import assert from 'node:assert';
import * as THREE from 'three';

// 1. Centralized Difficulty & Config Verification
import { DIFFICULTY_CONFIG, getTargetSpeedMultiplier, getDifficultyLevel } from '../lib/game/difficulty.ts';
import { GAME_CONFIG } from '../lib/game/game-config.ts';
import { GameRuntime } from '../lib/game/game-state.ts';

console.log('--- STARTING WEBTYPE DIFFICULTY & ACCURACY VERIFICATION ---');

// Test 1: Speed Tiers and Caps
console.log('[Test 1] Testing Speed Tiers & Caps...');
assert.strictEqual(getTargetSpeedMultiplier(0), 1.00);
assert.strictEqual(getTargetSpeedMultiplier(3), 1.00);
assert.strictEqual(getTargetSpeedMultiplier(4), 1.15);
assert.strictEqual(getTargetSpeedMultiplier(6), 1.15);
assert.strictEqual(getTargetSpeedMultiplier(7), 1.30);
assert.strictEqual(getTargetSpeedMultiplier(10), 1.30);
assert.strictEqual(getTargetSpeedMultiplier(11), 1.50);
assert.strictEqual(getTargetSpeedMultiplier(15), 1.50);
assert.strictEqual(getTargetSpeedMultiplier(16), 1.70);
assert.strictEqual(getTargetSpeedMultiplier(20), 1.70);
assert.strictEqual(getTargetSpeedMultiplier(21), 1.90);
assert.strictEqual(getTargetSpeedMultiplier(50), 1.90);
console.log('✓ Speed tiers pass correctly.');

// Test 2: Difficulty Levels
console.log('[Test 2] Testing Difficulty Levels...');
assert.strictEqual(getDifficultyLevel(0), 1);
assert.strictEqual(getDifficultyLevel(3), 1);
assert.strictEqual(getDifficultyLevel(5), 2);
assert.strictEqual(getDifficultyLevel(8), 3);
assert.strictEqual(getDifficultyLevel(12), 4);
assert.strictEqual(getDifficultyLevel(18), 5);
assert.strictEqual(getDifficultyLevel(25), 6);
console.log('✓ Difficulty levels pass correctly.');

// Test 3: Unique First Letter and Word Bank Fairness
console.log('[Test 3] Testing Unique First Letters in Generated Challenges...');
for (let level = 1; level <= 6; level++) {
  const runtime = new GameRuntime();
  runtime.completedCount = level * 3;
  runtime.spawnNextChallenge();
  const challenge = runtime.currentChallenge;
  assert.ok(challenge, 'Challenge must exist');
  assert.ok(challenge.anchors.length >= 2, 'Anchors count must be >= 2');
  
  const initials = challenge.anchors.map(a => a.word[0]);
  const uniqueInitials = new Set(initials);
  assert.strictEqual(initials.length, uniqueInitials.size, `Anchors at level ${level} must have unique initials`);
}
console.log('✓ Unique first letters guaranteed across all difficulty levels.');

// Test 4: Accuracy Grace Period (No failure before minAttempts or minCompletedWords)
console.log('[Test 4] Testing Accuracy Grace Period (< 30 attempts)...');
{
  const runtime = new GameRuntime();
  runtime.setStatus('falling');
  const usedInitials = new Set(runtime.currentChallenge.anchors.map(a => a.word[0]));
  const nonMatchingChar = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'].find(c => !usedInitials.has(c));
  
  // Make 25 wrong keystrokes (attempts = 25, correct = 0, acc = 0%)
  for (let i = 0; i < 25; i++) {
    runtime.handleKeyPress(nonMatchingChar);
  }
  assert.strictEqual(runtime.totalAttemptedChars, 25);
  assert.strictEqual(runtime.totalCorrectChars, 0);
  assert.notStrictEqual(runtime.status, 'dead', 'Must NOT trigger game over before minAttempts');
  const stats = runtime.getStats();
  assert.strictEqual(stats.accuracy, 0);
}
console.log('✓ Accuracy grace period passes.');

// Test 5: Accuracy Warning (<= 80%)
console.log('[Test 5] Testing Accuracy Warning (<= 80%)...');
{
  const runtime = new GameRuntime();
  runtime.setStatus('falling');
  runtime.totalAttemptedChars = 40;
  runtime.totalCorrectChars = 32; // 32/40 = 80.0%
  const stats = runtime.getStats();
  assert.strictEqual(stats.accuracy, 80.0);
  assert.strictEqual(stats.isAccuracyWarning, true, 'Warning must be true when acc <= 80%');
}
console.log('✓ Accuracy warning threshold passes.');

// Test 6: Strict Accuracy Failure (< 75.0% fails, exactly 75.0% survives once threshold met)
console.log('[Test 6] Testing Strict Accuracy Failure (< 75% fails, 75.0% survives)...');
{
  const runtime = new GameRuntime();
  runtime.setStatus('falling');
  runtime.completedCount = 5;
  runtime.totalAttemptedChars = 40;
  runtime.totalCorrectChars = 30; // 30/40 = 75.0% -> ALIVE

  const anchor = runtime.currentChallenge.anchors[0];
  runtime.currentChallenge.selectedAnchorId = anchor.id;
  anchor.state = 'selected';
  runtime.currentChallenge.typedIndex = 1;

  // Typo: 30/41 = 73.2% -> STRICTLY < 75.0% -> GAME OVER with ACCURACY reason!
  runtime.handleKeyPress('Q'); // non-matching char
  assert.strictEqual(runtime.status, 'deathSequence', 'Accuracy < 75% must trigger deathSequence state');
  assert.strictEqual(runtime.gameOverInfo.reason, 'ACCURACY');
  assert.strictEqual(runtime.gameOverInfo.title, 'ACCURACY TOO LOW');
  
  // Advance death sequence to completion
  runtime.updateDeathSequence(1.5);
  assert.strictEqual(runtime.status, 'dead', 'Completing death sequence transitions to dead state');
  console.log('Game over info detail:', runtime.gameOverInfo.detail);
}
console.log('✓ Strict accuracy failure threshold passes.');

// Test 7: Streak Tracking and Progression
console.log('[Test 7] Testing Streak Tracking...');
{
  const runtime = new GameRuntime();
  runtime.setStatus('falling');
  assert.strictEqual(runtime.streak, 0);

  // Complete challenge 1
  const a1 = runtime.currentChallenge.anchors[0];
  for (const c of a1.word) {
    runtime.handleKeyPress(c);
  }
  assert.strictEqual(runtime.streak, 1);
  assert.strictEqual(runtime.maxStreak, 1);

  // Traversal finishes
  runtime.updateTraversal(10.0);
  assert.strictEqual(runtime.status, 'falling');

  // Complete challenge 2
  const a2 = runtime.currentChallenge.anchors[0];
  for (const c of a2.word) {
    runtime.handleKeyPress(c);
  }
  assert.strictEqual(runtime.streak, 2);
  assert.strictEqual(runtime.maxStreak, 2);

  // On game over, current streak resets to 0, maxStreak is preserved
  runtime.triggerGameOver('FALL', 'ALTITUDE LOSS', 'Descended below city threshold');
  assert.strictEqual(runtime.streak, 0);
  assert.strictEqual(runtime.maxStreak, 2);
}
console.log('✓ Streak progression passes.');

// Test 8: Game Over Reasons
console.log('[Test 8] Testing Game Over Reasons...');
{
  const runtime = new GameRuntime();
  runtime.triggerGameOver('FALL', 'ALTITUDE LOSS', 'Descended below city threshold');
  assert.strictEqual(runtime.gameOverInfo.reason, 'FALL');

  const runtime2 = new GameRuntime();
  runtime2.triggerGameOver('ANCHORS_EXPIRED', 'ANCHOR EXPIRED', 'Missed target anchor');
  assert.strictEqual(runtime2.gameOverInfo.reason, 'ANCHORS_EXPIRED');

  const runtime3 = new GameRuntime();
  runtime3.triggerGameOver('ACCURACY', 'ACCURACY TOO LOW', '88.5% ACCURACY');
  assert.strictEqual(runtime3.gameOverInfo.reason, 'ACCURACY');
}
console.log('✓ Game over reasons pass.');

// Test 9: Smooth Speed Multiplier Interpolation
console.log('[Test 9] Testing Smooth Speed Multiplier Interpolation...');
{
  const runtime = new GameRuntime();
  runtime.setStatus('falling');
  runtime.completedCount = 5; // Target tier speed is 1.15x
  assert.strictEqual(runtime.currentSpeedMultiplier, 1.00);

  runtime.updatePacing(0.5); // dt = 0.5s
  assert.ok(runtime.currentSpeedMultiplier > 1.00, 'Speed must smoothly increase');
  assert.ok(runtime.currentSpeedMultiplier <= 1.15, 'Speed must not exceed target tier');

  // After enough time, speed reaches target tier
  runtime.updatePacing(2.0);
  assert.ok(Math.abs(runtime.currentSpeedMultiplier - 1.15) < 0.01, 'Speed reaches target tier');
}
console.log('✓ Smooth speed multiplier interpolation passes.');

console.log('--- ALL DIFFICULTY & ACCURACY VERIFICATION TESTS PASSED SUCCESSFULLY! ---');
