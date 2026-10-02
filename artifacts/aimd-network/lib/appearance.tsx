import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance, Platform, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppearanceMode = 'system' | 'light' | 'dark';
const STORAGE_KEY = 'aimd:appearance-mode';

type AppearanceValue = {
  mode: AppearanceMode;
  scheme: 'light' | 'dark';
  ready: boolean;
  setMode: (mode: AppearanceMode) => Promise<void>;
};

const AppearanceContext = createContext<AppearanceValue | null>(null);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, updateMode] = useState<AppearanceMode>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (mounted && (saved === 'light' || saved === 'dark' || saved === 'system')) {
          updateMode(saved);
        }
      })
      .catch((error) => console.warn('Could not restore appearance preference', error))
      .finally(() => { if (mounted) setReady(true); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (ready && Platform.OS !== 'web') {
      Appearance.setColorScheme(mode === 'system' ? null : mode);
    }
  }, [mode, ready]);

  const value = useMemo<AppearanceValue>(() => ({
    mode,
    scheme: mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode,
    ready,
    setMode: async (nextMode) => {
      // Apply only after persistence succeeds, so a failed save never looks saved.
      await AsyncStorage.setItem(STORAGE_KEY, nextMode);
      updateMode(nextMode);
    },
  }), [mode, ready, systemScheme]);

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const value = useContext(AppearanceContext);
  if (!value) throw new Error('useAppearance requires AppearanceProvider');
  return value;
}