/**
 * Sample the dominant edge colour of a hero image so the container
 * behind it can match, letting a scaled-down image recede into a
 * seamless field with no visible seam.
 *
 * Strategy: load the image with CORS, draw to an offscreen canvas,
 * read eight 1×1 samples (four corners + four edge midpoints), average
 * them, and return as an `rgb(...)` string.
 *
 * Results are cached per source URL for the life of the page. If the
 * image fails to load, taints the canvas, or the browser blocks the
 * read, the promise resolves to null and callers fall back to the
 * frontmatter override or the neutral cream.
 */

const CACHE = new Map<string, string | null>();
const IN_FLIGHT = new Map<string, Promise<string | null>>();

export function sampleHeroBg(src: string): Promise<string | null> {
  if (!src) return Promise.resolve(null);

  if (CACHE.has(src)) return Promise.resolve(CACHE.get(src)!);

  const existing = IN_FLIGHT.get(src);
  if (existing) return existing;

  const p = new Promise<string | null>(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';

    const done = (c: string | null) => {
      CACHE.set(src, c);
      IN_FLIGHT.delete(src);
      resolve(c);
    };

    img.onerror = () => done(null);
    img.onload = () => {
      try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (!w || !h) return done(null);

        const canvas = document.createElement('canvas');
        canvas.width  = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return done(null);
        ctx.drawImage(img, 0, 0);

        const px = (x: number, y: number) => ctx.getImageData(x, y, 1, 1).data;
        const mx = Math.max(0, Math.min(w - 1, Math.floor(w / 2)));
        const my = Math.max(0, Math.min(h - 1, Math.floor(h / 2)));
        const x0 = 2, y0 = 2, x1 = w - 3, y1 = h - 3;
        const pts: Array<[number, number]> = [
          [x0, y0], [x1, y0], [x0, y1], [x1, y1],  // corners
          [mx, y0], [mx, y1], [x0, my], [x1, my],  // edge midpoints
        ];

        let r = 0, g = 0, b = 0;
        for (const [x, y] of pts) {
          const d = px(x, y);
          r += d[0]; g += d[1]; b += d[2];
        }
        const n = pts.length;
        done(`rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})`);
      } catch {
        done(null);
      }
    };

    img.src = src;
  });

  IN_FLIGHT.set(src, p);
  return p;
}

export const HERO_BG_FALLBACK = '#F5F0E8';

/**
 * Resolve a hero background colour with the expected precedence:
 * sampled → frontmatter override → neutral cream. Synchronous — reads
 * from the module-level cache; schedule `sampleHeroBg(src)` first if
 * you need to populate it.
 */
export function resolveHeroBg(
  src: string | undefined,
  override: string | undefined,
): string {
  if (src) {
    const sampled = CACHE.get(src);
    if (sampled) return sampled;
  }
  if (override) return override;
  return HERO_BG_FALLBACK;
}
