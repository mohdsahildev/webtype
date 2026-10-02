'use client';

import { useGameRuntime } from '@/lib/game/game-state';
import { formatScore, formatDistance } from '@/lib/game/scoring';

interface GameOverModalProps {
  onRestart: () => void;
}

export function GameOverModal({ onRestart }: GameOverModalProps) {
  const runtime = useGameRuntime();
  const stats = runtime.getStats();
  const newRecords = stats.newRecords;

  const title = stats.gameOverInfo?.title || 'GAME OVER';
  const detail = stats.gameOverInfo?.detail || 'RUN TERMINATED';

  return (
    <div
      id="game-over-screen"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0c1527]/95 backdrop-blur-md p-4 select-none animate-fadeIn overflow-y-auto"
    >
      <div className="relative z-10 max-w-lg w-full bg-[#101A2B] border border-slate-800 rounded-xl p-5 sm:p-8 shadow-2xl shadow-black/80 text-center my-auto">
        {/* Failure Reason & Run Title */}
        <div className="flex items-center justify-center gap-2 mb-1.5">
          <div className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-widest uppercase bg-rose-950/70 border border-rose-800/60 text-rose-400">
            {title}
          </div>
        </div>
        <p className="text-xs font-mono font-medium tracking-wider text-[#A8B8C8] mb-3 uppercase">
          {detail}
        </p>

        {/* Hero Score Section */}
        <div className="relative bg-slate-900/90 border border-amber-500/30 rounded-xl p-3.5 sm:p-4 mb-3.5 shadow-md">
          <div className="text-[10px] sm:text-[11px] font-mono font-bold tracking-widest uppercase text-[#FF9B54]">
            RUN SCORE
          </div>
          <div className="text-3xl sm:text-5xl font-mono font-black tracking-tight text-[#FF9B54] my-0.5 sm:my-1">
            {formatScore(stats.score)}
          </div>

          {/* New Record Banner if any record broken */}
          {newRecords?.hasAnyRecord && (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 animate-bounce">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black tracking-wider uppercase bg-amber-400 text-slate-950">
                ★ NEW RECORD
              </span>
              {newRecords.achievedRecordLabels.map((lbl) => (
                <span
                  key={lbl}
                  className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold tracking-wider uppercase bg-slate-900 border border-amber-400/60 text-amber-300"
                >
                  {lbl}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 6-Stat Telemetry Matrix */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 mb-5 font-mono text-left">
          {/* Final WPM */}
          <div className="relative bg-slate-900/90 border border-slate-800 rounded-lg p-2 sm:p-3">
            <div className="text-[8px] sm:text-[9px] uppercase tracking-wider text-[#A8B8C8]">FINAL WPM</div>
            <div className="text-base sm:text-xl font-black text-[#55C7E8] mt-0.5">
              {stats.wpm ?? stats.displayedWpm ?? 0}
            </div>
            {newRecords?.isNewBestWpm && (
              <span className="absolute top-1 right-1 text-[7px] sm:text-[8px] font-black uppercase tracking-wider text-amber-300 bg-amber-950/90 border border-amber-500/40 px-1 rounded">
                BEST
              </span>
            )}
          </div>

          {/* Accuracy */}
          <div className="relative bg-slate-900/90 border border-slate-800 rounded-lg p-2 sm:p-3">
            <div className="text-[8px] sm:text-[9px] uppercase tracking-wider text-[#A8B8C8]">ACCURACY</div>
            <div
              className={`text-base sm:text-xl font-black mt-0.5 ${
                stats.accuracy < 75 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {stats.accuracy}%
            </div>
            {newRecords?.isNewBestAccuracy && (
              <span className="absolute top-1 right-1 text-[7px] sm:text-[8px] font-black uppercase tracking-wider text-amber-300 bg-amber-950/90 border border-amber-500/40 px-1 rounded">
                BEST
              </span>
            )}
          </div>

          {/* Completed Words */}
          <div className="relative bg-slate-900/90 border border-slate-800 rounded-lg p-2 sm:p-3">
            <div className="text-[8px] sm:text-[9px] uppercase tracking-wider text-[#A8B8C8]">WORDS</div>
            <div className="text-base sm:text-xl font-black text-[#F4F7FA] mt-0.5">{stats.completedWords}</div>
            {newRecords?.isNewMostWords && (
              <span className="absolute top-1 right-1 text-[7px] sm:text-[8px] font-black uppercase tracking-wider text-amber-300 bg-amber-950/90 border border-amber-500/40 px-1 rounded">
                BEST
              </span>
            )}
          </div>

          {/* Best Streak */}
          <div className="relative bg-slate-900/90 border border-slate-800 rounded-lg p-2 sm:p-3">
            <div className="text-[8px] sm:text-[9px] uppercase tracking-wider text-[#A8B8C8]">BEST STREAK</div>
            <div className="text-base sm:text-xl font-black text-[#FF9B54] mt-0.5">×{stats.maxStreak}</div>
            {newRecords?.isNewLongestStreak && (
              <span className="absolute top-1 right-1 text-[7px] sm:text-[8px] font-black uppercase tracking-wider text-amber-300 bg-amber-950/90 border border-amber-500/40 px-1 rounded">
                BEST
              </span>
            )}
          </div>

          {/* Max Speed */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2 sm:p-3">
            <div className="text-[8px] sm:text-[9px] uppercase tracking-wider text-[#A8B8C8]">MAX SPEED</div>
            <div className="text-base sm:text-xl font-black text-sky-300 mt-0.5">{stats.maxSpeedReached}×</div>
          </div>

          {/* Distance */}
          <div className="relative bg-slate-900/90 border border-slate-800 rounded-lg p-2 sm:p-3">
            <div className="text-[8px] sm:text-[9px] uppercase tracking-wider text-[#A8B8C8]">DISTANCE</div>
            <div className="text-base sm:text-xl font-black text-[#F4F7FA] mt-0.5">
              {formatDistance(stats.distanceTraveled)}
            </div>
            {newRecords?.isNewLongestDistance && (
              <span className="absolute top-1 right-1 text-[7px] sm:text-[8px] font-black uppercase tracking-wider text-amber-300 bg-amber-950/90 border border-amber-500/40 px-1 rounded">
                BEST
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 w-full">
          <button
            id="restart-button"
            onClick={onRestart}
            className="w-full py-3.5 bg-[#55C7E8] hover:bg-[#45b8d9] active:bg-[#3ba8c8] text-[#101A2B] font-mono font-black tracking-widest text-sm rounded-xl shadow-md active:scale-[0.98] transition-all duration-150 cursor-pointer border border-[#72D6F5]"
          >
            PLAY AGAIN
          </button>
          <button
            onClick={() => runtime.returnToMenu()}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-[#A8B8C8] hover:text-[#F4F7FA] font-mono font-bold tracking-wider text-xs rounded-xl border border-slate-800 hover:border-slate-700 shadow-sm active:scale-[0.98] transition-all duration-150 cursor-pointer"
          >
            MAIN MENU
          </button>
        </div>
      </div>
    </div>
  );
}
