import { Tabs } from 'expo-router';
import React from 'react';

import { AppTabBar } from '@/components/ui/AppTabBar';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { color } from '@/constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        tabBarActiveTintColor: color.accent,
        tabBarInactiveTintColor: color.textMuted,
        sceneStyle: { backgroundColor: color.space },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'System',
          tabBarIcon: ({ color: c }) => (
            <IconSymbol size={22} name="sun.max.fill" color={c} />
          ),
        }}
      />
      <Tabs.Screen
        name="box"
        options={{
          title: 'Schaukasten',
          tabBarIcon: ({ color: c }) => (
            <IconSymbol size={22} name="shippingbox.fill" color={c} />
          ),
        }}
      />
      <Tabs.Screen
        name="planets"
        options={{
          title: 'Planeten',
          tabBarIcon: ({ color: c }) => (
            <IconSymbol size={22} name="list.bullet" color={c} />
          ),
        }}
      />
    </Tabs>
  );
}
