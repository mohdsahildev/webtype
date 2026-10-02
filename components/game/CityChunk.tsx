'use client';

import React, { useMemo, memo, Suspense, Component, ReactNode } from 'react';
import { useGLTF, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { ChunkData, BuildingData } from '@/lib/game/city-generator';
import { GAME_CONFIG } from '@/lib/game/game-config';

interface CityChunkProps {
  chunk: ChunkData;
}

interface BuildingItemProps {
  building: BuildingData;
}

interface ErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
  assetId?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Isolated error boundary for individual building instances.
 * Prevents a single corrupted/failing asset from crashing or blanking the scene.
 */
class BuildingErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn(`[WebType City] Error loading asset ${this.props.assetId}:`, error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

/**
 * Lightweight geometric fallback rendered while an asset is loading or if a load fails.
 * Perfectly matches the building's known bounding dimensions so there are no visual holes.
 */
const BuildingFallback = memo(function BuildingFallback({
  building,
}: BuildingItemProps) {
  const [w, h, d] = building.size;
  return (
    <group position={building.position} rotation={building.rotation}>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#2d3f58" roughness={0.8} metalness={0.1} />
      </mesh>
    </group>
  );
});

/**
 * Reusable Kenney Building instance that loads GLTF and binds shared colormap
 */
const KenneyBuildingMesh = memo(function KenneyBuildingMesh({
  building,
}: BuildingItemProps) {
  const { scene } = useGLTF(building.modelPath);
  const colormap = useTexture('/assets/city/commercial/colormap.png');

  // Configure texture color space and crisp pixel filtering once
  useMemo(() => {
    if (colormap) {
      colormap.colorSpace = THREE.SRGBColorSpace;
      colormap.flipY = false;
      colormap.minFilter = THREE.NearestFilter;
      colormap.magFilter = THREE.NearestFilter;
      colormap.needsUpdate = true;
    }
  }, [colormap]);

  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (mesh.material) {
          const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
          mat.map = colormap;
          mat.roughness = 0.8;
          mat.metalness = 0.0;
          mat.color.setRGB(1, 1, 1);
          mat.needsUpdate = true;
          mesh.material = mat;
        }
      }
    });
    return clone;
  }, [scene, colormap]);

  return (
    <group
      position={building.position}
      rotation={building.rotation}
      scale={[building.scale, building.scale, building.scale]}
    >
      <primitive object={clonedScene} />
    </group>
  );
});

/**
 * Safe building wrapper with isolated Suspense and Error Boundary
 */
const SafeKenneyBuilding = memo(function SafeKenneyBuilding({
  building,
}: BuildingItemProps) {
  const fallback = <BuildingFallback building={building} />;
  return (
    <BuildingErrorBoundary fallback={fallback} assetId={building.assetId}>
      <Suspense fallback={fallback}>
        <KenneyBuildingMesh building={building} />
      </Suspense>
    </BuildingErrorBoundary>
  );
});

export const CityChunk = memo(function CityChunk({ chunk }: CityChunkProps) {
  const { corridorHalfWidth } = GAME_CONFIG.city;
  const failureHeight = GAME_CONFIG.movement.failureHeight;

  return (
    <group>
      {/* Ground plane for this chunk */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, failureHeight - 0.05, chunk.centerZ]}
      >
        <planeGeometry args={[corridorHalfWidth * 12, chunk.length]} />
        <meshStandardMaterial color="#1e293b" roughness={0.85} metalness={0.1} />
      </mesh>

      {/* Central Corridor Centerline Speed Markers */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, failureHeight + 0.01, chunk.centerZ]}
      >
        <planeGeometry args={[0.35, chunk.length]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.35} />
      </mesh>

      {/* Left & Right Glowing Runway Curb Lines along the corridor edges */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[-corridorHalfWidth, failureHeight + 0.02, chunk.centerZ]}
      >
        <planeGeometry args={[0.25, chunk.length]} />
        <meshBasicMaterial color="#0284c7" transparent opacity={0.7} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[corridorHalfWidth, failureHeight + 0.02, chunk.centerZ]}
      >
        <planeGeometry args={[0.25, chunk.length]} />
        <meshBasicMaterial color="#d97706" transparent opacity={0.7} />
      </mesh>

      {/* Kenney Commercial Asset Buildings with individual Suspense & Error Boundaries */}
      {chunk.buildings.map((b) => (
        <SafeKenneyBuilding key={b.id} building={b} />
      ))}
    </group>
  );
});

// Preload high-priority foreground commercial buildings and colormap texture
useTexture.preload('/assets/city/commercial/colormap.png');
useGLTF.preload('/assets/city/commercial/building-a.glb');
useGLTF.preload('/assets/city/commercial/building-b.glb');
useGLTF.preload('/assets/city/commercial/building-c.glb');
useGLTF.preload('/assets/city/commercial/building-d.glb');
useGLTF.preload('/assets/city/commercial/building-e.glb');
useGLTF.preload('/assets/city/commercial/building-f.glb');
useGLTF.preload('/assets/city/commercial/building-skyscraper-a.glb');
useGLTF.preload('/assets/city/commercial/building-skyscraper-b.glb');
useGLTF.preload('/assets/city/commercial/low-detail-building-d.glb');
useGLTF.preload('/assets/city/commercial/low-detail-building-wide-a.glb');
