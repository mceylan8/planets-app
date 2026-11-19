import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BodySheet } from '@/components/BodySheet';
import {
  BOX_IDS,
  Diorama,
  LampMode,
  captureBox,
  createBoxController,
} from '@/components/box/Diorama';
import { useTabBarOffset } from '@/components/ui/AppTabBar';
import {
  AppText,
  Button,
  IconButton,
  PlanetSwatch,
  PressableScale,
  SegmentedControl,
} from '@/components/ui/kit';
import { Body, getBoxBody, isPlanet } from '@/constants/planets';
import { color, elevation, hitTarget, radius, space } from '@/constants/theme';
import {
  BoxDesign,
  PAINTS,
  defaultDesign,
  isDefaultDesign,
  loadDesign,
  saveDesign,
} from '@/lib/boxDesign';
import { shareBoxImage } from '@/lib/shareBox';

const styles_: { value: BoxDesign['style']; label: string; a11y: string }[] = [
  { value: 'threads', label: 'Fäden', a11y: 'Planeten hängen an Fäden' },
  { value: 'arcs', label: 'Bögen', a11y: 'Planeten sitzen auf Bögen um die Sonne' },
];
const materials: { value: BoxDesign['material']; label: string; a11y: string }[] = [
  { value: 'paper', label: 'Papier', a11y: 'Papier und Pappe' },
  { value: 'knit', label: 'Strick', a11y: 'Strick und Stoff, ruckelt wie Stop-Motion' },
];

const lampModes: { value: LampMode; label: string; a11y: string }[] = [
  { value: 'all', label: 'Alles', a11y: 'Alles leuchtet' },
  { value: 'planets', label: 'Planeten', a11y: 'Nur Planeten leuchten' },
  { value: 'sun', label: 'Sonne', a11y: 'Nur Sonne leuchtet' },
];

export default function BoxScreen() {
  const controller = useMemo(createBoxController, []);
  const insets = useSafeAreaInsets();
  const tabOffset = useTabBarOffset();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lampMode, setLampMode] = useState<LampMode>('all');
  const [editing, setEditing] = useState(false);
  const [paintId, setPaintId] = useState<string | null>(null);
  const [design, setDesign] = useState<BoxDesign>(() => defaultDesign(BOX_IDS));
  const [sharing, setSharing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selected = selectedId ? (getBoxBody(selectedId) ?? null) : null;
  const paintBody = paintId ? getBoxBody(paintId) : undefined;
  const paintPlanet = isPlanet(paintBody) ? paintBody : undefined;

  // Bei „Bewegung reduzieren“ kein ständiges Wiegen
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduce) => {
        if (reduce) controller.idle = false;
      })
      .catch(() => {});
  }, [controller]);

  const apply = useCallback(
    (d: BoxDesign) => {
      controller.setLook(d.style, d.material);
      controller.setOrder(d.order);
      controller.paint = { ...d.paint };
      setDesign(d);
    },
    [controller]
  );

  // Gespeicherten Bastel-Kasten laden
  useEffect(() => {
    let alive = true;
    loadDesign(BOX_IDS).then((d) => alive && apply(d));
    return () => {
      alive = false;
    };
  }, [apply]);

  const update = useCallback(
    (d: BoxDesign) => {
      apply(d);
      saveDesign(d);
    },
    [apply]
  );

  const showToast = useCallback((text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const select = useCallback(
    (b: Body | null) => {
      if (controller.editing) {
        // Basteln: Antippen wählt den Planeten zum Anmalen, die Sonne bleibt, wie sie ist
        const id = b && isPlanet(b) ? b.id : null;
        controller.selectedId = id;
        setPaintId(id);
        return;
      }
      controller.selectedId = b?.id ?? null;
      // Detailkarte: auf den Planeten zoomen, damit er nicht hinter der Karte verschwindet
      controller.zoomId = b && isPlanet(b) ? b.id : null;
      setSelectedId(b?.id ?? null);
    },
    [controller]
  );

  const toggleEditing = useCallback(() => {
    const next = !controller.editing;
    controller.editing = next;
    controller.zoomId = null;
    controller.selectedId = null;
    setSelectedId(null);
    setPaintId(null);
    setEditing(next);
  }, [controller]);

  const changeLamp = useCallback(
    (mode: LampMode) => {
      controller.lampMode = mode;
      setLampMode(mode);
    },
    [controller]
  );

  const paint = useCallback(
    (value: string | null) => {
      if (!paintId) return;
      const next = { ...design.paint };
      if (value) next[paintId] = value;
      else delete next[paintId];
      update({ ...design, paint: next });
    },
    [design, paintId, update]
  );

  const reset = useCallback(() => {
    update(defaultDesign(BOX_IDS));
    showToast('Wieder wie ab Werk');
  }, [update, showToast]);

  const share = useCallback(async () => {
    if (sharing) return;
    setSharing(true);
    // Auswahl-Markierung soll nicht mit aufs Bild
    const prevSelected = controller.selectedId;
    controller.selectedId = null;
    try {
      const shot = await captureBox(controller);
      if (!shot.image) {
        showToast('Bild konnte nicht erstellt werden');
        return;
      }
      const result = await shareBoxImage(shot.image, shot.labels, shot.size);
      if (result === 'saved') showToast('Bild gespeichert');
      else if (result === 'failed') showToast('Teilen hat nicht geklappt');
    } finally {
      controller.selectedId = prevSelected;
      setSharing(false);
    }
  }, [controller, sharing, showToast]);

  const onReorder = useCallback(
    (order: string[]) => update({ ...design, order }),
    [design, update]
  );

  const custom = !isDefaultDesign(design, BOX_IDS);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + space.md }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <AppText variant="title" accessibilityRole="header">
              {editing ? 'Basteln' : 'Schaukasten'}
            </AppText>
            <AppText variant="bodySmall" tone="muted">
              {editing
                ? 'Planet zur Seite ziehen zum Umhängen, antippen zum Anmalen'
                : 'Ziehen zum Schwingen, doppelt tippen zum Zoomen'}
            </AppText>
          </View>
          <View style={styles.controls}>
            {!editing && (
              <SegmentedControl
                label="Licht"
                options={lampModes}
                value={lampMode}
                onChange={changeLamp}
              />
            )}
            <IconButton
              icon={editing ? 'checkmark' : 'paintbrush.fill'}
              label={editing ? 'Basteln beenden' : 'Schaukasten basteln'}
              onPress={toggleEditing}
            />
            <IconButton
              icon="square.and.arrow.up"
              label="Schaukasten als Bild teilen"
              onPress={share}
            />
          </View>
        </View>
      </View>
      <View style={styles.stage}>
        <Diorama
          controller={controller}
          look={{ style: design.style, material: design.material }}
          onPick={select}
          onReorder={onReorder}
        />
      </View>

      {!editing && selected && (
        <View
          pointerEvents="box-none"
          style={[styles.sheetWrap, { bottom: tabOffset + space.sm }]}
        >
          <BodySheet body={selected} onClose={() => select(null)} />
        </View>
      )}

      {editing && (
        <View
          pointerEvents="box-none"
          style={[styles.sheetWrap, { bottom: tabOffset + space.sm }]}
        >
          <View style={[styles.panel, elevation.floating]}>
            <View style={styles.looks}>
              <SegmentedControl
                label="Aufbau"
                options={styles_}
                value={design.style}
                onChange={(style) => update({ ...design, style })}
              />
              <SegmentedControl
                label="Material"
                options={materials}
                value={design.material}
                onChange={(material) => update({ ...design, material })}
              />
            </View>
            {paintPlanet ? (
              <>
                <AppText variant="heading">{paintPlanet.name} anmalen</AppText>
                <ScrollView
                  // Neuer Planet: Farbreihe beginnt wieder bei „Original“
                  key={paintPlanet.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.swatches}
                  accessibilityRole="radiogroup"
                  accessibilityLabel={`Farbe für ${paintPlanet.name}`}
                >
                  {PAINTS.map((p) => {
                    const active = (design.paint[paintPlanet.id] ?? null) === p.value;
                    return (
                      <PressableScale
                        key={p.name}
                        onPress={() => paint(p.value)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={p.name}
                        style={[styles.swatchRing, active && styles.swatchRingOn]}
                      >
                        {p.value ? (
                          <View style={[styles.swatch, { backgroundColor: p.value }]} />
                        ) : (
                          <PlanetSwatch planet={paintPlanet} size={30} />
                        )}
                      </PressableScale>
                    );
                  })}
                </ScrollView>
              </>
            ) : (
              <AppText variant="bodySmall" tone="muted">
                {design.style === 'arcs'
                  ? 'Tipp einen Planeten an, um ihn anzumalen. Zieh ihn auf einen anderen Bogen, um die Reihenfolge zu ändern.'
                  : 'Tipp einen Planeten an, um ihn anzumalen. Zieh ihn an einen anderen Platz, um die Reihenfolge zu ändern.'}
              </AppText>
            )}
            <View style={styles.actions}>
              <Button
                label="Zurücksetzen"
                variant="secondary"
                onPress={reset}
                disabled={!custom}
                style={styles.action}
              />
              <Button
                label="Fertig"
                icon="checkmark"
                onPress={toggleEditing}
                style={styles.action}
              />
            </View>
          </View>
        </View>
      )}

      {toast && (
        <View
          pointerEvents="none"
          style={[styles.toastWrap, { top: insets.top + 96 }]}
          accessibilityLiveRegion="polite"
        >
          <View style={[styles.toast, elevation.floating]}>
            <AppText variant="label">{toast}</AppText>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.space },
  header: { paddingHorizontal: space.md, paddingBottom: space.sm },
  headerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  headerText: { flex: 1, minWidth: 160, gap: 2 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  stage: { flex: 1 },
  sheetWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: space.md,
  },
  panel: {
    width: '100%',
    maxWidth: 520,
    padding: space.md,
    gap: space.sm,
    borderRadius: radius.sheet,
    backgroundColor: color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
  },
  swatches: { gap: space.xs, paddingVertical: 2 },
  swatchRing: {
    width: hitTarget,
    height: hitTarget,
    borderRadius: hitTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchRingOn: { borderColor: color.accent },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.35)',
  },
  actions: { flexDirection: 'row', gap: space.xs },
  looks: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  action: { flex: 1 },
  toastWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  toast: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceRaised,
  },
});
