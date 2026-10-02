import assert from 'node:assert';
import { GameRuntime } from '../lib/game/game-state.ts';
import { DIFFICULTY_CONFIG } from '../lib/game/difficulty.ts';

console.log('--- RUNNING WEBTYPE WPM & ACTIVE TYPING TIME VALIDATION ---');

// Test Case 1: 60 correct characters, 60 seconds active typing time -> 12 WPM
console.log('[Test Case 1] 60 correct characters, 60s active typing time...');
{
  const runtime = new GameRuntime();
  runtime.totalCorrectChars = 60;
  runtime.totalAttemptedChars = 60;
  runtime.activeTypingTimeSec = 60;
  runtime.elapsedRunTimeSec = 60;

  const stats = runtime.getStats();
  assert.strictEqual(stats.wpm, 12, 'WPM must be 12');
  assert.strictEqual(stats.displayedWpm, 12, 'Displayed WPM must be 12');
  assert.strictEqual(stats.accuracy, 100, 'Accuracy must be 100%');
  assert.strictEqual(stats.correctCharacters, 60);
  assert.strictEqual(stats.incorrectCharacters, 0);
  assert.strictEqual(stats.totalAttemptedCharacters, 60);
  console.log('✓ Case 1 Passed: WPM = 12, Accuracy = 100%');
}

// Test Case 2: 120 correct characters, 60 seconds active typing time -> 24 WPM
console.log('[Test Case 2] 120 correct characters, 60s active typing time...');
{
  const runtime = new GameRuntime();
  runtime.totalCorrectChars = 120;
  runtime.totalAttemptedChars = 120;
  runtime.activeTypingTimeSec = 60;
  runtime.elapsedRunTimeSec = 60;

  const stats = runtime.getStats();
  assert.strictEqual(stats.wpm, 24, 'WPM must be 24');
  assert.strictEqual(stats.displayedWpm, 24);
  console.log('✓ Case 2 Passed: WPM = 24');
}

// Test Case 3: 60 correct characters, 30 seconds active typing time -> 24 WPM
console.log('[Test Case 3] 60 correct characters, 30s active typing time...');
{
  const runtime = new GameRuntime();
  runtime.totalCorrectChars = 60;
  runtime.totalAttemptedChars = 60;
  runtime.activeTypingTimeSec = 30;
  runtime.elapsedRunTimeSec = 30;

  const stats = runtime.getStats();
  assert.strictEqual(stats.wpm, 24, 'WPM must be 24');
  assert.strictEqual(stats.displayedWpm, 24);
  console.log('✓ Case 3 Passed: WPM = 24');
}

// Test Case 4: 50 correct, 5 incorrect, 60 total attempts (assuming 5 non-letters or 55 total typed with 60 attempted), 60s active typing time
console.log('[Test Case 4] 50 correct, 60 attempts, 60s active typing time...');
{
  const runtime = new GameRuntime();
  runtime.totalCorrectChars = 50;
  runtime.totalAttemptedChars = 60;
  runtime.activeTypingTimeSec = 60;
  runtime.elapsedRunTimeSec = 60;

  const stats = runtime.getStats();
  assert.strictEqual(stats.accuracy, 83.3, 'Accuracy must be 83.3%');
  assert.strictEqual(stats.wpm, 10, 'WPM must be 10');
  assert.strictEqual(stats.correctCharacters, 50);
  assert.strictEqual(stats.incorrectCharacters, 10);
  console.log('✓ Case 4 Passed: WPM = 10, Accuracy = 83.3%');
}

// Test Case 5: 50 correct, 10 incorrect, 60 total attempts, 60s active typing time
console.log('[Test Case 5] 50 correct, 10 incorrect, 60 attempts, 60s active typing time...');
{
  const runtime = new GameRuntime();
  runtime.totalCorrectChars = 50;
  runtime.totalAttemptedChars = 60;
  runtime.activeTypingTimeSec = 60;
  runtime.elapsedRunTimeSec = 60;

  const stats = runtime.getStats();
  assert.strictEqual(stats.accuracy, 83.3, 'Accuracy must be 83.3%');
  assert.strictEqual(stats.wpm, 10, 'WPM must be 10');
  console.log('✓ Case 5 Passed: WPM = 10, Accuracy = 83.3% (Accuracy & WPM independent)');
}

// Test Case 6: 50 correct characters, 60s total run time, but only 30s active typing time -> WPM = 20 (NOT 10!)
console.log('[Test Case 6] 50 correct characters, 60s elapsed run time, 30s active typing time...');
{
  const runtime = new GameRuntime();
  runtime.totalCorrectChars = 50;
  runtime.totalAttemptedChars = 50;
  runtime.activeTypingTimeSec = 30; // 30s actively typing
  runtime.elapsedRunTimeSec = 60;   // 60s total run time (including swings / waiting)

  const stats = runtime.getStats();
  assert.strictEqual(stats.wpm, 20, 'WPM must be 20, not 10!');
  assert.strictEqual(stats.displayedWpm, 20);
  assert.strictEqual(stats.activeTypingTime, 30);
  assert.strictEqual(stats.elapsedRunTime, 60);
  console.log('✓ Case 6 Passed: WPM = 20 (activeTypingTime used, NOT elapsedRunTime)');
}

// Test Case 7: Edge Cases - Zero Active Time, Initial State
console.log('[Test Case 7] Edge Cases (0 active time, initial state)...');
{
  const runtime = new GameRuntime();
  assert.strictEqual(runtime.getStats().wpm, 0);
  assert.strictEqual(runtime.getStats().displayedWpm, 0, 'Displayed WPM must be 0 initially');

  // Type 3 correct characters in 1 second
  runtime.totalCorrectChars = 3;
  runtime.totalAttemptedChars = 3;
  runtime.activeTypingTimeSec = 1.0;
  assert.strictEqual(runtime.getStats().wpm, 36);
  assert.strictEqual(runtime.getStats().displayedWpm, 36, 'Must display live calculated WPM');

  // 5th character reached
  runtime.totalCorrectChars = 5;
  runtime.totalAttemptedChars = 5;
  runtime.activeTypingTimeSec = 5.0; // 1 char/sec -> 12 WPM
  assert.strictEqual(runtime.getStats().wpm, 12);
  assert.strictEqual(runtime.getStats().displayedWpm, 12);
  console.log('✓ Case 7 Passed: Numeric WPM displayed starting at 0.');
}

// Test Case 8: Active Typing Timer Lifecycle Simulation
console.log('[Test Case 8] Active Typing Timer Lifecycle Simulation...');
{
  const runtime = new GameRuntime();
  runtime.setStatus('falling');
  assert.strictEqual(runtime.isChallengeAttemptActive, false, 'Timer must not be active on challenge spawn');

  // 1. Player falls for 2 seconds before pressing anything
  runtime.updatePacing(2.0);
  assert.strictEqual(runtime.elapsedRunTimeSec, 2.0);
  assert.strictEqual(runtime.activeTypingTimeSec, 0.0, 'Active typing timer must NOT accumulate before first keystroke');

  // 2. Player makes first keystroke attempt
  const anchor = runtime.currentChallenge.anchors[0];
  runtime.handleKeyPress(anchor.word[0]);
  assert.strictEqual(runtime.isChallengeAttemptActive, true, 'Timer activates on first keystroke attempt');

  // 3. Player spends 1.5 seconds typing the rest of the word
  runtime.updatePacing(1.5);
  for (let i = 1; i < anchor.word.length; i++) {
    runtime.handleKeyPress(anchor.word[i]);
  }
  assert.strictEqual(runtime.isChallengeAttemptActive, false, 'Timer deactivates immediately when word completes');
  assert.strictEqual(runtime.status, 'traversing');
  assert.strictEqual(runtime.activeTypingTimeSec, 1.5, 'Only 1.5s active typing time accumulated');
  assert.strictEqual(runtime.elapsedRunTimeSec, 3.5, '3.5s total run time elapsed');

  // 4. Traversal runs for 1.8 seconds
  runtime.updatePacing(1.8);
  runtime.updateTraversal(1.8);
  assert.strictEqual(runtime.activeTypingTimeSec, 1.5, 'Active typing time does NOT increase during traversal');
  assert.strictEqual(runtime.elapsedRunTimeSec, 5.3, 'Total run time continues to track all play time');
  assert.strictEqual(runtime.status, 'falling');
  assert.strictEqual(runtime.isChallengeAttemptActive, false, 'New challenge starts with timer paused');

  console.log('✓ Case 8 Passed: Challenge active typing timer lifecycle operates with 100% precision.');
}

console.log('--- ALL WPM AND ACTIVE TYPING TIME TESTS PASSED! ---');
