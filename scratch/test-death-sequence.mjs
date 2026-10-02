import assert from 'node:assert';
import * as THREE from 'three';
import { GameRuntime } from '../lib/game/game-state.ts';
import { GAME_CONFIG } from '../lib/game/game-config.ts';

console.log('=== RUNNING COMPREHENSIVE DEATH SEQUENCE TEST SUITE ===\n');

// -------------------------------------------------------------
// TEST 1: ALTITUDE LOSS / FALL FAILURE
// -------------------------------------------------------------
console.log('[TEST 1] Testing Altitude Loss (Fall) Failure Sequence...');
{
  const runtime = new GameRuntime();
  runtime.setStatus('falling');
  runtime.playerPosition.set(0, 16.5, -50);

  // Simulate falling down
  while (runtime.playerPosition.y > GAME_CONFIG.movement.failureHeight) {
    runtime.playerPosition.y -= GAME_CONFIG.movement.fallSpeed * 0.016;
  }
  // Check failure condition
  if (runtime.playerPosition.y <= GAME_CONFIG.movement.failureHeight) {
    runtime.playerPosition.y = GAME_CONFIG.movement.failureHeight;
    runtime.triggerGameOver('FALL', 'ALTITUDE LOSS', 'Descended below city threshold');
  }

  // 1. Immediately after trigger:
  assert.strictEqual(runtime.status, 'deathSequence', 'Status must be deathSequence immediately upon failure');
  assert.strictEqual(runtime.gameOverInfo.reason, 'FALL', 'Reason must be FALL');
  assert.strictEqual(runtime.streak, 0, 'Current streak resets to 0');
  assert.strictEqual(runtime.isChallengeAttemptActive, false, 'Challenge attempt must be deactivated');

  // 2. Step through Phase 1 (Fall phase, 0.0s -> 0.55s)
  const dt = 0.016;
  let time = 0;
  while (time < 0.55) {
    runtime.updateDeathSequence(dt);
    time += dt;
    assert.strictEqual(runtime.status, 'deathSequence', 'Must stay in deathSequence during fall');
  }

  // 3. Step through Phase 2 (Impact frame at ~0.55s)
  runtime.updateDeathSequence(dt);
  assert.strictEqual(runtime.playerPosition.y, GAME_CONFIG.movement.failureHeight + 0.9, 'Character Y must reach ground landing height (0.9)');
  assert.ok(runtime.cameraShakeIntensity > 0, 'Camera shake must be triggered on impact');

  // 4. Step through Phase 3 (Recovery hold) & Phase 4 (Completion)
  while (runtime.status === 'deathSequence') {
    runtime.updateDeathSequence(dt);
  }

  assert.strictEqual(runtime.status, 'dead', 'Must transition to dead after full death sequence');
  assert.strictEqual(runtime.cameraShakeIntensity, 0, 'Camera shake must be zeroed');
  assert.strictEqual(runtime.gameOverInfo.reason, 'FALL', 'Reason must be preserved in dead state');

  // 5. Test Restart
  runtime.reset();
  assert.strictEqual(runtime.status, 'falling', 'Restart sets status to falling');
  assert.strictEqual(runtime.gameOverInfo, null, 'Game over info reset to null');
  assert.strictEqual(runtime.playerPosition.y, GAME_CONFIG.movement.initialPosition[1], 'Player Y reset to initial position');
  console.log('✓ Altitude Failure Sequence verified successfully.\n');
}

// -------------------------------------------------------------
// TEST 2: ANCHOR EXPIRATION FAILURE
// -------------------------------------------------------------
console.log('[TEST 2] Testing Anchor Expiration Failure Sequence...');
{
  const runtime = new GameRuntime();
  runtime.setStatus('falling');
  const challenge = runtime.currentChallenge;
  assert.ok(challenge, 'Challenge must exist');

  // Expire all anchors
  challenge.anchors.forEach(a => { a.state = 'expired'; });
  runtime.triggerGameOver('ANCHORS_EXPIRED', 'ALL ANCHORS EXPIRED', 'All available anchors passed out of reach');

  assert.strictEqual(runtime.status, 'deathSequence');
  assert.strictEqual(runtime.gameOverInfo.reason, 'ANCHORS_EXPIRED');

  // Advance sequence
  runtime.updateDeathSequence(1.5);
  assert.strictEqual(runtime.status, 'dead');
  assert.strictEqual(runtime.gameOverInfo.reason, 'ANCHORS_EXPIRED');
  console.log('✓ Anchor Expiration Failure Sequence verified successfully.\n');
}

// -------------------------------------------------------------
// TEST 3: ACCURACY FAILURE (< 75%)
// -------------------------------------------------------------
console.log('[TEST 3] Testing Accuracy Failure (< 75%) Sequence...');
{
  const runtime = new GameRuntime();
  runtime.setStatus('falling');
  runtime.completedCount = 5;
  runtime.totalAttemptedChars = 40;
  runtime.totalCorrectChars = 30; // 75.0%

  // Lock an anchor
  const anchor = runtime.currentChallenge.anchors[0];
  runtime.currentChallenge.selectedAnchorId = anchor.id;
  anchor.state = 'selected';
  runtime.currentChallenge.typedIndex = 1;

  // Typo to drop below 75%
  runtime.handleKeyPress('Q');
  assert.strictEqual(runtime.status, 'deathSequence');
  assert.strictEqual(runtime.gameOverInfo.reason, 'ACCURACY');
  assert.strictEqual(runtime.gameOverInfo.title, 'ACCURACY TOO LOW');

  // Advance sequence
  runtime.updateDeathSequence(1.5);
  assert.strictEqual(runtime.status, 'dead');
  assert.strictEqual(runtime.gameOverInfo.reason, 'ACCURACY');
  console.log('✓ Accuracy Failure Sequence verified successfully.\n');
}

// -------------------------------------------------------------
// TEST 4: FAILURE DURING TRAVERSAL
// -------------------------------------------------------------
console.log('[TEST 4] Testing Failure During Traversal...');
{
  const runtime = new GameRuntime();
  runtime.setStatus('falling');
  const anchor = runtime.currentChallenge.anchors[0];
  runtime.startTraversal(anchor);

  assert.strictEqual(runtime.status, 'traversing');
  assert.ok(runtime.traversal, 'Traversal must be active');
  assert.strictEqual(runtime.traversal.webAttached, true, 'Web must be attached');

  // Mid-traversal sudden failure (e.g. timeout / forced interrupt)
  runtime.triggerGameOver('FALL', 'TRAVERSAL INTERRUPTED', 'Lost grip mid-swing');

  assert.strictEqual(runtime.status, 'deathSequence', 'Status immediately enters deathSequence');
  assert.strictEqual(runtime.traversal, null, 'Traversal must be immediately cancelled');
  assert.strictEqual(runtime.currentChallenge.anchors.every(a => a.state === 'expired'), true, 'Anchors expired');

  // Player Y moves toward ground without teleporting Z
  const zBefore = runtime.playerPosition.z;
  runtime.updateDeathSequence(0.55);
  assert.strictEqual(runtime.playerPosition.y, GAME_CONFIG.movement.failureHeight + 0.9, 'Character reaches ground level');
  assert.ok(runtime.playerPosition.z <= zBefore, 'Z continues forward smoothly without resetting to origin');

  runtime.updateDeathSequence(1.0);
  assert.strictEqual(runtime.status, 'dead');
  console.log('✓ Traversal Interruption Failure Sequence verified successfully.\n');
}

// -------------------------------------------------------------
// TEST 5: NO INPUT ACCEPTED DURING DEATH SEQUENCE
// -------------------------------------------------------------
console.log('[TEST 5] Testing Input Rejection During Death Sequence...');
{
  const runtime = new GameRuntime();
  runtime.setStatus('falling');
  runtime.triggerGameOver('FALL', 'ALTITUDE LOSS', 'Descended below city threshold');

  assert.strictEqual(runtime.status, 'deathSequence');
  const attemptsBefore = runtime.totalAttemptedChars;
  runtime.handleKeyPress('A');
  runtime.handleKeyPress('B');
  runtime.handleKeyPress(' ');
  runtime.handleKeyPress('Enter');

  assert.strictEqual(runtime.totalAttemptedChars, attemptsBefore, 'No keystrokes must be registered during deathSequence');
  console.log('✓ Input rejection verified during death sequence.\n');
}

console.log('=== ALL 5 DEATH SEQUENCE INTEGRATION TESTS PASSED! ===');
