/**
 * iOS und Android: PNG aus dem GL-Snapshot über den System-Teilen-Dialog.
 * Die Papierschilder sind native Views über dem GLView und fehlen im Bild;
 * die Signatur zeichnet nur die Web-Version.
 */
import * as Sharing from 'expo-sharing';

export type ShareLabel = { name: string; x: number; y: number; k: number; tilt: number };
export type ShareResult = 'shared' | 'saved' | 'cancelled' | 'failed';

export async function shareBoxImage(
  image: string,
  _labels: ShareLabel[],
  _size: { width: number; height: number }
): Promise<ShareResult> {
  try {
    if (!(await Sharing.isAvailableAsync())) return 'failed';
    await Sharing.shareAsync(image, {
      mimeType: 'image/png',
      UTI: 'public.png',
      dialogTitle: 'Mein Schaukasten',
    });
    return 'shared';
  } catch {
    return 'failed';
  }
}
