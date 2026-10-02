'use client';

import { useRef, Suspense, Component, ReactNode } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameRuntime } from '@/lib/game/game-state';
import { GAME_CONFIG } from '@/lib/game/game-config';
import { CharacterModel } from './CharacterModel';

/**
 * Diagnostic Fallback Cyan Capsule
 * Shown while CharacterModel is loading or if loading fails.
 */
function FallbackCapsule() {
  return (
    <mesh position={[0, 0, 0]}>
      <capsuleGeometry args={[0.35, 1.0, 8, 16]} />
      <meshStandardMaterial
        color="#38bdf8"
        emissive="#0284c7"
        emissiveIntensity={0.5}
        roughness={0.2}
        metalness={0.8}
      />
    </mesh>
  );
}

interface ErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class CharacterErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: unknown) {
    console.warn('[Player] CharacterModel caught in ErrorBoundary:', error);
    return { hasError: true };
  }

  componentDidCatch(error: unknown, errorInfo: unknown) {
    console.error('[Player] CharacterModel ErrorBoundary details:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export function Player() {
  const runtime = useGameRuntime();
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const targetRotation = useRef(new THREE.Euler(0, 0, 0));

  useFrame((_, delta) => {
    if (runtime.isPaused) return;
    const dt = Math.min(delta, 0.1);

    // 1. Centralized pacing and speed interpolation update
    runtime.updatePacing(dt);

    if (runtime.status === 'falling') {
      // 2. Scaled forward movement along -Z
      const forwardDelta = GAME_CONFIG.movement.forwardSpeed * runtime.currentSpeedMultiplier * dt;
      runtime.playerPosition.z -= forwardDelta;
      runtime.distanceTraveled += forwardDelta;

      // 3. Continuous falling along -Y
      runtime.playerPosition.y -= GAME_CONFIG.movement.fallSpeed * dt;

      // Reset pitch and roll
      targetRotation.current.set(0.08, 0, 0);

      // 4. Check ground failure height
      if (runtime.playerPosition.y <= GAME_CONFIG.movement.failureHeight) {
        runtime.playerPosition.y = GAME_CONFIG.movement.failureHeight;
        runtime.triggerGameOver('FALL', 'ALTITUDE LOSS', 'Descended below city threshold');
      }

      // 5. Check dynamic anchor deadlines & expirations using camera frustum
      runtime.checkDeadlines(camera);
    } else if (runtime.status === 'traversing') {
      const prevZ = runtime.playerPosition.z;
      // Advance scripted traversal arc
      runtime.updateTraversal(dt);
      // Track forward distance traveled during traversal
      const deltaZ = Math.max(0, prevZ - runtime.playerPosition.z);
      runtime.distanceTraveled += deltaZ;

      // Dynamic bank / pitch angle during swing arc and launch
      if (runtime.traversal) {
        const sideDir = runtime.traversal.side === 'left' ? -1 : 1;
        const progress = Math.min(1.0, runtime.traversal.elapsed / runtime.traversal.duration);

        if (progress < 0.70) {
          // Pendulum swing phase: bank toward anchor and pitch up along arc
          const swingP = progress / 0.70;
          const roll = Math.sin(Math.PI * swingP) * 0.30 * -sideDir;
          const pitch = -0.20 + swingP * 0.42;
          targetRotation.current.set(pitch, 0, roll);
        } else {
          // Release & launch glide phase: smoothly level out
          const launchP = (progress - 0.70) / 0.30;
          const roll = THREE.MathUtils.lerp(0.08 * -sideDir, 0, launchP);
          const pitch = THREE.MathUtils.lerp(0.22, 0.08, launchP);
          targetRotation.current.set(pitch, 0, roll);
        }
      }
    } else if (runtime.status === 'menu') {
      targetRotation.current.set(0, 0, 0);
    } else if (runtime.status === 'intro') {
      runtime.updateIntro(dt);
      if (runtime.currentAnim === 'big_jump') {
        targetRotation.current.set(-0.12, 0, 0);
      } else if (runtime.currentAnim === 'falling_idle') {
        targetRotation.current.set(0.08, 0, 0);
      } else {
        targetRotation.current.set(0, 0, 0);
      }
    } else if (runtime.status === 'deathSequence') {
      runtime.updateDeathSequence(dt);
      targetRotation.current.set(0, 0, 0);
    } else if (runtime.status === 'dead') {
      targetRotation.current.set(0, 0, 0);
    }

    // Synchronize 3D mesh position and smooth rotation
    if (groupRef.current) {
      groupRef.current.position.copy(runtime.playerPosition);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        targetRotation.current.x,
        dt * 10
      );
      groupRef.current.rotation.z = THREE.MathUtils.lerp(
        groupRef.current.rotation.z,
        targetRotation.current.z,
        dt * 10
      );
    }
  });

  return (
    <group ref={groupRef} position={GAME_CONFIG.movement.initialPosition}>
      {/* 3D Rigged Animated Character with Safe Suspense & ErrorBoundary Fallback */}
      <CharacterErrorBoundary fallback={<FallbackCapsule />}>
        <Suspense fallback={<FallbackCapsule />}>
          <CharacterModel />
        </Suspense>
      </CharacterErrorBoundary>
    </group>
  );
}
