'use client';

import { useState, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameRuntime } from '@/lib/game/game-state';
import { GAME_CONFIG } from '@/lib/game/game-config';
import { generateChunk, ChunkData } from '@/lib/game/city-generator';
import { CityChunk } from './CityChunk';

// Cache generated chunk data by index to avoid re-generating
const chunkCache = new Map<number, ChunkData>();

function getOrGenerateChunk(idx: number): ChunkData {
  let chunk = chunkCache.get(idx);
  if (!chunk) {
    chunk = generateChunk(idx);
    chunkCache.set(idx, chunk);
  }
  return chunk;
}

export function City() {
  const runtime = useGameRuntime();
  const { chunkLength, chunksAhead, chunksBehind } = GAME_CONFIG.city;

  // Track the chunk index corresponding to player's current Z position
  const currentChunkIndexRef = useRef<number>(-999);
  const [activeChunkIndices, setActiveChunkIndices] = useState<number[]>(() => {
    // Initial chunks ahead and behind starting at Z = 0
    const indices: number[] = [];
    for (let i = -chunksBehind; i <= chunksAhead; i++) {
      indices.push(i);
    }
    return indices;
  });

  useFrame(() => {
    const playerZ = runtime.playerPosition.z;
    // player moves along -Z, so chunk index increases as player goes forward
    const chunkIdx = Math.floor(-playerZ / chunkLength);

    if (chunkIdx !== currentChunkIndexRef.current) {
      currentChunkIndexRef.current = chunkIdx;

      const newIndices: number[] = [];
      const minIdx = chunkIdx - chunksBehind;
      const maxIdx = chunkIdx + chunksAhead;

      for (let i = minIdx; i <= maxIdx; i++) {
        newIndices.push(i);
      }

      // Evict old chunks from cache that are far behind
      for (const key of chunkCache.keys()) {
        if (key < minIdx - 2 || key > maxIdx + 2) {
          chunkCache.delete(key);
        }
      }

      setActiveChunkIndices(newIndices);
    }
  });

  // Prepare active chunks data
  const activeChunks = useMemo(() => {
    return activeChunkIndices.map((idx) => getOrGenerateChunk(idx));
  }, [activeChunkIndices]);

  return (
    <group>
      {activeChunks.map((chunk) => (
        <CityChunk key={`chunk-${chunk.chunkIndex}`} chunk={chunk} />
      ))}
    </group>
  );
}
