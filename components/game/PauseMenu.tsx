'use client';

import { useState, useEffect } from 'react';
import { useGameRuntime } from '@/lib/game/game-state';
import {
  getGameSettings,
  saveGameSettings,
  resetGameSettings,
  subscribeSettings,
  toggleFullscreen,
  GameSettings,
} from '@/lib/game/settings';
import { sound } from '@/lib/game/audio';

interface PauseMenuProps {
  onRestart: () => void;
}

type MenuTab = 'main' | 'settings';
type SettingsTab = 'audio' | 'gameplay' | 'display';

export function PauseMenu({ onRestart }: PauseMenuProps) {
  const runtime = useGameRuntime();
  const [currentTab, setCurrentTab] = useState<MenuTab>('main');
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('audio');
  const [settings, setSettings] = useState<GameSettings>(getGameSettings());
  const [resetFeedback, setResetFeedback] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const unsub = subscribeSettings((newSettings) => {
      setSettings(newSettings);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const checkFullscreen = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', checkFullscreen);
    return () => document.removeEventListener('fullscreenchange', checkFullscreen);
  }, []);

  const handleResume = () => {
    sound.playKeyHit();
    runtime.resume();
  };

  const handleRestart = () => {
    sound.playKeyHit();
    runtime.resume();
    onRestart();
  };

  const handleHowToPlay = () => {
    sound.playKeyHit();
    runtime.resume();
    runtime.startIntro(true); // force tutorial run
  };

  const handleMainMenu = () => {
    sound.playKeyHit();
    runtime.returnToMenu();
  };

  const handleResetSettings = () => {
    sound.playKeyHit();
    resetGameSettings();
    setResetFeedback(true);
    setTimeout(() => setResetFeedback(false), 1500);
  };

  const handleFullscreenToggle = async () => {
    sound.playKeyHit();
    const isNowFs = await toggleFullscreen();
    setIsFullscreen(isNowFs);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0c1527]/95 backdrop-blur-md transition-all duration-300 select-none pointer-events-auto p-4 animate-in fade-in duration-200 touch-none overflow-y-auto">
      <div className="w-full max-w-md bg-[#101A2B] border border-slate-800 rounded-xl p-6 md:p-8 shadow-2xl shadow-black/80 flex flex-col items-center my-auto">
        {currentTab === 'main' ? (
          /* =========================================================================
             1. MAIN PAUSE MENU
             ========================================================================= */
          <div className="w-full flex flex-col items-center space-y-6">
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-[11px] font-mono tracking-widest text-[#55C7E8] font-bold uppercase mb-1">
                <span className="w-2 h-2 rounded-full bg-[#55C7E8]" />
                SIMULATION PAUSED
              </div>
              <h2 className="text-3xl md:text-4xl font-black font-mono tracking-tight text-[#F4F7FA]">
                PAUSED
              </h2>
            </div>

            <div className="w-full space-y-3 pt-2">
              <button
                type="button"
                onClick={handleResume}
                className="w-full py-3.5 px-4 rounded-xl font-mono font-black text-sm tracking-wider uppercase transition-all duration-150 bg-[#55C7E8] hover:bg-[#45b8d9] active:bg-[#3ba8c8] text-[#101A2B] shadow-md border border-[#72D6F5] flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>RESUME</span>
                <span className="text-[10px] opacity-75 font-normal px-1.5 py-0.5 rounded bg-black/20 border border-black/10">
                  ESC
                </span>
              </button>

              <button
                type="button"
                onClick={handleRestart}
                className="w-full py-3 px-4 rounded-xl font-mono font-bold text-sm tracking-wider uppercase transition-all duration-150 bg-slate-900 hover:bg-slate-800 text-[#F4F7FA] border border-slate-800 hover:border-slate-700 shadow-sm cursor-pointer"
              >
                RESTART RUN
              </button>

              <button
                type="button"
                onClick={handleHowToPlay}
                className="w-full py-3 px-4 rounded-xl font-mono font-bold text-sm tracking-wider uppercase transition-all duration-150 bg-slate-900 hover:bg-slate-800 text-[#F4F7FA] border border-slate-800 hover:border-slate-700 shadow-sm cursor-pointer"
              >
                HOW TO PLAY
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playKeyHit();
                  setCurrentTab('settings');
                }}
                className="w-full py-3 px-4 rounded-xl font-mono font-bold text-sm tracking-wider uppercase transition-all duration-150 bg-slate-900 hover:bg-slate-800 text-[#F4F7FA] border border-slate-800 hover:border-slate-700 shadow-sm cursor-pointer"
              >
                SETTINGS
              </button>

              <button
                type="button"
                onClick={handleMainMenu}
                className="w-full py-3 px-4 rounded-xl font-mono font-bold text-sm tracking-wider uppercase transition-all duration-150 bg-rose-950/40 hover:bg-rose-950/60 text-rose-300 hover:text-rose-100 border border-rose-900/50 hover:border-rose-700/60 shadow-sm cursor-pointer"
              >
                MAIN MENU
              </button>
            </div>
          </div>
        ) : (
          /* =========================================================================
             2. SETTINGS PANEL
             ========================================================================= */
          <div className="w-full flex flex-col items-center space-y-5">
            <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-2xl font-black font-mono tracking-tight text-[#F4F7FA]">
                SETTINGS
              </h3>
              <button
                type="button"
                onClick={() => {
                  sound.playKeyHit();
                  setCurrentTab('main');
                }}
                className="text-xs font-mono font-bold text-[#A8B8C8] hover:text-[#55C7E8] transition-colors uppercase px-2.5 py-1 rounded bg-slate-900 border border-slate-800 cursor-pointer"
              >
                BACK
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="w-full grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 font-mono text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  sound.playKeyHit();
                  setSettingsTab('audio');
                }}
                className={`py-1.5 rounded transition-all cursor-pointer ${
                  settingsTab === 'audio'
                    ? 'bg-[#55C7E8]/15 text-[#55C7E8] border border-[#55C7E8]/40'
                    : 'text-[#A8B8C8] hover:text-[#F4F7FA]'
                }`}
              >
                AUDIO
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playKeyHit();
                  setSettingsTab('gameplay');
                }}
                className={`py-1.5 rounded transition-all cursor-pointer ${
                  settingsTab === 'gameplay'
                    ? 'bg-[#55C7E8]/15 text-[#55C7E8] border border-[#55C7E8]/40'
                    : 'text-[#A8B8C8] hover:text-[#F4F7FA]'
                }`}
              >
                GAMEPLAY
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playKeyHit();
                  setSettingsTab('display');
                }}
                className={`py-1.5 rounded transition-all cursor-pointer ${
                  settingsTab === 'display'
                    ? 'bg-[#55C7E8]/15 text-[#55C7E8] border border-[#55C7E8]/40'
                    : 'text-[#A8B8C8] hover:text-[#F4F7FA]'
                }`}
              >
                DISPLAY
              </button>
            </div>

            {/* Tab Content Area */}
            <div className="w-full min-h-[210px] space-y-4 pt-1">
              {settingsTab === 'audio' && (
                <div className="space-y-3 font-mono">
                  {/* Master Volume */}
                  <div className="space-y-1.5 bg-slate-900/90 p-3 rounded-lg border border-slate-800">
                    <div className="flex justify-between text-xs text-[#F4F7FA]">
                      <span>MASTER VOLUME</span>
                      <span className="text-[#55C7E8] font-bold">{Math.round(settings.masterVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={Math.round(settings.masterVolume * 100)}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) / 100;
                        saveGameSettings({ masterVolume: val });
                      }}
                      className="w-full accent-[#55C7E8] bg-slate-800 rounded-lg cursor-pointer h-2"
                    />
                  </div>

                  {/* SFX Volume */}
                  <div className="space-y-1.5 bg-slate-900/90 p-3 rounded-lg border border-slate-800">
                    <div className="flex justify-between text-xs text-[#F4F7FA]">
                      <span>SFX VOLUME</span>
                      <span className="text-[#55C7E8] font-bold">{Math.round(settings.sfxVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={Math.round(settings.sfxVolume * 100)}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) / 100;
                        saveGameSettings({ sfxVolume: val });
                      }}
                      className="w-full accent-[#55C7E8] bg-slate-800 rounded-lg cursor-pointer h-2"
                    />
                  </div>

                  {/* Music Volume */}
                  <div className="space-y-1.5 bg-slate-900/90 p-3 rounded-lg border border-slate-800">
                    <div className="flex justify-between text-xs text-[#F4F7FA]">
                      <span>MUSIC VOLUME</span>
                      <span className="text-[#55C7E8] font-bold">{Math.round(settings.musicVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={Math.round(settings.musicVolume * 100)}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) / 100;
                        saveGameSettings({ musicVolume: val });
                      }}
                      className="w-full accent-[#55C7E8] bg-slate-800 rounded-lg cursor-pointer h-2"
                    />
                  </div>
                </div>
              )}

              {settingsTab === 'gameplay' && (
                <div className="space-y-3 font-mono">
                  {/* Camera Shake */}
                  <div className="flex items-center justify-between bg-slate-900/90 p-3.5 rounded-lg border border-slate-800">
                    <div className="flex flex-col">
                      <span className="text-xs text-[#F4F7FA] font-bold">CAMERA SHAKE</span>
                      <span className="text-[10px] text-[#A8B8C8]">Impact shake feedback on landing</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        sound.playKeyHit();
                        saveGameSettings({ cameraShake: !settings.cameraShake });
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        settings.cameraShake
                          ? 'bg-[#55C7E8]/15 text-[#55C7E8] border-[#55C7E8]/50'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {settings.cameraShake ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Speed Effects */}
                  <div className="flex items-center justify-between bg-slate-900/90 p-3.5 rounded-lg border border-slate-800">
                    <div className="flex flex-col">
                      <span className="text-xs text-[#F4F7FA] font-bold">SPEED EFFECTS</span>
                      <span className="text-[10px] text-[#A8B8C8]">High-speed velocity wind streaks</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        sound.playKeyHit();
                        saveGameSettings({ speedEffects: !settings.speedEffects });
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        settings.speedEffects
                          ? 'bg-[#55C7E8]/15 text-[#55C7E8] border-[#55C7E8]/50'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {settings.speedEffects ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Tutorial Hints */}
                  <div className="flex items-center justify-between bg-slate-900/90 p-3.5 rounded-lg border border-slate-800">
                    <div className="flex flex-col">
                      <span className="text-xs text-[#F4F7FA] font-bold">TUTORIAL HINTS</span>
                      <span className="text-[10px] text-[#A8B8C8]">Contextual hints during runs</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        sound.playKeyHit();
                        saveGameSettings({ tutorialHints: !settings.tutorialHints });
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        settings.tutorialHints
                          ? 'bg-[#55C7E8]/15 text-[#55C7E8] border-[#55C7E8]/50'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {settings.tutorialHints ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>
              )}

              {settingsTab === 'display' && (
                <div className="space-y-3 font-mono">
                  {/* Fullscreen */}
                  <div className="flex items-center justify-between bg-slate-900/90 p-3.5 rounded-lg border border-slate-800">
                    <div className="flex flex-col">
                      <span className="text-xs text-[#F4F7FA] font-bold">FULLSCREEN</span>
                      <span className="text-[10px] text-[#A8B8C8]">Toggle immersive display</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleFullscreenToggle}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        isFullscreen
                          ? 'bg-[#55C7E8]/15 text-[#55C7E8] border-[#55C7E8]/50'
                          : 'bg-slate-800 text-[#A8B8C8] border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      {isFullscreen ? 'ACTIVE' : 'TOGGLE'}
                    </button>
                  </div>

                  {/* Reduced Visual Effects */}
                  <div className="flex items-center justify-between bg-slate-900/90 p-3.5 rounded-lg border border-slate-800">
                    <div className="flex flex-col">
                      <span className="text-xs text-[#F4F7FA] font-bold">REDUCED EFFECTS</span>
                      <span className="text-[10px] text-[#A8B8C8]">Minimal particles & softer shake</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        sound.playKeyHit();
                        saveGameSettings({ reducedVisualEffects: !settings.reducedVisualEffects });
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        settings.reducedVisualEffects
                          ? 'bg-[#55C7E8]/15 text-[#55C7E8] border-[#55C7E8]/50'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {settings.reducedVisualEffects ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Settings Footer */}
            <div className="w-full pt-3 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={handleResetSettings}
                className="text-xs font-mono font-bold text-rose-400 hover:text-rose-300 transition-colors uppercase flex items-center gap-1.5 cursor-pointer"
              >
                <span>{resetFeedback ? '✓ DEFAULTS RESTORED' : 'RESET SETTINGS'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playKeyHit();
                  setCurrentTab('main');
                }}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-[#F4F7FA] border border-slate-700 font-mono text-xs font-bold tracking-wider uppercase transition-all cursor-pointer"
              >
                DONE
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
