export const GAME_CONFIG = {
  movement: {
    forwardSpeed: 14.0, // Units per second forward (-Z)
    fallSpeed: 3.6,     // Units per second downward (-Y)
    initialPosition: [0, 16.5, -50.0] as [number, number, number],
    failureHeight: 0,   // Ground Y boundary
    missMarginZ: 2.0,   // Margin past anchor before triggering failure
  },
  traversal: {
    duration: 1.35,     // Traversal swing duration
    forwardBoost: 38,   // Forward boost along -Z during swing
    apexLift: 5.5,      // Upward lift gained during the arc
    maxApexY: 21.0,     // Target apex height to maintain stable flight level
    lateralPull: 2.8,   // Controlled swing sway towards selected side
  },
  challenge: {
    minAnchors: 2,         // Minimum number of anchors per challenge
    maxAnchors: 4,         // Maximum number of anchors per challenge
    firstDistanceMin: 40,  // Distance of the closest anchor
    firstDistanceMax: 48,  // Distance of the closest anchor
    minGapBetweenAnchors: 14, // Spacing along Z between consecutive anchors
    maxGapBetweenAnchors: 20, // Spacing along Z between consecutive anchors
    minHeightOffset: 3.5,  // Anchor comfortably above player for swing radius
    maxHeightOffset: 6.5,  // Natural anchor height on skyscraper facade
    maxAnchorY: 23.0,      // Upper anchor ceiling
    lateralOffset: 7.6,    // X offset aligned with building facades
  },
  city: {
    chunkLength: 90,       // Length of each procedural chunk along Z
    chunksAhead: 4,        // Number of chunks generated ahead of player
    chunksBehind: 2,       // Number of chunks kept behind player
    cleanupDistance: 180,  // Distance behind player to purge chunks
    corridorHalfWidth: 7.6,// Center corridor half-width (clear zone -7.6 to +7.6)
    leftBuildingZoneX: -7.6,
    rightBuildingZoneX: 7.6,
    minBuildingHeight: 16,
    maxBuildingHeight: 46,
    palette: [
      '#334155', // Slate Blue-Gray
      '#3b4e68', // Steel Blue
      '#2e3e56', // Deep Slate Blue
      '#374962', // Twilight Blue
      '#2a3a52', // Muted Charcoal Blue
      '#3e5372', // Architectural Slate
      '#435b7e', // Accent Sky Blue-Gray
      '#2d3b50', // Rich Dark Blue
    ],
    windowColors: [
      '#fbbf24', // Warm Amber Gold
      '#f59e0b', // Sunset Gold
      '#38bdf8', // Soft Cyan
      '#fdba74', // Warm Peach
      '#93c5fd', // Soft Sky Blue
      '#a78bfa', // Soft Purple Neon
    ],
  },
  camera: {
    fov: 58,
    offset: [0, 2.0, 5.2] as [number, number, number],
    lookOffset: [0, 0.5, -18] as [number, number, number],
    lerpSpeed: 7.5,
  },
  environment: {
    fogColor: '#7dd3fc', // Beautiful bright daytime sky & atmospheric horizon
    fogNear: 120,        // Keeps all foreground and midground buildings crisp & readable
    fogFar: 450,         // Smooth distant skyline falloff
  },
  wordBank: {
    short: [
      'VOLT', 'DASH', 'HERO', 'ECHO', 'LEAP', 'WARP', 'BOLT', 'RUSH',
      'DROP', 'WIND', 'FLIP', 'ZEAL', 'APEX', 'NEON', 'SYNC', 'FLOW',
      'ZOOM', 'GRIP', 'FURY', 'HAWK', 'BYTE', 'SURG', 'JUMP', 'DIVE'
    ],
    medium: [
      'SPIDER', 'VENOM', 'GLIDE', 'RAPTOR', 'FALCON', 'BOUNCE', 'ZIPLINE',
      'CYBER', 'SONIC', 'TITAN', 'NINJA', 'CLIMB', 'ORBIT', 'MAGNET',
      'MATRIX', 'PULSE', 'SHADOW', 'COSMIC', 'STRIKE', 'VECTOR', 'SIGNAL',
      'FLIGHT', 'LAUNCH', 'RADAR', 'BLAST', 'TURBO', 'SPRINT', 'AVATAR'
    ],
    long: [
      'THUNDER', 'KINETIC', 'PHANTOM', 'VELOCITY', 'MOMENTUM', 'HORIZON',
      'GRAVITY', 'OVERDRIVE', 'BLASTER', 'SPECTRE', 'TURBINE', 'VALIANT',
      'CATALYST', 'INFINITY', 'RESONANCE', 'SUPERNOVA', 'NIGHTFALL', 'ACCELERATE'
    ],
  },
};
