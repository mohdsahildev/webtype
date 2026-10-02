import { GameRuntime } from '../lib/game/game-state';
import { WORD_BANK } from '../lib/game/word-bank';

console.log('===============================================================');
console.log('WEBTYPE DEEP FULL GAMEPLAY SIMULATION (100+ CHALLENGES)');
console.log('===============================================================\n');

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

// 1. Start from Main Menu and complete Intro + Tutorial
console.log('1. Starting Intro & Tutorial...');
runtime.startIntro(true); // force tutorial
assertCondition(runtime.status === 'intro', 'Status should be intro');
assertCondition(runtime.isTutorialMode, 'Tutorial mode should be active');

// Advance through intro animation sequence
runtime.updateIntro(3.5);
assertCondition(runtime.status === 'falling', 'Status should transition to falling');

// Tutorial Step 1: Word 'WEB'
let challenge = runtime.currentChallenge;
assertCondition(challenge !== null, 'Challenge should be spawned');
assertCondition(challenge.anchors[0].word === 'WEB', 'First tutorial word must be WEB');
typeWord(runtime, 'WEB');
completeTraversal(runtime);

// Tutorial Step 2: Words 'BOLT' / 'JUMP'
challenge = runtime.currentChallenge;
assertCondition(challenge.anchors.length === 2, 'Tutorial step 2 has 2 anchors');
const firstLetters = challenge.anchors.map(a => a.word[0]);
assertCondition(firstLetters.includes('B') && firstLetters.includes('J'), 'Tutorial step 2 words are BOLT and JUMP');
typeWord(runtime, challenge.anchors[0].word);
completeTraversal(runtime);

// Complete tutorial steps 3 & 4
typeWord(runtime, runtime.currentChallenge.anchors[0].word);
completeTraversal(runtime);
typeWord(runtime, runtime.currentChallenge.anchors[0].word);
completeTraversal(runtime);

console.log('✓ Tutorial completed successfully! Transitioned to main gameplay.\n');

// 2. Play 100 Main Gameplay Challenges with Dynamic Word Generation
console.log('2. Playing 100 Main Challenges with Dynamic Real-English Word Bank...');
const wordHistory = [];
const sampledChallenges = [];
let totalCharactersTyped = 0;

for (let i = 0; i < 100; i++) {
  challenge = runtime.currentChallenge;
  assertCondition(challenge !== null, `Challenge ${i + 1} must exist`);
  assertCondition(challenge.anchors.length >= 2 && challenge.anchors.length <= 4, `Anchor count should be 2-4`);

  // Verify unique first letters
  const initials = new Set();
  for (const anchor of challenge.anchors) {
    const initial = anchor.word[0];
    assertCondition(!initials.has(initial), `Duplicate initial ${initial} found in challenge ${i + 1}`);
    initials.add(initial);
  }

  // Pick one anchor to type
  const targetAnchor = challenge.anchors[Math.floor(Math.random() * challenge.anchors.length)];
  const word = targetAnchor.word;
  wordHistory.push(word);

  if (i < 10 || i % 20 === 0) {
    sampledChallenges.push({
      challengeNum: i + 1,
      anchors: challenge.anchors.map(a => a.word),
      selected: word,
      completedCount: runtime.completedCount,
      speedMultiplier: runtime.currentSpeedMultiplier.toFixed(2),
    });
  }

  // Type the word letter by letter
  typeWord(runtime, word);
  totalCharactersTyped += word.length;

  // Complete the resulting traversal
  completeTraversal(runtime);

  // Advance time & pacing
  runtime.updatePacing(0.8);
}

console.log('Sampled Challenge Progression:');
for (const sc of sampledChallenges) {
  console.log(`  Challenge #${sc.challengeNum.toString().padStart(3, ' ')}: Anchors [${sc.anchors.join(', ')}] -> Typed: "${sc.selected}" | Speed: ${sc.speedMultiplier}x | Completed: ${sc.completedCount}`);
}

const stats = runtime.getStats();
console.log('\nGameplay Session Stats after 100 Challenges:');
console.log(`  Completed Words:       ${runtime.completedCount}`);
console.log(`  Total Correct Chars:   ${stats.totalCorrectChars}`);
console.log(`  Current Score:         ${stats.score}`);
console.log(`  Max Streak:            ${stats.maxStreak}`);
console.log(`  Current Multiplier:    ${stats.currentSpeedMultiplier}x`);
console.log(`  Calculated Live WPM:   ${stats.wpm}`);
console.log(`  Accuracy:              ${stats.accuracy}%`);

// Verify uniqueness and repetition safety
const uniqueWords = new Set(wordHistory);
console.log(`  Unique Words Typed:    ${uniqueWords.size} / ${wordHistory.length}`);
assertCondition(uniqueWords.size > 85, 'High word variety expected across 100 challenges');

// 3. Test Game Over and Reset
console.log('\n3. Testing Game Over & Reset Lifecycle...');
runtime.triggerGameOver('FALL', 'ALTITUDE LOSS', 'Descended below city threshold');
assertCondition(runtime.status === 'deathSequence', 'Status should be deathSequence');
runtime.updateDeathSequence(2.0);
assertCondition(runtime.status === 'dead', 'Status should be dead');
assertCondition(runtime.gameOverInfo !== null, 'GameOverInfo should be populated');

// Restart
runtime.reset();
assertCondition(runtime.status === 'falling', 'Status should reset to falling');
assertCondition(runtime.currentChallenge !== null, 'Fresh challenge should be spawned on reset');
assertCondition(runtime.completedCount === 0, 'Completed count should reset to 0');
assertCondition(runtime.score === 0, 'Score should reset to 0');

console.log('✓ Reset flow verified successfully.');

console.log('\n===============================================================');
console.log('✓ ALL 100+ CHALLENGE GAMEPLAY SIMULATION TESTS PASSED PERFECTLY!');
console.log('===============================================================');

// Helper functions
function typeWord(rt, word) {
  for (let i = 0; i < word.length; i++) {
    rt.handleKeyPress(word[i]);
  }
}

function completeTraversal(rt) {
  assertCondition(rt.status === 'traversing', 'Status must be traversing after word completion');
  // Complete traversal trajectory arc
  rt.updateTraversal(1.4);
}

function assertCondition(cond, msg) {
  if (!cond) {
    console.error('ASSERTION FAILED:', msg);
    process.exit(1);
  }
}
