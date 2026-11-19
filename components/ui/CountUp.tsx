import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, TextProps } from 'react-native';

import { AppText } from './kit';
import { type } from '@/constants/theme';
import { easeOutCubic, textAt } from '@/lib/countUp';

/**
 * Zählt alle Zahlen in einem Text von 0 hoch (ca. 1 s, ease-out).
 * Selten gesehen (beim Öffnen einer Detailseite), deshalb darf es auffallen.
 * Bei reduzierter Bewegung steht sofort der Endwert da.
 */
export function CountUpText({
  text,
  delay = 0,
  duration = 1000,
  variant = 'data',
  active = true,
  ...rest
}: TextProps & {
  text: string;
  delay?: number;
  duration?: number;
  variant?: keyof typeof type;
  /** Erst hochzählen, wenn true (z. B. sobald sichtbar) */
  active?: boolean;
}) {
  const [t, setT] = useState(0);

  useEffect(() => {
    let raf = 0;
    let cancelled = false;
    setT(0);
    if (!active) return;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) return setT(1);
        const start = Date.now() + delay;
        const tick = () => {
          const p = Math.min(1, Math.max(0, (Date.now() - start) / duration));
          setT(easeOutCubic(p));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [text, delay, duration, active]);

  return (
    <AppText variant={variant} accessibilityLabel={text} {...rest}>
      {textAt(text, t)}
    </AppText>
  );
}
