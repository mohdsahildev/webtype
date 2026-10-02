'use client';

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameRuntime } from '@/lib/game/game-state';
import { ActiveChallenge } from '@/lib/game/game-types';

const MAX_TYPING_PARTICLES = 64;

interface FeedbackParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  baseSize: number;
  r: number;
  g: number;
  b: number;
}

function createInitialTypingParticles(): FeedbackParticle[] {
  const list: FeedbackParticle[] = [];
  for (let i = 0; i < MAX_TYPING_PARTICLES; i++) {
    list.push({
      active: false,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0,
      maxLife: 0.15,
      baseSize: 0.08,
      r: 1,
      g: 1,
      b: 1,
    });
  }
  return list;
}

/**
 * TypingFeedbackVFX: Zero-GC Procedural Feedback VFX for Typing & Anchors
 * - First-Key Selection Radial Burst & Shockwave Ring
 * - Correct Keystroke Micro-Sparkles
 * - Word Completion Radial Burst
 * - Anchor Expiration Dissolve Sparkles
 */
export function TypingFeedbackVFX() {
  const runtime = useGameRuntime();

  // 1. Instanced Mesh for Particles
  const particleMeshRef = useRef<THREE.InstancedMesh>(null);
  const dummyObjRef = useRef(new THREE.Object3D());
  const dummyColorRef = useRef(new THREE.Color());
  const particlesRef = useRef<FeedbackParticle[]>(createInitialTypingParticles());

  // 2. Selection / Completion Shockwave Ring
  const shockwaveRef = useRef<THREE.Mesh>(null);
  const shockwaveState = useRef({
    active: false,
    elapsed: 0,
    duration: 0.2,
    maxScale: 1.8,
    x: 0,
    y: 0,
    z: 0,
    color: '#38bdf8',
  });

  const spawnParticles = (
    cx: number,
    cy: number,
    cz: number,
    count: number,
    speed: number,
    duration: number,
    baseSize: number,
    color: { r: number; g: number; b: number },
    spreadYBias: number = 0
  ) => {
    let spawned = 0;
    const pool = particlesRef.current;
    for (let i = 0; i < pool.length && spawned < count; i++) {
      const p = pool[i];
      if (!p.active) {
        p.active = true;
        p.x = cx + (Math.random() - 0.5) * 0.2;
        p.y = cy + (Math.random() - 0.5) * 0.2;
        p.z = cz + (Math.random() - 0.5) * 0.2;

        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const s = speed * (0.65 + Math.random() * 0.7);

        p.vx = Math.sin(phi) * Math.cos(theta) * s;
        p.vy = Math.sin(phi) * Math.sin(theta) * s + spreadYBias;
        p.vz = Math.cos(phi) * s;

        p.life = duration * (0.8 + Math.random() * 0.4);
        p.maxLife = p.life;
        p.baseSize = baseSize;
        p.r = color.r;
        p.g = color.g;
        p.b = color.b;
        spawned++;
      }
    }
  };

  const triggerShockwave = (
    x: number,
    y: number,
    z: number,
    duration: number,
    maxScale: number,
    color: string
  ) => {
    shockwaveState.current.active = true;
    shockwaveState.current.elapsed = 0;
    shockwaveState.current.duration = duration;
    shockwaveState.current.maxScale = maxScale;
    shockwaveState.current.x = x;
    shockwaveState.current.y = y;
    shockwaveState.current.z = z;
    shockwaveState.current.color = color;
  };

  // State Tracking for Gameplay Transitions
  const prevChallengeIdRef = useRef<string | null>(null);
  const prevSelectedIdRef = useRef<string | null>(null);
  const prevTypedIndexRef = useRef<number>(0);
  const prevCompletedRef = useRef<boolean>(false);
  const prevAnchorStatesRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const unsub = runtime.subscribeChallenge((challenge: ActiveChallenge | null) => {
      if (!challenge) {
        prevChallengeIdRef.current = null;
        prevSelectedIdRef.current = null;
        prevTypedIndexRef.current = 0;
        prevCompletedRef.current = false;
        prevAnchorStatesRef.current.clear();
        return;
      }

      const isNewChallenge = challenge.id !== prevChallengeIdRef.current;
      if (isNewChallenge) {
        prevChallengeIdRef.current = challenge.id;
        prevSelectedIdRef.current = challenge.selectedAnchorId;
        prevTypedIndexRef.current = challenge.typedIndex;
        prevCompletedRef.current = challenge.isCompleted;
        prevAnchorStatesRef.current.clear();
        challenge.anchors.forEach((a) => {
          prevAnchorStatesRef.current.set(a.id, a.state);
        });
        return;
      }

      const selectedAnchor = challenge.anchors.find(
        (a) => a.id === challenge.selectedAnchorId
      );

      // 1. FIRST-KEY SELECTION EVENT
      if (
        challenge.selectedAnchorId &&
        challenge.selectedAnchorId !== prevSelectedIdRef.current &&
        selectedAnchor
      ) {
        const [ax, ay, az] = selectedAnchor.position;
        // Selection radial burst (8 particles, crisp sky-blue / white)
        spawnParticles(ax, ay, az, 8, 3.5, 0.20, 0.07, { r: 0.5, g: 0.85, b: 1.0 });
        // Quick expanding selection ring
        triggerShockwave(ax, ay, az, 0.22, 1.6, '#38bdf8');
      }

      // 2. CORRECT KEYSTROKE PROGRESSION (typedIndex advance without completion)
      if (
        challenge.selectedAnchorId &&
        challenge.typedIndex > prevTypedIndexRef.current &&
        !challenge.isCompleted &&
        selectedAnchor
      ) {
        const [ax, ay, az] = selectedAnchor.position;
        // Micro character spark near anchor (2-3 particles)
        spawnParticles(ax, ay - 0.4, az, 3, 2.2, 0.12, 0.05, { r: 0.8, g: 0.95, b: 1.0 });
      }

      // 3. WORD COMPLETION EVENT
      if (challenge.isCompleted && !prevCompletedRef.current && selectedAnchor) {
        const [ax, ay, az] = selectedAnchor.position;
        // Success radial burst (12-14 particles, radiant emerald / gold-white)
        spawnParticles(ax, ay, az, 14, 5.0, 0.24, 0.09, { r: 0.4, g: 1.0, b: 0.7 });
        // Strong completion shockwave
        triggerShockwave(ax, ay, az, 0.25, 2.2, '#34d399');
      }

      // 4. ANCHOR EXPIRATION DISSOLVE
      challenge.anchors.forEach((a) => {
        const prevState = prevAnchorStatesRef.current.get(a.id);
        if (prevState === 'available' && a.state === 'expired') {
          const [ax, ay, az] = a.position;
          // Soft dissolving downward particles (5-6 particles, muted slate)
          spawnParticles(ax, ay, az, 6, 2.0, 0.18, 0.06, { r: 0.4, g: 0.45, b: 0.55 }, -0.8);
        }
        prevAnchorStatesRef.current.set(a.id, a.state);
      });

      prevSelectedIdRef.current = challenge.selectedAnchorId;
      prevTypedIndexRef.current = challenge.typedIndex;
      prevCompletedRef.current = challenge.isCompleted;
    });

    return () => unsub();
  }, [runtime]);

  useFrame((_, delta) => {
    if (runtime.isPaused) return;
    const dt = Math.min(delta, 0.1);

    // Update Particles
    if (particleMeshRef.current) {
      const dummyObj = dummyObjRef.current;
      const dummyColor = dummyColorRef.current;
      const particles = particlesRef.current;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (p.active) {
          p.life -= dt;
          if (p.life <= 0) {
            p.active = false;
            dummyObj.position.set(0, -999, 0);
            dummyObj.scale.set(0, 0, 0);
            dummyObj.updateMatrix();
            particleMeshRef.current.setMatrixAt(i, dummyObj.matrix);
          } else {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;
            p.vx *= 0.90;
            p.vy *= 0.90;
            p.vz *= 0.90;

            const ratio = p.life / p.maxLife;
            const curScale = p.baseSize * ratio;

            dummyObj.position.set(p.x, p.y, p.z);
            dummyObj.scale.set(curScale, curScale, curScale);
            dummyObj.updateMatrix();
            particleMeshRef.current.setMatrixAt(i, dummyObj.matrix);

            dummyColor.setRGB(p.r, p.g, p.b);
            particleMeshRef.current.setColorAt(i, dummyColor);
          }
        } else {
          dummyObj.position.set(0, -999, 0);
          dummyObj.scale.set(0, 0, 0);
          dummyObj.updateMatrix();
          particleMeshRef.current.setMatrixAt(i, dummyObj.matrix);
        }
      }
      particleMeshRef.current.instanceMatrix.needsUpdate = true;
      if (particleMeshRef.current.instanceColor) {
        particleMeshRef.current.instanceColor.needsUpdate = true;
      }
    }

    // Update Shockwave Ring
    if (shockwaveRef.current) {
      const sw = shockwaveState.current;
      if (sw.active) {
        sw.elapsed += dt;
        const progress = sw.elapsed / sw.duration;
        if (progress >= 1.0) {
          sw.active = false;
          shockwaveRef.current.visible = false;
        } else {
          shockwaveRef.current.visible = true;
          shockwaveRef.current.position.set(sw.x, sw.y, sw.z);
          shockwaveRef.current.rotation.set(0, 0, 0);

          const scale = THREE.MathUtils.lerp(0.3, sw.maxScale, Math.sqrt(progress));
          shockwaveRef.current.scale.set(scale, scale, scale);

          const mat = shockwaveRef.current.material as THREE.MeshBasicMaterial;
          mat.color.set(sw.color);
          mat.opacity = (1 - progress) * 0.85;
        }
      } else {
        shockwaveRef.current.visible = false;
      }
    }
  });

  return (
    <group>
      {/* 1. Shared Instanced Mesh for Typing Feedback Particles */}
      <instancedMesh
        ref={particleMeshRef}
        args={[undefined, undefined, MAX_TYPING_PARTICLES]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </instancedMesh>

      {/* 2. Selection & Completion Shockwave Ring */}
      <mesh ref={shockwaveRef} visible={false}>
        <ringGeometry args={[0.2, 0.38, 28]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
