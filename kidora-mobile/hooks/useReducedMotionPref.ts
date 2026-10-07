import { useReducedMotion } from 'react-native-reanimated';

import { useSettingsStore } from '@/store/settingsStore';

/** True when either the OS or the in-app setting asks for reduced motion. */
export function useReducedMotionPref(): boolean {
  const system = useReducedMotion();
  const app = useSettingsStore((s) => s.reduceMotion);
  return system || app;
}
