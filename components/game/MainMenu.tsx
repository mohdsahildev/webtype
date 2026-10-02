'use client';

import { useState } from 'react';
import { useGameRuntime } from '@/lib/game/game-state';
import { getPersonalRecords, PersonalRecords } from '@/lib/game/records';
import { formatScore } from '@/lib/game/scoring';

interface MainMenuProps {
  onPlay?: () => void;
}

export function MainMenu({ onPlay }: MainMenuProps) {
  const runtime = useGameRuntime();
  const [isStarting, setIsStarting] = useState(false);
  const [records] = useState<PersonalRecords | null>(() => {
    if (typeof window !== 'undefined') {
      return getPersonalRecords();
    }
    return null;
  });

  const handlePlayClick = () => {
    if (isStarting || runtime.status !== 'menu') return;
    setIsStarting(true);
    if (onPlay) {
      onPlay();
    } else {
      runtime.startIntro();
    }
  };

  const handleTutorialClick = () => {
    if (isStarting || runtime.status !== 'menu') return;
    setIsStarting(true);
    runtime.startIntro(true);
  };

  const hasRecords = records && (records.highestScore > 0 || records.totalRuns > 0);

  return (
    <div className="absolute inset-0 z-30 pointer-events-none flex flex-col justify-between items-center p-4 sm:p-8 select-none transition-all duration-500 overflow-y-auto">
      {/* Top Center: Clean Restrained WebType Branding */}
      <div className="flex flex-col items-center mt-3 sm:mt-6">
        <div className="flex items-center gap-2.5 sm:gap-3 bg-[#101A2B]/90 border border-slate-800 rounded-xl px-4 sm:px-6 py-2 sm:py-2.5 shadow-lg">
          <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-[#55C7E8]" />
          <h1 className="font-mono font-black text-xl sm:text-3xl tracking-widest text-[#F4F7FA]">
            WEBTYPE
          </h1>
        </div>
        <p className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs font-mono font-semibold tracking-[0.25em] sm:tracking-[0.35em] text-[#A8B8C8] uppercase">
          TYPE • SWING • SURVIVE
        </p>

        {/* Personal Best Summary Card on Menu */}
        {hasRecords && (
          <div className="mt-3 sm:mt-4 flex flex-wrap justify-center items-center gap-2 sm:gap-4 bg-[#101A2B]/90 border border-slate-800 rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 font-mono text-[10px] sm:text-xs shadow-md max-w-[90vw]">
            <span className="text-[9px] sm:text-[10px] font-bold text-[#FF9B54] tracking-widest uppercase">
              PERSONAL BEST
            </span>
            <div className="hidden sm:block w-px h-3.5 bg-slate-800" />
            <div className="flex items-center gap-1.5">
              <span className="text-[#A8B8C8]">SCORE:</span>
              <span className="font-bold text-[#FF9B54]">{formatScore(records.highestScore)}</span>
            </div>
            <div className="hidden sm:block w-px h-3.5 bg-slate-800" />
            <div className="flex items-center gap-1.5">
              <span className="text-[#A8B8C8]">WPM:</span>
              <span className="font-bold text-[#55C7E8]">{records.bestWpm}</span>
            </div>
            <div className="hidden sm:block w-px h-3.5 bg-slate-800" />
            <div className="flex items-center gap-1.5">
              <span className="text-[#A8B8C8]">STREAK:</span>
              <span className="font-bold text-emerald-400">×{records.longestStreak}</span>
            </div>
          </div>
        )}
      </div>

      {/* Center/Lower-Middle: Restrained Game UI Buttons */}
      <div className="mb-6 sm:mb-14 flex flex-col items-center gap-2.5 sm:gap-3">
        <button
          onClick={handlePlayClick}
          disabled={isStarting}
          className={`group pointer-events-auto relative flex items-center justify-center gap-3 px-10 sm:px-12 py-3 sm:py-3.5 rounded-xl font-mono font-black text-base sm:text-xl tracking-wider transition-all duration-150 transform cursor-pointer border ${
            isStarting
              ? 'opacity-50 scale-95 cursor-not-allowed bg-slate-800 text-slate-400 border-slate-700'
              : 'bg-[#55C7E8] hover:bg-[#45b8d9] active:bg-[#3ba8c8] text-[#101A2B] border-[#72D6F5] shadow-md hover:shadow-lg active:scale-[0.98]'
          }`}
        >
          {/* Play Icon */}
          <svg
            className={`w-5 h-5 transition-transform duration-200 ${
              isStarting ? 'animate-spin' : 'group-hover:translate-x-0.5'
            }`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>

          <span>
            {isStarting ? 'STARTING...' : 'PLAY'}
          </span>
        </button>

        {/* How to Play / Replay Tutorial Button */}
        <button
          onClick={handleTutorialClick}
          disabled={isStarting}
          className="pointer-events-auto text-xs font-mono font-bold tracking-wider text-[#A8B8C8] hover:text-[#F4F7FA] bg-[#101A2B]/85 hover:bg-[#18263E] border border-slate-700/80 hover:border-[#55C7E8]/60 px-5 py-2 rounded-lg shadow-sm transition-all duration-150 cursor-pointer"
        >
          HOW TO PLAY
        </button>

        {/* Subtle Keyboard Accessibility Hint */}
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-[#A8B8C8] bg-[#101A2B]/80 px-3 py-1 rounded-lg border border-slate-800">
          <span>PRESS</span>
          <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[#55C7E8] font-bold">
            SPACE
          </kbd>
          <span>OR</span>
          <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[#55C7E8] font-bold">
            ENTER
          </kbd>
        </div>
      </div>
    </div>
  );
}
