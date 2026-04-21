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
 * read, we fall back to the site's neutral cream so the container
 * never flashes a jarring colour.
 */

const FALLBACK = '#F5F0E8';

const CACHE = new Map<string, string>();
const IN_FLIGHT = new Map<string, Promise<string>>();

export function sampleHeroBg(src: string): Promise<string> {
  if (!src) return Promise.resolve(FALLBACK);

  const cached = CACHE.get(src);
  if (cached) return Promise.resolve(cached);

  const existing = IN_FLIGHT.get(src);
  if (existing) return existing;

  const p = new Promise<string>(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';

    const done = (c: string) => {
      CACHE.set(src, c);
      IN_FLIGHT.delete(src);
      resolve(c);
    };

    img.onerror = () => done(FALLBACK);
    img.onload = () => {
      try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (!w || !h) return done(FALLBACK);

        const canvas = document.createElement('canvas');
        canvas.width  = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: false });
        if (!ctx) return done(FALLBACK);
        ctx.drawImage(img, 0, 0);

        const px = (x: number, y: number) => ctx.getImageData(x, y, 1, 1).data;
        const clamp = (v: number, max: number) => Math.max(0, Math.min(max - 1, v));
        const mx = clamp(Math.floor(w / 2), w);
        const my = clamp(Math.floor(h / 2), h);
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
        done(FALLBACK);
      }
    };

    img.src = src;
  });

  IN_FLIGHT.set(src, p);
  return p;
}

export { FALLBACK as HERO_BG_FALLBACK };
