import { GAME_CONFIG } from './game-config';
import {
  BuildingAssetDef,
  MAIN_BUILDINGS,
  SKYSCRAPER_BUILDINGS,
  LOW_DETAIL_BUILDINGS,
} from './city-assets';

export interface BuildingData {
  id: string;
  assetId: string;
  modelPath: string;
  side: 'left' | 'right';
  position: [number, number, number]; // [posX, posY, posZ]
  rotation: [number, number, number]; // [rotX, rotY, rotZ]
  scale: number;
  size: [number, number, number]; // World-space [width, height, depth]
}

export interface ChunkData {
  chunkIndex: number;
  centerZ: number;
  length: number;
  buildings: BuildingData[];
}

/**
 * Seeded pseudo-random number generator (Mulberry32)
 * Ensures 100% deterministic generation for any given chunk index.
 */
function createPRNG(seed: number) {
  let s = (seed ^ 0xdeadbeef) >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate all deterministic Kenney Commercial buildings for a specific chunk index.
 * Note: Forward along -Z means chunkIndex 0 is [0 to -chunkLength], chunkIndex 1 is [-chunkLength to -2*chunkLength], etc.
 */
export function generateChunk(chunkIndex: number): ChunkData {
  const { chunkLength, corridorHalfWidth } = GAME_CONFIG.city;

  const startZ = -chunkIndex * chunkLength;
  const endZ = -(chunkIndex + 1) * chunkLength;
  const centerZ = (startZ + endZ) / 2;

  const buildings: BuildingData[] = [];
  const rng = createPRNG(chunkIndex * 9973 + 42);

  const sides: ('left' | 'right')[] = ['left', 'right'];

  for (const side of sides) {
    const isLeft = side === 'left';
    const sign = isLeft ? -1 : 1;
    let buildingCount = 0;

    // =========================================================================
    // LAYER 1: Corridor Edge Street Facades (Main Commercial Buildings)
    // =========================================================================
    let curZ = startZ + 2;
    while (curZ > endZ + 4) {
      buildingCount++;
      const id = `chunk-${chunkIndex}-${side}-L1-${buildingCount}`;

      // Pick main commercial building
      const asset: BuildingAssetDef =
        MAIN_BUILDINGS[Math.floor(rng() * MAIN_BUILDINGS.length)];
      const scale = asset.minScale + rng() * (asset.maxScale - asset.minScale);

      // Facing inward toward the central corridor
      const rotY = isLeft ? Math.PI / 2 : -Math.PI / 2;

      // After 90 deg rotation: native width is along Z, native depth is along X
      const sizeZ = asset.nativeSize[0] * scale;
      const sizeX = asset.nativeSize[2] * scale;
      const sizeY = asset.nativeSize[1] * scale;

      // Inner facade boundary aligns safely at or slightly set back from corridor edge (7.6m)
      const setback = 0.2 + rng() * 0.6;
      const posX = sign * (corridorHalfWidth + sizeX / 2 + setback);
      const posZ = curZ - sizeZ / 2;

      buildings.push({
        id,
        assetId: asset.id,
        modelPath: asset.path,
        side,
        position: [posX, 0, posZ],
        rotation: [0, rotY, 0],
        scale,
        size: [sizeX, sizeY, sizeZ],
      });

      // Tightly advance along Z with realistic urban spacing
      const streetGap = 1.2 + rng() * 2.2;
      curZ -= sizeZ + streetGap;
    }

    // =========================================================================
    // LAYER 2: Midground Urban Skyline (Mixed Main, Mid-Rise Skyscrapers & Low-Detail)
    // =========================================================================
    let midZ = startZ - 4;
    let midCount = 0;
    while (midZ > endZ + 6) {
      midCount++;
      const id = `chunk-${chunkIndex}-${side}-L2-${midCount}`;

      const tierRoll = rng();
      let asset: BuildingAssetDef;
      if (tierRoll < 0.5) {
        asset = MAIN_BUILDINGS[Math.floor(rng() * MAIN_BUILDINGS.length)];
      } else if (tierRoll < 0.8) {
        asset = SKYSCRAPER_BUILDINGS[Math.floor(rng() * SKYSCRAPER_BUILDINGS.length)];
      } else {
        asset = LOW_DETAIL_BUILDINGS[Math.floor(rng() * LOW_DETAIL_BUILDINGS.length)];
      }

      const scale = asset.minScale + rng() * (asset.maxScale - asset.minScale);

      // Varied rotation for visual interest
      const rotOptions = [0, Math.PI / 2, -Math.PI / 2, Math.PI];
      const rotY = rotOptions[Math.floor(rng() * rotOptions.length)];

      const isRotated90 = Math.abs(Math.sin(rotY)) > 0.5;
      const sizeX = (isRotated90 ? asset.nativeSize[2] : asset.nativeSize[0]) * scale;
      const sizeZ = (isRotated90 ? asset.nativeSize[0] : asset.nativeSize[2]) * scale;
      const sizeY = asset.nativeSize[1] * scale;

      const posX = sign * (17.5 + rng() * 4.5);
      const posZ = midZ - sizeZ / 2;

      buildings.push({
        id,
        assetId: asset.id,
        modelPath: asset.path,
        side,
        position: [posX, 0, posZ],
        rotation: [0, rotY, 0],
        scale,
        size: [sizeX, sizeY, sizeZ],
      });

      midZ -= 16.0 + rng() * 7.0;
    }

    // =========================================================================
    // LAYER 3: Background Silhouette (Majestic Skyscrapers & Low-Detail Towers)
    // =========================================================================
    let skyZ = startZ - 8;
    let skyCount = 0;
    while (skyZ > endZ + 8) {
      skyCount++;
      const id = `chunk-${chunkIndex}-${side}-L3-${skyCount}`;

      const isSkyscraper = rng() < 0.45;
      const asset: BuildingAssetDef = isSkyscraper
        ? SKYSCRAPER_BUILDINGS[Math.floor(rng() * SKYSCRAPER_BUILDINGS.length)]
        : LOW_DETAIL_BUILDINGS[Math.floor(rng() * LOW_DETAIL_BUILDINGS.length)];

      const scale = asset.minScale + rng() * (asset.maxScale - asset.minScale);
      const rotOptions = [0, Math.PI / 2, -Math.PI / 2];
      const rotY = rotOptions[Math.floor(rng() * rotOptions.length)];

      const isRotated90 = Math.abs(Math.sin(rotY)) > 0.5;
      const sizeX = (isRotated90 ? asset.nativeSize[2] : asset.nativeSize[0]) * scale;
      const sizeZ = (isRotated90 ? asset.nativeSize[0] : asset.nativeSize[2]) * scale;
      const sizeY = asset.nativeSize[1] * scale;

      const posX = sign * (27.0 + rng() * 9.0);
      const posZ = skyZ - sizeZ / 2;

      buildings.push({
        id,
        assetId: asset.id,
        modelPath: asset.path,
        side,
        position: [posX, 0, posZ],
        rotation: [0, rotY, 0],
        scale,
        size: [sizeX, sizeY, sizeZ],
      });

      skyZ -= 22.0 + rng() * 11.0;
    }
  }

  return {
    chunkIndex,
    centerZ,
    length: chunkLength,
    buildings,
  };
}
