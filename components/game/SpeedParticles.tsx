'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameRuntime } from '@/lib/game/game-state';
import { getGameSettings } from '@/lib/game/settings';

const PARTICLE_COUNT = 45;

interface SpeedParticleData {
  x: number;
  y: number;
  z: number;
  speed: number;
  length: number;
}

function createInitialSpeedParticles(): SpeedParticleData[] {
  const data: SpeedParticleData[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    // Seeded pure initial positioning
    const seed = i / PARTICLE_COUNT;
    data.push({
      x: (seed - 0.5) * 22,
      y: ((i % 5) / 5 - 0.5) * 14 + 16,
      z: -((i * 13) % 50),
      speed: 35 + ((i * 7) % 30),
      length: 1.2 + ((i * 3) % 2.0),
    });
  }
  return data;
}

export function SpeedParticles() {
  const runtime = useGameRuntime();
  const instancedRef = useRef<THREE.InstancedMesh>(null);
  const dummyRef = useRef(new THREE.Object3D());
  const particlesRef = useRef<SpeedParticleData[]>(createInitialSpeedParticles());

  useFrame((_, delta) => {
    if (!instancedRef.current) return;
    if (runtime.isPaused) return;
    const dt = Math.min(delta, 0.1);

    const settings = getGameSettings();
    const isAlive = (runtime.status === 'falling' || runtime.status === 'traversing') && settings.speedEffects;
    if (!isAlive) {
      instancedRef.current.visible = false;
      return;
    }
    instancedRef.current.visible = true;

    const pz = runtime.playerPosition.z;
    const px = runtime.playerPosition.x;
    const py = runtime.playerPosition.y;
    const speedMult = runtime.currentSpeedMultiplier;
    const isTraversing = runtime.status === 'traversing';
    const dummy = dummyRef.current;

    particlesRef.current.forEach((p, i) => {
      // Advance particle forward relative to player movement
      const effectiveSpeed = p.speed * speedMult * (isTraversing ? 1.4 : 1.0);
      p.z += effectiveSpeed * dt;

      // Wrap around when past player
      if (p.z > pz + 8) {
        p.z = pz - 45 - Math.random() * 15;
        p.x = px + (Math.random() - 0.5) * 20;
        p.y = py + (Math.random() - 0.5) * 12;
      }

      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.set(0.04, 0.04, p.length * Math.max(1.0, speedMult * 0.9));
      dummy.updateMatrix();

      instancedRef.current!.setMatrixAt(i, dummy.matrix);
    });

    instancedRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={instancedRef}
      args={[undefined, undefined, PARTICLE_COUNT]}
      frustumCulled={false}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial
        color="#7dd3fc"
        transparent
        opacity={0.38}
        blending={THREE.AdditiveBlending}
      />
    </instancedMesh>
  );
}
