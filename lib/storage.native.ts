// iOS und Android: eine kleine JSON-Datei pro Schlüssel im Dokumente-Ordner der App.
import * as FileSystem from 'expo-file-system';

const path = (key: string) => `${FileSystem.documentDirectory}${key}.json`;

export async function readText(key: string): Promise<string | null> {
  try {
    const p = path(key);
    const info = await FileSystem.getInfoAsync(p);
    return info.exists ? await FileSystem.readAsStringAsync(p) : null;
  } catch {
    return null;
  }
}

export async function writeText(key: string, value: string): Promise<void> {
  try {
    await FileSystem.writeAsStringAsync(path(key), value);
  } catch {
    // Speichern fehlgeschlagen: das Design bleibt für diese Sitzung erhalten
  }
}
