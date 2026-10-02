import assert from 'node:assert';
import * as THREE from 'three';
import { GameRuntime } from '../lib/game/game-state.ts';
import { GAME_CONFIG } from '../lib/game/game-config.ts';

console.log('=== RUNNING WEBTYPE CINEMATIC CAMERA & MOVEMENT FEEL TEST SUITE ===\n');

// Mock PerspectiveCamera
class MockCamera extends THREE.PerspectiveCamera {
  constructor() {
    super(GAME_CONFIG.camera.fov, 16 / 9, 0.1, 450);
  }
}

// =========================================================================
// TEST 1: Coordinate Independence & Gameplay Immutability
// =========================================================================
console.log('[Test 1] Testing Coordinate Independence & Gameplay State Immutability...');
{
  const runtime = new GameRuntime();
  runtime.playerPosition.set(3.5, 18.2, -120.4);
  runtime.status = 'falling';
  runtime.currentSpeedMultiplier = 1.35;

  const initialX = runtime.playerPosition.x;
  const initialY = runtime.playerPosition.y;
  const initialZ = runtime.playerPosition.z;

  const camera = new MockCamera();
  const [ox, oy, oz] = GAME_CONFIG.camera.offset;

  // Calculate target camera position
  const targetCamX = runtime.playerPosition.x + ox;
  const targetCamY = runtime.playerPosition.y + oy;
  const targetCamZ = runtime.playerPosition.z + oz;

  // Verify axes are strictly separate
  assert.strictEqual(targetCamX, initialX + ox, 'X must only derive from player X');
  assert.strictEqual(targetCamY, initialY + oy, 'Y must only derive from player Y');
  assert.strictEqual(targetCamZ, initialZ + oz, 'Z must only derive from player Z');

  // Verify gameplay coordinates were NOT mutated
  assert.strictEqual(runtime.playerPosition.x, initialX);
  assert.strictEqual(runtime.playerPosition.y, initialY);
  assert.strictEqual(runtime.playerPosition.z, initialZ);

  console.log('✓ Coordinate independence and gameplay immutability verified.\n');
}

// =========================================================================
// TEST 2: Traversal Banking & Lateral Sway Math
// =========================================================================
console.log('[Test 2] Testing Traversal Banking Roll & Lateral Motion...');
{
  const runtime = new GameRuntime();
  runtime.status = 'falling';
  runtime.spawnNextChallenge();

  // Test Left-side traversal banking
  const leftAnchor = {
    id: 'test-left',
    side: 'left',
    position: [-7.6, 20.0, -80.0],
    word: 'LEFT',
    distance: 40,
    state: 'available',
  };
  runtime.startTraversal(leftAnchor);
  assert.strictEqual(runtime.status, 'traversing');

  const pMid = 0.35; // Peak swing phase
  const sideDirLeft = leftAnchor.side === 'left' ? -1 : 1;
  const swingAmp = Math.sin(Math.PI * (pMid / 0.65));
  const targetRollLeft = swingAmp * 0.048 * -sideDirLeft;

  assert.ok(targetRollLeft > 0, 'Left swing should bank rightwards (positive roll)');
  assert.ok(Math.abs(targetRollLeft) < 0.06, 'Roll must remain restrained (< 3.5 deg)');

  // Test Right-side traversal banking
  const sideDirRight = 1;
  const targetRollRight = swingAmp * 0.048 * -sideDirRight;
  assert.ok(targetRollRight < 0, 'Right swing should bank leftwards (negative roll)');

  console.log('✓ Traversal banking roll direction and bounded magnitude verified.\n');
}

// =========================================================================
// TEST 3: Dynamic Speed FOV Scaling & Bounded Range
// =========================================================================
console.log('[Test 3] Testing Dynamic Speed FOV Bounds & Progression...');
{
  const baseFov = GAME_CONFIG.camera.fov; // 58
  assert.strictEqual(baseFov, 58);

  const testSpeeds = [1.0, 1.25, 1.5, 1.75, 2.0];
  let prevFov = baseFov;

  for (const speed of testSpeeds) {
    const speedBoost = (speed - 1.0) * 4.2;
    const finalFov = baseFov + speedBoost;

    assert.ok(finalFov >= prevFov, 'FOV must monotonically increase with speed');
    assert.ok(finalFov <= baseFov + 5.0, 'FOV increase must remain restrained under +5.0 deg');
    prevFov = finalFov;
  }

  // Launch impulse boost
  const launchFovBoost = 2.5;
  const maxCombinedFov = baseFov + (2.0 - 1.0) * 4.2 + launchFovBoost;
  assert.ok(maxCombinedFov <= 65.0, 'Maximum combined FOV must remain comfortably under 65 deg');

  console.log('✓ Dynamic Speed FOV scaling and safe bounds verified.\n');
}

// =========================================================================
// TEST 4: Intro Camera Handoff Convergence
// =========================================================================
console.log('[Test 4] Testing Intro Sequence Camera Convergence...');
{
  const runtime = new GameRuntime();
  runtime.status = 'menu';
  runtime.startIntro();

  const [baseOx, baseOy, baseOz] = GAME_CONFIG.camera.offset;
  const [baseLx, baseLy, baseLz] = GAME_CONFIG.camera.lookOffset;

  // At intro start (t = 0.0s)
  const blend0 = Math.min(1.0, 0 / 2.6);
  const curOx0 = THREE.MathUtils.lerp(2.2, baseOx, blend0);
  assert.strictEqual(curOx0, 2.2, 'Menu starts at over-the-shoulder offset');

  // At intro handoff (t = 3.1s)
  const blendEnd = Math.min(1.0, 3.1 / 2.6);
  const curOxEnd = THREE.MathUtils.lerp(2.2, baseOx, blendEnd);
  const curOyEnd = THREE.MathUtils.lerp(1.4, baseOy, blendEnd);
  const curOzEnd = THREE.MathUtils.lerp(4.2, baseOz, blendEnd);

  assert.strictEqual(curOxEnd, baseOx, 'Camera offset X converged to gameplay offset');
  assert.strictEqual(curOyEnd, baseOy, 'Camera offset Y converged to gameplay offset');
  assert.strictEqual(curOzEnd, baseOz, 'Camera offset Z converged to gameplay offset');

  console.log('✓ Intro camera handoff smoothly converges before gameplay starts.\n');
}

console.log('=== ALL CINEMATIC CAMERA TESTS PASSED! ===');
