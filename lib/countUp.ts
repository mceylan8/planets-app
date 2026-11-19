/** Zahlen im deutschen Format: 1.391.400 oder 4,6 oder 23 */
const NUMBER = /\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?/g;

type Part = { value: number; decimals: number; grouped: boolean };

export function parseNumbers(text: string): Part[] {
  return (text.match(NUMBER) ?? []).map((m) => {
    const [int, dec = ''] = m.split(',');
    return {
      value: Number(int.replace(/\./g, '') + (dec ? `.${dec}` : '')),
      decimals: dec.length,
      grouped: m.includes('.'),
    };
  });
}

/**
 * Der Text, wenn alle Zahlen darin bei Anteil `t` (0 bis 1) stehen.
 * Format, Nachkommastellen und Tausenderpunkte bleiben wie im Original.
 */
export function textAt(text: string, t: number) {
  const parts = parseNumbers(text);
  if (!parts.length) return text;
  let i = 0;
  return text
    .replace(NUMBER, () => {
      const p = parts[i++];
      return new Intl.NumberFormat('de-DE', {
        minimumFractionDigits: p.decimals,
        maximumFractionDigits: p.decimals,
        useGrouping: p.grouped,
      }).format(p.value * t);
    })
    .replace(/−0(?![\d,])/g, '0');
}

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
