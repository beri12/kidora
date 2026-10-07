/* Global test doubles for native modules. */
/* eslint-disable @typescript-eslint/no-require-imports */

jest.mock('react-native-reanimated', () => {
  const mock = require('react-native-reanimated/mock');
  // The official mock leaves useReducedMotion out ("ADD ME IF NEEDED").
  return { ...mock, useReducedMotion: () => false, default: { ...mock.default, useReducedMotion: () => false } };
});

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

// In-memory keychain so token code paths run for real.
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
    getItemAsync: jest.fn(async (k: string) => store.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
    deleteItemAsync: jest.fn(async (k: string) => {
      store.delete(k);
    }),
    __store: store,
  };
});

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(async () => undefined),
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageTag: 'en-US' }],
  useLocales: () => [{ languageCode: 'en', languageTag: 'en-US' }],
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: jest.fn(() => ({})),
  Redirect: () => null,
}));

jest.mock('lottie-react-native', () => () => null);
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({ play: jest.fn(), pause: jest.fn(), remove: jest.fn(), seekTo: jest.fn(async () => undefined) })),
  setAudioModeAsync: jest.fn(async () => undefined),
  useAudioPlayer: jest.fn(() => ({ play: jest.fn(), pause: jest.fn(), seekTo: jest.fn() })),
  useAudioPlayerStatus: jest.fn(() => ({ playing: false, currentTime: 0, duration: 0 })),
}));
jest.mock('expo-video', () => ({ useVideoPlayer: jest.fn(() => ({})), VideoView: () => null }));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn(), openAuthSessionAsync: jest.fn(), maybeCompleteAuthSession: jest.fn() }));

// expo-image renders a plain View in tests.
jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return { Image: View };
});

// Keep test output readable: the app logger is dev-only noise here.
jest.spyOn(console, 'warn').mockImplementation(() => undefined);
jest.spyOn(console, 'info').mockImplementation(() => undefined);
jest.spyOn(console, 'debug').mockImplementation(() => undefined);

jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'));
