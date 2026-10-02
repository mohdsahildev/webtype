import { ChallengeSide, AnchorFormation } from './game-types';

export interface FormationWeight {
  formation: AnchorFormation;
  weight: number;
}

export const FORMATION_CONFIG = {
  distribution: [
    { formation: 'LEFT_ONLY', weight: 0.15 },
    { formation: 'RIGHT_ONLY', weight: 0.15 },
    { formation: 'BALANCED', weight: 0.25 },
    { formation: 'LEFT_HEAVY', weight: 0.10 },
    { formation: 'RIGHT_HEAVY', weight: 0.10 },
    { formation: 'ALTERNATING', weight: 0.10 },
    { formation: 'WIDE_SPLIT', weight: 0.10 },
    { formation: 'MIXED_RANDOM', weight: 0.05 },
  ] as FormationWeight[],
  rules: {
    maxConsecutiveSame: 2, // Max 2 of same formation in a row
    disallowConsecutiveLeftOnly: true,
    disallowConsecutiveRightOnly: true,
  },
  spatial: {
    baseLateralOffset: 7.6,
    xVariation: 0.7,
    wideSplitOffset: 8.2,
  },
};

/**
 * Select next formation with weighted distribution and strict anti-repetition rules.
 */
export function selectNextFormation(recentHistory: AnchorFormation[]): AnchorFormation {
  const eligible = FORMATION_CONFIG.distribution.filter((item) => {
    const f = item.formation;
    const len = recentHistory.length;

    // Rule 1: Avoid exact same formation 3 times consecutively
    if (len >= 2 && recentHistory[len - 1] === f && recentHistory[len - 2] === f) {
      return false;
    }

    // Rule 2: Avoid LEFT_ONLY repeating twice consecutively
    if (FORMATION_CONFIG.rules.disallowConsecutiveLeftOnly && f === 'LEFT_ONLY' && len >= 1 && recentHistory[len - 1] === 'LEFT_ONLY') {
      return false;
    }

    // Rule 3: Avoid RIGHT_ONLY repeating twice consecutively
    if (FORMATION_CONFIG.rules.disallowConsecutiveRightOnly && f === 'RIGHT_ONLY' && len >= 1 && recentHistory[len - 1] === 'RIGHT_ONLY') {
      return false;
    }

    return true;
  });

  const activePool = eligible.length > 0 ? eligible : FORMATION_CONFIG.distribution;
  const totalWeight = activePool.reduce((sum, item) => sum + item.weight, 0);
  let randomVal = Math.random() * totalWeight;

  for (const item of activePool) {
    if (randomVal <= item.weight) {
      return item.formation;
    }
    randomVal -= item.weight;
  }

  return activePool[activePool.length - 1].formation;
}

export interface AnchorLayoutItem {
  side: ChallengeSide;
  x: number;
}

/**
 * Generates array of anchor sides and randomized X positions according to formation type.
 */
export function generateAnchorLayout(
  formation: AnchorFormation,
  count: number,
  baseLateralOffset: number = FORMATION_CONFIG.spatial.baseLateralOffset
): AnchorLayoutItem[] {
  const sides: ChallengeSide[] = [];
  const xPositions: number[] = [];

  switch (formation) {
    case 'LEFT_ONLY': {
      for (let i = 0; i < count; i++) {
        sides.push('left');
        const offset = baseLateralOffset + (Math.random() - 0.5) * (FORMATION_CONFIG.spatial.xVariation * 2);
        xPositions.push(-Math.round(offset * 10) / 10);
      }
      break;
    }

    case 'RIGHT_ONLY': {
      for (let i = 0; i < count; i++) {
        sides.push('right');
        const offset = baseLateralOffset + (Math.random() - 0.5) * (FORMATION_CONFIG.spatial.xVariation * 2);
        xPositions.push(Math.round(offset * 10) / 10);
      }
      break;
    }

    case 'BALANCED': {
      if (count === 2) {
        const startLeft = Math.random() < 0.5;
        sides.push(startLeft ? 'left' : 'right', startLeft ? 'right' : 'left');
      } else if (count === 3) {
        const twoLeft = Math.random() < 0.5;
        const tempSides: ChallengeSide[] = twoLeft ? ['left', 'left', 'right'] : ['right', 'right', 'left'];
        // Shuffle order
        tempSides.sort(() => Math.random() - 0.5);
        sides.push(...tempSides);
      } else {
        // 4 anchors: 2 left and 2 right in shuffled order
        const tempSides: ChallengeSide[] = ['left', 'left', 'right', 'right'];
        tempSides.sort(() => Math.random() - 0.5);
        sides.push(...tempSides);
      }

      for (const side of sides) {
        const offset = baseLateralOffset + (Math.random() - 0.5) * (FORMATION_CONFIG.spatial.xVariation * 2);
        xPositions.push(side === 'left' ? -Math.round(offset * 10) / 10 : Math.round(offset * 10) / 10);
      }
      break;
    }

    case 'LEFT_HEAVY': {
      if (count === 2) {
        sides.push('left', 'right');
        if (Math.random() < 0.5) sides.reverse();
      } else if (count === 3) {
        // 2 left, 1 right at random index
        const rightIndex = Math.floor(Math.random() * 3);
        for (let i = 0; i < 3; i++) {
          sides.push(i === rightIndex ? 'right' : 'left');
        }
      } else {
        // 4 anchors: 3 left, 1 right at random index
        const rightIndex = Math.floor(Math.random() * 4);
        for (let i = 0; i < 4; i++) {
          sides.push(i === rightIndex ? 'right' : 'left');
        }
      }

      for (const side of sides) {
        const offset = baseLateralOffset + (Math.random() - 0.5) * (FORMATION_CONFIG.spatial.xVariation * 2);
        xPositions.push(side === 'left' ? -Math.round(offset * 10) / 10 : Math.round(offset * 10) / 10);
      }
      break;
    }

    case 'RIGHT_HEAVY': {
      if (count === 2) {
        sides.push('right', 'left');
        if (Math.random() < 0.5) sides.reverse();
      } else if (count === 3) {
        // 2 right, 1 left at random index
        const leftIndex = Math.floor(Math.random() * 3);
        for (let i = 0; i < 3; i++) {
          sides.push(i === leftIndex ? 'left' : 'right');
        }
      } else {
        // 4 anchors: 3 right, 1 left at random index
        const leftIndex = Math.floor(Math.random() * 4);
        for (let i = 0; i < 4; i++) {
          sides.push(i === leftIndex ? 'left' : 'right');
        }
      }

      for (const side of sides) {
        const offset = baseLateralOffset + (Math.random() - 0.5) * (FORMATION_CONFIG.spatial.xVariation * 2);
        xPositions.push(side === 'left' ? -Math.round(offset * 10) / 10 : Math.round(offset * 10) / 10);
      }
      break;
    }

    case 'ALTERNATING': {
      let currentSide: ChallengeSide = Math.random() < 0.5 ? 'left' : 'right';
      for (let i = 0; i < count; i++) {
        sides.push(currentSide);
        const offset = baseLateralOffset + (Math.random() - 0.5) * (FORMATION_CONFIG.spatial.xVariation * 2);
        xPositions.push(currentSide === 'left' ? -Math.round(offset * 10) / 10 : Math.round(offset * 10) / 10);
        currentSide = currentSide === 'left' ? 'right' : 'left';
      }
      break;
    }

    case 'WIDE_SPLIT': {
      const wideOffset = FORMATION_CONFIG.spatial.wideSplitOffset;
      if (count === 2) {
        const startLeft = Math.random() < 0.5;
        sides.push(startLeft ? 'left' : 'right', startLeft ? 'right' : 'left');
      } else if (count === 3) {
        const tempSides: ChallengeSide[] = Math.random() < 0.5 ? ['left', 'right', 'left'] : ['right', 'left', 'right'];
        sides.push(...tempSides);
      } else {
        const tempSides: ChallengeSide[] = ['left', 'left', 'right', 'right'];
        tempSides.sort(() => Math.random() - 0.5);
        sides.push(...tempSides);
      }

      for (const side of sides) {
        const offset = wideOffset + (Math.random() - 0.5) * 0.4;
        xPositions.push(side === 'left' ? -Math.round(offset * 10) / 10 : Math.round(offset * 10) / 10);
      }
      break;
    }

    case 'MIXED_RANDOM':
    default: {
      for (let i = 0; i < count; i++) {
        const side: ChallengeSide = Math.random() < 0.5 ? 'left' : 'right';
        sides.push(side);
        const offset = baseLateralOffset + (Math.random() - 0.5) * (FORMATION_CONFIG.spatial.xVariation * 2);
        xPositions.push(side === 'left' ? -Math.round(offset * 10) / 10 : Math.round(offset * 10) / 10);
      }
      break;
    }
  }

  return sides.map((side, i) => ({
    side,
    x: xPositions[i],
  }));
}
