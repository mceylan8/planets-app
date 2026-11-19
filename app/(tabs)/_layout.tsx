import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { color } from '@/constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        tabBarButton: HapticTab,
        tabBarActiveTintColor: color.accent,
        tabBarInactiveTintColor: color.textMuted,
        tabBarStyle: { backgroundColor: color.surface, borderTopColor: color.border },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
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
