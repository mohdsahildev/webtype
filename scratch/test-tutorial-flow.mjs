import assert from 'node:assert';
import { GameRuntime } from '../lib/game/game-state.ts';
import {
  getTutorialCompleted,
  setTutorialCompleted,
  TUTORIAL_STORAGE_KEY,
} from '../lib/game/tutorial.ts';
import { getPersonalRecords } from '../lib/game/records.ts';

console.log('=== RUNNING WEBTYPE INTERACTIVE TUTORIAL TEST SUITE ===\n');

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
// TEST 1: First-Time Player Detection & Auto-Start
// =========================================================================
console.log('[Test 1] Testing First-Time Player Detection & Auto-Start...');
{
  global.window.localStorage.clear();
  assert.strictEqual(getTutorialCompleted(), false, 'Default tutorial state must be incomplete');

  const runtime = new GameRuntime();
  runtime.status = 'menu';
  runtime.startIntro(); // Standard play flow

  assert.strictEqual(runtime.isTutorialMode, true, 'First-time player must automatically enter tutorial');
  assert.strictEqual(runtime.tutorialStep, 'FIRST_WORD');
  assert.strictEqual(runtime.currentTutorialHint.title, 'TYPE THE WORD');

  console.log('✓ First-time player auto-start verified.\n');
}

// =========================================================================
// TEST 2: Step-by-Step Interactive Progression Flow
// =========================================================================
console.log('[Test 2] Testing Step-by-Step Interactive Progression Flow...');
{
  const runtime = new GameRuntime();
  runtime.status = 'menu';
  runtime.startIntro(true); // Force tutorial

  // Complete intro handoff
  runtime.updateIntro(3.2);
  assert.strictEqual(runtime.status, 'falling');

  // Challenge 1: Single anchor ("WEB")
  const c1 = runtime.currentChallenge;
  assert.ok(c1, 'First challenge active');
  assert.strictEqual(c1.anchors.length, 1, 'First tutorial challenge must have exactly 1 anchor');
  assert.strictEqual(c1.anchors[0].word, 'WEB');
  assert.strictEqual(runtime.tutorialStep, 'FIRST_WORD');

  // Keystroke 1: Lock onto 'W'
  runtime.handleKeyPress('W');
  assert.strictEqual(runtime.tutorialStep, 'FIRST_LOCKED');
  assert.strictEqual(runtime.currentTutorialHint.title, 'ANCHOR LOCKED');

  // Complete "EB"
  runtime.handleKeyPress('E');
  runtime.handleKeyPress('B');
  assert.strictEqual(runtime.status, 'traversing');
  assert.strictEqual(runtime.tutorialStep, 'FIRST_TRAVERSING');
  assert.strictEqual(runtime.currentTutorialHint.title, 'WEB ATTACHED');

  // Finish traversal -> Challenge 2: Multi-anchor (2 anchors)
  runtime.updateTraversal(1.5);
  assert.strictEqual(runtime.status, 'falling');

  const c2 = runtime.currentChallenge;
  assert.strictEqual(c2.anchors.length, 2, 'Second tutorial challenge must have 2 anchors');
  assert.strictEqual(runtime.tutorialStep, 'MULTI_ANCHOR');
  assert.strictEqual(runtime.currentTutorialHint.title, 'CHOOSE YOUR ANCHOR');

  // Select first anchor 'B' ("BOLT")
  runtime.handleKeyPress('B');
  assert.strictEqual(runtime.tutorialStep, 'MULTI_LOCKED');
  assert.strictEqual(runtime.currentTutorialHint.title, 'LOCKED ON TARGET');

  // Complete "OLT"
  runtime.handleKeyPress('O');
  runtime.handleKeyPress('L');
  runtime.handleKeyPress('T');
  assert.strictEqual(runtime.status, 'traversing');

  // Finish traversal -> Challenge 3: Accuracy instruction
  runtime.updateTraversal(1.5);
  assert.strictEqual(runtime.tutorialStep, 'ACCURACY');
  assert.strictEqual(runtime.currentTutorialHint.title, 'KEEP ACCURACY AT/ABOVE 90%');

  // Complete Challenge 3
  const c3 = runtime.currentChallenge;
  for (const char of c3.anchors[0].word) {
    runtime.handleKeyPress(char);
  }
  runtime.updateTraversal(1.5);

  // Challenge 4: Speed instruction
  assert.strictEqual(runtime.tutorialStep, 'SPEED');
  assert.strictEqual(runtime.currentTutorialHint.title, 'SPEED INCREASES AS YOU SURVIVE');

  // Complete Challenge 4 -> Tutorial Completed!
  const c4 = runtime.currentChallenge;
  for (const char of c4.anchors[0].word) {
    runtime.handleKeyPress(char);
  }

  assert.strictEqual(runtime.tutorialStep, 'COMPLETED');
  assert.strictEqual(runtime.isTutorialMode, false);
  assert.strictEqual(getTutorialCompleted(), true, 'Tutorial completion must be saved to localStorage');
  assert.strictEqual(runtime.currentTutorialHint.title, "YOU'RE READY!");

  console.log('✓ Full tutorial progression and completion verified.\n');
}

// =========================================================================
// TEST 3: Returning Player Bypass & HOW TO PLAY Replay
// =========================================================================
console.log('[Test 3] Testing Returning Player Flow & HOW TO PLAY Replay...');
{
  assert.strictEqual(getTutorialCompleted(), true);

  // Returning player starts normal game
  const runtime1 = new GameRuntime();
  runtime1.status = 'menu';
  runtime1.startIntro(false); // Normal play
  assert.strictEqual(runtime1.isTutorialMode, false, 'Completed tutorial player bypasses tutorial');
  assert.strictEqual(runtime1.tutorialStep, 'INACTIVE');

  // HOW TO PLAY button triggers tutorial replay
  const runtime2 = new GameRuntime();
  runtime2.status = 'menu';
  runtime2.startIntro(true); // Replay tutorial
  assert.strictEqual(runtime2.isTutorialMode, true, 'HOW TO PLAY button forces tutorial mode');
  assert.strictEqual(runtime2.tutorialStep, 'FIRST_WORD');

  console.log('✓ Returning player bypass and HOW TO PLAY replay verified.\n');
}

// =========================================================================
// TEST 4: Skip Tutorial Functionality
// =========================================================================
console.log('[Test 4] Testing Skip Tutorial Action...');
{
  global.window.localStorage.clear();
  const runtime = new GameRuntime();
  runtime.status = 'menu';
  runtime.startIntro();
  assert.strictEqual(runtime.isTutorialMode, true);

  runtime.skipTutorial();
  assert.strictEqual(runtime.isTutorialMode, false);
  assert.strictEqual(runtime.tutorialStep, 'COMPLETED');
  assert.strictEqual(getTutorialCompleted(), true, 'Skipping marks tutorial complete');
  assert.strictEqual(runtime.currentTutorialHint.title, 'TUTORIAL SKIPPED');

  console.log('✓ Skip tutorial action verified.\n');
}

// =========================================================================
// TEST 5: Tutorial Runs Do Not Overwrite Personal Records
// =========================================================================
console.log('[Test 5] Testing Tutorial Isolation from Personal Records...');
{
  global.window.localStorage.clear();

  const runtime = new GameRuntime();
  runtime.status = 'menu';
  runtime.startIntro(true); // Tutorial run
  runtime.updateIntro(3.2);

  // Complete a word in tutorial
  const c = runtime.currentChallenge;
  for (const char of c.anchors[0].word) {
    runtime.handleKeyPress(char);
  }

  // Trigger game over during tutorial
  runtime.triggerGameOver('FALL', 'ALTITUDE LOSS', 'Descended below city');

  const records = getPersonalRecords();
  assert.strictEqual(records.highestScore, 0, 'Tutorial practice runs must not save personal high scores');
  assert.strictEqual(records.totalRuns, 0, 'Tutorial runs must not increment total competitive runs');

  console.log('✓ Tutorial records isolation verified.\n');
}

console.log('=== ALL INTERACTIVE TUTORIAL TESTS PASSED! ===');
