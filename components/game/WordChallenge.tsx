'use client';

import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { ChallengeSide, AnchorState } from '@/lib/game/game-types';

interface WordChallengeProps {
  word: string;
  side: ChallengeSide;
  state: AnchorState;
  isOtherSelected: boolean;
  typedIndex: number;
  hasError?: boolean;
}

export function WordChallenge({
  word,
  state,
  isOtherSelected,
  typedIndex,
  hasError,
}: WordChallengeProps) {
  const characters = useMemo(() => word.split(''), [word]);
  const isExpired = state === 'expired';
  const isSelected = state === 'selected';
  const isCompleted = state === 'completed';
  const isAvailable = state === 'available';

  return (
    <Html
      transform
      center
      position={[0, -1.35, 0]}
      distanceFactor={16}
      zIndexRange={[5, 0]}
      className="pointer-events-none select-none"
    >
      <div
        className={`flex flex-col items-center transition-all duration-150 ${isExpired
          ? 'opacity-25 scale-75 grayscale'
          : isOtherSelected
            ? 'opacity-35 scale-85'
            : isSelected
              ? hasError
                ? 'opacity-100 scale-110 -translate-x-1.5 duration-75'
                : 'opacity-100 scale-110'
              : isCompleted
                ? 'opacity-100 scale-120 duration-150'
                : 'opacity-95 scale-100'
          }`}
      >
        {/* Main Word Plate */}
        <div
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border shadow-lg transition-all duration-100 ${isExpired
            ? 'bg-[#101A2B]/75 border-slate-800 shadow-none'
            : isCompleted
              ? 'bg-[#0c241b]/95 border-emerald-500'
              : isSelected
                ? hasError
                  ? 'bg-[#291013]/95 border-red-500 animate-pulse'
                  : 'bg-[#101A2B]/95 border-[#55C7E8]'
                : 'bg-[#101A2B]/90 border-slate-700'
            }`}
        >
          {characters.map((char, index) => {
            const isTyped = (isSelected || isCompleted) && index < typedIndex;
            const isCurrentTarget = isSelected && index === typedIndex;

            let charColorClass = 'text-[#F4F7FA]';
            let charScale = 'scale-100';

            if (isExpired) {
              charColorClass = 'text-slate-500 line-through';
            } else if (isOtherSelected) {
              charColorClass = 'text-slate-500';
            } else if (isCompleted || isTyped) {
              charColorClass = 'text-emerald-400 font-extrabold';
              charScale = 'scale-105';
            } else if (isCurrentTarget) {
              if (hasError) {
                charColorClass = 'text-red-400 font-black';
                charScale = 'scale-115';
              } else {
                charColorClass = 'text-[#55C7E8] font-black';
                charScale = 'scale-110';
              }
            } else if (isAvailable) {
              if (index === 0) {
                charColorClass = 'text-[#55C7E8] font-extrabold';
                charScale = 'scale-105';
              } else {
                charColorClass = 'text-[#F4F7FA] font-semibold';
              }
            } else {
              charColorClass = 'text-[#A8B8C8] font-medium';
            }

            return (
              <div key={`${char}-${index}`} className="flex flex-col items-center">
                <span
                  className={`text-2xl font-mono tracking-wider transition-all duration-75 transform ${charScale} ${charColorClass}`}
                >
                  {char}
                </span>
                {/* Letter underline progress bar */}
                {!isOtherSelected && !isExpired && (
                  <div
                    className={`w-full mt-0.5 rounded-full transition-all duration-100 ${isTyped || isCompleted
                      ? 'bg-emerald-400 h-1'
                      : isCurrentTarget
                        ? 'bg-[#55C7E8] h-1'
                        : 'bg-slate-700/80 h-0.5'
                      }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* State Hint Badge */}
        {isExpired ? (
          <div className="mt-1 px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase bg-slate-900 border border-slate-700 text-slate-400 shadow-sm">
            EXPIRED
          </div>
        ) : isAvailable && !isOtherSelected ? (
          <div className="mt-1 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold tracking-wider uppercase border shadow-sm bg-[#101A2B]/90 border-[#55C7E8]/60 text-[#55C7E8]">
            [ {word[0]} ]
          </div>
        ) : null}
      </div>
    </Html>
  );
}
