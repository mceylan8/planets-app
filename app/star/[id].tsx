import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { LexiconMissing, LexiconPage } from '@/components/LexiconPage';
import { AppText, PressableScale } from '@/components/ui/kit';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { brightStars, getBrightStar, getConstellation } from '@/constants/constellations';
import { color, radius, space } from '@/constants/theme';

/** Ein heller Stern: Steckbrief mit Temperatur, Größe, Leuchtkraft */
export default function StarScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const st = getBrightStar(id);
  if (!st) return <LexiconMissing what="Diesen Stern" />;
  const c = getConstellation(st.constellation);
  const i = brightStars.indexOf(st);
  const prev = brightStars[i - 1];
  const next = brightStars[i + 1];
  return (
    <LexiconPage
      art={
        <View style={styles.glowWrap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={[styles.glow3, { backgroundColor: st.color }]} />
          <View style={[styles.glow2, { backgroundColor: st.color }]} />
          <View style={[styles.core, { backgroundColor: st.color }]} />
        </View>
      }
      title={st.name}
      subtitle={`Stern im Sternbild ${c?.name ?? ''} · Nummer ${i + 1} der hellsten`}
      lead={st.note}
      facts={[
        { label: 'Entfernung', value: st.distance },
        { label: 'Temperatur', value: st.temperature },
        { label: 'Durchmesser', value: st.size },
        { label: 'Leuchtkraft', value: st.luminosity },
      ]}
      paragraphs={st.text}
      sections={
        c
          ? [
              {
                title: 'Sein Sternbild',
                body: (
                  <PressableScale
                    static
                    onPress={() => router.push({ pathname: '/constellation/[id]', params: { id: c.id } })}
                    accessibilityRole="link"
                    accessibilityLabel={`Steckbrief ${c.name}`}
                    style={({ hovered, pressed }) => [
                      styles.link,
                      { backgroundColor: hovered || pressed ? color.surfaceRaised : color.surface },
                    ]}
                  >
                    <AppText variant="heading" style={styles.linkText}>
                      {c.name}
                    </AppText>
                    <IconSymbol name="chevron.right" size={20} color={color.textSubtle} />
                  </PressableScale>
                ),
              },
            ]
          : undefined
      }
      cta={
        c
          ? {
              label: 'Im Sternenkasten zeigen',
              icon: 'sparkles',
              onPress: () =>
                router.navigate({ pathname: '/sky', params: { show: c.id, t: String(Date.now()) } }),
            }
          : undefined
      }
      prev={prev && { label: prev.name, onPress: () => router.setParams({ id: prev.id }) }}
      next={next && { label: next.name, onPress: () => router.setParams({ id: next.id }) }}
      note="Werte gerundet. „Rund“ heißt: Die Messungen gehen noch auseinander, vor allem bei fernen Riesensternen."
    />
  );
}

const styles = StyleSheet.create({
  glowWrap: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center' },
  glow3: { position: 'absolute', width: 180, height: 180, borderRadius: 90, opacity: 0.08 },
  glow2: { position: 'absolute', width: 110, height: 110, borderRadius: 55, opacity: 0.18 },
  core: { width: 56, height: 56, borderRadius: 28 },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.tile,
  },
  linkText: { flex: 1 },
});
