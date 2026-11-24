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
          tabBarIcon: ({ color: c, focused }) => (
            <IconSymbol size={22} name={focused ? 'sun.max.fill' : 'sun.max'} color={c} />
          ),
        }}
      />
      <Tabs.Screen
        name="box"
        options={{
          title: 'Schaukasten',
          tabBarIcon: ({ color: c, focused }) => (
            <IconSymbol size={22} name={focused ? 'shippingbox.fill' : 'shippingbox'} color={c} />
          ),
        }}
      />
      <Tabs.Screen
        name="sky"
        options={{
          title: 'Sterne',
          tabBarIcon: ({ color: c, focused }) => (
            <IconSymbol size={22} name={focused ? 'moon.stars.fill' : 'moon.stars'} color={c} />
          ),
        }}
      />
      <Tabs.Screen
        name="planets"
        options={{
          title: 'Lexikon',
          tabBarIcon: ({ color: c, focused }) => (
            <IconSymbol size={22} name={focused ? 'book.fill' : 'book'} color={c} />
          ),
        }}
      />
    </Tabs>
  );
}
