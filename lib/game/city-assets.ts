export type BuildingCategory = 'MAIN' | 'SKYSCRAPER' | 'LOW_DETAIL';

export interface BuildingAssetDef {
  id: string;
  path: string;
  category: BuildingCategory;
  nativeSize: [number, number, number]; // [width, height, depth]
  defaultScale: number;
  minScale: number;
  maxScale: number;
}

export const KENNEY_COMMERCIAL_ASSETS: BuildingAssetDef[] = [
  // --- MAIN COMMERCIAL BUILDINGS (Detailed facades, storefronts, multi-story windows) ---
  {
    id: 'building-a',
    path: '/assets/city/commercial/building-a.glb',
    category: 'MAIN',
    nativeSize: [0.884, 1.293, 0.94],
    defaultScale: 14.0,
    minScale: 13.0,
    maxScale: 15.5,
  },
  {
    id: 'building-b',
    path: '/assets/city/commercial/building-b.glb',
    category: 'MAIN',
    nativeSize: [0.97, 1.293, 0.94],
    defaultScale: 14.0,
    minScale: 13.0,
    maxScale: 15.5,
  },
  {
    id: 'building-c',
    path: '/assets/city/commercial/building-c.glb',
    category: 'MAIN',
    nativeSize: [0.884, 0.893, 1.09],
    defaultScale: 15.0,
    minScale: 14.0,
    maxScale: 16.5,
  },
  {
    id: 'building-d',
    path: '/assets/city/commercial/building-d.glb',
    category: 'MAIN',
    nativeSize: [0.84, 1.293, 0.9],
    defaultScale: 14.0,
    minScale: 13.0,
    maxScale: 15.5,
  },
  {
    id: 'building-e',
    path: '/assets/city/commercial/building-e.glb',
    category: 'MAIN',
    nativeSize: [1.64, 0.893, 1.008],
    defaultScale: 13.5,
    minScale: 12.5,
    maxScale: 14.5,
  },
  {
    id: 'building-f',
    path: '/assets/city/commercial/building-f.glb',
    category: 'MAIN',
    nativeSize: [0.84, 1.693, 1.03],
    defaultScale: 14.0,
    minScale: 13.0,
    maxScale: 15.5,
  },
  {
    id: 'building-g',
    path: '/assets/city/commercial/building-g.glb',
    category: 'MAIN',
    nativeSize: [0.97, 1.693, 0.922],
    defaultScale: 14.0,
    minScale: 13.0,
    maxScale: 15.5,
  },
  {
    id: 'building-h',
    path: '/assets/city/commercial/building-h.glb',
    category: 'MAIN',
    nativeSize: [0.884, 1.293, 1.008],
    defaultScale: 14.0,
    minScale: 13.0,
    maxScale: 15.5,
  },
  {
    id: 'building-i',
    path: '/assets/city/commercial/building-i.glb',
    category: 'MAIN',
    nativeSize: [1.24, 1.68, 1.302],
    defaultScale: 13.5,
    minScale: 12.5,
    maxScale: 14.5,
  },
  {
    id: 'building-j',
    path: '/assets/city/commercial/building-j.glb',
    category: 'MAIN',
    nativeSize: [2.084, 1.693, 1.34],
    defaultScale: 13.0,
    minScale: 12.0,
    maxScale: 14.0,
  },
  {
    id: 'building-k',
    path: '/assets/city/commercial/building-k.glb',
    category: 'MAIN',
    nativeSize: [2.084, 1.47, 0.942],
    defaultScale: 13.0,
    minScale: 12.0,
    maxScale: 14.0,
  },

  // --- SKYSCRAPERS (Vertical landmarks, glass towers, mid & high-rise accents) ---
  {
    id: 'building-skyscraper-a',
    path: '/assets/city/commercial/building-skyscraper-a.glb',
    category: 'SKYSCRAPER',
    nativeSize: [1.36, 2.88, 1.36],
    defaultScale: 14.0,
    minScale: 13.0,
    maxScale: 15.0,
  },
  {
    id: 'building-skyscraper-b',
    path: '/assets/city/commercial/building-skyscraper-b.glb',
    category: 'SKYSCRAPER',
    nativeSize: [1.36, 4.48, 1.36],
    defaultScale: 14.0,
    minScale: 13.0,
    maxScale: 15.0,
  },
  {
    id: 'building-skyscraper-c',
    path: '/assets/city/commercial/building-skyscraper-c.glb',
    category: 'SKYSCRAPER',
    nativeSize: [1.28, 4.08, 1.388],
    defaultScale: 14.0,
    minScale: 13.0,
    maxScale: 15.0,
  },
  {
    id: 'building-skyscraper-d',
    path: '/assets/city/commercial/building-skyscraper-d.glb',
    category: 'SKYSCRAPER',
    nativeSize: [1.28, 5.47, 1.388],
    defaultScale: 13.0,
    minScale: 12.0,
    maxScale: 14.0,
  },
  {
    id: 'building-skyscraper-e',
    path: '/assets/city/commercial/building-skyscraper-e.glb',
    category: 'SKYSCRAPER',
    nativeSize: [1.295, 4.08, 1.242],
    defaultScale: 14.0,
    minScale: 13.0,
    maxScale: 15.0,
  },

  // --- LOW DETAIL BUILDINGS (Background skyline & silhouette fillers) ---
  {
    id: 'low-detail-building-d',
    path: '/assets/city/commercial/low-detail-building-d.glb',
    category: 'LOW_DETAIL',
    nativeSize: [0.5, 1.75, 0.5],
    defaultScale: 17.0,
    minScale: 15.0,
    maxScale: 19.0,
  },
  {
    id: 'low-detail-building-e',
    path: '/assets/city/commercial/low-detail-building-e.glb',
    category: 'LOW_DETAIL',
    nativeSize: [0.5, 1.8, 0.5],
    defaultScale: 17.0,
    minScale: 15.0,
    maxScale: 19.0,
  },
  {
    id: 'low-detail-building-f',
    path: '/assets/city/commercial/low-detail-building-f.glb',
    category: 'LOW_DETAIL',
    nativeSize: [0.5, 2.0, 0.5],
    defaultScale: 16.0,
    minScale: 14.5,
    maxScale: 18.0,
  },
  {
    id: 'low-detail-building-g',
    path: '/assets/city/commercial/low-detail-building-g.glb',
    category: 'LOW_DETAIL',
    nativeSize: [0.5, 2.0, 0.5],
    defaultScale: 16.0,
    minScale: 14.5,
    maxScale: 18.0,
  },
  {
    id: 'low-detail-building-h',
    path: '/assets/city/commercial/low-detail-building-h.glb',
    category: 'LOW_DETAIL',
    nativeSize: [0.5, 2.1, 0.5],
    defaultScale: 16.0,
    minScale: 14.5,
    maxScale: 18.0,
  },
  {
    id: 'low-detail-building-i',
    path: '/assets/city/commercial/low-detail-building-i.glb',
    category: 'LOW_DETAIL',
    nativeSize: [0.5, 1.775, 0.5],
    defaultScale: 17.0,
    minScale: 15.0,
    maxScale: 19.0,
  },
  {
    id: 'low-detail-building-j',
    path: '/assets/city/commercial/low-detail-building-j.glb',
    category: 'LOW_DETAIL',
    nativeSize: [0.5, 1.75, 0.5],
    defaultScale: 17.0,
    minScale: 15.0,
    maxScale: 19.0,
  },
  {
    id: 'low-detail-building-k',
    path: '/assets/city/commercial/low-detail-building-k.glb',
    category: 'LOW_DETAIL',
    nativeSize: [0.5, 1.55, 0.5],
    defaultScale: 17.0,
    minScale: 15.0,
    maxScale: 19.0,
  },
  {
    id: 'low-detail-building-l',
    path: '/assets/city/commercial/low-detail-building-l.glb',
    category: 'LOW_DETAIL',
    nativeSize: [0.5, 1.85, 0.5],
    defaultScale: 17.0,
    minScale: 15.0,
    maxScale: 19.0,
  },
  {
    id: 'low-detail-building-m',
    path: '/assets/city/commercial/low-detail-building-m.glb',
    category: 'LOW_DETAIL',
    nativeSize: [0.5, 1.975, 0.5],
    defaultScale: 16.0,
    minScale: 14.5,
    maxScale: 18.0,
  },
  {
    id: 'low-detail-building-n',
    path: '/assets/city/commercial/low-detail-building-n.glb',
    category: 'LOW_DETAIL',
    nativeSize: [0.5, 0.7, 0.5],
    defaultScale: 18.0,
    minScale: 16.0,
    maxScale: 20.0,
  },
  {
    id: 'low-detail-building-wide-a',
    path: '/assets/city/commercial/low-detail-building-wide-a.glb',
    category: 'LOW_DETAIL',
    nativeSize: [1.0, 1.1, 0.5],
    defaultScale: 17.0,
    minScale: 15.0,
    maxScale: 19.0,
  },
  {
    id: 'low-detail-building-wide-b',
    path: '/assets/city/commercial/low-detail-building-wide-b.glb',
    category: 'LOW_DETAIL',
    nativeSize: [1.0, 1.15, 0.5],
    defaultScale: 17.0,
    minScale: 15.0,
    maxScale: 19.0,
  },
];

export const MAIN_BUILDINGS = KENNEY_COMMERCIAL_ASSETS.filter((a) => a.category === 'MAIN');
export const SKYSCRAPER_BUILDINGS = KENNEY_COMMERCIAL_ASSETS.filter((a) => a.category === 'SKYSCRAPER');
export const LOW_DETAIL_BUILDINGS = KENNEY_COMMERCIAL_ASSETS.filter((a) => a.category === 'LOW_DETAIL');

export const ASSET_MAP = new Map<string, BuildingAssetDef>(
  KENNEY_COMMERCIAL_ASSETS.map((asset) => [asset.id, asset])
);

export function getAssetDef(id: string): BuildingAssetDef | undefined {
  return ASSET_MAP.get(id);
}
