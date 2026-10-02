import assert from 'node:assert';
import { GameRuntime } from '../lib/game/game-state.ts';
import { DIFFICULTY_CONFIG } from '../lib/game/difficulty.ts';

console.log('--- TESTING ACCURACY TRIGGER SIMULATION ---');

const runtime = new GameRuntime();
runtime.setStatus('falling');

// Simulate 12 completed words
for (let w = 0; w < 12; w++) {
  const challenge = runtime.currentChallenge;
  const targetAnchor = challenge.anchors[0];
  for (const c of targetAnchor.word) {
    runtime.handleKeyPress(c);
  }
  // Traversal completes
  runtime.updateTraversal(2.0);
}

assert.strictEqual(runtime.completedCount, 12);
console.log('Completed 12 words. Total correct chars:', runtime.totalCorrectChars);
console.log('Total attempted chars:', runtime.totalAttemptedChars);
console.log('Accuracy before mistakes:', runtime.getStats().accuracy);

// Now simulate intentional typos to drop accuracy below 90%
const usedInitials = new Set(runtime.currentChallenge.anchors.map(a => a.word[0]));
const typoKey = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'].find(c => !usedInitials.has(c));

while (runtime.status !== 'deathSequence' && runtime.status !== 'dead') {
  runtime.handleKeyPress(typoKey);
}

assert.strictEqual(runtime.status, 'deathSequence');
assert.strictEqual(runtime.gameOverInfo.reason, 'ACCURACY');
assert.strictEqual(runtime.gameOverInfo.title, 'ACCURACY TOO LOW');

// Advance death sequence to completion
runtime.updateDeathSequence(1.5);

const finalStats = runtime.getStats();
console.log('Final Status:', runtime.status);
console.log('Game Over Info Reason:', runtime.gameOverInfo.reason);
console.log('Game Over Info Title:', runtime.gameOverInfo.title);
console.log('Game Over Info Detail:', runtime.gameOverInfo.detail);
console.log('Final Accuracy:', finalStats.accuracy + '%');
console.log('Final WPM:', finalStats.wpm);
console.log('Displayed WPM:', finalStats.displayedWpm);

assert.strictEqual(runtime.status, 'dead');
assert.strictEqual(runtime.gameOverInfo.reason, 'ACCURACY');
assert.strictEqual(runtime.gameOverInfo.title, 'ACCURACY TOO LOW');
assert.ok(finalStats.accuracy < 90.0);
assert.ok(typeof finalStats.wpm === 'number');

console.log('✓ Accuracy Failure trigger verified successfully!');
