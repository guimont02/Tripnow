import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { ThemeProvider as AppThemeProvider, useTheme } from '../lib/theme';

function ThemedStack() {
  const { dark } = useTheme();
  return (
    <ThemeProvider value={dark ? DarkTheme : DefaultTheme}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Meus Roteiros' }} />
        <Stack.Screen name="roteiro/nova" options={{ title: 'Novo Roteiro' }} />
        <Stack.Screen name="roteiro/[id]" options={{ title: 'Roteiro' }} />
        <Stack.Screen name="roteiro/editar/[id]" options={{ title: 'Edit Trip' }} />
        <Stack.Screen name="roteiro/agente/[id]" options={{ title: 'AI Travel Agent' }} />
        <Stack.Screen name="atividade/nova" options={{ title: 'Nova Atividade' }} />
        <Stack.Screen name="atividade/[id]" options={{ title: 'Edit Activity' }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <ThemedStack />
    </AppThemeProvider>
  );
}
