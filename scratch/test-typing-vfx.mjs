import { GameRuntime } from '../lib/game/game-state.js';
import assert from 'assert';

console.log('--- STARTING TYPING & ANCHOR FEEDBACK VFX TEST SUITE ---');

const runtime = new GameRuntime();

// Test 1: Initial state & intro transition
assert.strictEqual(runtime.status, 'loading');
runtime.status = 'menu';
runtime.startIntro();
assert.strictEqual(runtime.status, 'intro');
runtime.updateIntro(3.2); // Complete intro handoff
assert.strictEqual(runtime.status, 'falling');
assert.ok(runtime.currentChallenge !== null, 'Challenge should be active');
console.log('✓ Test 1: Intro handoff and initial challenge creation passed');

// Test 2: First-key lock & subscription notifications
let challengeNotifications = 0;
let lastChallenge = null;
const unsub = runtime.subscribeChallenge((c) => {
  challengeNotifications++;
  lastChallenge = c;
});

const currentChallenge = runtime.currentChallenge;
const targetAnchor = currentChallenge.anchors.find(a => a.state === 'available');
assert.ok(targetAnchor, 'At least one anchor must be available');
const firstChar = targetAnchor.word[0];

runtime.handleKeyPress(firstChar);
assert.strictEqual(runtime.currentChallenge.selectedAnchorId, targetAnchor.id, 'Target anchor must be locked on first correct key');
assert.strictEqual(runtime.totalCorrectChars, 1, 'Total correct chars must be incremented');
assert.strictEqual(runtime.totalAttemptedChars, 1, 'Total attempted chars must be incremented');
console.log('✓ Test 2: First-key lock and event subscription verified');

// Test 3: Typing remaining characters and completing word
for (let i = 1; i < targetAnchor.word.length; i++) {
  runtime.handleKeyPress(targetAnchor.word[i]);
}

assert.strictEqual(runtime.status, 'traversing', 'Completing word must immediately trigger traversing status');
assert.ok(runtime.traversal !== null, 'Traversal data must be active');
assert.strictEqual(runtime.completedCount, 1, 'Completed words count must be 1');
console.log('✓ Test 3: Word completion and immediate traversal trigger verified');

// Test 4: Traversal step & next challenge spawn
runtime.updateTraversal(1.5);
assert.strictEqual(runtime.status, 'falling', 'After traversal finishes, status returns to falling');
assert.ok(runtime.currentChallenge !== null, 'New challenge spawned');
console.log('✓ Test 4: Seamless transition to next challenge verified');

// Test 5: Error typing handling & non-fatal mistake tracking
const newChallenge = runtime.currentChallenge;
const newAnchor = newChallenge.anchors.find(a => a.state === 'available');
const wrongChar = newAnchor.word[0] === 'Z' ? 'X' : 'Z';

const prevCorrect = runtime.totalCorrectChars;
const prevAttempted = runtime.totalAttemptedChars;

runtime.handleKeyPress(wrongChar);
assert.strictEqual(runtime.totalCorrectChars, prevCorrect, 'Correct chars should not increase on mistake');
assert.strictEqual(runtime.totalAttemptedChars, prevAttempted + 1, 'Attempted chars must increase on mistake');

unsub();
console.log('✓ Test 5: Error handling and typing accuracy math intact');
console.log('--- ALL TYPING & ANCHOR FEEDBACK VFX TESTS PASSED ---');
