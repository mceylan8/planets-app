/**
 * Strichzeichnung eines Sternbilds ohne SVG: Linien sind gedrehte Haarstriche,
 * Sterne kleine Punkte, nach Helligkeit größer.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Constellation } from '@/constants/constellations';

export function ConstellationSketch({
  c,
  size,
  star = '#FFE58A',
  line = 'rgba(244, 239, 228, 0.55)',
}: {
  c: Constellation;
  size: number;
  star?: string;
  line?: string;
}) {
  const pad = size * 0.12;
  const s = (size - 2 * pad) / 2;
  const px = (x: number) => pad + (x + 1) * s;
  const py = (y: number) => pad + (1 - y) * s;
  const dot = (b: number) => Math.max(2.5, size * (0.035 + b * 0.04));
  return (
    <View
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {c.lines.map(([a, b], i) => {
        const [x1, y1] = c.stars[a];
        const [x2, y2] = c.stars[b];
        const ax = px(x1);
        const ay = py(y1);
        const bx = px(x2);
        const by = py(y2);
        const len = Math.hypot(bx - ax, by - ay);
        const ang = Math.atan2(by - ay, bx - ax);
        return (
          <View
            key={i}
            style={[
              styles.line,
              {
                width: len,
                left: (ax + bx) / 2 - len / 2,
                top: (ay + by) / 2 - 0.5,
                backgroundColor: line,
                transform: [{ rotate: `${ang}rad` }],
              },
            ]}
          />
        );
      })}
      {c.stars.map(([x, y, b], i) => {
        const d = dot(b);
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: px(x) - d / 2,
              top: py(y) - d / 2,
              width: d,
              height: d,
              borderRadius: d / 2,
              backgroundColor: star,
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  line: { position: 'absolute', height: 1 },
});
