import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlanetViewer } from '@/components/solar/PlanetViewer';
import {
  Comparisons,
  FactGrid,
  ScrollTick,
  createScrollBus,
} from '@/components/BodyFacts';
import { AppText, Button, IconButton } from '@/components/ui/kit';
import {
  bodies,
  detailFacts,
  getBody,
  planetTypeLabel,
} from '@/constants/planets';
import { color, space } from '@/constants/theme';

export default function PlanetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const planet = getBody(id);
  const bus = useMemo(createScrollBus, []);

  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace('/planets');

  if (!planet) {
    return (
      <View
        style={[
          styles.root,
          styles.missing,
          { paddingTop: insets.top + space.xxl },
        ]}
      >
        <AppText variant="title">Diesen Planeten gibt es hier nicht.</AppText>
        <AppText tone="muted">Wähle einen Planeten aus der Liste.</AppText>
        <Button
          label="Zur Planetenliste"
          onPress={() => router.replace('/planets')}
        />
      </View>
    );
  }

  const index = bodies.indexOf(planet);
  const prev = bodies[index - 1];
  const next = bodies[index + 1];
  const viewerHeight = Math.max(300, Math.min(width * 0.9, 460));

  return (
    <View style={styles.root}>
      <ScrollTick.Provider value={bus}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          scrollEventThrottle={120}
          onScroll={bus.emit}
        >
          <View style={{ height: viewerHeight + insets.top }}>
            <PlanetViewer planet={planet} />
          </View>

          <View style={styles.content}>
            <View style={styles.inner}>
              <View style={styles.heading}>
                <AppText variant="display" accessibilityRole="header">
                  {planet.name}
                </AppText>
                <AppText tone="muted">
                  {planet.type === 'star'
                    ? 'Stern im Zentrum des Sonnensystems'
                    : `${planetTypeLabel[planet.type]}, Nummer ${index} von der Sonne aus`}
                </AppText>
              </View>

              <AppText variant="heading" style={styles.tagline}>
                {planet.tagline}
              </AppText>
              {planet.description.map((para, i) => (
                <AppText key={i} style={styles.paragraph}>
                  {para}
                </AppText>
              ))}

              <View style={styles.facts}>
                <FactGrid items={detailFacts(planet)} />
              </View>

              <Comparisons body={planet} />

              <Button
                label="Im Sonnensystem zeigen"
                icon="sun.max.fill"
                onPress={() =>
                  router.navigate({
                    pathname: '/',
                    params: { focus: planet.id, t: String(Date.now()) },
                  })
                }
                style={styles.primary}
              />

              <View style={styles.pager}>
                {prev ? (
                  <Button
                    variant="secondary"
                    label={prev.name}
                    icon="chevron.left"
                    onPress={() =>
                      router.replace({
                        pathname: '/planet/[id]',
                        params: { id: prev.id },
                      })
                    }
                    style={styles.pagerButton}
                  />
                ) : (
                  <View style={styles.pagerButton} />
                )}
                {next ? (
                  <Button
                    variant="secondary"
                    label={next.name}
                    icon="chevron.right"
                    iconSide="right"
                    onPress={() =>
                      router.replace({
                        pathname: '/planet/[id]',
                        params: { id: next.id },
                      })
                    }
                    style={styles.pagerButton}
                  />
                ) : (
                  <View style={styles.pagerButton} />
                )}
              </View>

              <AppText variant="label" tone="subtle" style={styles.source}>
                Daten: NASA. Mondzahlen Stand 2025. Größen und Abstände in der
                3D-Ansicht sind nicht maßstabsgetreu.
              </AppText>
            </View>
          </View>
        </ScrollView>
      </ScrollTick.Provider>

      <View style={[styles.back, { top: insets.top + space.sm }]}>
        <IconButton icon="chevron.left" label="Zurück" onPress={goBack} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.space },
  missing: {
    paddingHorizontal: space.md,
    gap: space.sm,
    alignItems: 'flex-start',
  },
  scroll: { paddingBottom: space.xxxl },
  content: { paddingHorizontal: space.md, alignItems: 'center' },
  inner: { width: '100%', maxWidth: 720 },
  heading: { gap: space.xxs, marginTop: space.lg },
  tagline: { marginTop: space.xl, maxWidth: 640 },
  paragraph: { marginTop: space.sm, maxWidth: 640 },
  facts: { marginTop: space.xxl },
  primary: { marginTop: space.xxl, alignSelf: 'flex-start' },
  pager: { flexDirection: 'row', gap: space.sm, marginTop: space.xxl },
  pagerButton: { flex: 1 },
  source: { marginTop: space.xl },
  back: { position: 'absolute', left: space.md },
});
