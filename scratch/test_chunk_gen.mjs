import { KENNEY_COMMERCIAL_ASSETS, MAIN_BUILDINGS, SKYSCRAPER_BUILDINGS, LOW_DETAIL_BUILDINGS, getAssetDef } from '../lib/game/city-assets.js';

function createPRNG(seed) {
  let s = (seed ^ 0xdeadbeef) >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function testChunkGeneration(chunkIndex) {
  const rng = createPRNG(chunkIndex * 9973 + 42);
  const chunkLength = 90;
  const startZ = -chunkIndex * chunkLength;
  const endZ = -(chunkIndex + 1) * chunkLength;
  const buildings = [];

  const sides = ['left', 'right'];

  for (const side of sides) {
    const isLeft = side === 'left';
    const sign = isLeft ? -1 : 1;

    // Layer 1: Street Facades
    let curZ = startZ;
    while (curZ > endZ + 4) {
      const asset = MAIN_BUILDINGS[Math.floor(rng() * MAIN_BUILDINGS.length)];
      const scale = asset.minScale + rng() * (asset.maxScale - asset.minScale);
      const rotY = isLeft ? Math.PI / 2 : -Math.PI / 2;

      // After 90 deg rotation: native width is along Z, native depth is along X
      const sizeZ = asset.nativeSize[0] * scale;
      const sizeX = asset.nativeSize[2] * scale;
      const sizeY = asset.nativeSize[1] * scale;

      const posX = sign * (7.6 + sizeX / 2 + rng() * 0.4);
      const posZ = curZ - sizeZ / 2;

      buildings.push({
        id: `c${chunkIndex}-${side}-L1-${buildings.length}`,
        assetId: asset.id,
        category: asset.category,
        pos: [posX.toFixed(1), 0, posZ.toFixed(1)],
        size: [sizeX.toFixed(1), sizeY.toFixed(1), sizeZ.toFixed(1)],
        scale: scale.toFixed(2),
      });

      curZ -= sizeZ + 1.2 + rng() * 2.0;
    }

    // Layer 2: Midground
    let midZ = startZ - 5;
    while (midZ > endZ + 6) {
      const pickTier = rng();
      let asset;
      if (pickTier < 0.5) {
        asset = MAIN_BUILDINGS[Math.floor(rng() * MAIN_BUILDINGS.length)];
      } else if (pickTier < 0.8) {
        asset = SKYSCRAPER_BUILDINGS[Math.floor(rng() * SKYSCRAPER_BUILDINGS.length)];
      } else {
        asset = LOW_DETAIL_BUILDINGS[Math.floor(rng() * LOW_DETAIL_BUILDINGS.length)];
      }

      const scale = asset.minScale + rng() * (asset.maxScale - asset.minScale);
      const posX = sign * (17.5 + rng() * 3.5);
      const posZ = midZ - (asset.nativeSize[2] * scale) / 2;

      buildings.push({
        id: `c${chunkIndex}-${side}-L2-${buildings.length}`,
        assetId: asset.id,
        category: asset.category,
        pos: [posX.toFixed(1), 0, posZ.toFixed(1)],
        scale: scale.toFixed(2),
      });

      midZ -= 16.0 + rng() * 6.0;
    }

    // Layer 3: Background Skyline
    let skyZ = startZ - 8;
    while (skyZ > endZ + 10) {
      const isSkyscraper = rng() < 0.45;
      const asset = isSkyscraper
        ? SKYSCRAPER_BUILDINGS[Math.floor(rng() * SKYSCRAPER_BUILDINGS.length)]
        : LOW_DETAIL_BUILDINGS[Math.floor(rng() * LOW_DETAIL_BUILDINGS.length)];

      const scale = asset.minScale + rng() * (asset.maxScale - asset.minScale);
      const posX = sign * (26.0 + rng() * 8.0);
      const posZ = skyZ - (asset.nativeSize[2] * scale) / 2;

      buildings.push({
        id: `c${chunkIndex}-${side}-L3-${buildings.length}`,
        assetId: asset.id,
        category: asset.category,
        pos: [posX.toFixed(1), 0, posZ.toFixed(1)],
        scale: scale.toFixed(2),
      });

      skyZ -= 22.0 + rng() * 10.0;
    }
  }

  return buildings;
}

console.log('--- Testing Chunk 0 Generation ---');
const c0 = testChunkGeneration(0);
console.log(`Generated ${c0.length} buildings in Chunk 0`);
console.log('Sample buildings:');
console.log(c0.slice(0, 10));

console.log('--- Testing Chunk 1 Generation ---');
const c1 = testChunkGeneration(1);
console.log(`Generated ${c1.length} buildings in Chunk 1`);
