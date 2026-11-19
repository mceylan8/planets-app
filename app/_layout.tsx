import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Caveat_700Bold } from '@expo-google-fonts/caveat';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { color } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

// Die App ist bewusst immer dunkel: Man schaut in den Weltraum, die 3D-Szene
// ist schwarz, und helle Flächen daneben würden blenden.
const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: color.accent,
    background: color.space,
    card: color.surface,
    text: color.text,
    border: color.border,
  },
};

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    Caveat_700Bold,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <ThemeProvider value={theme}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.space } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="planet/[id]" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
