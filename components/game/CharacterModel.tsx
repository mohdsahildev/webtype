'use client';

import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useFBX } from '@react-three/drei';
import * as THREE from 'three';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { useGameRuntime } from '@/lib/game/game-state';

/**
 * Neutralizes Mixamo root & hips translation tracks.
 * Locks X and Z to 0 (gameplay controls world movement),
 * and maintains appropriate hip height baseline without root drift.
 * For landing animation, allows natural crouch compression down from standard hip height.
 */
function sanitizeClip(clip: THREE.AnimationClip | null | undefined, name?: string): THREE.AnimationClip | null {
  if (!clip) return null;
  const standardHipY = 90.7; // Standard neutral Mixamo hip height in cm

  const cleanTracks: THREE.KeyframeTrack[] = [];

  for (const track of clip.tracks) {
    if (track.name.endsWith('Hips.position') || track.name.endsWith('.position')) {
      const times = track.times.slice();
      const values = new Float32Array(track.values.length);

      for (let i = 0; i < values.length; i += 3) {
        values[i] = 0; // Lock lateral root drift to 0
        if (name === 'falling_to_landing') {
          // Allow natural landing crouch compression while clamping any flyaway or excessive dip
          const rawY = track.values[i + 1];
          values[i + 1] = Math.min(standardHipY, Math.max(35.0, rawY));
        } else {
          values[i + 1] = standardHipY; // Lock vertical hip height to standard baseline
        }
        values[i + 2] = 0; // Lock forward root drift to 0
      }

      cleanTracks.push(new THREE.VectorKeyframeTrack(track.name, times, values));
    } else {
      // Preserve all 52 bone rotation quaternion tracks intact (arms, legs, spine, neck, etc.)
      cleanTracks.push(track.clone());
    }
  }

  return new THREE.AnimationClip(name || clip.name, clip.duration, cleanTracks);
}

export function CharacterModel() {
  const runtime = useGameRuntime();
  const groupRef = useRef<THREE.Group>(null);

  // Load character FBX and animation FBX files
  const characterFbx = useFBX('/assets/character/Webtype%20Character.fbx');
  const fallingIdleFbx = useFBX('/assets/character/Falling%20Idle.fbx');
  const startSwingingFbx = useFBX('/assets/character/Start%20Swinging.fbx');
  const swingingFbx = useFBX('/assets/character/Swinging.fbx');
  const bigJumpFbx = useFBX('/assets/character/Big%20Jump.fbx');
  const flyingFbx = useFBX('/assets/character/Flying.fbx');
  const fallingToLandingFbx = useFBX('/assets/character/Falling%20To%20Landing.fbx');
  const idleFbx = useFBX('/assets/character/Idle.fbx');
  const sprintFbx = useFBX('/assets/character/Sprint.fbx');

  // Proper SkinnedMesh cloning with SkeletonUtils to ensure skeleton binds to cloned mesh
  const charModel = useMemo(() => {
    const clone = skeletonClone(characterFbx) as THREE.Group;

    clone.traverse((child) => {
      if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
        const mesh = child as THREE.SkinnedMesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;
        mesh.visible = true;

        if (mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => {
            m.side = THREE.DoubleSide;
            m.needsUpdate = true;
          });
        }
      }
    });

    return clone;
  }, [characterFbx]);

  // Track hand bones for web attachment
  const handBones = useMemo<{ leftHand: THREE.Object3D | null; rightHand: THREE.Object3D | null }>(() => {
    let leftHand: THREE.Object3D | null = null;
    let rightHand: THREE.Object3D | null = null;

    charModel.traverse((child) => {
      if (child.name === 'mixamorig9LeftHand' || child.name.endsWith('LeftHand')) {
        leftHand = child;
      }
      if (child.name === 'mixamorig9RightHand' || child.name.endsWith('RightHand')) {
        rightHand = child;
      }
    });

    return { leftHand, rightHand };
  }, [charModel]);

  // Animation mixer and clip actions
  const mixer = useMemo(() => new THREE.AnimationMixer(charModel), [charModel]);
  const actionsRef = useRef<Record<string, THREE.AnimationAction>>({});
  const currentActionNameRef = useRef<string>('idle');

  // Process and sanitize clips
  const sanitizedClips = useMemo(() => {
    const rawSwingClip = swingingFbx.animations[0];
    // Frames 0 to 25 at 30fps = 0.0s to 0.83s (pure dynamic pendulum swinging arc, removing landing motion)
    const trimmedSwing = rawSwingClip
      ? THREE.AnimationUtils.subclip(rawSwingClip, 'trimmed_swinging', 0, 25, 30)
      : null;

    return {
      falling_idle: sanitizeClip(fallingIdleFbx.animations[0], 'falling_idle'),
      start_swinging: sanitizeClip(startSwingingFbx.animations[0], 'start_swinging'),
      swinging: sanitizeClip(trimmedSwing, 'swinging'),
      big_jump: sanitizeClip(bigJumpFbx.animations[0], 'big_jump'),
      flying: sanitizeClip(flyingFbx.animations[0], 'flying'),
      falling_to_landing: sanitizeClip(fallingToLandingFbx.animations[0], 'falling_to_landing'),
      idle: sanitizeClip(idleFbx.animations[0], 'idle'),
      sprint: sanitizeClip(sprintFbx.animations[0], 'sprint'),
    };
  }, [
    fallingIdleFbx,
    startSwingingFbx,
    swingingFbx,
    bigJumpFbx,
    flyingFbx,
    fallingToLandingFbx,
    idleFbx,
    sprintFbx,
  ]);

  useEffect(() => {
    const actions: Record<string, THREE.AnimationAction> = {};

    for (const [name, clip] of Object.entries(sanitizedClips)) {
      if (clip) {
        const action = mixer.clipAction(clip);
        if (name === 'start_swinging' || name === 'big_jump' || name === 'falling_to_landing') {
          action.setLoop(THREE.LoopOnce, 1);
          action.clampWhenFinished = true;
        } else {
          action.setLoop(THREE.LoopRepeat, Infinity);
        }
        actions[name] = action;
      }
    }

    actionsRef.current = actions;

    // Start directly with idle when mounting in menu/loading
    const initialAnim = runtime.status === 'falling' ? 'falling_idle' : 'idle';
    if (actions[initialAnim]) {
      actions[initialAnim].play();
      currentActionNameRef.current = initialAnim;
      runtime.currentAnim = initialAnim;
    }

    return () => {
      mixer.stopAllAction();
    };
  }, [mixer, sanitizedClips, runtime]);

  // Smooth crossfading without hard cuts
  const transitionTo = (actionName: string, duration = 0.15) => {
    if (currentActionNameRef.current === actionName) return;

    const prevAction = actionsRef.current[currentActionNameRef.current];
    const nextAction = actionsRef.current[actionName];

    if (!nextAction) return;

    nextAction.reset();
    nextAction.enabled = true;
    nextAction.setEffectiveTimeScale(1);
    nextAction.setEffectiveWeight(1);

    if (prevAction) {
      prevAction.crossFadeTo(nextAction, duration, true);
    } else {
      nextAction.fadeIn(duration);
    }
    nextAction.play();

    currentActionNameRef.current = actionName;
    runtime.currentAnim = actionName;
  };

  useFrame((_, delta) => {
    if (runtime.isPaused) return;
    const dt = Math.min(delta, 0.1);

    // 1. Update animation state machine based on traversal progress
    const status = runtime.status;
    const traversal = runtime.traversal;

    if (status === 'dead' || status === 'deathSequence') {
      transitionTo('falling_to_landing', 0.18);
    } else if (status === 'menu' || status === 'loading') {
      transitionTo('idle', 0.2);
    } else if (status === 'intro') {
      if (runtime.currentAnim === 'sprint') {
        transitionTo('sprint', 0.15);
      } else if (runtime.currentAnim === 'big_jump') {
        transitionTo('big_jump', 0.12);
      } else {
        transitionTo('falling_idle', 0.18);
      }
    } else if (status === 'traversing' && traversal) {
      const progress = traversal.progress;

      if (progress < 0.12) {
        // Phase 1: Attach & Start Swing
        transitionTo('start_swinging', 0.10);
      } else if (traversal.webAttached) {
        // Phase 2: Active Swing while web is attached to anchor
        transitionTo('swinging', 0.12);
      } else if (progress < 0.72) {
        // Phase 3: Immediate release & forward apex launch
        transitionTo('big_jump', 0.12);
      } else {
        // Phase 4: Forward Flight Glide
        transitionTo('flying', 0.14);
      }
    } else if (status === 'falling') {
      transitionTo('falling_idle', 0.18);
    }

    // 2. Advance mixer
    mixer.update(dt);

    // 3. Update hand world position for Web.tsx
    const side = traversal?.side || 'left';
    const activeHand = side === 'left' ? handBones.leftHand : handBones.rightHand;

    if (activeHand) {
      activeHand.getWorldPosition(runtime.playerHandPosition);
    } else {
      runtime.playerHandPosition.set(
        runtime.playerPosition.x + (side === 'left' ? -0.35 : 0.35),
        runtime.playerPosition.y + 0.4,
        runtime.playerPosition.z
      );
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.9, 0]} rotation={[0, Math.PI, 0]} scale={0.01}>
      <primitive object={charModel} />
    </group>
  );
}

// Preload assets for instant load
useFBX.preload('/assets/character/Webtype%20Character.fbx');
useFBX.preload('/assets/character/Falling%20Idle.fbx');
useFBX.preload('/assets/character/Start%20Swinging.fbx');
useFBX.preload('/assets/character/Swinging.fbx');
useFBX.preload('/assets/character/Big%20Jump.fbx');
useFBX.preload('/assets/character/Flying.fbx');
useFBX.preload('/assets/character/Falling%20To%20Landing.fbx');
useFBX.preload('/assets/character/Idle.fbx');
useFBX.preload('/assets/character/Sprint.fbx');
