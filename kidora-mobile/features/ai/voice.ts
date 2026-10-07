/**
 * Voice interaction seam for Kai (not shipped in the MVP).
 *
 * Planned flow: expo-audio recorder → upload to backend → server-side
 * speech-to-text + tutor + text-to-speech → `audio.playVoice(url)`.
 * No audio is ever sent to a third party from the device, and the
 * microphone permission is only requested when the child taps the mic.
 */
export interface VoiceSession {
  start: () => Promise<void>;
  stop: () => Promise<{ transcript: string } | null>;
  cancel: () => void;
}

export const VOICE_ENABLED = false;
