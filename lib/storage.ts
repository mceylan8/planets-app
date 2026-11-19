// Web: localStorage. Kann in privaten Fenstern fehlen oder werfen, dann bleibt alles im Speicher.
// iOS und Android nehmen lib/storage.native.ts.
export async function readText(key: string): Promise<string | null> {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export async function writeText(key: string, value: string): Promise<void> {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // Kein Speicher verfügbar: dann eben nur für diese Sitzung
  }
}
