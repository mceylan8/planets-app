import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { LexiconMissing, LexiconPage } from '@/components/LexiconPage';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { AppText } from '@/components/ui/kit';
import { getPhenomenon, phenomena } from '@/constants/phenomena';
import { color, space } from '@/constants/theme';

/** Himmelserscheinung: was es ist, wie es entsteht, wann man es sieht */
export default function PhenomenonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const p = getPhenomenon(id);
  if (!p) return <LexiconMissing what="Diesen Eintrag" />;
  const i = phenomena.indexOf(p);
  const prev = phenomena[i - 1];
  const next = phenomena[i + 1];
  return (
    <LexiconPage
      art={
        <View style={styles.badge} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <IconSymbol name={p.icon} size={56} color={color.text} />
        </View>
      }
      title={p.name}
      subtitle={p.tagline}
      paragraphs={p.text}
      facts={p.facts}
      sections={[{ title: 'Selbst sehen', body: <AppText>{p.see}</AppText> }]}
      cta={
        p.box
          ? {
              label: p.box.label,
              icon: 'sparkles',
              onPress: () =>
                router.navigate({
                  pathname: '/sky',
                  params: {
                    ...(p.box?.enable ? { enable: p.box.enable } : {}),
                    ...(p.box?.show ? { show: p.box.show } : {}),
                    t: String(Date.now()),
                  },
                }),
            }
          : undefined
      }
      prev={prev && { label: prev.name, onPress: () => router.setParams({ id: prev.id }) }}
      next={next && { label: next.name, onPress: () => router.setParams({ id: next.id }) }}
      note="Werte gerundet. Raten von Sternschnuppen gelten für einen ganz dunklen Himmel."
    />
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surface,
    marginVertical: space.xs,
  },
});
