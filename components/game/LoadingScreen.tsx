'use client';

import { useEffect, useState, useCallback } from 'react';
import { useProgress } from '@react-three/drei';
import { useGameRuntime } from '@/lib/game/game-state';
import { isInitialAssetsReady, retryInitialAssets, preloadInitialAssets } from '@/lib/game/initial-assets';

export function LoadingScreen() {
  const runtime = useGameRuntime();
  const { active, progress, errors } = useProgress();
  const [displayProgress, setDisplayProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Ensure preloading is active on mount
  useEffect(() => {
    preloadInitialAssets();
  }, []);

  const hasErrors = errors && errors.length > 0;

  // Real loading state & smooth progress animation
  useEffect(() => {
    if (hasErrors) return;

    const interval = setInterval(() => {
      const ready = isInitialAssetsReady();

      if (ready) {
        // All required assets are genuinely resolved and cached in memory
        setDisplayProgress((prev) => {
          if (prev < 100) {
            const next = Math.min(prev + Math.max(2, (100 - prev) * 0.25), 100);
            return Math.round(next);
          }
          return 100;
        });
      } else {
        // Still downloading / parsing assets - clamp target to max 95% until genuinely ready
        const currentTarget = active
          ? Math.min(95, Math.max(progress, 10))
          : Math.min(90, Math.max(10, displayProgress));

        setDisplayProgress((prev) => {
          if (prev < currentTarget) {
            const next = Math.min(prev + Math.max(1, (currentTarget - prev) * 0.15), currentTarget);
            return Math.round(next);
          }
          return prev;
        });
      }
    }, 30);

    return () => clearInterval(interval);
  }, [active, progress, hasErrors, displayProgress]);

  // Transition automatically into 3D Main Menu ONLY once all required assets are genuinely loaded
  useEffect(() => {
    if (displayProgress >= 100 && isInitialAssetsReady() && !hasErrors && !hasStarted) {
      const timer = setTimeout(() => {
        setIsReady(true);
        setHasStarted(true);
        setTimeout(() => {
          runtime.setStatus('menu');
        }, 300);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [displayProgress, hasErrors, hasStarted, runtime]);

  const handleStartGame = useCallback(() => {
    if (!isReady || hasStarted) return;
    setHasStarted(true);
    setTimeout(() => {
      runtime.setStatus('menu');
    }, 200);
  }, [isReady, hasStarted, runtime]);

  // Handle retry action upon asset load failure
  const handleRetry = useCallback(() => {
    setDisplayProgress(0);
    setIsReady(false);
    setHasStarted(false);
    retryInitialAssets();
    useProgress.setState({ errors: [], active: true, progress: 0 });
  }, []);

  // Keyboard / Touch trigger to start
  useEffect(() => {
    const handleKeyDown = () => {
      if (isReady && !hasStarted) {
        handleStartGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isReady, hasStarted, handleStartGame]);

  if (hasStarted && displayProgress >= 100 && isInitialAssetsReady()) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#101A2B] transition-opacity duration-500 select-none ${
        hasStarted ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      onClick={handleStartGame}
    >
      <div className="relative z-10 flex flex-col items-center max-w-sm w-full px-6 text-center">
        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-mono font-black tracking-widest text-[#F4F7FA] uppercase mb-6">
          WEBTYPE
        </h1>

        {hasErrors ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs font-mono font-bold tracking-wider text-rose-400 uppercase">
              FAILED TO LOAD
            </p>
            <button
              onClick={handleRetry}
              className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-[#F4F7FA] border border-slate-700 font-mono text-xs font-bold tracking-wider uppercase rounded-lg cursor-pointer"
            >
              RETRY
            </button>
          </div>
        ) : (
          <>
            {/* Loading Progress Bar Container */}
            <div className="w-full bg-slate-900 border border-slate-800 rounded-full h-2 p-0.5 relative overflow-hidden mb-3">
              <div
                className="h-full bg-[#55C7E8] rounded-full transition-all duration-150"
                style={{ width: `${displayProgress}%` }}
              />
            </div>

            {/* Status / Percentage */}
            <div className="flex justify-between items-center w-full text-xs font-mono px-1">
              <span className="text-[#A8B8C8] tracking-wider">
                {isReady ? 'GOOD LUCK.' : 'LOADING...'}
              </span>
              <span className="font-bold text-[#F4F7FA] tracking-wider">
                {displayProgress}%
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
