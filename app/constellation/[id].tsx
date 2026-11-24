import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConstellationSketch } from '@/components/sky/ConstellationSketch';
import { AppText, Button, IconButton } from '@/components/ui/kit';
import {
  constellations,
  details,
  getConstellation,
  seasonLabel,
} from '@/constants/constellations';
import { color, radius, space } from '@/constants/theme';

/** Steckbrief eines Sternbilds: Zeichnung, Sterne, Sage, wie man es findet */
export default function ConstellationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = getConstellation(id);
  const d = c ? details[c.id] : undefined;

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/planets'));

  if (!c || !d) {
    return (
      <View style={[styles.root, styles.missing, { paddingTop: insets.top + space.xxl }]}>
        <AppText variant="title">Dieses Sternbild gibt es hier nicht.</AppText>
        <Button label="Zur Himmelsliste" onPress={() => router.replace('/planets')} />
      </View>
    );
  }

  const i = constellations.indexOf(c);
  const prev = constellations[i - 1];
  const next = constellations[i + 1];

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.xxl },
        ]}
      >
        <View style={styles.inner}>
          <IconButton icon="chevron.left" label="Zurück" onPress={goBack} />

          <View style={styles.art}>
            <ConstellationSketch c={c} size={220} />
          </View>

          <View style={styles.heading}>
            <AppText variant="display" accessibilityRole="header">
              {c.name}
            </AppText>
            <AppText tone="muted">
              {d.latin} ({d.abbr}) · {c.zodiac ? 'Tierkreiszeichen' : 'Sternbild'}
            </AppText>
          </View>

          <View style={styles.chips}>
            <View style={styles.chip}>
              <AppText variant="label">{seasonLabel[d.season]}</AppText>
            </View>
          </View>

          <AppText variant="heading" style={styles.tagline}>
            {c.fact}
          </AppText>

          <Section title="Seine Sterne">
            <View style={styles.rows}>
              {d.stars.map((st) => (
                <View key={st.name} style={styles.row}>
                  <View style={styles.rowHead}>
                    <AppText variant="heading" style={styles.rowName}>
                      {st.name}
                    </AppText>
                    <AppText variant="dataSmall" tone="muted">
                      {st.distance}
                    </AppText>
                  </View>
                  <AppText variant="bodySmall" tone="muted">
                    {st.note}
                  </AppText>
                </View>
              ))}
            </View>
          </Section>

          <Section title="Die Sage">
            <AppText>{d.myth}</AppText>
          </Section>

          <Section title="So findest du es">
            <AppText>{d.find}</AppText>
          </Section>

          <Button
            label="Im Sternenkasten zeigen"
            icon="sparkles"
            onPress={() =>
              router.navigate({ pathname: '/sky', params: { show: c.id, t: String(Date.now()) } })
            }
            style={styles.cta}
          />

          <View style={styles.pager}>
            {prev ? (
              <Button
                label={prev.name}
                variant="secondary"
                icon="chevron.left"
                onPress={() => router.setParams({ id: prev.id })}
                style={styles.pagerBtn}
              />
            ) : (
              <View style={styles.pagerBtn} />
            )}
            {next ? (
              <Button
                label={next.name}
                variant="secondary"
                icon="chevron.right"
                iconSide="right"
                onPress={() => router.setParams({ id: next.id })}
                style={styles.pagerBtn}
              />
            ) : (
              <View style={styles.pagerBtn} />
            )}
          </View>

          <AppText variant="label" tone="subtle" style={styles.note}>
            Entfernungen gerundet in Lichtjahren (Lj). „Rund“ heißt: Die Messungen gehen noch auseinander.
          </AppText>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="heading" tone="muted" accessibilityRole="header">
        {title}
      </AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.space },
  missing: { alignItems: 'center', gap: space.md, paddingHorizontal: space.md },
  scroll: { paddingHorizontal: space.md, alignItems: 'center' },
  inner: { width: '100%', maxWidth: 640 },
  art: { alignItems: 'center', marginVertical: space.md },
  heading: { gap: space.xxs },
  chips: { flexDirection: 'row', gap: space.xs, marginTop: space.sm },
  chip: {
    paddingHorizontal: space.sm,
    paddingVertical: space.xxs,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceRaised,
  },
  tagline: { marginTop: space.lg },
  section: { marginTop: space.xxl, gap: space.sm },
  rows: { gap: space.xs },
  row: { padding: space.md, borderRadius: radius.tile, backgroundColor: color.surface, gap: 2 },
  rowHead: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  rowName: { flex: 1 },
  cta: { marginTop: space.xxl },
  pager: { flexDirection: 'row', gap: space.xs, marginTop: space.sm },
  pagerBtn: { flex: 1 },
  note: { marginTop: space.xl },
});
