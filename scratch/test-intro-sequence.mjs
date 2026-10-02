import assert from 'node:assert';
import * as THREE from 'three';
import { GameRuntime } from '../lib/game/game-state.ts';

console.log('=== RUNNING WEBTYPE INTRO SEQUENCE TEST SUITE ===\n');

// 1. Initial State
console.log('[Test 1] Testing Initial State on Load...');
const runtime = new GameRuntime();
assert.strictEqual(runtime.status, 'loading');
assert.strictEqual(runtime.playerPosition.x, 0);
assert.strictEqual(runtime.playerPosition.y, 17.4);
assert.strictEqual(runtime.playerPosition.z, 14);
assert.strictEqual(runtime.currentAnim, 'idle');
assert.strictEqual(runtime.currentChallenge, null, 'No challenge must be active on load');
console.log('✓ Initial state verified: Player standing at rooftop starting position (0, 17.4, 14).\n');

// 2. Menu State & Input Safety
console.log('[Test 2] Testing Menu State & Input Rejection...');
runtime.setStatus('menu');
assert.strictEqual(runtime.status, 'menu');
assert.strictEqual(runtime.currentAnim, 'idle');
assert.strictEqual(runtime.currentChallenge, null);

// Typing attempt during menu
const initialAttempts = runtime.totalAttemptedChars;
runtime.handleKeyPress('A');
runtime.handleKeyPress('W');
runtime.handleKeyPress(' ');
assert.strictEqual(runtime.totalAttemptedChars, initialAttempts, 'Keystrokes must be completely ignored during menu');
console.log('✓ Menu state & input rejection verified.\n');

// 3. Start Intro Trigger
console.log('[Test 3] Testing Start Intro Trigger (PLAY button press)...');
runtime.startIntro();
assert.strictEqual(runtime.status, 'intro', 'Status must transition to intro');
assert.strictEqual(runtime.introTimer, 0);
assert.strictEqual(runtime.currentChallenge, null);
console.log('✓ startIntro() successfully initiated intro sequence.\n');

// 4. Phase 1: Rooftop Sprint
console.log('[Test 4] Testing Phase 1: Rooftop Sprint (0.0s -> 1.4s)...');
const dt = 0.016;
let timer = 0;
while (timer < 1.0) {
  runtime.updateIntro(dt);
  timer += dt;
}
assert.strictEqual(runtime.status, 'intro');
assert.strictEqual(runtime.currentAnim, 'sprint');
assert.strictEqual(runtime.playerPosition.y, 17.4, 'Y must stay flat on rooftop during sprint');
assert.ok(runtime.playerPosition.z < 14 && runtime.playerPosition.z > 0, `Z should advance towards edge: ${runtime.playerPosition.z}`);
console.log(`✓ Sprint verified at t=1.0s: Z=${runtime.playerPosition.z.toFixed(2)}, Y=${runtime.playerPosition.y}, Anim=${runtime.currentAnim}\n`);

// Advance to edge at t=1.4s
while (timer < 1.4) {
  runtime.updateIntro(dt);
  timer += dt;
}
assert.ok(Math.abs(runtime.playerPosition.z - 0) < 0.2, 'Character should reach rooftop edge at Z ≈ 0');
console.log('✓ Rooftop edge reached at Z ≈ 0.\n');

// 5. Phase 2: Big Jump
console.log('[Test 5] Testing Phase 2: Big Jump off Rooftop (1.4s -> 2.3s)...');
while (timer < 1.85) {
  runtime.updateIntro(dt);
  timer += dt;
}
assert.strictEqual(runtime.status, 'intro');
assert.strictEqual(runtime.currentAnim, 'big_jump');
assert.ok(runtime.playerPosition.z < 0, `Player should be past the rooftop edge: Z=${runtime.playerPosition.z}`);
assert.ok(runtime.playerPosition.y > 17.4, `Player should be lifted in jump arc: Y=${runtime.playerPosition.y}`);
console.log(`✓ Big Jump apex verified at t=1.85s: Z=${runtime.playerPosition.z.toFixed(2)}, Y=${runtime.playerPosition.y.toFixed(2)}, Anim=${runtime.currentAnim}\n`);

// 6. Phase 3: Transition to Falling Idle
console.log('[Test 6] Testing Phase 3: Direct Transition to Falling Idle (2.3s -> 3.1s)...');
while (timer < 2.8) {
  runtime.updateIntro(dt);
  timer += dt;
}
assert.strictEqual(runtime.status, 'intro');
assert.strictEqual(runtime.currentAnim, 'falling_idle');
assert.ok(runtime.playerPosition.z < -11, `Z should be continuing forward: ${runtime.playerPosition.z}`);
console.log(`✓ Direct Falling Idle transition verified at t=2.8s: Z=${runtime.playerPosition.z.toFixed(2)}, Y=${runtime.playerPosition.y.toFixed(2)}, Anim=${runtime.currentAnim}\n`);

// 7. Phase 4: Seamless Gameplay Handoff
console.log('[Test 7] Testing Phase 4: Gameplay Handoff (t >= 3.1s)...');
while (runtime.status === 'intro') {
  runtime.updateIntro(dt);
  timer += dt;
}
assert.strictEqual(runtime.status, 'falling', 'Status must transition to falling');
assert.strictEqual(runtime.currentAnim, 'falling_idle', 'Animation must transition to falling_idle');
assert.ok(runtime.currentChallenge, 'First gameplay challenge must be spawned');
assert.ok(runtime.currentChallenge.anchors.length >= 1, 'First challenge must contain anchors');
assert.ok(runtime.currentChallenge.anchors[0].position[2] < runtime.playerPosition.z, 'Anchors must be positioned ahead of player along -Z');
console.log(`✓ Seamless gameplay handoff verified at Z=${runtime.playerPosition.z}, Y=${runtime.playerPosition.y}`);
console.log(`  First challenge spawned with ${runtime.currentChallenge.anchors.length} anchors ahead at Z=${runtime.currentChallenge.anchors[0].position[2]}.\n`);

// 8. Gameplay Input Verification
console.log('[Test 8] Testing Active Gameplay Typing after Handoff...');
const firstAnchor = runtime.currentChallenge.anchors[0];
const initialWord = firstAnchor.word;
const firstChar = initialWord[0];
runtime.handleKeyPress(firstChar);

assert.strictEqual(runtime.totalAttemptedChars, 1);
assert.strictEqual(runtime.totalCorrectChars, 1);
assert.strictEqual(runtime.currentChallenge.selectedAnchorId, firstAnchor.id);
assert.strictEqual(runtime.currentChallenge.typedIndex, 1);
console.log(`✓ Successfully typed '${firstChar}' for anchor word "${initialWord}".`);

console.log('\n=== ALL 8 INTRO SEQUENCE TESTS PASSED SUCCESSFULLY! ===');
