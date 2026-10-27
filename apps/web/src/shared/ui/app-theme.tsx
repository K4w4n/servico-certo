'use client';

import { createContext, useContext, type ReactNode } from 'react';

export type AppTheme = 'light' | 'dark';

const AppThemeContext = createContext<AppTheme>('light');

export function AppThemeProvider({ theme, children }: { theme: AppTheme; children: ReactNode }) {
  return <AppThemeContext.Provider value={theme}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme(): AppTheme {
  return useContext(AppThemeContext);
}
