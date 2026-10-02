'use client';

import { useState, useEffect } from 'react';
import { useGameRuntime } from '@/lib/game/game-state';
import { TutorialHintData } from '@/lib/game/tutorial';
import { getGameSettings, subscribeSettings } from '@/lib/game/settings';

export function TutorialHint() {
  const runtime = useGameRuntime();
  const [hint, setHint] = useState<TutorialHintData | null>(runtime.currentTutorialHint);
  const [isTutorial, setIsTutorial] = useState(runtime.isTutorialMode);
  const [hintsEnabled, setHintsEnabled] = useState(getGameSettings().tutorialHints);

  useEffect(() => {
    const unsubTutorial = runtime.subscribeTutorial((newHint) => {
      setHint(newHint);
      setIsTutorial(runtime.isTutorialMode);
    });
    const unsubSettings = subscribeSettings((settings) => {
      setHintsEnabled(settings.tutorialHints);
    });
    return () => {
      unsubTutorial();
      unsubSettings();
    };
  }, [runtime]);

  if (!isTutorial && (!hint || !hintsEnabled)) {
    return null;
  }

  // Hide during menu, loading, or death sequence
  if (runtime.status === 'menu' || runtime.status === 'loading' || runtime.status === 'dead' || runtime.status === 'deathSequence') {
    return null;
  }

  return (
    <div className="absolute bottom-20 sm:bottom-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center gap-2 select-none max-w-md w-[92%] px-3 sm:px-4 animate-fadeIn">
      {hint && (
        <div className="relative flex flex-col items-center text-center bg-[#101A2B]/95 border border-slate-700/80 rounded-xl px-4 sm:px-6 py-2.5 sm:py-3.5 shadow-xl shadow-black/60 transition-all duration-200 pointer-events-auto">
          {/* Top Badge */}
          {hint.badge && (
            <div className="mb-1 px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-black tracking-widest uppercase bg-cyan-950/80 border border-cyan-600/40 text-[#55C7E8]">
              {hint.badge}
            </div>
          )}

          {/* Main Title */}
          <h2 className="font-mono font-black text-sm sm:text-base md:text-lg tracking-wider text-[#F4F7FA] uppercase">
            {hint.title}
          </h2>

          {/* Contextual Subtitle */}
          {hint.subtitle && (
            <p className="mt-0.5 text-[11px] sm:text-xs font-mono font-medium tracking-wide text-[#A8B8C8]">
              {hint.subtitle}
            </p>
          )}

          {/* Unobtrusive Skip Option */}
          {isTutorial && (
            <button
              onClick={() => runtime.skipTutorial()}
              className="mt-2 text-[10px] font-mono font-semibold tracking-wider text-[#A8B8C8] hover:text-[#F4F7FA] transition-colors duration-150 underline underline-offset-2 cursor-pointer pointer-events-auto"
            >
              SKIP TUTORIAL
            </button>
          )}
        </div>
      )}
    </div>
  );
}
