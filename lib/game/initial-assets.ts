'use client';

import { useFBX, useGLTF, useTexture } from '@react-three/drei';
import { FBXLoader, GLTFLoader } from 'three-stdlib';
import { TextureLoader } from 'three';
import { peek } from 'suspend-react';

/**
 * All character FBX assets required before the main menu is shown.
 * CharacterModel requires all 9 files synchronously on mount.
 */
export const INITIAL_CHARACTER_FBX_ASSETS = [
  '/assets/character/Webtype%20Character.fbx',
  '/assets/character/Idle.fbx',
  '/assets/character/Sprint.fbx',
  '/assets/character/Big%20Jump.fbx',
  '/assets/character/Falling%20Idle.fbx',
  '/assets/character/Flying.fbx',
  '/assets/character/Start%20Swinging.fbx',
  '/assets/character/Swinging.fbx',
  '/assets/character/Falling%20To%20Landing.fbx',
] as const;

/**
 * Essential 3D city and building assets visible in the initial main menu & intro scene.
 */
export const INITIAL_CITY_GLTF_ASSETS = [
  '/assets/city/commercial/building-j.glb',
  '/assets/city/commercial/building-a.glb',
  '/assets/city/commercial/building-b.glb',
  '/assets/city/commercial/building-c.glb',
  '/assets/city/commercial/building-d.glb',
  '/assets/city/commercial/building-e.glb',
  '/assets/city/commercial/building-f.glb',
  '/assets/city/commercial/building-skyscraper-a.glb',
  '/assets/city/commercial/building-skyscraper-b.glb',
  '/assets/city/commercial/low-detail-building-d.glb',
  '/assets/city/commercial/low-detail-building-wide-a.glb',
] as const;

/**
 * Textures required for the initial scene.
 */
export const INITIAL_TEXTURE_ASSETS = [
  '/assets/city/commercial/colormap.png',
] as const;

/**
 * Starts preloading all required initial assets using Drei loaders.
 */
export function preloadInitialAssets(): void {
  INITIAL_CHARACTER_FBX_ASSETS.forEach((path) => {
    useFBX.preload(path);
  });

  INITIAL_CITY_GLTF_ASSETS.forEach((path) => {
    useGLTF.preload(path);
  });

  INITIAL_TEXTURE_ASSETS.forEach((path) => {
    useTexture.preload(path);
  });
}

/**
 * Checks whether all required initial assets are genuinely loaded and cached in memory.
 * Returns true only when every required asset is ready to be consumed synchronously.
 */
export function isInitialAssetsReady(): boolean {
  for (const path of INITIAL_CHARACTER_FBX_ASSETS) {
    if (!peek([FBXLoader, path])) {
      return false;
    }
  }

  for (const path of INITIAL_CITY_GLTF_ASSETS) {
    if (!peek([GLTFLoader, path])) {
      return false;
    }
  }

  for (const path of INITIAL_TEXTURE_ASSETS) {
    if (!peek([TextureLoader, path])) {
      return false;
    }
  }

  return true;
}

/**
 * Clears cached entries for initial assets and re-triggers preloading.
 */
export function retryInitialAssets(): void {
  INITIAL_CHARACTER_FBX_ASSETS.forEach((path) => {
    useFBX.clear(path);
  });

  INITIAL_CITY_GLTF_ASSETS.forEach((path) => {
    useGLTF.clear(path);
  });

  INITIAL_TEXTURE_ASSETS.forEach((path) => {
    useTexture.clear(path);
  });

  preloadInitialAssets();
}

// Automatically trigger preload on module evaluation
preloadInitialAssets();
