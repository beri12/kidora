import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioSource } from 'expo-audio';

import { logger } from '@/lib/logger';
import { useSettingsStore } from '@/store/settingsStore';

/**
 * Audio abstraction over expo-audio.
 *
 * Channels map to user settings: `music` (background loop), `sfx`
 * (reward/success/error), `voice` (lesson narration, future Kai voice).
 * Sound files are registered at startup rather than bundled here, so the
 * base download stays small; register remote URLs (cached by the OS) or
 * small local assets.
 */
export type SoundEffect = 'reward' | 'success' | 'error' | 'tap' | 'levelUp';
export type Channel = 'music' | 'sfx' | 'voice';

const sources = new Map<SoundEffect, AudioSource>();
const players = new Map<string, AudioPlayer>();
let musicPlayer: AudioPlayer | null = null;
let voicePlayer: AudioPlayer | null = null;
let configured = false;

function channelEnabled(channel: Channel): boolean {
  const s = useSettingsStore.getState();
  if (channel === 'music') return s.music;
  if (channel === 'voice') return s.voice;
  return s.soundEffects;
}

async function configure(): Promise<void> {
  if (configured) return;
  configured = true;
  try {
    // Respect the silent switch: children's apps shouldn't blast sound in class.
    await setAudioModeAsync({ playsInSilentMode: false, shouldPlayInBackground: false });
  } catch (e) {
    logger.debug('audio mode unavailable', e);
  }
}

export const audio = {
  registerEffect(effect: SoundEffect, source: AudioSource): void {
    sources.set(effect, source);
  },

  async play(effect: SoundEffect): Promise<void> {
    if (!channelEnabled('sfx')) return;
    const source = sources.get(effect);
    if (!source) return;
    await configure();
    try {
      let player = players.get(effect);
      if (!player) {
        player = createAudioPlayer(source);
        players.set(effect, player);
      }
      await player.seekTo(0);
      player.play();
    } catch (e) {
      logger.debug('sfx failed', e);
    }
  },

  async playMusic(source: AudioSource): Promise<void> {
    if (!channelEnabled('music')) return;
    await configure();
    musicPlayer?.remove();
    musicPlayer = createAudioPlayer(source);
    musicPlayer.loop = true;
    musicPlayer.volume = 0.35;
    musicPlayer.play();
  },

  stopMusic(): void {
    musicPlayer?.pause();
    musicPlayer?.remove();
    musicPlayer = null;
  },

  /** Lesson narration / future Kai voice replies. */
  async playVoice(source: AudioSource): Promise<AudioPlayer | null> {
    if (!channelEnabled('voice')) return null;
    await configure();
    voicePlayer?.remove();
    voicePlayer = createAudioPlayer(source);
    voicePlayer.play();
    return voicePlayer;
  },

  stopVoice(): void {
    voicePlayer?.pause();
  },

  /** Apply a settings change immediately (e.g. music toggled off). */
  applySettings(): void {
    if (!channelEnabled('music')) this.stopMusic();
    if (!channelEnabled('voice')) this.stopVoice();
  },

  releaseAll(): void {
    players.forEach((p) => p.remove());
    players.clear();
    this.stopMusic();
    voicePlayer?.remove();
    voicePlayer = null;
  },
};
