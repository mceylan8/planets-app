import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { color } from '@/constants/theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  // Safari/PWA: ohne viewport-fit oft 0 — dann Mindestpolster, damit Labels nicht abgeschnitten werden
  const bottom = Math.max(insets.bottom, Platform.OS === 'web' ? 12 : 0);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        tabBarButton: HapticTab,
        tabBarActiveTintColor: color.accent,
        tabBarInactiveTintColor: color.textMuted,
        tabBarStyle: {
          backgroundColor: color.surface,
          borderTopColor: color.border,
          height: 52 + bottom,
          paddingBottom: bottom,
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontSize: 11, fontFamily: 'Inter_500Medium', marginBottom: 2 },
        sceneStyle: { backgroundColor: color.space },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'System',
          tabBarIcon: ({ color: c }) => <IconSymbol size={26} name="sun.max.fill" color={c} />,
        }}
      />
      <Tabs.Screen
        name="box"
        options={{
          title: 'Schaukasten',
          tabBarIcon: ({ color: c }) => <IconSymbol size={26} name="shippingbox.fill" color={c} />,
        }}
      />
      <Tabs.Screen
        name="planets"
        options={{
          title: 'Planeten',
          tabBarIcon: ({ color: c }) => <IconSymbol size={26} name="list.bullet" color={c} />,
        }}
      />
    </Tabs>
  );
}
