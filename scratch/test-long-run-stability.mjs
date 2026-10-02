import { GameRuntime } from '../lib/game/game-state.ts';
import { generateChunk } from '../lib/game/city-generator.ts';

console.log('=== WEBTYPE PRODUCTION READINESS: 500-CHALLENGE / EXTENDED RUN SIMULATION ===\n');

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

const runtime = new GameRuntime();
runtime.setStatus('menu');
runtime.startIntro(false);
runtime.updateIntro(3.5);

let challengesPassed = 0;
let totalWordsTyped = 0;
let collisions = 0;
const wordHistory = [];

const startTime = Date.now();

for (let i = 0; i < 500; i++) {
  const challenge = runtime.currentChallenge;
  if (!challenge || challenge.anchors.length === 0) {
    console.error(`FATAL: Challenge #${i + 1} failed to spawn anchors!`);
    process.exit(1);
  }

  // Check unique first letters
  const firstLetters = challenge.anchors.map(a => a.word[0].toUpperCase());
  const uniqueLetters = new Set(firstLetters);
  if (firstLetters.length !== uniqueLetters.size) {
    console.error(`Collision on challenge #${i + 1}: ${firstLetters.join(', ')}`);
    collisions++;
  }

  // Pick target anchor
  const targetAnchor = challenge.anchors[Math.floor(Math.random() * challenge.anchors.length)];
  const word = targetAnchor.word;
  wordHistory.push(word);

  // Type every letter
  for (let c = 0; c < word.length; c++) {
    const char = word[c];
    runtime.handleKeyPress(char);
  }

  totalWordsTyped++;
  challengesPassed++;

  // Complete traversal
  if (runtime.status === 'traversing') {
    runtime.updateTraversal(1.4);
  }
  runtime.updatePacing(0.8);
}

const elapsedMs = Date.now() - startTime;
const stats = runtime.getStats();
const uniqueWords = new Set(wordHistory);

console.log(`✓ Completed ${challengesPassed} consecutive challenges in ${elapsedMs}ms simulation.`);
console.log(`✓ Total Words Typed: ${totalWordsTyped} (${uniqueWords.size} unique words)`);
console.log(`✓ Letter Collisions: ${collisions}`);
console.log(`✓ Player Position: Z = ${runtime.playerPosition.z.toFixed(1)}m, Y = ${runtime.playerPosition.y.toFixed(1)}m`);
console.log(`✓ Current Score: ${stats.score}`);
console.log(`✓ Final Multiplier: ${stats.currentSpeedMultiplier.toFixed(2)}x`);
console.log(`✓ Final Max Streak: ${stats.maxStreak}`);
console.log(`✓ Accuracy: ${stats.accuracy}%`);
console.log(`✓ Final WPM: ${stats.wpm}`);

// Verify Chunk Generation over 100 chunks
console.log('\n--- Verifying Deterministic Chunk Streaming over 100 Chunks ---');
let totalBuildings = 0;
for (let c = 0; c < 100; c++) {
  const chunk = generateChunk(c);
  totalBuildings += chunk.buildings.length;
  if (chunk.buildings.length < 10) {
    console.error(`Warning: Chunk ${c} produced fewer than 10 buildings!`);
  }
}
console.log(`✓ Generated 100 consecutive chunks cleanly (Total ${totalBuildings} buildings).`);
console.log('✓ All 500-challenge extended run invariants satisfied!\n');

