'use client';

import { subscribeSettings } from './settings';

/**
 * Pure Web Audio API Synthesizer for WebType
 * Ultra-lightweight, zero-dependency, zero-latency procedural game audio with settings & pause integration.
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted = false;
  private masterVolume = 1.0;
  private sfxVolume = 1.0;
  private musicVolume = 1.0;

  constructor() {
    if (typeof window !== 'undefined') {
      subscribeSettings((settings) => {
        this.masterVolume = settings.masterVolume;
        this.sfxVolume = settings.sfxVolume;
        this.musicVolume = settings.musicVolume;
      });
    }
  }

  public setVolumes(master: number, sfx: number, music: number) {
    this.masterVolume = Math.max(0, Math.min(1, master));
    this.sfxVolume = Math.max(0, Math.min(1, sfx));
    this.musicVolume = Math.max(0, Math.min(1, music));
  }

  public pause() {
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend().catch(() => {});
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getEffectiveSfxGain(baseGain: number): number {
    return baseGain * this.masterVolume * this.sfxVolume;
  }

  public playKeyHit() {
    if (this.isMuted) return;
    const gainVal = this.getEffectiveSfxGain(0.08);
    if (gainVal <= 0.001) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(950, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.035);

    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  public playKeyError() {
    if (this.isMuted) return;
    const gainVal = this.getEffectiveSfxGain(0.09);
    if (gainVal <= 0.001) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(90, now + 0.08);

    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.095);
  }

  public playWordComplete() {
    if (this.isMuted) return;
    const gainVal = this.getEffectiveSfxGain(0.12);
    if (gainVal <= 0.001) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Harmonic dual-bell chime
    const freqs = [587.33, 880.0]; // D5, A5
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + idx * 0.04);
      osc.frequency.exponentialRampToValueAtTime(f * 1.5, now + idx * 0.04 + 0.18);

      gain.gain.setValueAtTime(gainVal, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.04 + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.23);
    });
  }

  public playWebShoot() {
    if (this.isMuted) return;
    const gainVal = this.getEffectiveSfxGain(0.14);
    if (gainVal <= 0.001) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.07);

    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playWebRelease() {
    if (this.isMuted) return;
    const gainVal = this.getEffectiveSfxGain(0.10);
    if (gainVal <= 0.001) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(950, now + 0.06);

    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  public playStreakMilestone() {
    if (this.isMuted) return;
    const gainVal = this.getEffectiveSfxGain(0.12);
    if (gainVal <= 0.001) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const chord = [523.25, 659.25, 783.99, 1046.5]; // C Major arpeggio C5, E5, G5, C6

    chord.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.045);

      gain.gain.setValueAtTime(gainVal, now + i * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.045 + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.045);
      osc.stop(now + i * 0.045 + 0.3);
    });
  }

  public playGameOver() {
    if (this.isMuted) return;
    const gainVal = this.getEffectiveSfxGain(0.12);
    if (gainVal <= 0.001) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.35);

    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playLandingImpact() {
    if (this.isMuted) return;
    const gainVal = this.getEffectiveSfxGain(0.18);
    if (gainVal <= 0.001) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.12);

    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }
}

export const sound = new SoundEngine();
