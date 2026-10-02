'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WordChallenge } from './WordChallenge';
import { ChallengeSide, AnchorState } from '@/lib/game/game-types';
import { useGameRuntime } from '@/lib/game/game-state';

interface AnchorProps {
  side: ChallengeSide;
  position: [number, number, number];
  word: string;
  state: AnchorState;
  isOtherSelected: boolean;
  typedIndex: number;
  hasError?: boolean;
}

export function Anchor({
  side,
  position,
  word,
  state,
  isOtherSelected,
  typedIndex,
  hasError,
}: AnchorProps) {
  const runtime = useGameRuntime();
  const isLeft = side === 'left';
  const isExpired = state === 'expired';
  const isSelected = state === 'selected';
  const isCompleted = state === 'completed';
  const isAvailable = state === 'available';

  const groupRef = useRef<THREE.Group>(null);
  const visualGroupRef = useRef<THREE.Group>(null);
  const pulseRingRef = useRef<THREE.Mesh>(null);
  const orbitRingRef = useRef<THREE.Mesh>(null);
  const coreMeshRef = useRef<THREE.Mesh>(null);

  // Selection bounce animation ref
  const selectionAnimRef = useRef({
    wasSelected: false,
    timer: 0,
  });

  // Base palette (clean, crisp daytime styling)
  const baseColor = isExpired
    ? '#475569'
    : isCompleted
    ? '#10b981'
    : isSelected
    ? '#38bdf8'
    : isLeft
    ? '#0284c7'
    : '#0ea5e9';

  const emissiveColor = isExpired
    ? '#1e293b'
    : isCompleted
    ? '#059669'
    : isSelected
    ? '#0284c7'
    : isLeft
    ? '#0369a1'
    : '#0284c7';

  let targetScale = 1.0;
  let emissiveIntensity = 0.85;
  let opacity = 1.0;

  if (isExpired) {
    targetScale = 0.45;
    emissiveIntensity = 0.05;
    opacity = 0.20;
  } else if (isOtherSelected) {
    targetScale = 0.70;
    emissiveIntensity = 0.20;
    opacity = 0.35;
  } else if (isSelected) {
    targetScale = 1.25;
    emissiveIntensity = 2.2;
    opacity = 1.0;
  } else if (isCompleted) {
    targetScale = 1.35;
    emissiveIntensity = 2.6;
    opacity = 1.0;
  }

  useFrame((stateObj, delta) => {
    if (runtime.isPaused) return;
    const time = stateObj.clock.getElapsedTime();
    const dt = Math.min(delta, 0.1);

    // Player proximity check for expiration warning
    const playerZ = runtime.playerPosition.z;
    const anchorZ = position[2];
    const distToPlayerZ = playerZ - anchorZ;
    // Approaching expiration threshold: when player is within 10 units of anchor Z while still available
    const isNearExpiration = isAvailable && distToPlayerZ < 10.5 && distToPlayerZ > 0;

    // Selection impact pop animation (150-250ms impact)
    if (isSelected) {
      if (!selectionAnimRef.current.wasSelected) {
        selectionAnimRef.current.wasSelected = true;
        selectionAnimRef.current.timer = 0.22;
      }
    } else {
      selectionAnimRef.current.wasSelected = false;
    }

    if (selectionAnimRef.current.timer > 0) {
      selectionAnimRef.current.timer = Math.max(0, selectionAnimRef.current.timer - dt);
    }

    // 1. Anchor Idle Floating, Breathing & Gentle Swivel
    if (visualGroupRef.current) {
      if (isExpired) {
        // Smooth shrink upon expiration
        visualGroupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), dt * 10);
        visualGroupRef.current.position.y = 0;
        visualGroupRef.current.rotation.z = 0;
      } else if (isSelected || isCompleted) {
        // Selected / Completed state: pop or stable lock
        let popScale = targetScale;
        if (selectionAnimRef.current.timer > 0) {
          const popFactor = Math.sin((selectionAnimRef.current.timer / 0.22) * Math.PI);
          popScale += popFactor * 0.20; // Brief punch to ~1.45x
        }
        visualGroupRef.current.scale.lerp(new THREE.Vector3(popScale, popScale, popScale), dt * 12);
        visualGroupRef.current.position.y = 0;
        visualGroupRef.current.rotation.z = Math.sin(time * 2.0) * 0.03;
      } else {
        // Available or Subdued: subtle float & breathing
        const floatSpeed = isNearExpiration ? 5.5 : isOtherSelected ? 1.5 : 2.5;
        const floatAmp = isOtherSelected ? 0.03 : 0.08;
        const breath = 1.0 + Math.sin(time * (isNearExpiration ? 7.0 : 3.0) + position[2]) * (isNearExpiration ? 0.05 : 0.02);

        const currentTargetScale = targetScale * breath;
        visualGroupRef.current.scale.lerp(new THREE.Vector3(currentTargetScale, currentTargetScale, currentTargetScale), dt * 8);
        visualGroupRef.current.position.y = Math.sin(time * floatSpeed + position[2] * 0.5) * floatAmp;
        visualGroupRef.current.rotation.z = Math.sin(time * 1.5 + position[0]) * 0.04;
      }
    }

    // 2. Pulse Outer Ring
    if (pulseRingRef.current) {
      if (isSelected || isCompleted) {
        const pScale = 1.0 + Math.sin(time * 9.0) * 0.16;
        pulseRingRef.current.scale.set(pScale, pScale, 1);
        pulseRingRef.current.rotation.z += dt * 1.5;
      } else if (isNearExpiration) {
        // Fast warning pulse
        const pScale = 1.0 + Math.sin(time * 12.0) * 0.12;
        pulseRingRef.current.scale.set(pScale, pScale, 1);
      } else if (isAvailable && !isOtherSelected) {
        // Gentle available pulse
        const pScale = 1.0 + Math.sin(time * 3.0 + position[2]) * 0.06;
        pulseRingRef.current.scale.set(pScale, pScale, 1);
      }
    }

    // 3. Orbit Ring (Active for Selected Anchor)
    if (orbitRingRef.current) {
      if (isSelected) {
        orbitRingRef.current.visible = true;
        orbitRingRef.current.rotation.z -= dt * 2.5;
      } else {
        orbitRingRef.current.visible = false;
      }
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <group ref={visualGroupRef}>
        {/* Building Wall Mount Armature & Bracket */}
        <group position={[isLeft ? -0.35 : 0.35, 0, 0]}>
          {/* Wall Mount Base Plate on building facade */}
          <mesh position={[isLeft ? -0.15 : 0.15, 0, 0]}>
            <boxGeometry args={[0.1, 0.9, 0.9]} />
            <meshStandardMaterial
              color="#1e293b"
              roughness={0.5}
              metalness={0.8}
            />
          </mesh>

          {/* Horizontal Extension Strut connecting facade to anchor core */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.06, 0.08, 0.5, 8]} />
            <meshStandardMaterial
              color="#334155"
              metalness={0.9}
              roughness={0.3}
            />
          </mesh>

          {/* Glowing Conduit Ring on Wall Mount */}
          <mesh position={[isLeft ? -0.1 : 0.1, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <ringGeometry args={[0.2, 0.28, 16]} />
            <meshBasicMaterial
              color={baseColor}
              transparent
              opacity={opacity * 0.85}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>

        {/* Anchor Core Sphere */}
        <mesh ref={coreMeshRef}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial
            color={baseColor}
            emissive={emissiveColor}
            emissiveIntensity={emissiveIntensity}
            transparent
            opacity={opacity}
            roughness={0.2}
            metalness={0.9}
          />
        </mesh>

        {/* Anchor Target Outer Pulse Ring */}
        <mesh ref={pulseRingRef} rotation={[0, 0, 0]}>
          <ringGeometry args={[0.42, 0.52, 24]} />
          <meshBasicMaterial
            color={baseColor}
            transparent
            opacity={opacity * 0.85}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Selected Anchor Orbit Reticle */}
        <mesh ref={orbitRingRef} visible={false}>
          <ringGeometry args={[0.58, 0.64, 16]} />
          <meshBasicMaterial
            color="#e0f2fe"
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* 3D Floating Word Billboard */}
        {word ? (
          <WordChallenge
            word={word}
            side={side}
            state={state}
            isOtherSelected={isOtherSelected}
            typedIndex={typedIndex}
            hasError={hasError}
          />
        ) : null}
      </group>
    </group>
  );
}
