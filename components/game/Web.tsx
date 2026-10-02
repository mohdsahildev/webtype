'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameRuntime } from '@/lib/game/game-state';

export function Web() {
  const runtime = useGameRuntime();
  const haloRef = useRef<THREE.Mesh>(null);

  const outerLine = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const mat = new THREE.LineBasicMaterial({
      color: '#7dd3fc',
      linewidth: 3,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const line = new THREE.Line(geom, mat);
    line.frustumCulled = false;
    line.visible = false;
    return line;
  }, []);

  const coreLine = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const mat = new THREE.LineBasicMaterial({
      color: '#ffffff',
      linewidth: 1,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    const line = new THREE.Line(geom, mat);
    line.frustumCulled = false;
    line.visible = false;
    return line;
  }, []);

  useFrame(() => {
    // Web is visible ONLY when actively traversing AND webAttached is true
    if (
      runtime.status === 'traversing' &&
      runtime.traversal &&
      runtime.traversal.webAttached
    ) {
      const [ax, ay, az] = runtime.traversal.anchorPos;
      const h = runtime.playerHandPosition;

      outerLine.visible = true;
      coreLine.visible = true;

      // Fast shoot-out animation during the first 60ms of traversal
      const shootDuration = 0.06;
      const shootProgress = Math.min(
        1.0,
        runtime.traversal.elapsed / shootDuration
      );

      // Interpolate tip position during initial web shoot
      const targetEndX = THREE.MathUtils.lerp(h.x, ax, shootProgress);
      const targetEndY = THREE.MathUtils.lerp(h.y, ay, shootProgress);
      const targetEndZ = THREE.MathUtils.lerp(h.z, az, shootProgress);

      const updateLine = (line: THREE.Line) => {
        const posAttr = line.geometry.attributes.position;
        if (posAttr) {
          const arr = posAttr.array as Float32Array;
          arr[0] = h.x;
          arr[1] = h.y;
          arr[2] = h.z;
          arr[3] = targetEndX;
          arr[4] = targetEndY;
          arr[5] = targetEndZ;
          posAttr.needsUpdate = true;
          line.geometry.computeBoundingSphere();
        }
      };

      updateLine(outerLine);
      updateLine(coreLine);

      // Subtle tension pulse on outer sheath during swing
      const tensionPulse = 0.85 + Math.sin(runtime.traversal.elapsed * 35.0) * 0.12;
      (outerLine.material as THREE.LineBasicMaterial).opacity = tensionPulse;

      // Contact attachment pulse ring at anchor
      if (haloRef.current) {
        haloRef.current.visible = true;
        haloRef.current.position.set(ax, ay, az);
        const pulse = 1.0 + Math.sin(runtime.traversal.elapsed * 18.0) * 0.22;
        haloRef.current.scale.set(pulse, pulse, pulse);
      }
    } else {
      outerLine.visible = false;
      coreLine.visible = false;
      if (haloRef.current) {
        haloRef.current.visible = false;
      }
    }
  });

  return (
    <>
      <primitive object={outerLine} />
      <primitive object={coreLine} />
      <mesh ref={haloRef} visible={false}>
        <sphereGeometry args={[0.32, 16, 16]} />
        <meshBasicMaterial
          color="#bae6fd"
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </>
  );
}

