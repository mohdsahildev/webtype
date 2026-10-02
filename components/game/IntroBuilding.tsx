'use client';

import React, { memo, useMemo } from 'react';
import { useGLTF, useTexture } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Cinematic Intro Skyscraper & Rooftop Platform
 * Provides the launch platform for the player to stand, sprint, and leap off.
 * Positioned in the central corridor between Z = 0 and Z = 22 at height Y = 16.5m.
 */
export const IntroBuilding = memo(function IntroBuilding() {
  const { scene } = useGLTF('/assets/city/commercial/building-j.glb');
  const colormap = useTexture('/assets/city/commercial/colormap.png');

  useMemo(() => {
    if (colormap) {
      colormap.colorSpace = THREE.SRGBColorSpace;
      colormap.flipY = false;
      colormap.minFilter = THREE.NearestFilter;
      colormap.magFilter = THREE.NearestFilter;
    }
  }, [colormap]);

  const clonedModel = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (mesh.material) {
          const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
          mat.map = colormap;
          mat.roughness = 0.65;
          mat.metalness = 0.15;
          mat.color.set('#ffffff');
          mesh.material = mat;
        }
      }
    });
    return clone;
  }, [scene, colormap]);

  return (
    <group position={[0, 0, 11]}>
      {/* 1. Base Skyscraper Structure (Height: 16.5m, Width: 9.6m, Depth: 22m) */}
      <mesh position={[0, 8.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[9.6, 16.5, 22.0]} />
        <meshStandardMaterial
          color="#1e293b"
          roughness={0.7}
          metalness={0.2}
        />
      </mesh>

      {/* 2. Commercial Facade Details on Front Wall (Z = -11 in local space -> Z = 0 in world) */}
      <group position={[0, 0, -10.9]} rotation={[0, 0, 0]} scale={9.8}>
        <primitive object={clonedModel} />
      </group>

      {/* 3. Rooftop Top Deck Slab (Y = 16.5m) */}
      <mesh position={[0, 16.5, 0]} receiveShadow>
        <boxGeometry args={[9.5, 0.1, 21.8]} />
        <meshStandardMaterial
          color="#0f172a"
          roughness={0.8}
          metalness={0.15}
        />
      </mesh>

      {/* 4. Yellow Safety Edge Line at Rooftop Launch Boundary (World Z = 0) */}
      <mesh position={[0, 16.52, -10.8]} receiveShadow>
        <planeGeometry args={[9.2, 0.4]} />
        <meshStandardMaterial
          color="#facc15"
          emissive="#eab308"
          emissiveIntensity={0.25}
          roughness={0.4}
        />
      </mesh>

      {/* 5. Left & Right Rooftop Parapet Curbs */}
      <mesh position={[-4.7, 16.8, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.3, 0.6, 21.8]} />
        <meshStandardMaterial color="#334155" roughness={0.6} />
      </mesh>
      <mesh position={[4.7, 16.8, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.3, 0.6, 21.8]} />
        <meshStandardMaterial color="#334155" roughness={0.6} />
      </mesh>
      <mesh position={[0, 16.8, 10.8]} castShadow receiveShadow>
        <boxGeometry args={[9.6, 0.6, 0.3]} />
        <meshStandardMaterial color="#334155" roughness={0.6} />
      </mesh>

      {/* 6. Rooftop Architectural HVAC Units & Elevator Shaft Roof Structure */}
      <mesh position={[-3.2, 17.2, 6.0]} castShadow receiveShadow>
        <boxGeometry args={[2.0, 1.4, 3.2]} />
        <meshStandardMaterial color="#293548" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[3.2, 17.2, 6.0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 1.2, 2.5]} />
        <meshStandardMaterial color="#243042" roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[3.4, 17.0, -4.0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.6, 0.6, 1.0, 16]} />
        <meshStandardMaterial color="#3b4d66" roughness={0.4} metalness={0.4} />
      </mesh>
    </group>
  );
});

useGLTF.preload('/assets/city/commercial/building-j.glb');
useTexture.preload('/assets/city/commercial/colormap.png');
