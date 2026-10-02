import { WORD_BANK, type ValidatedWord } from './word-bank';

export interface WordSelectionProfile {
  minLength: number;
  maxLength: number;
  maxRareLetters: number;
  maxComplexity: number;
  level: number;
}

export interface ChallengeWordContext {
  count: number;
  completedCount?: number;
  speedMultiplier?: number;
  activeWords?: string[];
}

export class WordGenerator {
  private bag: ValidatedWord[] = [];
  private bagIndex = 0;
  private recentHistory: string[] = [];
  private recentSet = new Set<string>();
  private readonly maxRecentHistory = 40;

  constructor() {
    this.refillAndShuffleBag();
  }

  /**
   * Resets session history and refreshes the shuffle bag.
   */
  public resetSession() {
    this.recentHistory = [];
    this.recentSet.clear();
    this.refillAndShuffleBag();
  }

  /**
   * Resets only the recent words history without reshuffling the remaining bag.
   */
  public resetHistory() {
    this.recentHistory = [];
    this.recentSet.clear();
  }

  /**
   * Refills the bag with all validated words and performs an unbiased Fisher-Yates shuffle.
   */
  private refillAndShuffleBag() {
    this.bag = [...WORD_BANK.words];
    for (let i = this.bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = this.bag[i];
      this.bag[i] = this.bag[j];
      this.bag[j] = temp;
    }
    this.bagIndex = 0;
  }

  /**
   * Determines difficulty profile based on completed challenges and current speed multiplier.
   */
  public getWordSelectionProfile(speedMultiplier = 1.0, completedChallenges = 0): WordSelectionProfile {
    if (completedChallenges <= 3) {
      return {
        level: 1,
        minLength: 3,
        maxLength: 6,
        maxRareLetters: 1,
        maxComplexity: 7.2,
      };
    } else if (completedChallenges <= 6) {
      return {
        level: 2,
        minLength: 4,
        maxLength: 7,
        maxRareLetters: 1,
        maxComplexity: 8.5,
      };
    } else if (completedChallenges <= 10) {
      return {
        level: 3,
        minLength: 4,
        maxLength: 8,
        maxRareLetters: 2,
        maxComplexity: 10.0,
      };
    } else if (completedChallenges <= 15) {
      return {
        level: 4,
        minLength: 5,
        maxLength: 9,
        maxRareLetters: 2,
        maxComplexity: 11.5,
      };
    } else if (completedChallenges <= 20) {
      return {
        level: 5,
        minLength: 5,
        maxLength: 10,
        maxRareLetters: 3,
        maxComplexity: 13.0,
      };
    } else {
      // Level 6+ / high difficulty
      const highSpeedBonus = speedMultiplier >= 1.7 ? 12 : 11;
      return {
        level: 6,
        minLength: 6,
        maxLength: highSpeedBonus,
        maxRareLetters: 5,
        maxComplexity: Infinity,
      };
    }
  }

  /**
   * Checks if a word meets candidate constraints.
   */
  private matchesProfile(
    word: ValidatedWord,
    profile: WordSelectionProfile,
    ignoreComplexity = false
  ): boolean {
    if (word.length < profile.minLength || word.length > profile.maxLength) {
      return false;
    }
    if (!ignoreComplexity) {
      if (word.rareLetterCount > profile.maxRareLetters) {
        return false;
      }
      if (word.complexityScore > profile.maxComplexity) {
        return false;
      }
    }
    return true;
  }

  /**
   * Adds a word to the recent history buffer with fixed maximum capacity.
   */
  private recordRecentWord(word: string) {
    this.recentHistory.push(word);
    this.recentSet.add(word);
    if (this.recentHistory.length > this.maxRecentHistory) {
      const removed = this.recentHistory.shift();
      if (removed) {
        // Only remove from set if not present earlier in remaining history
        if (!this.recentHistory.includes(removed)) {
          this.recentSet.delete(removed);
        }
      }
    }
  }

  /**
   * Generates a set of words for a challenge adhering to:
   * 1. Unique first letters across all selected anchors
   * 2. Exclusion of active on-screen words
   * 3. Recent-word protection (last 30-50 words)
   * 4. Shuffle-bag progression
   * 5. Difficulty-aware profile matching
   * 6. Guaranteed bounded fallback
   */
  public generateChallengeWords(context: ChallengeWordContext): string[] {
    const requestedCount = Math.max(1, Math.min(context.count, 6));
    const completed = context.completedCount ?? 0;
    const speed = context.speedMultiplier ?? 1.0;
    const profile = this.getWordSelectionProfile(speed, completed);

    const activeSet = new Set<string>(
      (context.activeWords || []).map((w) => w.toLowerCase())
    );
    const chosenWords: string[] = [];
    const usedInitials = new Set<string>();

    for (let slot = 0; slot < requestedCount; slot++) {
      let chosen: ValidatedWord | null = null;

      // PASS 1: Ideal selection from Shuffle Bag (strict profile + no recent)
      const bagLength = this.bag.length;
      let inspectedCount = 0;
      while (inspectedCount < bagLength) {
        if (this.bagIndex >= this.bag.length) {
          this.refillAndShuffleBag();
        }

        const candidate = this.bag[this.bagIndex];
        this.bagIndex++;
        inspectedCount++;

        if (usedInitials.has(candidate.initial)) continue;
        if (activeSet.has(candidate.word)) continue;
        if (this.recentSet.has(candidate.word)) continue;
        if (!this.matchesProfile(candidate, profile, false)) continue;

        chosen = candidate;
        break;
      }

      // PASS 2: Relax recent history (still enforce profile + no active + unique initial)
      if (!chosen) {
        inspectedCount = 0;
        while (inspectedCount < Math.min(1000, bagLength)) {
          if (this.bagIndex >= this.bag.length) {
            this.refillAndShuffleBag();
          }
          const candidate = this.bag[this.bagIndex];
          this.bagIndex++;
          inspectedCount++;

          if (usedInitials.has(candidate.initial)) continue;
          if (activeSet.has(candidate.word)) continue;
          if (!this.matchesProfile(candidate, profile, true)) continue;

          chosen = candidate;
          break;
        }
      }

      // PASS 3: Relax length/difficulty entirely from shuffle bag
      if (!chosen) {
        inspectedCount = 0;
        while (inspectedCount < bagLength) {
          if (this.bagIndex >= this.bag.length) {
            this.refillAndShuffleBag();
          }
          const candidate = this.bag[this.bagIndex];
          this.bagIndex++;
          inspectedCount++;

          if (usedInitials.has(candidate.initial)) continue;
          if (activeSet.has(candidate.word)) continue;

          chosen = candidate;
          break;
        }
      }

      // PASS 4: Direct lookup by available first letters in indexed map
      if (!chosen) {
        for (const [letter, wordList] of WORD_BANK.wordsByFirstLetter.entries()) {
          if (usedInitials.has(letter)) continue;
          for (const item of wordList) {
            if (!activeSet.has(item.word)) {
              chosen = item;
              break;
            }
          }
          if (chosen) break;
        }
      }

      if (chosen) {
        chosenWords.push(chosen.word.toUpperCase());
        usedInitials.add(chosen.initial);
        this.recordRecentWord(chosen.word);
      }
    }

    return chosenWords;
  }

  /**
   * Diagnostic statistics for testing and telemetry.
   */
  public getStats() {
    return {
      bagTotal: this.bag.length,
      bagRemaining: this.bag.length - this.bagIndex,
      recentCount: this.recentHistory.length,
      uniqueRecentCount: this.recentSet.size,
    };
  }
}

// Global word generator instance for WebType runtime
export const wordGenerator = new WordGenerator();
