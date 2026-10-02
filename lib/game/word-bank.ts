import { RAW_WORD_BANK } from './word-bank-data';

export interface ValidatedWord {
  word: string;
  length: number;
  uniqueCharacters: number;
  repeatedCharacterCount: number;
  rareLetterCount: number;
  complexityScore: number;
  initial: string;
}

export interface WordBankMetadata {
  totalWords: number;
  words: ValidatedWord[];
  wordsByLength: Map<number, ValidatedWord[]>;
  wordsByFirstLetter: Map<string, ValidatedWord[]>;
  wordsByBand: {
    short: ValidatedWord[];   // 3 - 5 chars
    medium: ValidatedWord[];  // 5 - 8 chars
    long: ValidatedWord[];    // 7 - 12 chars
  };
}

const RARE_LETTERS = new Set(['q', 'x', 'z', 'j', 'v']);

/**
 * Calculates derived difficulty metadata for a single word.
 */
export function deriveWordMetadata(rawWord: string): ValidatedWord {
  const word = rawWord.toLowerCase();
  const len = word.length;
  const uniqueChars = new Set(word.split('')).size;
  const repeatedChars = Math.max(0, len - uniqueChars);

  let rareCount = 0;
  for (let i = 0; i < len; i++) {
    if (RARE_LETTERS.has(word[i])) {
      rareCount++;
    }
  }

  // Complexity formula: length contribution + rare letter penalty + repeated character penalty
  const complexityScore = len * 1.0 + rareCount * 2.2 + repeatedChars * 0.4;

  return {
    word,
    length: len,
    uniqueCharacters: uniqueChars,
    repeatedCharacterCount: repeatedChars,
    rareLetterCount: rareCount,
    complexityScore: Math.round(complexityScore * 10) / 10,
    initial: word[0],
  };
}

/**
 * Initializes and strictly validates the entire word bank once at module load.
 */
function createWordBank(): WordBankMetadata {
  const seen = new Set<string>();
  const validatedList: ValidatedWord[] = [];
  const byLength = new Map<number, ValidatedWord[]>();
  const byFirstLetter = new Map<string, ValidatedWord[]>();
  const byBand = {
    short: [] as ValidatedWord[],
    medium: [] as ValidatedWord[],
    long: [] as ValidatedWord[],
  };

  const validWordRegex = /^[a-z]+$/;

  for (const raw of RAW_WORD_BANK) {
    if (!raw || typeof raw !== 'string') continue;
    const trimmed = raw.trim().toLowerCase();

    // Enforce 3 to 12 character length and regex ^[a-z]+$
    if (trimmed.length < 3 || trimmed.length > 12) continue;
    if (!validWordRegex.test(trimmed)) continue;
    if (seen.has(trimmed)) continue;

    seen.add(trimmed);
    const meta = deriveWordMetadata(trimmed);
    validatedList.push(meta);

    // Index by length
    if (!byLength.has(meta.length)) {
      byLength.set(meta.length, []);
    }
    byLength.get(meta.length)!.push(meta);

    // Index by first letter
    if (!byFirstLetter.has(meta.initial)) {
      byFirstLetter.set(meta.initial, []);
    }
    byFirstLetter.get(meta.initial)!.push(meta);

    // Index by broad difficulty bands
    if (meta.length <= 5) {
      byBand.short.push(meta);
    }
    if (meta.length >= 4 && meta.length <= 8) {
      byBand.medium.push(meta);
    }
    if (meta.length >= 7) {
      byBand.long.push(meta);
    }
  }

  return {
    totalWords: validatedList.length,
    words: validatedList,
    wordsByLength: byLength,
    wordsByFirstLetter: byFirstLetter,
    wordsByBand: byBand,
  };
}

// Singleton pre-validated word bank instance
export const WORD_BANK = createWordBank();
