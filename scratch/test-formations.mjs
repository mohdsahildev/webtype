import assert from 'node:assert';
import { GameRuntime } from '../lib/game/game-state.ts';
import { FORMATION_CONFIG, selectNextFormation, generateAnchorLayout } from '../lib/game/formations.ts';

console.log('--- STARTING WEBTYPE ANCHOR FORMATION SYSTEM VERIFICATION ---');

// Test 1: All 8 formation types generation
console.log('[Test 1] Testing layout generation for all 8 formation types...');
const allFormations = [
  'LEFT_ONLY',
  'RIGHT_ONLY',
  'BALANCED',
  'LEFT_HEAVY',
  'RIGHT_HEAVY',
  'ALTERNATING',
  'WIDE_SPLIT',
  'MIXED_RANDOM',
];

for (const f of allFormations) {
  for (let count = 2; count <= 4; count++) {
    const layout = generateAnchorLayout(f, count);
    assert.strictEqual(layout.length, count, `Layout must have ${count} anchors for formation ${f}`);

    if (f === 'LEFT_ONLY') {
      layout.forEach(a => {
        assert.strictEqual(a.side, 'left');
        assert.ok(a.x < 0, 'Left anchors must have negative X');
      });
    }

    if (f === 'RIGHT_ONLY') {
      layout.forEach(a => {
        assert.strictEqual(a.side, 'right');
        assert.ok(a.x > 0, 'Right anchors must have positive X');
      });
    }

    if (f === 'LEFT_HEAVY') {
      const lefts = layout.filter(a => a.side === 'left').length;
      const rights = layout.filter(a => a.side === 'right').length;
      assert.ok(lefts >= 1, 'LEFT_HEAVY must have left anchors');
      assert.ok(rights >= 1, 'LEFT_HEAVY must have at least one right anchor');
      if (count > 2) {
        assert.ok(lefts > rights, 'LEFT_HEAVY must have more left anchors than right');
      }
    }

    if (f === 'RIGHT_HEAVY') {
      const lefts = layout.filter(a => a.side === 'left').length;
      const rights = layout.filter(a => a.side === 'right').length;
      assert.ok(rights >= 1, 'RIGHT_HEAVY must have right anchors');
      assert.ok(lefts >= 1, 'RIGHT_HEAVY must have at least one left anchor');
      if (count > 2) {
        assert.ok(rights > lefts, 'RIGHT_HEAVY must have more right anchors than left');
      }
    }

    if (f === 'ALTERNATING') {
      for (let i = 1; i < layout.length; i++) {
        assert.notStrictEqual(layout[i].side, layout[i - 1].side, 'Sides must alternate');
      }
    }

    if (f === 'WIDE_SPLIT') {
      layout.forEach(a => {
        assert.ok(Math.abs(a.x) >= 7.8, 'WIDE_SPLIT must place anchors near outer corridor zone');
        assert.ok(Math.abs(a.x) <= 9.0, 'WIDE_SPLIT must stay within playable corridor bounds');
      });
    }
  }
}
console.log('✓ All 8 formation types generate valid spatial layouts.');

// Test 2: Anti-Repeat Rules
console.log('[Test 2] Testing Anti-Repeat History Rules...');
{
  // Cannot have LEFT_ONLY twice consecutively
  for (let i = 0; i < 200; i++) {
    const next = selectNextFormation(['LEFT_ONLY']);
    assert.notStrictEqual(next, 'LEFT_ONLY', 'LEFT_ONLY must not repeat consecutively');
  }

  // Cannot have RIGHT_ONLY twice consecutively
  for (let i = 0; i < 200; i++) {
    const next = selectNextFormation(['RIGHT_ONLY']);
    assert.notStrictEqual(next, 'RIGHT_ONLY', 'RIGHT_ONLY must not repeat consecutively');
  }

  // Cannot have BALANCED 3 times consecutively
  for (let i = 0; i < 200; i++) {
    const next = selectNextFormation(['BALANCED', 'BALANCED']);
    assert.notStrictEqual(next, 'BALANCED', 'Cannot repeat same formation 3 times consecutively');
  }
}
console.log('✓ Anti-repeat rules strictly enforced.');

// Test 3: Large-Scale Distribution Check (5,000 samples)
console.log('[Test 3] Testing Weighted Distribution over 5,000 iterations...');
{
  const counts = {};
  allFormations.forEach(f => counts[f] = 0);

  let history = [];
  const TOTAL_SAMPLES = 5000;

  for (let i = 0; i < TOTAL_SAMPLES; i++) {
    const formation = selectNextFormation(history);
    counts[formation]++;
    history.push(formation);
    if (history.length > 5) history.shift();
  }

  console.log('Sampled Formation Distribution:');
  allFormations.forEach(f => {
    const pct = ((counts[f] / TOTAL_SAMPLES) * 100).toFixed(1);
    console.log(`  ${f.padEnd(14)}: ${pct}% (${counts[f]} times)`);
    assert.ok(counts[f] > 0, `Formation ${f} must appear in distribution`);
  });
}
console.log('✓ Formation distribution verified.');

// Test 4: Integration with GameRuntime & Unique First Letters
console.log('[Test 4] Testing Runtime Challenge Generation & Unique First Letters...');
{
  const runtime = new GameRuntime();
  for (let round = 0; round < 50; round++) {
    runtime.spawnNextChallenge();
    const challenge = runtime.currentChallenge;
    assert.ok(challenge, 'Challenge must exist');
    assert.ok(challenge.formation, 'Challenge must have a formation');
    assert.ok(challenge.anchors.length >= 2 && challenge.anchors.length <= 4, 'Anchor count must be 2-4');

    const initials = challenge.anchors.map(a => a.word[0]);
    const uniqueInitials = new Set(initials);
    assert.strictEqual(initials.length, uniqueInitials.size, 'All active anchors must have unique first letters');
  }
}
console.log('✓ Runtime challenge generation & unique first letter rules verified.');

console.log('--- ALL ANCHOR FORMATION TESTS PASSED! ---');
