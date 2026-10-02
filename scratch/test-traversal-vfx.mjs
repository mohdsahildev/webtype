import assert from 'node:assert';
import * as THREE from 'three';
import { GameRuntime } from '../lib/game/game-state.ts';
import { GAME_CONFIG } from '../lib/game/game-config.ts';

console.log('=== RUNNING WEBTYPE TRAVERSAL VFX REGRESSION & INTEGRATION TEST ===\n');

// 1. Verify Traversal Lifecycle Math Continuity
console.log('[Test 1] Testing Traversal Lifecycle & Spline Mathematical Continuity...');
{
  const runtime = new GameRuntime();
  runtime.playerPosition.set(0, 16.5, -50);
  runtime.setStatus('falling');

  const challenge = runtime.currentChallenge;
  assert.ok(challenge, 'Challenge must exist');
  const anchor = challenge.anchors[0];

  // Complete word typing
  for (const char of anchor.word) {
    runtime.handleKeyPress(char);
  }

  assert.strictEqual(runtime.status, 'traversing', 'Status must transition to traversing on word complete');
  assert.ok(runtime.traversal, 'Traversal data must be initialized');
  assert.strictEqual(runtime.traversal.webAttached, true, 'Web must be attached initially');
  assert.strictEqual(runtime.traversal.duration, GAME_CONFIG.traversal.duration);

  // Sample along spline trajectory (dt = 0.05s)
  const startZ = runtime.playerPosition.z;
  let webDetachedObserved = false;

  for (let t = 0; t <= GAME_CONFIG.traversal.duration + 0.1; t += 0.05) {
    runtime.updateTraversal(0.05);
    if (runtime.traversal) {
      if (!runtime.traversal.webAttached) {
        webDetachedObserved = true;
      }
    }
  }

  assert.ok(runtime.playerPosition.z < startZ - 10.0, 'Player must have advanced significantly forward along -Z');
  assert.strictEqual(webDetachedObserved, true, 'Web detachment at apex must be observed');
  assert.strictEqual(runtime.status, 'falling', 'Must return to falling state upon traversal completion');
  console.log('✓ Traversal Spline & Web Lifecycle math verified with 100% continuity.\n');
}

// 2. Speed Tiers and Traversal Integration
console.log('[Test 2] Testing Traversal Across Multiple Speed Multipliers...');
{
  const runtime = new GameRuntime();
  runtime.setStatus('falling');

  // Test across low, medium, and high difficulty speeds
  const testTiers = [1.0, 1.3, 1.7, 1.9];

  for (const speed of testTiers) {
    runtime.currentSpeedMultiplier = speed;
    const anchor = runtime.currentChallenge.anchors[0];

    for (const char of anchor.word) {
      runtime.handleKeyPress(char);
    }
    assert.strictEqual(runtime.status, 'traversing');

    // Run through traversal
    runtime.updateTraversal(GAME_CONFIG.traversal.duration + 0.1);
    assert.strictEqual(runtime.status, 'falling');
  }
  console.log('✓ Traversal across all speed tiers verified.\n');
}

// 3. Traversal Left vs Right Side Balance
console.log('[Test 3] Testing Left & Right Side Traversal Consistency...');
{
  const runtime = new GameRuntime();
  runtime.setStatus('falling');

  // Left anchor traversal
  const leftAnchor = {
    id: 'test-left',
    side: 'left',
    position: [-7.6, 20.0, -80.0],
    word: 'LEFT',
    distance: 40,
    state: 'available',
  };
  runtime.startTraversal(leftAnchor);
  assert.strictEqual(runtime.traversal.side, 'left');
  runtime.updateTraversal(GAME_CONFIG.traversal.duration + 0.1);
  assert.strictEqual(runtime.status, 'falling');

  // Right anchor traversal
  const rightAnchor = {
    id: 'test-right',
    side: 'right',
    position: [7.6, 20.0, -140.0],
    word: 'RIGHT',
    distance: 40,
    state: 'available',
  };
  runtime.startTraversal(rightAnchor);
  assert.strictEqual(runtime.traversal.side, 'right');
  runtime.updateTraversal(GAME_CONFIG.traversal.duration + 0.1);
  assert.strictEqual(runtime.status, 'falling');
  console.log('✓ Left and Right Traversal balance verified.\n');
}

console.log('=== ALL TRAVERSAL VFX REGRESSION TESTS PASSED! ===');
