import { createContext, useContext } from 'react';
import * as THREE from 'three';
import { GameStatus, ActiveChallenge, ChallengeSide, AnchorData, TraversalData, TypingStats, GameOverReason, GameOverInfo, AnchorFormation, NewRecordsInfo } from './game-types';
import { GAME_CONFIG } from './game-config';
import { DIFFICULTY_CONFIG, getTargetSpeedMultiplier, getDifficultyLevel } from './difficulty';
import { selectNextFormation, generateAnchorLayout } from './formations';
import { sound } from './audio';
import { calculateWordScore, calculateDistanceScore } from './scoring';
import { evaluateAndSaveRunRecords } from './records';
import { getTutorialCompleted, setTutorialCompleted, TutorialHintData, TutorialStep } from './tutorial';
import { WordGenerator } from './word-generator';

export class GameRuntime {
  public status: GameStatus = 'loading';
  public playerPosition = new THREE.Vector3(0, 17.4, 14);
  public playerHandPosition = new THREE.Vector3(0, 17.4, 14);
  public currentAnim = 'idle';
  public currentChallenge: ActiveChallenge | null = null;
  public traversal: TraversalData | null = null;
  private challengeIndex = 0;
  private formationHistory: AnchorFormation[] = [];
  private wordGenerator = new WordGenerator();

  public completedCount = 0;
  public totalCorrectChars = 0;
  public totalAttemptedChars = 0;
  public activeTypingTimeSec = 0;
  public elapsedRunTimeSec = 0;
  public isChallengeAttemptActive = false;
  public distanceTraveled = 0;
  public wordScoreTotal = 0;
  public score = 0;
  public lastScoreDelta = 0;
  public lastScoreDeltaTime = 0;
  public newRecords: NewRecordsInfo | null = null;
  public streak = 0;
  public maxStreak = 0;
  public currentSpeedMultiplier = 1.0;
  public maxSpeedReached = 1.0;
  public gameOverInfo: GameOverInfo | null = null;
  public deathSequenceTimer = 0;
  public deathInitialPos = new THREE.Vector3();
  public cameraShakeIntensity = 0;
  public introTimer = 0;

  public isPaused = false;
  private pauseListeners = new Set<(isPaused: boolean) => void>();

  // Interactive Tutorial State
  public isTutorialMode = false;
  public tutorialStep: TutorialStep = 'INACTIVE';
  public currentTutorialHint: TutorialHintData | null = null;
  private tutorialListeners = new Set<(hint: TutorialHintData | null, step: TutorialStep) => void>();

  private statusListeners = new Set<(status: GameStatus) => void>();
  private challengeListeners = new Set<(challenge: ActiveChallenge | null) => void>();
  private traversalListeners = new Set<(traversal: TraversalData | null) => void>();
  private statsListeners = new Set<(stats: TypingStats) => void>();

  constructor() {
    // Challenge will spawn when gameplay begins after the intro or upon direct start
  }

  public pause() {
    if (this.isPaused) return;
    if (this.status !== 'falling' && this.status !== 'traversing') return;
    this.isPaused = true;
    sound.pause();
    this.notifyPause();
  }

  public resume() {
    if (!this.isPaused) return;
    this.isPaused = false;
    sound.resume();
    this.notifyPause();
  }

  public togglePause() {
    if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  public subscribePause(fn: (isPaused: boolean) => void) {
    this.pauseListeners.add(fn);
    fn(this.isPaused);
    return () => {
      this.pauseListeners.delete(fn);
    };
  }

  public notifyPause() {
    this.pauseListeners.forEach((fn) => fn(this.isPaused));
  }

  public returnToMenu() {
    if (this.isPaused) {
      this.isPaused = false;
      this.notifyPause();
    }
    sound.resume();
    this.traversal = null;
    this.traversalCurve = null;
    this.currentChallenge = null;
    this.challengeIndex = 0;
    this.formationHistory = [];
    this.wordGenerator.resetSession();
    this.completedCount = 0;
    this.streak = 0;
    this.maxStreak = 0;
    this.totalCorrectChars = 0;
    this.totalAttemptedChars = 0;
    this.activeTypingTimeSec = 0;
    this.elapsedRunTimeSec = 0;
    this.isChallengeAttemptActive = false;
    this.distanceTraveled = 0;
    this.wordScoreTotal = 0;
    this.score = 0;
    this.lastScoreDelta = 0;
    this.lastScoreDeltaTime = 0;
    this.newRecords = null;
    this.currentSpeedMultiplier = 1.0;
    this.maxSpeedReached = 1.0;
    this.gameOverInfo = null;
    this.playerPosition.set(0, 17.4, 14);
    this.currentAnim = 'idle';
    this.isTutorialMode = false;
    this.tutorialStep = 'INACTIVE';
    this.currentTutorialHint = null;

    this.setStatus('menu');
    this.notifyChallenge();
    this.notifyTraversal();
    this.notifyTutorial();
    this.notifyStats();
  }

  public startIntro(forceTutorial = false) {
    if (this.status !== 'menu') return;
    this.introTimer = 0;
    this.currentChallenge = null;

    const isFirstTime = !getTutorialCompleted();
    if (forceTutorial || isFirstTime) {
      this.isTutorialMode = true;
      this.tutorialStep = 'FIRST_WORD';
      this.currentTutorialHint = {
        title: 'TYPE THE WORD',
        subtitle: 'Complete the word to swing.',
        badge: 'TUTORIAL 1/4',
      };
    } else {
      this.isTutorialMode = false;
      this.tutorialStep = 'INACTIVE';
      this.currentTutorialHint = null;
    }

    this.notifyTutorial();
    this.notifyChallenge();
    this.setStatus('intro');
  }

  public subscribeTutorial(fn: (hint: TutorialHintData | null, step: TutorialStep) => void) {
    this.tutorialListeners.add(fn);
    fn(this.currentTutorialHint, this.tutorialStep);
    return () => {
      this.tutorialListeners.delete(fn);
    };
  }

  public notifyTutorial() {
    this.tutorialListeners.forEach((fn) => fn(this.currentTutorialHint, this.tutorialStep));
  }

  public setTutorialHint(hint: TutorialHintData | null) {
    this.currentTutorialHint = hint;
    this.notifyTutorial();
  }

  public skipTutorial() {
    this.isTutorialMode = false;
    this.tutorialStep = 'COMPLETED';
    setTutorialCompleted(true);
    this.setTutorialHint({
      title: 'TUTORIAL SKIPPED',
      subtitle: 'Normal gameplay active.',
      badge: 'READY',
    });
    setTimeout(() => {
      if (this.tutorialStep === 'COMPLETED') {
        this.setTutorialHint(null);
      }
    }, 1800);
  }

  public updateIntro(delta: number) {
    if (this.status !== 'intro') return;
    this.introTimer += delta;
    const t = this.introTimer;

    const SPRINT_DURATION = 1.4;
    const JUMP_DURATION = 0.9;
    const FALL_DURATION = 0.8;
    const TOTAL_INTRO_DURATION = SPRINT_DURATION + JUMP_DURATION + FALL_DURATION; // 3.1s

    if (t < SPRINT_DURATION) {
      // Phase 1: Sprint along rooftop from Z=14 to Z=0
      const p = t / SPRINT_DURATION;
      const easeZ = p * p * (3 - 2 * p); // smooth acceleration
      this.playerPosition.x = 0;
      this.playerPosition.y = 17.4;
      this.playerPosition.z = THREE.MathUtils.lerp(14, 0, easeZ);
      this.currentAnim = 'sprint';
    } else if (t < SPRINT_DURATION + JUMP_DURATION) {
      // Phase 2: Big Jump off rooftop edge from Z=0 to Z=-11
      const p = (t - SPRINT_DURATION) / JUMP_DURATION;
      this.playerPosition.x = 0;
      this.playerPosition.z = THREE.MathUtils.lerp(0, -11, p);
      // Parabolic jump arc: apex lift up to +1.0m, then descent
      const arcY = Math.sin(p * Math.PI) * 1.1 - p * 0.7;
      this.playerPosition.y = 17.4 + arcY;
      this.currentAnim = 'big_jump';
    } else if (t < TOTAL_INTRO_DURATION) {
      // Phase 3: Transition directly into falling idle from Z=-11 to Z=-18
      const p = (t - SPRINT_DURATION - JUMP_DURATION) / FALL_DURATION;
      this.playerPosition.x = 0;
      this.playerPosition.z = THREE.MathUtils.lerp(-11, -18, p);
      this.playerPosition.y = THREE.MathUtils.lerp(16.7, 16.0, p);
      this.currentAnim = 'falling_idle';
    } else {
      // Phase 4: Seamless handoff into active gameplay
      this.playerPosition.set(0, 16.0, -18);
      this.currentAnim = 'falling_idle';
      this.spawnNextChallenge();
      this.setStatus('falling');
    }
  }

  public subscribeStatus(fn: (status: GameStatus) => void) {
    this.statusListeners.add(fn);
    return () => {
      this.statusListeners.delete(fn);
    };
  }

  public subscribeChallenge(fn: (challenge: ActiveChallenge | null) => void) {
    this.challengeListeners.add(fn);
    return () => {
      this.challengeListeners.delete(fn);
    };
  }

  public subscribeTraversal(fn: (traversal: TraversalData | null) => void) {
    this.traversalListeners.add(fn);
    return () => {
      this.traversalListeners.delete(fn);
    };
  }

  public subscribeStats(fn: (stats: TypingStats) => void) {
    this.statsListeners.add(fn);
    return () => {
      this.statsListeners.delete(fn);
    };
  }

  public getStats(): TypingStats {
    const correctCharacters = this.totalCorrectChars;
    const totalAttemptedCharacters = this.totalAttemptedChars;
    const incorrectCharacters = Math.max(0, totalAttemptedCharacters - correctCharacters);

    const accuracy = totalAttemptedCharacters > 0
      ? Math.round((correctCharacters / totalAttemptedCharacters) * 1000) / 10
      : 100;

    const isAccuracyWarning =
      totalAttemptedCharacters >= DIFFICULTY_CONFIG.accuracy.minAttempts &&
      accuracy <= DIFFICULTY_CONFIG.accuracy.warningThreshold;

    // Standard Typing Test WPM = (correct characters / 5) / (active typing time in minutes)
    let rawWpm = 0;
    if (this.activeTypingTimeSec > 0 && correctCharacters > 0) {
      const activeMinutes = this.activeTypingTimeSec / 60;
      rawWpm = (correctCharacters / 5) / activeMinutes;
    }
    const wpm = Math.round(rawWpm);
    const displayedWpm = wpm;

    return {
      score: this.score,
      lastScoreDelta: this.lastScoreDelta,
      wpm,
      displayedWpm,
      accuracy,
      isAccuracyWarning,
      streak: this.streak,
      maxStreak: this.maxStreak,
      completedWords: this.completedCount,
      correctCharacters,
      incorrectCharacters,
      totalAttemptedCharacters,
      activeTypingTime: Math.round(this.activeTypingTimeSec * 10) / 10,
      elapsedRunTime: Math.round(this.elapsedRunTimeSec * 10) / 10,
      currentSpeedMultiplier: Math.round(this.currentSpeedMultiplier * 100) / 100,
      maxSpeedReached: Math.round(this.maxSpeedReached * 100) / 100,
      distanceTraveled: Math.round(this.distanceTraveled),
      gameOverInfo: this.gameOverInfo,
      newRecords: this.newRecords ?? undefined,
      // Aliases
      totalCorrectChars: correctCharacters,
      totalAttemptedChars: totalAttemptedCharacters,
    };
  }

  public notifyStats() {
    const snapshot = this.getStats();
    this.statsListeners.forEach((fn) => fn(snapshot));
  }

  private notifyStatus() {
    this.statusListeners.forEach((fn) => fn(this.status));
  }

  private notifyChallenge() {
    const challengeSnapshot = this.currentChallenge
      ? {
        ...this.currentChallenge,
        anchors: this.currentChallenge.anchors.map((a) => ({ ...a })),
      }
      : null;
    this.challengeListeners.forEach((fn) => fn(challengeSnapshot));
  }

  private notifyTraversal() {
    const traversalSnapshot = this.traversal ? { ...this.traversal } : null;
    this.traversalListeners.forEach((fn) => fn(traversalSnapshot));
  }

  public setStatus(newStatus: GameStatus) {
    if (this.status === newStatus) return;
    this.status = newStatus;
    if (newStatus === 'falling' && !this.currentChallenge) {
      this.spawnNextChallenge();
    }
    if (newStatus === 'dead' || newStatus === 'deathSequence' || newStatus === 'menu' || newStatus === 'intro') {
      this.isChallengeAttemptActive = false;
      this.streak = 0;
      this.notifyStats();
    }
    this.notifyStatus();
  }

  public triggerGameOver(reason: GameOverReason, title: string, detail: string) {
    if (this.status === 'dead' || this.status === 'deathSequence') return;
    this.isChallengeAttemptActive = false;
    this.score = this.wordScoreTotal + calculateDistanceScore(this.distanceTraveled);

    // Evaluate and persist personal records ONLY for non-tutorial runs
    if (!this.isTutorialMode) {
      const evaluation = evaluateAndSaveRunRecords(this.getStats(), this.score);
      this.newRecords = evaluation.newRecords;
      this.gameOverInfo = {
        reason,
        title,
        detail,
        newRecords: evaluation.newRecords,
      };
    } else {
      this.gameOverInfo = {
        reason,
        title,
        detail,
      };
    }
    this.streak = 0;

    // 1. Immediately cancel traversal & hide active web
    this.traversal = null;
    this.traversalCurve = null;
    this.notifyTraversal();

    // 2. Mark active challenge anchors expired & notify
    if (this.currentChallenge) {
      this.currentChallenge.anchors.forEach((a) => {
        if (a.state === 'available' || a.state === 'selected') {
          a.state = 'expired';
        }
      });
      this.notifyChallenge();
    }

    // 3. Initialize death sequence state
    this.deathSequenceTimer = 0;
    this.deathInitialPos.copy(this.playerPosition);
    this.cameraShakeIntensity = 0;

    // 4. Transition to deathSequence state
    this.setStatus('deathSequence');
    sound.playGameOver();
    this.notifyStats();
  }

  public updateDeathSequence(delta: number) {
    if (this.status !== 'deathSequence') return;

    this.deathSequenceTimer += delta;
    const t = this.deathSequenceTimer;

    const FALL_DURATION = 0.55;
    const IMPACT_DURATION = 0.18;
    const HOLD_DURATION = 0.52;
    const TOTAL_DURATION = FALL_DURATION + IMPACT_DURATION + HOLD_DURATION;

    const targetLandingY = GAME_CONFIG.movement.failureHeight + 0.9;

    if (t < FALL_DURATION) {
      // Phase 1: Smooth downward drop with gravity acceleration
      const p = t / FALL_DURATION;
      const easeY = p * p;
      this.playerPosition.y = THREE.MathUtils.lerp(this.deathInitialPos.y, targetLandingY, easeY);

      // Dampen forward momentum
      const forwardRemaining = (1 - p) * GAME_CONFIG.movement.forwardSpeed * 0.35 * delta;
      this.playerPosition.z -= forwardRemaining;
    } else {
      // Phase 2 & 3: Ground contact, impact compression & recovery hold
      this.playerPosition.y = targetLandingY;

      // Trigger subtle camera shake and sound on impact frame
      if (t - delta < FALL_DURATION) {
        this.cameraShakeIntensity = 0.055;
        sound.playLandingImpact();
      }
    }

    // Decay camera shake smoothly
    if (this.cameraShakeIntensity > 0) {
      this.cameraShakeIntensity = Math.max(0, this.cameraShakeIntensity - delta * 0.35);
    }

    // Phase 4: Sequence complete -> Reveal Game Over modal
    if (t >= TOTAL_DURATION) {
      this.cameraShakeIntensity = 0;
      this.setStatus('dead');
    }
  }

  private statsThrottleTimer = 0;

  public updatePacing(delta: number) {
    if (this.isPaused || (this.status !== 'falling' && this.status !== 'traversing')) return;

    this.elapsedRunTimeSec += delta;

    if (this.isChallengeAttemptActive) {
      this.activeTypingTimeSec += delta;
    }

    // Update live score with distance progression
    this.score = this.wordScoreTotal + calculateDistanceScore(this.distanceTraveled);

    // Periodic telemetry update for HUD (every 150ms)
    this.statsThrottleTimer += delta;
    if (this.statsThrottleTimer >= 0.15) {
      this.statsThrottleTimer = 0;
      this.notifyStats();
    }

    // Smooth speed multiplier interpolation toward target tier speed
    const targetSpeed = getTargetSpeedMultiplier(this.completedCount);
    const lerpFactor = Math.min(1.0, DIFFICULTY_CONFIG.speed.lerpSpeed * delta);
    this.currentSpeedMultiplier = THREE.MathUtils.lerp(
      this.currentSpeedMultiplier,
      targetSpeed,
      lerpFactor
    );

    if (this.currentSpeedMultiplier > this.maxSpeedReached) {
      this.maxSpeedReached = this.currentSpeedMultiplier;
    }
  }

  public spawnNextChallenge() {
    this.challengeIndex++;
    this.isChallengeAttemptActive = false;

    // Tutorial Challenge 1 (1 single anchor) & Challenge 2 (2 distinct anchors)
    if (this.isTutorialMode) {
      const playerZ = this.playerPosition.z;
      const playerY = this.playerPosition.y;

      if (this.completedCount === 0) {
        // Step 1: Single left anchor with simple 3-letter word
        this.currentChallenge = {
          id: `challenge-${Date.now()}-${this.challengeIndex}`,
          anchors: [
            {
              id: `anchor-${this.challengeIndex}-0`,
              side: 'left',
              position: [-GAME_CONFIG.challenge.lateralOffset, playerY + 4.5, playerZ - 44],
              word: 'WEB',
              distance: 44,
              state: 'available',
            },
          ],
          selectedAnchorId: null,
          typedIndex: 0,
          isCompleted: false,
          hasError: false,
          mistakeCount: 0,
          difficultyLevel: 1,
          completedCount: 0,
          typingEstimateSec: 1.5,
          availableTimeSec: 3.2,
          isFair: true,
          formation: 'LEFT_ONLY',
        };
        this.setTutorialHint({
          title: 'TYPE THE WORD',
          subtitle: 'Complete the word to swing.',
          badge: 'TUTORIAL 1/4',
        });
        this.notifyChallenge();
        return;
      } else if (this.completedCount === 1) {
        // Step 2: Two anchors with distinct first letters
        this.currentChallenge = {
          id: `challenge-${Date.now()}-${this.challengeIndex}`,
          anchors: [
            {
              id: `anchor-${this.challengeIndex}-0`,
              side: 'left',
              position: [-GAME_CONFIG.challenge.lateralOffset, playerY + 4.5, playerZ - 44],
              word: 'BOLT',
              distance: 44,
              state: 'available',
            },
            {
              id: `anchor-${this.challengeIndex}-1`,
              side: 'right',
              position: [GAME_CONFIG.challenge.lateralOffset, playerY + 5.2, playerZ - 58],
              word: 'JUMP',
              distance: 58,
              state: 'available',
            },
          ],
          selectedAnchorId: null,
          typedIndex: 0,
          isCompleted: false,
          hasError: false,
          mistakeCount: 0,
          difficultyLevel: 1,
          completedCount: 1,
          typingEstimateSec: 1.8,
          availableTimeSec: 3.5,
          isFair: true,
          formation: 'WIDE_SPLIT',
        };
        this.tutorialStep = 'MULTI_ANCHOR';
        this.setTutorialHint({
          title: 'CHOOSE YOUR ANCHOR',
          subtitle: 'Type its first letter to lock on.',
          badge: 'TUTORIAL 2/4',
        });
        this.notifyChallenge();
        return;
      }
    }

    const level = getDifficultyLevel(this.completedCount);
    const rule = DIFFICULTY_CONFIG.challengeRules[level as keyof typeof DIFFICULTY_CONFIG.challengeRules] || DIFFICULTY_CONFIG.challengeRules[6];

    const {
      minHeightOffset,
      maxHeightOffset,
      maxAnchorY,
      lateralOffset,
    } = GAME_CONFIG.challenge;

    // 1. Determine anchor count based on progressive difficulty
    const count =
      rule.minAnchors +
      Math.floor(Math.random() * (rule.maxAnchors - rule.minAnchors + 1));

    // 2. Pick words with guaranteed UNIQUE first letters from dynamic real-English word generator
    const activeWords = this.currentChallenge?.anchors?.map((a) => a.word) || [];
    const chosenWords = this.wordGenerator.generateChallengeWords({
      count,
      completedCount: this.completedCount,
      speedMultiplier: this.currentSpeedMultiplier,
      activeWords,
    });

    // 3. Stagger distances along -Z with formation-driven spatial layout
    const playerZ = this.playerPosition.z;
    const playerY = this.playerPosition.y;
    const speedScale = Math.min(1.22, Math.sqrt(this.currentSpeedMultiplier));
    const distMin = rule.baseDistMin * speedScale;
    const distMax = rule.baseDistMax * speedScale;
    let currentDist = distMin + Math.random() * (distMax - distMin);

    // Pick formation and generate layout
    const formation = selectNextFormation(this.formationHistory);
    this.formationHistory.push(formation);
    if (this.formationHistory.length > 10) {
      this.formationHistory.shift();
    }

    const layout = generateAnchorLayout(formation, chosenWords.length, lateralOffset);
    const anchors: AnchorData[] = [];

    for (let i = 0; i < chosenWords.length; i++) {
      const item = layout[i] || { side: 'left' as ChallengeSide, x: -lateralOffset };
      const side = item.side;
      const x = item.x;
      const z = playerZ - currentDist;

      const heightOffset =
        minHeightOffset + Math.random() * (maxHeightOffset - minHeightOffset);
      const y = Math.min(maxAnchorY, playerY + heightOffset);

      anchors.push({
        id: `anchor-${this.challengeIndex}-${i}`,
        side,
        position: [x, Math.round(y * 10) / 10, z],
        word: chosenWords[i],
        distance: Math.round(currentDist),
        state: 'available',
      });

      const gap = (rule.gapMin + Math.random() * (rule.gapMax - rule.gapMin)) * speedScale;
      currentDist += gap;
    }

    // Fairness & timing estimation
    const effectiveForwardSpeed = GAME_CONFIG.movement.forwardSpeed * this.currentSpeedMultiplier;
    const firstDist = anchors[0]?.distance ?? 40;
    const availableTimeSec = Math.round((firstDist / effectiveForwardSpeed) * 10) / 10;
    const shortestWordLen = Math.min(...anchors.map((a) => a.word.length));
    const typingEstimateSec = Math.round((0.5 + shortestWordLen / 3.8) * 10) / 10;
    const isFair = availableTimeSec >= typingEstimateSec;

    this.currentChallenge = {
      id: `challenge-${Date.now()}-${this.challengeIndex}`,
      anchors,
      selectedAnchorId: null,
      typedIndex: 0,
      isCompleted: false,
      hasError: false,
      mistakeCount: 0,
      difficultyLevel: level,
      completedCount: this.completedCount,
      typingEstimateSec,
      availableTimeSec,
      isFair,
      formation,
    };

    this.notifyChallenge();
  }

  private frustum = new THREE.Frustum();
  private projScreenMatrix = new THREE.Matrix4();
  private anchorSphere = new THREE.Sphere(new THREE.Vector3(), 1.6);

  public checkDeadlines(camera?: THREE.Camera) {
    if (this.isPaused || this.status !== 'falling' || !this.currentChallenge) return;

    const challenge = this.currentChallenge;
    const pz = this.playerPosition.z;

    let hasCameraFrustum = false;
    if (camera) {
      this.projScreenMatrix.multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse
      );
      this.frustum.setFromProjectionMatrix(this.projScreenMatrix);
      hasCameraFrustum = true;
    }

    let stateChanged = false;

    // Check deadlines for each anchor using camera view frustum
    for (const anchor of challenge.anchors) {
      if (anchor.state === 'expired' || anchor.state === 'completed') continue;

      let isOutOfFrame = false;

      if (hasCameraFrustum && camera) {
        this.anchorSphere.center.set(...anchor.position);
        const inFrustum = this.frustum.intersectsSphere(this.anchorSphere);
        // An anchor expires the moment it leaves the camera frame after player reaches its proximity
        const hasReachedAnchor = pz <= anchor.position[2] + 5.0;
        isOutOfFrame = hasReachedAnchor && !inFrustum;
      } else {
        isOutOfFrame = pz <= anchor.position[2] - GAME_CONFIG.movement.missMarginZ;
      }

      if (isOutOfFrame) {
        if (challenge.selectedAnchorId === anchor.id && !challenge.isCompleted) {
          anchor.state = 'expired';
          this.triggerGameOver('ANCHORS_EXPIRED', 'ANCHOR EXPIRED', 'Missed target anchor before completing word');
          return;
        }

        if (anchor.state === 'available') {
          anchor.state = 'expired';
          stateChanged = true;
          if (this.isTutorialMode && this.tutorialStep === 'MULTI_LOCKED') {
            this.setTutorialHint({
              title: 'TOO LATE',
              subtitle: 'Anchors expire when you pass them.',
              badge: 'TIP',
            });
          }
        }
      }
    }

    // If no anchor is selected and ALL anchors have expired:
    if (!challenge.selectedAnchorId) {
      const allExpired = challenge.anchors.every((a) => a.state === 'expired');
      if (allExpired) {
        this.triggerGameOver('ANCHORS_EXPIRED', 'ALL ANCHORS EXPIRED', 'All available anchors passed out of reach');
        return;
      }
    }

    if (stateChanged) {
      this.notifyChallenge();
    }
  }

  public handleKeyPress(key: string) {
    if (this.isPaused || this.status !== 'falling' || !this.currentChallenge) {
      return;
    }

    if (key.length !== 1) return;
    const char = key.toUpperCase();
    if (!/^[A-Z0-9]$/.test(char)) return;

    // Start active typing timer for this challenge on the first keystroke attempt
    if (!this.isChallengeAttemptActive) {
      this.isChallengeAttemptActive = true;
    }

    this.totalAttemptedChars++;
    const challenge = this.currentChallenge;

    // Case 1: First keystroke - lock onto the matching AVAILABLE anchor
    if (!challenge.selectedAnchorId) {
      const matchedAnchor = challenge.anchors.find(
        (a) => a.state === 'available' && a.word[0] === char
      );

      if (matchedAnchor) {
        this.totalCorrectChars++;
        challenge.selectedAnchorId = matchedAnchor.id;
        matchedAnchor.state = 'selected';
        challenge.typedIndex = 1;
        challenge.hasError = false;
        sound.playKeyHit();

        if (this.isTutorialMode) {
          if (this.tutorialStep === 'FIRST_WORD') {
            this.tutorialStep = 'FIRST_LOCKED';
            this.setTutorialHint({
              title: 'ANCHOR LOCKED',
              subtitle: 'The first letter chooses your anchor.',
              badge: 'TUTORIAL 1/4',
            });
          } else if (this.tutorialStep === 'MULTI_ANCHOR') {
            this.tutorialStep = 'MULTI_LOCKED';
            this.setTutorialHint({
              title: 'LOCKED ON TARGET',
              subtitle: 'Unselected anchors become subdued.',
              badge: 'TUTORIAL 2/4',
            });
          }
        }

        this.checkCompletion(challenge, matchedAnchor);
        this.notifyChallenge();
        this.notifyStats();
      } else {
        sound.playKeyError();
        this.notifyStats();
      }
      this.checkAccuracyFailure();
      return;
    }

    // Case 2: Progress typed characters for the locked selected word
    const selectedAnchor = challenge.anchors.find(
      (a) => a.id === challenge.selectedAnchorId
    );
    if (!selectedAnchor) return;

    const expectedChar = selectedAnchor.word[challenge.typedIndex];
    if (char === expectedChar) {
      this.totalCorrectChars++;
      challenge.typedIndex++;
      challenge.hasError = false;
      sound.playKeyHit();
      this.checkCompletion(challenge, selectedAnchor);
      this.notifyChallenge();
      this.notifyStats();
    } else {
      // Non-fatal typo feedback: records error and pulses character indicator
      challenge.hasError = true;
      challenge.mistakeCount = (challenge.mistakeCount || 0) + 1;
      sound.playKeyError();
      this.notifyChallenge();
      this.notifyStats();
      setTimeout(() => {
        if (this.currentChallenge && this.currentChallenge.id === challenge.id) {
          this.currentChallenge.hasError = false;
          this.notifyChallenge();
        }
      }, 180);
    }
    this.checkAccuracyFailure();
  }

  private checkAccuracyFailure() {
    if (
      this.totalAttemptedChars >= DIFFICULTY_CONFIG.accuracy.minAttempts &&
      this.completedCount >= DIFFICULTY_CONFIG.accuracy.minCompletedWords
    ) {
      const acc = (this.totalCorrectChars / this.totalAttemptedChars) * 100;
      // Strictly below 90.0% is failure (90.0% is alive)
      if (acc < DIFFICULTY_CONFIG.accuracy.failThreshold) {
        const formattedAcc = Math.round(acc * 10) / 10;
        this.triggerGameOver(
          'ACCURACY',
          'ACCURACY TOO LOW',
          `${formattedAcc}% ACCURACY (MIN ${DIFFICULTY_CONFIG.accuracy.failThreshold}%)`
        );
      }
    }
  }

  private checkCompletion(challenge: ActiveChallenge, anchor: AnchorData) {
    if (challenge.typedIndex >= anchor.word.length) {
      challenge.isCompleted = true;
      anchor.state = 'completed';
      this.isChallengeAttemptActive = false;
      this.completedCount++;
      this.streak++;
      if (this.streak > this.maxStreak) {
        this.maxStreak = this.streak;
      }

      // Calculate and award word score
      const currentAccuracy = this.totalAttemptedChars > 0
        ? (this.totalCorrectChars / this.totalAttemptedChars) * 100
        : 100;
      const breakdown = calculateWordScore(
        anchor.word.length,
        this.streak,
        this.currentSpeedMultiplier,
        currentAccuracy
      );
      this.wordScoreTotal += breakdown.totalWordPoints;
      this.lastScoreDelta = breakdown.totalWordPoints;
      this.lastScoreDeltaTime = performance.now();
      this.score = this.wordScoreTotal + calculateDistanceScore(this.distanceTraveled);

      if (this.isTutorialMode) {
        if (this.tutorialStep === 'FIRST_LOCKED') {
          this.tutorialStep = 'FIRST_TRAVERSING';
          this.setTutorialHint({
            title: 'WEB ATTACHED',
            subtitle: 'Great swing!',
            badge: 'TUTORIAL 1/4',
          });
        } else if (this.tutorialStep === 'MULTI_LOCKED' || this.completedCount === 2) {
          this.tutorialStep = 'ACCURACY';
          this.setTutorialHint({
            title: 'KEEP ACCURACY AT/ABOVE 90%',
            subtitle: 'Mistakes lower accuracy. Stay focused!',
            badge: 'TUTORIAL 3/4',
          });
        } else if (this.completedCount === 3) {
          this.tutorialStep = 'SPEED';
          this.setTutorialHint({
            title: 'SPEED INCREASES AS YOU SURVIVE',
            subtitle: 'Move faster and score higher.',
            badge: 'TUTORIAL 4/4',
          });
        } else if (this.completedCount >= 4) {
          this.tutorialStep = 'COMPLETED';
          this.isTutorialMode = false;
          setTutorialCompleted(true);
          this.setTutorialHint({
            title: "YOU'RE READY!",
            subtitle: 'Type fast. Stay accurate. Keep moving.',
            badge: 'COMPLETE',
          });
          setTimeout(() => {
            if (this.tutorialStep === 'COMPLETED') {
              this.setTutorialHint(null);
            }
          }, 3000);
        }
      }

      if (this.streak > 0 && this.streak % 5 === 0) {
        sound.playStreakMilestone();
      } else {
        sound.playWordComplete();
      }

      this.notifyChallenge();
      this.notifyStats();
      this.startTraversal(anchor);
    }
  }

  private traversalCurve: THREE.CatmullRomCurve3 | null = null;

  public startTraversal(anchor: AnchorData) {
    const sx = this.playerPosition.x;
    const sy = this.playerPosition.y;
    const sz = this.playerPosition.z;

    const [, ay, az] = anchor.position;
    const sideDir = anchor.side === 'left' ? -1 : 1;

    const targetApexY = Math.min(
      GAME_CONFIG.traversal.maxApexY,
      ay - 1.5
    );
    const endZ = az - 18.0;

    // Swing control points ensuring 100% C^1 continuity strictly starting from current player position
    const p0 = new THREE.Vector3(sx, sy, sz);
    const p1 = new THREE.Vector3(
      sx * 0.7 + sideDir * 1.0 * 0.3,
      Math.min(sy, ay - 3.2),
      sz + (az - sz) * 0.35
    );
    const p2 = new THREE.Vector3(
      sideDir * 2.2,
      Math.min(sy - 1.2, ay - 5.2),
      az
    );
    const p3 = new THREE.Vector3(
      sideDir * 1.8,
      Math.min(ay - 1.8, targetApexY),
      az - 8.0
    );
    const p4 = new THREE.Vector3(
      sideDir * 0.6,
      targetApexY,
      az - 13.5
    );
    const p5 = new THREE.Vector3(
      0,
      targetApexY - 0.5,
      endZ
    );

    this.traversalCurve = new THREE.CatmullRomCurve3(
      [p0, p1, p2, p3, p4, p5],
      false,
      'centripetal',
      0.5
    );

    this.traversal = {
      side: anchor.side,
      startPos: [sx, sy, sz],
      anchorPos: [...anchor.position],
      targetPos: [0, targetApexY, endZ],
      elapsed: 0,
      duration: GAME_CONFIG.traversal.duration,
      progress: 0,
      webAttached: true,
    };

    this.setStatus('traversing');
    sound.playWebShoot();
    this.notifyTraversal();
  }

  public updateTraversal(delta: number) {
    if (this.isPaused || !this.traversal || !this.traversalCurve || this.status !== 'traversing') return;

    this.traversal.elapsed += delta;
    const p = Math.min(1.0, this.traversal.elapsed / this.traversal.duration);
    // Continuous motion sampled from the spline starting directly from current player position
    const pt = this.traversalCurve.getPoint(p);
    this.playerPosition.copy(pt);

    // Web Detachment: Disappear the moment or just before the player reaches the anchor point's same Z value (vertical alignment)
    const anchorZ = this.traversal.anchorPos[2];
    const isAttached = this.playerPosition.z > (anchorZ + 0.2) && p < 0.50;
    if (this.traversal.webAttached !== isAttached) {
      this.traversal.webAttached = isAttached;
      if (!isAttached) {
        sound.playWebRelease();
      }
      this.notifyTraversal();
    }

    // Traversal Completion
    if (p >= 1.0) {
      this.traversal = null;
      this.traversalCurve = null;
      this.notifyTraversal();

      // Spawn next challenge set ahead of new player position
      this.spawnNextChallenge();
      this.setStatus('falling');
    }
  }

  public reset() {
    if (this.isPaused) {
      this.isPaused = false;
      this.notifyPause();
    }
    sound.resume();
    this.traversal = null;
    this.traversalCurve = null;
    this.challengeIndex = 0;
    this.formationHistory = [];
    this.wordGenerator.resetHistory();
    this.completedCount = 0;
    this.streak = 0;
    this.maxStreak = 0;
    this.totalCorrectChars = 0;
    this.totalAttemptedChars = 0;
    this.activeTypingTimeSec = 0;
    this.elapsedRunTimeSec = 0;
    this.isChallengeAttemptActive = false;
    this.distanceTraveled = 0;
    this.wordScoreTotal = 0;
    this.score = 0;
    this.lastScoreDelta = 0;
    this.lastScoreDeltaTime = 0;
    this.newRecords = null;
    this.currentSpeedMultiplier = 1.0;
    this.maxSpeedReached = 1.0;
    this.gameOverInfo = null;
    this.playerPosition.set(...GAME_CONFIG.movement.initialPosition);

    if (this.isTutorialMode && !getTutorialCompleted()) {
      this.tutorialStep = 'FIRST_WORD';
      this.currentTutorialHint = {
        title: 'TYPE THE WORD',
        subtitle: 'Complete the word to swing.',
        badge: 'TUTORIAL 1/4',
      };
    } else {
      this.isTutorialMode = false;
      this.tutorialStep = 'INACTIVE';
      this.currentTutorialHint = null;
    }
    this.notifyTutorial();

    this.spawnNextChallenge();
    this.setStatus('falling');
    this.notifyTraversal();
    this.notifyStats();
  }
}

export const GameContext = createContext<GameRuntime | null>(null);

export function useGameRuntime(): GameRuntime {
  const runtime = useContext(GameContext);
  if (!runtime) {
    throw new Error('useGameRuntime must be used within a GameContextProvider');
  }
  return runtime;
}
