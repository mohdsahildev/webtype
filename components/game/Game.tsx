'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { GameCamera } from './GameCamera';
import { Player } from './Player';
import { City } from './City';
import { Anchor } from './Anchor';
import { Web } from './Web';
import { SpeedParticles } from './SpeedParticles';
import { LoadingScreen } from './LoadingScreen';
import { TopHUD } from './TopHUD';
import { GameOverModal } from './GameOverModal';
import { MainMenu } from './MainMenu';
import { PauseMenu } from './PauseMenu';
import { IntroBuilding } from './IntroBuilding';
import { TutorialHint } from './TutorialHint';
import { TraversalVFX } from './vfx/TraversalVFX';
import { TypingFeedbackVFX } from './vfx/TypingFeedbackVFX';
import { GameRuntime, GameContext } from '@/lib/game/game-state';
import { GameStatus, ActiveChallenge } from '@/lib/game/game-types';
import { GAME_CONFIG } from '@/lib/game/game-config';

export function Game() {
  const [runtime] = useState(() => new GameRuntime());
  const mobileInputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<GameStatus>(runtime.status);
  const [isPaused, setIsPaused] = useState(runtime.isPaused);
  const [challenge, setChallenge] = useState<ActiveChallenge | null>(runtime.currentChallenge);

  // Status, Challenge & Pause subscriptions
  useEffect(() => {
    const unsubStatus = runtime.subscribeStatus((newStatus) => {
      setStatus(newStatus);
    });
    const unsubChallenge = runtime.subscribeChallenge((newChallenge) => {
      setChallenge(newChallenge);
    });
    const unsubPause = runtime.subscribePause((newPaused) => {
      setIsPaused(newPaused);
    });

    return () => {
      unsubStatus();
      unsubChallenge();
      unsubPause();
    };
  }, [runtime]);

  // Mobile virtual keyboard focus & blur lifecycle management
  useEffect(() => {
    if (isPaused || status === 'dead' || status === 'menu' || status === 'loading' || status === 'intro' || status === 'deathSequence') {
      mobileInputRef.current?.blur();
    } else if (status === 'falling' || status === 'traversing') {
      // Small timeout to guarantee DOM ready and keyboard request acceptance on mobile
      const timer = setTimeout(() => {
        mobileInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [status, isPaused]);

  const handleRestart = useCallback(() => {
    runtime.reset();
    setStatus('falling');
    setChallenge(runtime.currentChallenge);
    setTimeout(() => {
      mobileInputRef.current?.focus();
    }, 50);
  }, [runtime]);

  // Handle tap anywhere on active gameplay screen to restore mobile keyboard focus
  const handleGameplayTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target && (target.closest('button') || target.closest('input') || target.closest('a'))) {
      return;
    }
    if (!isPaused && (status === 'falling' || status === 'traversing')) {
      mobileInputRef.current?.focus();
    }
  }, [isPaused, status]);

  // Mobile virtual keyboard input handler
  const handleMobileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isPaused || (status !== 'falling' && status !== 'traversing')) {
      e.target.value = '';
      return;
    }
    const val = e.target.value;
    if (val) {
      for (const char of val) {
        if (/^[a-zA-Z0-9]$/.test(char)) {
          runtime.handleKeyPress(char);
        }
      }
    }
    e.target.value = '';
  };

  // Global keyboard listener for typing & menu controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (status === 'falling' || status === 'traversing') {
          runtime.togglePause();
        } else if (isPaused) {
          runtime.resume();
        }
        return;
      }

      if (isPaused) {
        return;
      }

      if (status === 'dead') {
        if (e.code === 'Space' || e.key === 'Enter') {
          e.preventDefault();
          handleRestart();
        }
        return;
      }

      if (status === 'menu') {
        if (e.code === 'Space' || e.key === 'Enter') {
          e.preventDefault();
          runtime.startIntro();
        }
        return;
      }

      if (status === 'intro' || status === 'deathSequence') {
        return;
      }

      // If document.activeElement is our mobile input, let onChange process the character
      // Otherwise process directly for physical desktop keyboard
      if (document.activeElement !== mobileInputRef.current) {
        runtime.handleKeyPress(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [runtime, status, isPaused, handleRestart]);

  return (
    <GameContext.Provider value={runtime}>
      <div
        className="w-full h-full h-[100dvh] relative bg-[#0c1527] select-none touch-manipulation overflow-hidden"
        onClick={handleGameplayTap}
        onTouchStart={handleGameplayTap}
      >
        {/* Hidden accessible mobile typing input */}
        <input
          ref={mobileInputRef}
          type="text"
          inputMode="text"
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
          aria-hidden="true"
          tabIndex={-1}
          className="fixed -top-96 left-0 opacity-0 pointer-events-none w-1 h-1"
          value=""
          onChange={handleMobileInputChange}
        />
        {/* 3D Scene */}
        <Canvas>
          {/* Beautiful Stylized Daytime Sky & Atmospheric Depth */}
          <color attach="background" args={['#60a5fa']} />
          <fog
            attach="fog"
            args={[
              GAME_CONFIG.environment.fogColor,
              GAME_CONFIG.environment.fogNear,
              GAME_CONFIG.environment.fogFar,
            ]}
          />

          {/* Soft sky / ground daylight ambient illumination */}
          <hemisphereLight args={['#dbeafe', '#f1f5f9', 1.35]} />

          {/* Neutral white primary sunlight */}
          <directionalLight
            position={[45, 65, 30]}
            intensity={2.2}
            color="#ffffff"
            castShadow
          />
          {/* Soft secondary daylight bounce */}
          <directionalLight
            position={[-30, 40, -10]}
            intensity={0.8}
            color="#e0f2fe"
          />
          {/* Neutral ground fill */}
          <directionalLight
            position={[0, -10, 10]}
            intensity={0.4}
            color="#f8fafc"
          />

          {/* Scene Core (Non-suspending: Camera & Particles) */}
          <GameCamera />
          <SpeedParticles />

          {/* City Metropolis (Independent Suspense with progressive loading) */}
          <Suspense fallback={null}>
            <City />
            <IntroBuilding />
          </Suspense>

          {/* Player Character, Web Line, Traversal & Typing VFX (Independent Suspense) */}
          <Suspense fallback={null}>
            <Player />
            <Web />
            <TraversalVFX />
            <TypingFeedbackVFX />
          </Suspense>

          {/* Dynamic 3D Word Challenge Anchors (Hidden during loading, menu, intro, death sequence, and game over) */}
          {challenge && status !== 'loading' && status !== 'menu' && status !== 'intro' && status !== 'dead' && status !== 'deathSequence' && (
            <group key={challenge.id}>
              {challenge.anchors.map((anchor) => {
                const isSelected = challenge.selectedAnchorId === anchor.id;
                const isOtherSelected =
                  challenge.selectedAnchorId !== null && !isSelected;

                return (
                  <Anchor
                    key={anchor.id}
                    side={anchor.side}
                    position={anchor.position}
                    word={anchor.word}
                    state={anchor.state}
                    isOtherSelected={isOtherSelected}
                    typedIndex={isSelected ? challenge.typedIndex : 0}
                    hasError={isSelected ? challenge.hasError : false}
                  />
                );
              })}
            </group>
          )}
        </Canvas>

        {/* Cinematic Asset Loading Screen */}
        <LoadingScreen />

        {/* Polished Top HUD (Branding, Streak, WPM & Accuracy) */}
        <TopHUD />

        {/* Contextual First-Time Player Tutorial Overlay */}
        <TutorialHint />

        {/* Clean Screen-Space Main Menu */}
        {status === 'menu' && <MainMenu />}

        {/* Polished Cinematic Game Over Modal */}
        {status === 'dead' && (
          <GameOverModal onRestart={handleRestart} />
        )}

        {/* Polished Glassmorphism Pause Menu & Settings Overlay */}
        {isPaused && (
          <PauseMenu onRestart={handleRestart} />
        )}
      </div>
    </GameContext.Provider>
  );
}

export default Game;
