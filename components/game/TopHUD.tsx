'use client';

import { useState, useEffect, useRef } from 'react';
import { useGameRuntime } from '@/lib/game/game-state';
import { TypingStats } from '@/lib/game/game-types';
import { formatScore } from '@/lib/game/scoring';

export function TopHUD() {
  const runtime = useGameRuntime();
  const [stats, setStats] = useState<TypingStats>(runtime.getStats());
  const [status, setStatus] = useState(runtime.status);
  const [streakPulse, setStreakPulse] = useState(false);
  const [isMilestone, setIsMilestone] = useState(false);
  const [speedPulse, setSpeedPulse] = useState(false);
  const [floatingScoreDelta, setFloatingScoreDelta] = useState<number | null>(null);
  const prevSpeedRef = useRef(stats.currentSpeedMultiplier);
  const prevScoreDeltaRef = useRef(0);
  const prevStreakRef = useRef(stats.streak);

  useEffect(() => {
    const unsubStats = runtime.subscribeStats((newStats) => {
      setStats(newStats);
      if (newStats.lastScoreDelta > 0 && newStats.lastScoreDelta !== prevScoreDeltaRef.current) {
        prevScoreDeltaRef.current = newStats.lastScoreDelta;
        setFloatingScoreDelta(newStats.lastScoreDelta);
        setTimeout(() => {
          setFloatingScoreDelta(null);
        }, 650);
      }
      if (newStats.streak > 0 && newStats.streak !== prevStreakRef.current) {
        prevStreakRef.current = newStats.streak;
        const isMilestoneHit = newStats.streak % 5 === 0;
        setIsMilestone(isMilestoneHit);
        setStreakPulse(true);
        setTimeout(() => {
          setStreakPulse(false);
          setIsMilestone(false);
        }, isMilestoneHit ? 600 : 300);
      }
      if (newStats.currentSpeedMultiplier > prevSpeedRef.current + 0.05) {
        prevSpeedRef.current = newStats.currentSpeedMultiplier;
        setSpeedPulse(true);
        setTimeout(() => setSpeedPulse(false), 400);
      }
    });
    const unsubStatus = runtime.subscribeStatus((newStatus) => {
      setStatus(newStatus);
    });

    return () => {
      unsubStats();
      unsubStatus();
    };
  }, [runtime]);

  // Hide during loading, menu, intro, or game over
  if (status === 'loading' || status === 'menu' || status === 'intro' || status === 'dead') {
    return null;
  }

  return (
    <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none p-2 sm:p-4 md:p-6 flex justify-between items-start select-none gap-1 sm:gap-2">
      {/* Top Left: Game Title & Progressive Speed Indicator */}
      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
        <div className="hidden xs:flex items-center gap-1.5 sm:gap-2 bg-[#101A2B]/90 border border-slate-800 rounded-lg px-2 sm:px-3.5 py-1 sm:py-1.5 shadow-md">
          <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-[#55C7E8]" />
          <span className="font-mono font-black text-xs sm:text-sm tracking-wider text-[#F4F7FA]">
            WEBTYPE
          </span>
        </div>

        {/* Dynamic Speed Multiplier Badge */}
        <div
          className={`flex items-center gap-1 bg-[#101A2B]/90 border rounded-lg px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-mono shadow-sm transition-all duration-200 ${
            speedPulse
              ? 'border-sky-400 bg-slate-900 text-sky-300'
              : 'border-slate-800 text-[#A8B8C8]'
          }`}
        >
          <span className="text-slate-500 hidden sm:inline">SPEED</span>
          <span className="text-sky-300 font-bold">{stats.currentSpeedMultiplier.toFixed(1)}×</span>
        </div>
      </div>

      {/* Top Center: Run Score & Word Streak Telemetry */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* Score Counter Plate */}
        <div className="relative flex items-center gap-1.5 sm:gap-2 bg-[#101A2B]/90 border border-slate-800 rounded-lg px-2.5 sm:px-4 py-1 sm:py-1.5 shadow-md font-mono">
          <span className="text-[9px] sm:text-[10px] font-bold tracking-widest text-[#A8B8C8] uppercase">SCORE</span>
          <span className="text-base sm:text-xl font-black text-[#FF9B54] tracking-wider">
            {formatScore(stats.score)}
          </span>

          {/* Floating +Delta score animation */}
          {floatingScoreDelta !== null && (
            <span className="absolute -bottom-4 sm:-bottom-5 right-1 sm:right-2 text-[10px] sm:text-xs font-mono font-black text-emerald-400 animate-bounce">
              +{floatingScoreDelta}
            </span>
          )}
        </div>

        {/* Streak Counter Badge */}
        {stats.streak > 0 && (
          <div
            className={`flex items-center gap-1 sm:gap-1.5 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 shadow-md transition-all duration-200 transform ${
              isMilestone
                ? 'bg-amber-500/20 border border-amber-400 text-amber-300 scale-105'
                : streakPulse
                ? 'bg-[#101A2B]/90 border border-amber-500/80 text-amber-400 scale-105'
                : 'bg-[#101A2B]/90 border border-amber-500/40 text-amber-400 scale-100'
            }`}
          >
            <span className="font-mono text-[10px] sm:text-xs font-bold text-amber-400">×</span>
            <span className="font-mono text-sm sm:text-base font-black text-amber-400 tracking-wider">
              {stats.streak}
            </span>
            <span className="hidden sm:inline font-mono text-[9px] font-bold uppercase tracking-wider text-amber-300/80">
              {isMilestone ? 'MILESTONE!' : 'STREAK'}
            </span>
          </div>
        )}
      </div>

      {/* Top Right: WPM, Accuracy Telemetry & Pause Button */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="flex items-center gap-1.5 sm:gap-3 bg-[#101A2B]/90 border border-slate-800 rounded-lg p-1 sm:p-1.5 px-2 sm:px-4 shadow-md font-mono">
          {/* WPM Display */}
          <div className="flex flex-col items-end">
            <div className="flex items-baseline gap-0.5 sm:gap-1">
              <span className="text-sm sm:text-xl font-black text-[#F4F7FA] tracking-tight">
                {stats.wpm ?? stats.displayedWpm ?? 0}
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold text-[#55C7E8] uppercase">WPM</span>
            </div>
          </div>

          <div className="w-px h-4 sm:h-6 bg-slate-800" />

          {/* Accuracy Display with Danger Warning State */}
          <div className="flex flex-col items-end">
            <div className="flex items-baseline gap-0.5 sm:gap-1">
              {stats.isAccuracyWarning && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 mr-0.5 self-center" />
              )}
              <span
                className={`text-sm sm:text-xl font-black tracking-tight transition-colors duration-200 ${
                  stats.isAccuracyWarning ? 'text-rose-400' : 'text-[#F4F7FA]'
                }`}
              >
                {stats.accuracy}%
              </span>
              <span
                className={`text-[9px] sm:text-[10px] font-bold uppercase ${
                  stats.isAccuracyWarning ? 'text-rose-400 font-black' : 'text-emerald-400'
                }`}
              >
                ACC
              </span>
            </div>
          </div>
        </div>

        {/* Interactive Pause Button */}
        <button
          type="button"
          onClick={() => runtime.pause()}
          aria-label="Pause Game"
          className="pointer-events-auto flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-[#101A2B]/90 hover:bg-[#18263E] active:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg text-[#A8B8C8] hover:text-[#F4F7FA] shadow-md transition-all duration-150 group cursor-pointer"
          title="Pause Game (ESC)"
        >
          <div className="flex gap-0.5 sm:gap-1 items-center justify-center">
            <div className="w-1 h-3 sm:h-3.5 bg-current rounded-xs transition-transform group-hover:scale-y-110" />
            <div className="w-1 h-3 sm:h-3.5 bg-current rounded-xs transition-transform group-hover:scale-y-110" />
          </div>
        </button>
      </div>
    </div>
  );
}
