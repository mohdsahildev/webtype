/**
 * Game Settings Persistence & Reactivity Module for WebType
 *
 * Persists user preferences in localStorage under 'webtype-settings-v1'.
 * Supports real-time reactive subscriptions without page reloads.
 */

export const SETTINGS_STORAGE_KEY = 'webtype-settings-v1';

export interface GameSettings {
  masterVolume: number;        // 0.0 to 1.0
  sfxVolume: number;           // 0.0 to 1.0
  musicVolume: number;         // 0.0 to 1.0
  cameraShake: boolean;
  speedEffects: boolean;
  tutorialHints: boolean;
  reducedVisualEffects: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 1.0,
  sfxVolume: 1.0,
  musicVolume: 1.0,
  cameraShake: true,
  speedEffects: true,
  tutorialHints: true,
  reducedVisualEffects: false,
};

const settingsListeners = new Set<(settings: GameSettings) => void>();

/**
 * Safely loads settings from localStorage with default fallbacks.
 */
export function getGameSettings(): GameSettings {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_SETTINGS };

    return {
      masterVolume: Math.max(0, Math.min(1, typeof parsed.masterVolume === 'number' ? parsed.masterVolume : 1.0)),
      sfxVolume: Math.max(0, Math.min(1, typeof parsed.sfxVolume === 'number' ? parsed.sfxVolume : 1.0)),
      musicVolume: Math.max(0, Math.min(1, typeof parsed.musicVolume === 'number' ? parsed.musicVolume : 1.0)),
      cameraShake: parsed.cameraShake !== undefined ? Boolean(parsed.cameraShake) : true,
      speedEffects: parsed.speedEffects !== undefined ? Boolean(parsed.speedEffects) : true,
      tutorialHints: parsed.tutorialHints !== undefined ? Boolean(parsed.tutorialHints) : true,
      reducedVisualEffects: Boolean(parsed.reducedVisualEffects),
    };
  } catch (err) {
    console.warn('[WebType Settings] Failed to load settings from storage:', err);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Safely saves settings to localStorage and notifies active listeners.
 */
export function saveGameSettings(settings: Partial<GameSettings>): GameSettings {
  const current = getGameSettings();
  const updated: GameSettings = {
    ...current,
    ...settings,
    masterVolume: settings.masterVolume !== undefined ? Math.max(0, Math.min(1, settings.masterVolume)) : current.masterVolume,
    sfxVolume: settings.sfxVolume !== undefined ? Math.max(0, Math.min(1, settings.sfxVolume)) : current.sfxVolume,
    musicVolume: settings.musicVolume !== undefined ? Math.max(0, Math.min(1, settings.musicVolume)) : current.musicVolume,
  };

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('[WebType Settings] Failed to save settings to storage:', err);
    }
  }

  // Notify listeners
  settingsListeners.forEach((fn) => fn(updated));
  return updated;
}

/**
 * Resets settings to default values.
 */
export function resetGameSettings(): GameSettings {
  return saveGameSettings(DEFAULT_SETTINGS);
}

/**
 * Subscribes to real-time settings updates.
 */
export function subscribeSettings(fn: (settings: GameSettings) => void): () => void {
  settingsListeners.add(fn);
  fn(getGameSettings());
  return () => {
    settingsListeners.delete(fn);
  };
}

/**
 * Helper to toggle fullscreen mode using standard Browser Fullscreen API.
 */
export function toggleFullscreen(): Promise<boolean> {
  if (typeof document === 'undefined') return Promise.resolve(false);

  if (!document.fullscreenElement) {
    return document.documentElement
      .requestFullscreen()
      .then(() => true)
      .catch((err) => {
        console.warn('[WebType Settings] Fullscreen request failed:', err);
        return false;
      });
  } else {
    return document
      .exitFullscreen()
      .then(() => false)
      .catch((err) => {
        console.warn('[WebType Settings] Exit fullscreen failed:', err);
        return false;
      });
  }
}
