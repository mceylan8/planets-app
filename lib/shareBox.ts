/**
 * Web: Bild des Schaukastens teilen. Die Papierschilder liegen als HTML über
 * dem Canvas, deshalb werden sie hier nachgezeichnet, mit derselben Handschrift.
 * Teilt über das System-Menü (navigator.share), sonst Download als PNG.
 * iOS und Android nehmen lib/shareBox.native.ts.
 */
export type ShareLabel = { name: string; x: number; y: number; k: number; tilt: number };
export type ShareResult = 'shared' | 'saved' | 'cancelled' | 'failed';

const FILE = 'mein-schaukasten.png';
const TITLE = 'Mein Schaukasten';

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawLabel(ctx: CanvasRenderingContext2D, l: ShareLabel, scale: number) {
  ctx.save();
  ctx.translate(l.x * scale, l.y * scale);
  ctx.scale(l.k * scale, l.k * scale);
  // Knoten und Schnur, wie im Schaukasten (styles.knot / styles.tagString)
  ctx.fillStyle = '#EDE6D6';
  ctx.beginPath();
  ctx.arc(0, 0, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.rotate((l.tilt * 0.6 * Math.PI) / 180);
  ctx.fillRect(-0.5, 0, 1, 14);
  ctx.restore();
  // Papierschild
  ctx.font = '19px Caveat_700Bold, Caveat, cursive';
  const w = ctx.measureText(l.name).width + 16;
  const h = 24;
  ctx.translate(0, 12 + h / 2);
  ctx.rotate((l.tilt * Math.PI) / 180);
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 2;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = '#F4EFE4';
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#2A2418';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(l.name, 0, 1);
  ctx.restore();
}

async function compose(image: string, labels: ShareLabel[], width: number) {
  const img = await loadImage(image);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  const scale = img.width / Math.max(width, 1);
  await document.fonts?.load?.('19px Caveat_700Bold').catch(() => {});
  labels.forEach((l) => drawLabel(ctx, l, scale));
  // Kleine Signatur unten rechts
  ctx.font = `${Math.round(30 * scale)}px Caveat_700Bold, Caveat, cursive`;
  ctx.fillStyle = 'rgba(237, 230, 214, 0.85)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText(TITLE, img.width - 14 * scale, img.height - 10 * scale);
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
}

export async function shareBoxImage(
  image: string,
  labels: ShareLabel[],
  size: { width: number; height: number }
): Promise<ShareResult> {
  try {
    const blob = await compose(image, labels, size.width);
    if (!blob) return 'failed';
    const file = new File([blob], FILE, { type: 'image/png' });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: TITLE });
        return 'shared';
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return 'cancelled';
        // Teilen nicht erlaubt (z. B. ohne Nutzergeste): auf Download ausweichen
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = FILE;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return 'saved';
  } catch {
    return 'failed';
  }
}
