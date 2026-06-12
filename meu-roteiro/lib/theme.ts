import React, { createContext, useContext, useState, type ReactNode } from 'react';

export const lightColors = {
  background: '#F8FAFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F3F4F6',
  border: '#F3F4F6',
  borderInput: '#E0E0E0',
  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  primary: '#3B82F6',
  primaryLight: '#EFF6FF',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  success: '#10B981',
  fabBg: '#111827',
  fabText: '#FFFFFF',
  inputPlaceholder: '#AAAAAA',
};

export const darkColors: typeof lightColors = {
  background: '#0F172A',
  surface: '#1E293B',
  surfaceAlt: '#334155',
  border: '#1E293B',
  borderInput: '#475569',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  primary: '#60A5FA',
  primaryLight: '#1E3A5F',
  danger: '#F87171',
  dangerLight: '#7F1D1D',
  success: '#34D399',
  fabBg: '#F1F5F9',
  fabText: '#0F172A',
  inputPlaceholder: '#64748B',
};

export type Colors = typeof lightColors;

interface ThemeContextValue {
  dark: boolean;
  colors: Colors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  dark: false,
  colors: lightColors,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);
  return React.createElement(
    ThemeContext.Provider,
    {
      value: {
        dark,
        colors: dark ? darkColors : lightColors,
        toggleTheme: () => setDark((d) => !d),
      },
    },
    children
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
