import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

/** AsyncStorage adapter for persisted, NON-SENSITIVE client state. */
export const asyncJSONStorage = createJSONStorage(() => AsyncStorage);
