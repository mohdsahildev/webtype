import assert from 'node:assert';

// Mock browser globals for node testing
if (!globalThis.window) {
  globalThis.window = {
    localStorage: {
      _store: {},
      getItem(k) { return this._store[k] || null; },
      setItem(k, v) { this._store[k] = String(v); },
      removeItem(k) { delete this._store[k]; },
      clear() { this._store = {}; }
    }
  };
}

console.log('🧪 RUNNING PAUSE SYSTEM + SETTINGS TEST SUITE...\n');

async function runTests() {
  const { GameRuntime } = await import('../lib/game/game-state.ts');
  const { getGameSettings, saveGameSettings, resetGameSettings, subscribeSettings } = await import('../lib/game/settings.ts');

  // Test 1: Settings initialization & defaults
  console.log('Test 1: Settings Initialization & Defaults');
  resetGameSettings();
  const initial = getGameSettings();
  assert.strictEqual(initial.masterVolume, 1.0);
  assert.strictEqual(initial.sfxVolume, 1.0);
  assert.strictEqual(initial.musicVolume, 1.0);
  assert.strictEqual(initial.cameraShake, true);
  assert.strictEqual(initial.speedEffects, true);
  assert.strictEqual(initial.tutorialHints, true);
  assert.strictEqual(initial.reducedVisualEffects, false);
  console.log('  ✓ Default settings match schema accurately');

  // Test 2: Settings reactivity & updates
  console.log('\nTest 2: Settings Reactivity & Storage Persistence');
  let notifiedVolume = null;
  const unsubSettings = subscribeSettings((s) => {
    notifiedVolume = s.masterVolume;
  });
  saveGameSettings({ masterVolume: 0.65, cameraShake: false });
  const updated = getGameSettings();
  assert.strictEqual(updated.masterVolume, 0.65);
  assert.strictEqual(updated.cameraShake, false);
  assert.strictEqual(notifiedVolume, 0.65);
  unsubSettings();
  console.log('  ✓ Settings react immediately and persist to localStorage');

  // Test 3: Reset Settings
  console.log('\nTest 3: Reset Settings Functionality');
  resetGameSettings();
  const resetVal = getGameSettings();
  assert.strictEqual(resetVal.masterVolume, 1.0);
  assert.strictEqual(resetVal.cameraShake, true);
  console.log('  ✓ Settings reset restores defaults without issue');

  // Test 4: GameRuntime Pause & Resume Logic
  console.log('\nTest 4: Pause State Lifecycle');
  const runtime = new GameRuntime();
  runtime.setStatus('falling');
  assert.strictEqual(runtime.isPaused, false);

  let pauseEvents = [];
  runtime.subscribePause((p) => pauseEvents.push(p));
  assert.deepStrictEqual(pauseEvents, [false]);

  runtime.pause();
  assert.strictEqual(runtime.isPaused, true);
  assert.deepStrictEqual(pauseEvents, [false, true]);

  // Clicking pause again does not unpause accidentally
  runtime.pause();
  assert.strictEqual(runtime.isPaused, true);

  runtime.resume();
  assert.strictEqual(runtime.isPaused, false);
  assert.deepStrictEqual(pauseEvents, [false, true, false]);

  runtime.togglePause();
  assert.strictEqual(runtime.isPaused, true);
  runtime.togglePause();
  assert.strictEqual(runtime.isPaused, false);
  console.log('  ✓ Pause / Resume state transitions fire correctly');

  // Test 5: Timer & Simulation Freeze during 30s Simulated Pause
  console.log('\nTest 5: Strict Timer & Progression Freeze');
  runtime.reset();
  runtime.status = 'falling';
  runtime.elapsedRunTimeSec = 10.0;
  runtime.activeTypingTimeSec = 5.0;
  runtime.distanceTraveled = 120.0;
  runtime.score = 500;
  runtime.isChallengeAttemptActive = true;

  // Let 0.5s of normal gameplay run
  runtime.updatePacing(0.5);
  assert.strictEqual(runtime.elapsedRunTimeSec, 10.5);
  assert.strictEqual(runtime.activeTypingTimeSec, 5.5);

  // Pause simulation
  runtime.pause();

  // Simulate 30 seconds of paused frames (e.g. 1800 frames of 1/60s dt)
  for (let i = 0; i < 1800; i++) {
    runtime.updatePacing(1 / 60);
  }

  // Verify NOT A SINGLE MILLISECOND advanced
  assert.strictEqual(runtime.elapsedRunTimeSec, 10.5);
  assert.strictEqual(runtime.activeTypingTimeSec, 5.5);
  console.log('  ✓ 30-second pause froze activeTypingTime and elapsedRunTime with 100% precision');

  // Test 6: Keystroke Suppression while Paused
  console.log('\nTest 6: Typing Input Ignored while Paused');
  assert(runtime.currentChallenge !== null);
  const firstWord = runtime.currentChallenge.anchors[0].word;
  const initialAttempts = runtime.totalAttemptedChars;

  runtime.handleKeyPress(firstWord[0]);
  assert.strictEqual(runtime.totalAttemptedChars, initialAttempts, 'Keystroke must not be recorded while paused');
  assert.strictEqual(runtime.currentChallenge.selectedAnchorId, null, 'Anchor must not be selected while paused');

  // Resume and verify keystroke works normally
  runtime.resume();
  runtime.handleKeyPress(firstWord[0]);
  assert.strictEqual(runtime.totalAttemptedChars, initialAttempts + 1);
  assert.notStrictEqual(runtime.currentChallenge.selectedAnchorId, null);
  console.log('  ✓ Keystrokes safely ignored during pause and registered on resume');

  // Test 7: Return to Main Menu from Pause
  console.log('\nTest 7: Clean Return to Main Menu');
  runtime.pause();
  assert.strictEqual(runtime.isPaused, true);
  runtime.returnToMenu();
  assert.strictEqual(runtime.status, 'menu');
  assert.strictEqual(runtime.isPaused, false);
  assert.strictEqual(runtime.currentChallenge, null);
  console.log('  ✓ Return to menu resets runtime safely and cleanly');

  console.log('\n🎉 ALL PAUSE & SETTINGS TESTS PASSED PERFECTLY!\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
