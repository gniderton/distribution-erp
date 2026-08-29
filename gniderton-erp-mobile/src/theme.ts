import { useAppStore } from './store';

export const lightTheme = {
  background: '#f9fafb',
  card: '#ffffff',
  text: '#111827',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  border: '#e5e7eb',
  input: '#f3f4f6',
  primary: '#2f7f74',
  success: '#16a34a',
  error: '#ef4444',
  isDark: false,
  isGlass: false,
};

export const darkTheme = {
  background: '#121212',
  card: '#1e1e1e',
  text: '#f9fafb',
  textSecondary: '#9ca3af',
  textMuted: '#6b7280',
  border: '#333333',
  input: '#2c2c2c',
  primary: '#4d9e92',
  success: '#22c55e',
  error: '#f87171',
  isDark: true,
  isGlass: false,
};

export const glassTheme = {
  ...darkTheme,
  background: 'transparent',
  card: 'rgba(30, 30, 30, 0.4)',
  border: 'rgba(255, 255, 255, 0.1)',
  input: 'rgba(255, 255, 255, 0.05)',
  isGlass: true,
};

export const useTheme = () => {
  const activeTheme = useAppStore(state => state.activeTheme);
  if (activeTheme === 'dark') return darkTheme;
  if (activeTheme === 'glass') return glassTheme;
  return lightTheme;
};
