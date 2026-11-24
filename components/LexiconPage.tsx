/**
 * Gemeinsame Vorlage für Lexikon-Seiten (Sterne, Phänomene): Zurück-Knopf,
 * Bild, Titel, Fakten-Kacheln, Text, Abschnitte und der Weg in den Sternenkasten.
 */
import { useRouter } from 'expo-router';
import React, { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbolName } from '@/components/ui/IconSymbol';
import { AppText, Button, IconButton } from '@/components/ui/kit';
import { color, radius, space } from '@/constants/theme';

type Neighbor = { label: string; onPress: () => void } | undefined;

export function LexiconPage({
  art,
  title,
  subtitle,
  lead,
  facts,
  paragraphs,
  sections,
  cta,
  prev,
  next,
  note,
}: {
  art?: ReactNode;
  title: string;
  subtitle: string;
  lead?: string;
  facts?: { label: string; value: string }[];
  paragraphs?: string[];
  sections?: { title: string; body: ReactNode }[];
  cta?: { label: string; icon: IconSymbolName; onPress: () => void };
  prev?: Neighbor;
  next?: Neighbor;
  note?: string;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/planets'));
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
          {art ? <View style={styles.art}>{art}</View> : null}
          <View style={styles.heading}>
            <AppText variant="display" accessibilityRole="header">
              {title}
            </AppText>
            <AppText tone="muted">{subtitle}</AppText>
          </View>
          {lead ? (
            <AppText variant="heading" style={styles.lead}>
              {lead}
            </AppText>
          ) : null}
          {paragraphs?.map((p, i) => (
            <AppText key={i} style={styles.paragraph}>
              {p}
            </AppText>
          ))}
          {facts?.length ? (
            <View style={styles.facts}>
              {facts.map((f) => (
                <View key={f.label} style={styles.tile}>
                  <AppText variant="label" tone="subtle">
                    {f.label}
                  </AppText>
                  <AppText variant="heading">{f.value}</AppText>
                </View>
              ))}
            </View>
          ) : null}
          {sections?.map((s) => (
            <View key={s.title} style={styles.section}>
              <AppText variant="heading" tone="muted" accessibilityRole="header">
                {s.title}
              </AppText>
              {s.body}
            </View>
          ))}
          {cta ? (
            <Button label={cta.label} icon={cta.icon} onPress={cta.onPress} style={styles.cta} />
          ) : null}
          {prev || next ? (
            <View style={styles.pager}>
              {prev ? (
                <Button label={prev.label} variant="secondary" icon="chevron.left" onPress={prev.onPress} style={styles.pagerBtn} />
              ) : (
                <View style={styles.pagerBtn} />
              )}
              {next ? (
                <Button
                  label={next.label}
                  variant="secondary"
                  icon="chevron.right"
                  iconSide="right"
                  onPress={next.onPress}
                  style={styles.pagerBtn}
                />
              ) : (
                <View style={styles.pagerBtn} />
              )}
            </View>
          ) : null}
          {note ? (
            <AppText variant="label" tone="subtle" style={styles.note}>
              {note}
            </AppText>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

export function LexiconMissing({ what }: { what: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, styles.missing, { paddingTop: insets.top + space.xxl }]}>
      <AppText variant="title">{what} gibt es hier nicht.</AppText>
      <Button label="Zum Lexikon" onPress={() => router.replace('/planets')} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.space },
  missing: { alignItems: 'flex-start', gap: space.md, paddingHorizontal: space.md },
  scroll: { paddingHorizontal: space.md, alignItems: 'center' },
  inner: { width: '100%', maxWidth: 640 },
  art: { alignItems: 'center', marginVertical: space.lg },
  heading: { gap: space.xxs },
  lead: { marginTop: space.lg },
  paragraph: { marginTop: space.sm },
  // Text-Fakten (Daten, Namen): keine hochzählenden Zahlen wie bei den Planeten
  facts: { marginTop: space.xl, flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  tile: {
    flexGrow: 1,
    flexBasis: 150,
    padding: space.md,
    gap: space.xxs,
    borderRadius: radius.tile,
    backgroundColor: color.surface,
  },
  section: { marginTop: space.xxl, gap: space.sm },
  cta: { marginTop: space.xxl, alignSelf: 'flex-start' },
  pager: { flexDirection: 'row', gap: space.xs, marginTop: space.sm },
  pagerBtn: { flex: 1 },
  note: { marginTop: space.xl },
});
