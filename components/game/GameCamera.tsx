'use client';

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameRuntime } from '@/lib/game/game-state';
import { GAME_CONFIG } from '@/lib/game/game-config';
import { getGameSettings } from '@/lib/game/settings';

/**
 * GameCamera: Cinematic Third-Person Camera with Forward Anticipation,
 * Traversal Banking, Dynamic Speed FOV, and Additive Ground Impact Shake.
 *
 * Strictly READ-ONLY with respect to gameplay systems.
 */
export function GameCamera() {
  const runtime = useGameRuntime();
  const camera = useThree((state) => state.camera);

  const isInitializedRef = useRef(false);

  // Pre-allocated Vector & Rotation Pool (Zero GC per frame)
  const targetPos = useRef(new THREE.Vector3());
  const lookTarget = useRef(new THREE.Vector3());
  const currentLookAt = useRef(new THREE.Vector3());
  const currentRollRef = useRef(0);

  // Set initial camera projection parameters
  useEffect(() => {
    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const persCam = camera as THREE.PerspectiveCamera;
      persCam.fov = GAME_CONFIG.camera.fov;
      persCam.near = 0.1;
      persCam.far = 450;
      persCam.updateProjectionMatrix();
    }
  }, [camera]);

  // Handle game restart / reset cleanly
  useEffect(() => {
    const unsub = runtime.subscribeStatus((status) => {
      if (status === 'falling' && runtime.distanceTraveled === 0) {
        // Player reset back to start: snap camera immediately
        isInitializedRef.current = false;
      }
    });
    return () => unsub();
  }, [runtime]);

  useFrame((_, delta) => {
    if (!camera) return;
    if (runtime.isPaused) return;
    const dt = Math.min(delta, 0.1);

    const baseOx = GAME_CONFIG.camera.offset[0] || 0;
    const baseOy = GAME_CONFIG.camera.offset[1] || 1.9;
    const baseOz = GAME_CONFIG.camera.offset[2] || 4.9;

    const baseLx = GAME_CONFIG.camera.lookOffset[0] || 0;
    const baseLy = GAME_CONFIG.camera.lookOffset[1] || 0.7;
    const baseLz = GAME_CONFIG.camera.lookOffset[2] || -19.0;

    const px = runtime.playerPosition.x;
    const py = runtime.playerPosition.y;
    const pz = runtime.playerPosition.z;

    const speedMult = runtime.currentSpeedMultiplier || 1.0;
    const status = runtime.status;
    const traversal = runtime.traversal;

    let targetRoll = 0;
    let launchPullback = 0;
    let launchFovBoost = 0;

    // =========================================================================
    // 1. STATE-DEPENDENT CAMERA FRAMING
    // =========================================================================
    if (status === 'menu') {
      // Cinematic Over-The-Shoulder Menu Framing
      targetPos.current.set(px + 2.2, py + 1.4, pz + 4.2);
      lookTarget.current.set(px, py - 0.4, pz - 9.0);
    } else if (status === 'intro') {
      // Smooth interpolation from menu framing into active gameplay framing across 3.1s sequence
      const blend = Math.min(1.0, runtime.introTimer / 2.6);
      const easeBlend = blend * blend * (3 - 2 * blend); // smooth hermite curve

      const curOx = THREE.MathUtils.lerp(2.2, baseOx, easeBlend);
      const curOy = THREE.MathUtils.lerp(1.4, baseOy, easeBlend);
      const curOz = THREE.MathUtils.lerp(4.2, baseOz, easeBlend);

      const curLx = THREE.MathUtils.lerp(0, baseLx, easeBlend);
      const curLy = THREE.MathUtils.lerp(-0.4, baseLy, easeBlend);
      const curLz = THREE.MathUtils.lerp(-9.0, baseLz, easeBlend);

      targetPos.current.set(px + curOx, py + curOy, pz + curOz);
      lookTarget.current.set(px + curLx, py + curLy, pz + curLz);
    } else if (status === 'traversing' && traversal) {
      // Traversal Swing Framing with Lateral Lean and Launch Emphasis
      const progress = Math.min(1.0, traversal.elapsed / traversal.duration);
      const sideDir = traversal.side === 'left' ? -1 : 1;

      if (progress < 0.65) {
        // Swing Phase: Subtle lateral follow and banking roll
        const swingP = progress / 0.65;
        const swingAmp = Math.sin(Math.PI * swingP);
        targetRoll = swingAmp * 0.048 * -sideDir; // ~2.75 deg roll

        const lateralSway = swingAmp * 0.45 * sideDir;
        targetPos.current.set(px + baseOx + lateralSway, py + baseOy, pz + baseOz);
        lookTarget.current.set(px + baseLx + lateralSway * 0.5, py + baseLy, pz + baseLz);
      } else {
        // Forward Launch Phase: Smooth return of roll, brief dynamic pull-back
        const launchP = (progress - 0.65) / 0.35;
        const launchAmp = Math.sin(Math.PI * launchP);
        launchPullback = launchAmp * 0.45;
        launchFovBoost = launchAmp * 2.5;
        targetRoll = THREE.MathUtils.lerp(0.02 * -sideDir, 0, launchP);

        targetPos.current.set(px + baseOx, py + baseOy, pz + baseOz + launchPullback);
        lookTarget.current.set(px + baseLx, py + baseLy, pz + baseLz - launchPullback * 2.0);
      }
    } else {
      // Standard Falling Gameplay Framing with Forward Look-Ahead
      const speedLookAheadZ = (speedMult - 1.0) * 3.5;
      targetPos.current.set(px + baseOx, py + baseOy, pz + baseOz);
      lookTarget.current.set(px + baseLx, py + baseLy, pz + baseLz - speedLookAheadZ);
    }

    // =========================================================================
    // 2. INITIAL FRAME PLACEMENT
    // =========================================================================
    if (!isInitializedRef.current) {
      camera.position.copy(targetPos.current);
      currentLookAt.current.copy(lookTarget.current);
      camera.lookAt(currentLookAt.current);
      currentRollRef.current = 0;
      camera.rotation.z = 0;
      isInitializedRef.current = true;
      return;
    }

    // =========================================================================
    // 3. SMOOTH POSITION & LOOK-AT INTERPOLATION
    // =========================================================================
    const lerpSpeed = status === 'menu' ? 4.5 : GAME_CONFIG.camera.lerpSpeed;
    const lerpFactor = 1 - Math.exp(-lerpSpeed * dt);

    camera.position.lerp(targetPos.current, lerpFactor);
    currentLookAt.current.lerp(lookTarget.current, lerpFactor);

    // =========================================================================
    // 4. ADDITIVE IMPACT CAMERA SHAKE (Zero Permanent Drift)
    // =========================================================================
    const settings = getGameSettings();
    if (runtime.cameraShakeIntensity > 0 && settings.cameraShake) {
      const shakeFactor = settings.reducedVisualEffects ? 0.35 : 1.0;
      const intensity = Math.min(0.08, runtime.cameraShakeIntensity) * shakeFactor;
      const shakeX = (Math.random() - 0.5) * 2 * intensity;
      const shakeY = (Math.random() - 0.5) * 2 * intensity * 0.8;
      const shakeZ = (Math.random() - 0.5) * intensity * 0.5;
      camera.position.x += shakeX;
      camera.position.y += shakeY;
      camera.position.z += shakeZ;
    }

    camera.lookAt(currentLookAt.current);

    // =========================================================================
    // 5. CINEMATIC ROLL & DYNAMIC SPEED FOV
    // =========================================================================
    currentRollRef.current = THREE.MathUtils.lerp(currentRollRef.current, targetRoll, dt * 7.0);
    camera.rotation.z = currentRollRef.current;

    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const persCam = camera as THREE.PerspectiveCamera;
      const speedFovBoost = (speedMult - 1.0) * 4.2; // ~+4.2 deg max at 2.0x
      const finalTargetFov = GAME_CONFIG.camera.fov + speedFovBoost + launchFovBoost;

      if (Math.abs(persCam.fov - finalTargetFov) > 0.01) {
        persCam.fov = THREE.MathUtils.lerp(persCam.fov, finalTargetFov, dt * 5.0);
        persCam.updateProjectionMatrix();
      }
    }
  });

  return null;
}
