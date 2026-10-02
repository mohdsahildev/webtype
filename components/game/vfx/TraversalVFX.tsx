'use client';

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameRuntime } from '@/lib/game/game-state';

const MAX_BURST_PARTICLES = 48;
const TRAIL_SEGMENTS = 16;
const LAUNCH_STREAMERS_COUNT = 24;

interface BurstParticle {
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

interface LaunchStreamer {
  x: number;
  y: number;
  z: number;
  speed: number;
  length: number;
  active: boolean;
}

function createInitialBurstParticles(): BurstParticle[] {
  const list: BurstParticle[] = [];
  for (let i = 0; i < MAX_BURST_PARTICLES; i++) {
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

function createInitialLaunchStreamers(): LaunchStreamer[] {
  const list: LaunchStreamer[] = [];
  for (let i = 0; i < LAUNCH_STREAMERS_COUNT; i++) {
    const seed = i / LAUNCH_STREAMERS_COUNT;
    list.push({
      x: (seed - 0.5) * 4.0,
      y: (((i * 3) % 7) / 7 - 0.5) * 3.0,
      z: -((i * 5) % 6.0),
      speed: 40 + ((i * 11) % 25),
      length: 1.5 + ((i * 7) % 1.5),
      active: false,
    });
  }
  return list;
}

function createTrailGeometry(): THREE.BufferGeometry {
  const trailPositions = new Float32Array(TRAIL_SEGMENTS * 2 * 3);
  const trailAlphas = new Float32Array(TRAIL_SEGMENTS * 2);
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
  geom.setAttribute('alpha', new THREE.BufferAttribute(trailAlphas, 1));

  const indices: number[] = [];
  for (let i = 0; i < TRAIL_SEGMENTS - 1; i++) {
    const top1 = i * 2;
    const bot1 = i * 2 + 1;
    const top2 = (i + 1) * 2;
    const bot2 = (i + 1) * 2 + 1;
    indices.push(top1, bot1, top2);
    indices.push(bot1, bot2, top2);
  }
  geom.setIndex(indices);
  return geom;
}

function createTrailMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      color: { value: new THREE.Color('#7dd3fc') },
      coreColor: { value: new THREE.Color('#ffffff') },
    },
    vertexShader: `
      attribute float alpha;
      varying float vAlpha;
      varying vec2 vUv;
      void main() {
        vAlpha = alpha;
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      uniform vec3 coreColor;
      varying float vAlpha;
      varying vec2 vUv;
      void main() {
        vec3 finalColor = mix(color, coreColor, vAlpha * 0.5);
        gl_FragColor = vec4(finalColor, vAlpha * 0.45);
      }
    `,
  });
}

/**
 * TraversalVFX: Lightweight, Zero-GC Procedural VFX for Web Traversal
 * - Anchor Attach Impact & Shockwave
 * - Hand Web Shoot Micro-Burst
 * - High-Velocity Swing Motion Ribbon
 * - Apex Release Fiber Burst
 * - Forward Launch Velocity Streamers
 */
export function TraversalVFX() {
  const runtime = useGameRuntime();

  // 1. Instanced Mesh for Spark Particles
  const burstMeshRef = useRef<THREE.InstancedMesh>(null);
  const dummyObjRef = useRef(new THREE.Object3D());
  const dummyColorRef = useRef(new THREE.Color());
  const particlesRef = useRef<BurstParticle[]>(createInitialBurstParticles());

  // 2. Shockwave Ring Mesh
  const shockwaveRef = useRef<THREE.Mesh>(null);
  const shockwaveState = useRef({
    active: false,
    elapsed: 0,
    duration: 0.18,
    maxScale: 2.2,
    x: 0,
    y: 0,
    z: 0,
  });

  // 3. Ribbon Motion Trail Geometry & Material
  const trailMeshRef = useRef<THREE.Mesh>(null);
  const trailHistory = useRef<{ pos: THREE.Vector3; time: number }[]>([]);
  const trailGeometryRef = useRef<THREE.BufferGeometry>(createTrailGeometry());
  const trailMaterialRef = useRef<THREE.ShaderMaterial>(createTrailMaterial());

  // 4. Forward Launch Streamers Instanced Mesh
  const launchStreamersMeshRef = useRef<THREE.InstancedMesh>(null);
  const launchStreamersRef = useRef<LaunchStreamer[]>(createInitialLaunchStreamers());

  // Attach trail ribbon geometry and shader material
  useEffect(() => {
    if (trailMeshRef.current) {
      trailMeshRef.current.geometry = trailGeometryRef.current;
      trailMeshRef.current.material = trailMaterialRef.current;
    }
  }, []);

  // Spawn Burst Helper
  const spawnBurst = (
    cx: number,
    cy: number,
    cz: number,
    count: number,
    speed: number,
    duration: number,
    baseSize: number,
    color: { r: number; g: number; b: number }
  ) => {
    let spawned = 0;
    const pool = particlesRef.current;
    for (let i = 0; i < pool.length && spawned < count; i++) {
      const p = pool[i];
      if (!p.active) {
        p.active = true;
        p.x = cx;
        p.y = cy;
        p.z = cz;

        // Spherical random velocity
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const s = speed * (0.6 + Math.random() * 0.8);

        p.vx = Math.sin(phi) * Math.cos(theta) * s;
        p.vy = Math.sin(phi) * Math.sin(theta) * s;
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

  // Traversal Event Detection State
  const prevTraversalRef = useRef<boolean>(false);
  const prevWebAttachedRef = useRef<boolean>(false);
  const hasTriggeredAttachVFX = useRef<boolean>(false);

  useFrame((_, delta) => {
    if (runtime.isPaused) return;
    const dt = Math.min(delta, 0.1);
    const status = runtime.status;
    const traversal = runtime.traversal;
    const isTraversing = status === 'traversing' && traversal !== null;

    // --- EVENT 1: Web Shoot (Start of Traversal) ---
    if (isTraversing && !prevTraversalRef.current) {
      hasTriggeredAttachVFX.current = false;
      const h = runtime.playerHandPosition;
      // Micro spark burst at hand
      spawnBurst(h.x, h.y, h.z, 6, 4.5, 0.12, 0.07, { r: 0.9, g: 0.98, b: 1.0 });
    }

    // --- EVENT 2: Web Attach at Anchor ---
    if (isTraversing && traversal && traversal.elapsed >= 0.05 && !hasTriggeredAttachVFX.current) {
      hasTriggeredAttachVFX.current = true;
      const [ax, ay, az] = traversal.anchorPos;

      // Radial impact spark burst at anchor
      spawnBurst(ax, ay, az, 12, 6.0, 0.16, 0.09, { r: 0.95, g: 1.0, b: 1.0 });

      // Trigger expanding shockwave ring
      shockwaveState.current.active = true;
      shockwaveState.current.elapsed = 0;
      shockwaveState.current.x = ax;
      shockwaveState.current.y = ay;
      shockwaveState.current.z = az;
    }

    // --- EVENT 3: Web Release at Apex ---
    if (prevWebAttachedRef.current && (!traversal || !traversal.webAttached)) {
      const h = runtime.playerHandPosition;
      // Small fiber release burst at hand/apex
      spawnBurst(h.x, h.y, h.z, 8, 5.0, 0.14, 0.08, { r: 0.85, g: 0.95, b: 1.0 });
    }

    prevTraversalRef.current = isTraversing;
    prevWebAttachedRef.current = traversal?.webAttached ?? false;

    // =========================================================================
    // 1. UPDATE BURST PARTICLES
    // =========================================================================
    if (burstMeshRef.current) {
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
            burstMeshRef.current.setMatrixAt(i, dummyObj.matrix);
          } else {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;
            p.vx *= 0.92; // aerodynamic drag
            p.vy *= 0.92;
            p.vz *= 0.92;

            const lifeRatio = p.life / p.maxLife;
            const curScale = p.baseSize * lifeRatio;

            dummyObj.position.set(p.x, p.y, p.z);
            dummyObj.scale.set(curScale, curScale, curScale);
            dummyObj.updateMatrix();
            burstMeshRef.current.setMatrixAt(i, dummyObj.matrix);

            dummyColor.setRGB(p.r, p.g, p.b);
            burstMeshRef.current.setColorAt(i, dummyColor);
          }
        } else {
          dummyObj.position.set(0, -999, 0);
          dummyObj.scale.set(0, 0, 0);
          dummyObj.updateMatrix();
          burstMeshRef.current.setMatrixAt(i, dummyObj.matrix);
        }
      }
      burstMeshRef.current.instanceMatrix.needsUpdate = true;
      if (burstMeshRef.current.instanceColor) {
        burstMeshRef.current.instanceColor.needsUpdate = true;
      }
    }

    // =========================================================================
    // 2. UPDATE ANCHOR SHOCKWAVE RING
    // =========================================================================
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
          // Facing along Z corridor
          shockwaveRef.current.rotation.set(0, 0, 0);

          const scale = THREE.MathUtils.lerp(0.2, sw.maxScale, Math.sqrt(progress));
          shockwaveRef.current.scale.set(scale, scale, scale);

          const mat = shockwaveRef.current.material as THREE.MeshBasicMaterial;
          mat.opacity = (1 - progress) * 0.85;
        }
      } else {
        shockwaveRef.current.visible = false;
      }
    }

    // =========================================================================
    // 3. UPDATE MOTION TRAIL (SWING RIBBON)
    // =========================================================================
    const isSwinging = isTraversing && traversal && traversal.progress >= 0.08 && traversal.progress <= 0.72;

    if (isSwinging) {
      // Record player position
      const p = runtime.playerPosition;
      trailHistory.current.unshift({
        pos: new THREE.Vector3(p.x, p.y + 0.1, p.z),
        time: performance.now(),
      });
      if (trailHistory.current.length > TRAIL_SEGMENTS) {
        trailHistory.current.pop();
      }
    } else {
      // Fade out trail samples rapidly when not swinging
      if (trailHistory.current.length > 0) {
        trailHistory.current.pop();
      }
    }

    if (trailMeshRef.current) {
      const trailGeometry = trailGeometryRef.current;
      const history = trailHistory.current;
      const count = history.length;

      if (count >= 2) {
        trailMeshRef.current.visible = true;
        const posArr = trailGeometry.attributes.position.array as Float32Array;
        const alphaArr = trailGeometry.attributes.alpha.array as Float32Array;

        for (let i = 0; i < TRAIL_SEGMENTS; i++) {
          const sample = i < count ? history[i] : history[count - 1];
          const nextSample = i + 1 < count ? history[i + 1] : sample;

          // Compute ribbon lateral perpendicular vector
          const forward = new THREE.Vector3().subVectors(sample.pos, nextSample.pos).normalize();
          if (forward.lengthSq() < 0.001) forward.set(0, 0, -1);
          const up = new THREE.Vector3(0, 1, 0);
          const right = new THREE.Vector3().crossVectors(forward, up).normalize();

          const taper = (TRAIL_SEGMENTS - i) / TRAIL_SEGMENTS;
          const halfWidth = 0.22 * taper;

          // Vertex 1: Top edge
          posArr[i * 6] = sample.pos.x + right.x * halfWidth;
          posArr[i * 6 + 1] = sample.pos.y + right.y * halfWidth;
          posArr[i * 6 + 2] = sample.pos.z + right.z * halfWidth;

          // Vertex 2: Bottom edge
          posArr[i * 6 + 3] = sample.pos.x - right.x * halfWidth;
          posArr[i * 6 + 4] = sample.pos.y - right.y * halfWidth;
          posArr[i * 6 + 5] = sample.pos.z - right.z * halfWidth;

          const alphaVal = taper * (isSwinging ? 1.0 : 0.4);
          alphaArr[i * 2] = alphaVal;
          alphaArr[i * 2 + 1] = alphaVal;
        }

        trailGeometry.attributes.position.needsUpdate = true;
        trailGeometry.attributes.alpha.needsUpdate = true;
        trailGeometry.computeBoundingSphere();
      } else {
        trailMeshRef.current.visible = false;
      }
    }

    // =========================================================================
    // 4. FORWARD LAUNCH VELOCITY STREAMERS
    // =========================================================================
    const isLaunching = isTraversing && traversal && traversal.progress >= 0.60 && traversal.progress <= 0.98;

    if (launchStreamersMeshRef.current) {
      if (isLaunching) {
        launchStreamersMeshRef.current.visible = true;
        const pp = runtime.playerPosition;
        const speedMult = runtime.currentSpeedMultiplier;
        const launchIntensity = Math.sin((traversal.progress - 0.60) / 0.38 * Math.PI);
        const dummyObj = dummyObjRef.current;

        launchStreamersRef.current.forEach((s, idx) => {
          s.z += s.speed * speedMult * 1.6 * dt;

          // Respawn in front of player
          if (s.z > 6.0) {
            s.z = -12.0 - Math.random() * 8.0;
            s.x = (Math.random() - 0.5) * 3.5;
            s.y = (Math.random() - 0.5) * 2.5;
          }

          dummyObj.position.set(pp.x + s.x, pp.y + s.y, pp.z + s.z);
          const streamerScaleZ = s.length * (1.0 + speedMult * 0.4) * launchIntensity;
          dummyObj.scale.set(0.03, 0.03, streamerScaleZ);
          dummyObj.updateMatrix();
          launchStreamersMeshRef.current!.setMatrixAt(idx, dummyObj.matrix);
        });
        launchStreamersMeshRef.current.instanceMatrix.needsUpdate = true;
      } else {
        launchStreamersMeshRef.current.visible = false;
      }
    }
  });

  return (
    <group>
      {/* 1. Pre-allocated Instanced Mesh for Spark / Fiber Particles */}
      <instancedMesh
        ref={burstMeshRef}
        args={[undefined, undefined, MAX_BURST_PARTICLES]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
        />
      </instancedMesh>

      {/* 2. Anchor Contact Shockwave Ring */}
      <mesh ref={shockwaveRef} visible={false}>
        <ringGeometry args={[0.22, 0.42, 32]} />
        <meshBasicMaterial
          color="#bae6fd"
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 3. Smooth Swing Motion Trail Ribbon */}
      <mesh ref={trailMeshRef} visible={false} frustumCulled={false} />

      {/* 4. Apex Launch Velocity Streamers */}
      <instancedMesh
        ref={launchStreamersMeshRef}
        args={[undefined, undefined, LAUNCH_STREAMERS_COUNT]}
        frustumCulled={false}
        visible={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          color="#e0f2fe"
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  );
}
