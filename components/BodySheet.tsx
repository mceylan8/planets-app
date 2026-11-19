import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

import { AppText, Button, Fact, IconButton, PlanetSwatch } from '@/components/ui/kit';
import { Body, bodyTypeLabel, quickFacts } from '@/constants/planets';
import { color, elevation, motion, radius, space } from '@/constants/theme';

/** Schwebende Infokarte zu einem gewählten Körper (System-Tab und Schaukasten). */
export function BodySheet({ body, onClose }: { body: Body; onClose: () => void }) {
  const router = useRouter();
  return (
    <Animated.View
      entering={FadeInDown.duration(motion.sheetIn).easing(motion.easeOut)}
      exiting={FadeOutDown.duration(motion.sheetOut)}
      style={[styles.sheet, elevation.floating]}>
      <View style={styles.header}>
        <PlanetSwatch planet={body} size={40} />
        <View style={styles.title}>
          <AppText variant="title">{body.name}</AppText>
          <AppText variant="bodySmall" tone="muted">
            {bodyTypeLabel(body)}
          </AppText>
        </View>
        <IconButton icon="xmark" label="Auswahl schließen" variant="plain" onPress={onClose} />
      </View>
      <AppText tone="muted">{body.tagline}</AppText>
      <View style={styles.facts}>
        {quickFacts(body).map((f) => (
          <Fact key={f.label} label={f.label} value={f.value} />
        ))}
      </View>
      <Button
        label={`${body.name} im Detail`}
        icon="chevron.right"
        iconSide="right"
        onPress={() => router.push({ pathname: '/planet/[id]', params: { id: body.id } })}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    marginHorizontal: space.md,
    maxWidth: 440,
    padding: space.md,
    gap: space.sm,
    borderRadius: radius.sheet,
    backgroundColor: color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  title: { flex: 1, minWidth: 0 },
  facts: { flexDirection: 'row', gap: space.lg, paddingVertical: space.xxs },
});
