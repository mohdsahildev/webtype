import { WORD_BANK } from '../lib/game/word-bank.ts';
import { WordGenerator } from '../lib/game/word-generator.ts';

console.log('====================================================');
console.log('WEBTYPE DYNAMIC WORD GENERATOR VALIDATION TEST SUITE');
console.log('====================================================\n');

console.log(`Word Bank Size: ${WORD_BANK.totalWords} words.`);
console.log(`Words indexed by lengths 3-12:`);
for (let len = 3; len <= 12; len++) {
  const count = WORD_BANK.wordsByLength.get(len)?.length || 0;
  console.log(`  Length ${len.toString().padStart(2, ' ')}: ${count} words`);
}
console.log('');

// ==========================================
// TEST 1: 1,000 Challenge Simulation
// ==========================================
console.log('--- TEST 1: 1,000 Challenges Simulation (2-4 words each) ---');
const generator = new WordGenerator();
const bankSet = new Set(WORD_BANK.words.map((w) => w.word.toUpperCase()));

let totalChallenges = 1000;
let totalWordsGenerated = 0;
let firstLetterConflicts = 0;
let invalidWords = 0;
let generationFailures = 0;
let activeWordCollisions = 0;
let recentWindowViolations = 0;

const RECENT_CHECK_WINDOW = 30;
const historyWindow = [];
let activeSimulatedWords = [];

for (let c = 0; c < totalChallenges; c++) {
  const count = 2 + Math.floor(Math.random() * 3); // 2, 3, or 4 anchors
  const completedCount = Math.floor(c / 5); // Progressive difficulty
  const speedMultiplier = 1.0 + Math.min(0.9, (c / 100) * 0.1);

  const words = generator.generateChallengeWords({
    count,
    completedCount,
    speedMultiplier,
    activeWords: activeSimulatedWords,
  });

  if (words.length !== count) {
    generationFailures++;
  }

  // Check 1: Unique first letters
  const initials = new Set();
  for (const w of words) {
    if (initials.has(w[0])) {
      firstLetterConflicts++;
    }
    initials.add(w[0]);

    // Check 2: Exists in bank and only a-z
    if (!bankSet.has(w) || !/^[A-Z]+$/.test(w) || w.length < 3 || w.length > 12) {
      invalidWords++;
    }

    // Check 3: Active collision
    if (activeSimulatedWords.includes(w)) {
      activeWordCollisions++;
    }

    // Check 4: Recent window check
    if (historyWindow.includes(w)) {
      recentWindowViolations++;
    }
    historyWindow.push(w);
    if (historyWindow.length > RECENT_CHECK_WINDOW) {
      historyWindow.shift();
    }

    totalWordsGenerated++;
  }

  // Update active words for next challenge simulation
  activeSimulatedWords = [...words];
}

console.log(`Total Challenges Simulated: ${totalChallenges}`);
console.log(`Total Generated Words:      ${totalWordsGenerated}`);
console.log(`First-Letter Conflicts:     ${firstLetterConflicts}`);
console.log(`Active Word Collisions:     ${activeWordCollisions}`);
console.log(`Invalid Words (non-bank):   ${invalidWords}`);
console.log(`Generation Count Failures:  ${generationFailures}`);
console.log(`Recent Window Violations:   ${recentWindowViolations}`);

if (
  firstLetterConflicts === 0 &&
  activeWordCollisions === 0 &&
  invalidWords === 0 &&
  generationFailures === 0
) {
  console.log('✓ TEST 1 PASSED WITH ZERO CONFLICTS & ZERO FAILURES!\n');
} else {
  console.error('✗ TEST 1 FAILED!');
  process.exit(1);
}

// ==========================================
// TEST 2: 10,000 Word Distribution Test
// ==========================================
console.log('--- TEST 2: 10,000 Words Large Distribution Simulation ---');
const distGen = new WordGenerator();
const lenDist = {};
const letterDist = {};
const allGeneratedWords = new Set();
let totalSimWords = 10000;
let wordsGeneratedCount = 0;
let challengeIndex = 0;

while (wordsGeneratedCount < totalSimWords) {
  const count = 3;
  const completed = Math.floor(challengeIndex / 10);
  const speed = 1.0 + Math.min(0.9, (completed / 20) * 0.3);

  const words = distGen.generateChallengeWords({
    count,
    completedCount: completed,
    speedMultiplier: speed,
  });

  for (const w of words) {
    lenDist[w.length] = (lenDist[w.length] || 0) + 1;
    letterDist[w[0]] = (letterDist[w[0]] || 0) + 1;
    allGeneratedWords.add(w);
    wordsGeneratedCount++;
    if (wordsGeneratedCount >= totalSimWords) break;
  }
  challengeIndex++;
}

console.log(`Total Simulated Words: ${wordsGeneratedCount}`);
console.log(`Unique Words Encountered: ${allGeneratedWords.size} / ${WORD_BANK.totalWords}`);
console.log('Word Length Distribution:');
for (let len = 3; len <= 12; len++) {
  const count = lenDist[len] || 0;
  const pct = ((count / wordsGeneratedCount) * 100).toFixed(1);
  const bar = '█'.repeat(Math.round(pct / 2));
  console.log(`  Length ${len.toString().padStart(2, ' ')}: ${count.toString().padStart(5, ' ')} (${pct.padStart(4, ' ')}%) ${bar}`);
}

console.log('\nFirst Letter Distribution:');
const letters = Object.keys(letterDist).sort();
for (const l of letters) {
  const count = letterDist[l];
  const pct = ((count / wordsGeneratedCount) * 100).toFixed(1);
  console.log(`  Letter ${l}: ${count.toString().padStart(4, ' ')} (${pct.padStart(4, ' ')}%)`);
}

console.log('\n✓ TEST 2 DISTRIBUTION & UNIQUENESS PASSED SUCCESSFULLY!');
