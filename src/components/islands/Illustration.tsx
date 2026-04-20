import type { IllustrationSpec } from '@lib/types';

interface Props {
  recipe: IllustrationSpec;
  className?: string;
  style?: React.CSSProperties;
}

export default function Illustration({ recipe, className = '', style = {} }: Props) {
  if (!recipe) return null;

  // Static photo — wrap in SVG so callers get identical interface + CSS hooks
  if (recipe.kind === 'photo') {
    return (
      <svg
        className={className}
        style={style}
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
      >
        <image
          href={recipe.src}
          x="0" y="0"
          width="1200" height="800"
          preserveAspectRatio="xMidYMid slice"
        />
      </svg>
    );
  }

  const { kind, palette = ['#E8E0D0', '#2F4858', '#15120E'], seed = 1 } = recipe;
  const [bg, mid, ink] = palette;

  // Tiny seeded PRNG
  const rand = (() => {
    let s = seed * 9301 + 49297;
    return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  })();

  const diag = (count: number, opacity = 0.18) => {
    const lines = [];
    for (let i = 0; i < count; i++) {
      const x = (i / count) * 1400 - 200;
      lines.push(
        <line key={i} x1={x} y1={-100} x2={x + 600} y2={900}
          stroke={ink} strokeWidth={1} opacity={opacity} />
      );
    }
    return lines;
  };

  let content: React.ReactNode;

  switch (kind) {
    case 'grid':
      content = (<>
        <rect width="1200" height="800" fill={bg} />
        {Array.from({ length: 6 }).map((_, r) =>
          Array.from({ length: 9 }).map((_, c) => {
            const on = ((r * 3 + c * 7 + seed) % 5) < 2;
            return (
              <rect key={`${r}-${c}`} x={60 + c * 130} y={60 + r * 120}
                width={110} height={100}
                fill={on ? mid : 'none'} stroke={ink} strokeWidth={1}
                opacity={on ? 0.9 : 0.35} />
            );
          })
        )}
      </>);
      break;

    case 'bars':
      content = (<>
        <rect width="1200" height="800" fill={bg} />
        {Array.from({ length: 14 }).map((_, i) => {
          const h = 120 + ((i * 53 + seed * 31) % 420);
          return (
            <rect key={i} x={80 + i * 78} y={800 - h - 60}
              width={58} height={h}
              fill={i % 4 === 0 ? ink : mid}
              opacity={i % 4 === 0 ? 0.95 : 0.75} />
          );
        })}
        <line x1={40} y1={740} x2={1160} y2={740} stroke={ink} strokeWidth={1.5} />
      </>);
      break;

    case 'stack':
      content = (<>
        <rect width="1200" height="800" fill={bg} />
        {Array.from({ length: 7 }).map((_, i) => (
          <rect key={i} x={120 + i * 12} y={120 + i * 70}
            width={900 - i * 24} height={52}
            fill={i % 2 ? mid : ink} opacity={0.82} />
        ))}
      </>);
      break;

    case 'rays':
      content = (<>
        <rect width="1200" height="800" fill={bg} />
        {Array.from({ length: 18 }).map((_, i) => {
          const a = (i / 18) * Math.PI - Math.PI / 2;
          const x2 = 600 + Math.cos(a) * 1400;
          const y2 = 800 + Math.sin(a) * 1400;
          return (
            <line key={i} x1={600} y1={800} x2={x2} y2={y2}
              stroke={i % 2 ? mid : ink}
              strokeWidth={i % 2 ? 1 : 2} opacity={0.8} />
          );
        })}
        <rect x={0} y={720} width={1200} height={80} fill={ink} />
      </>);
      break;

    case 'eye': {
      const clipId = `ec${seed}`;
      const cx = 600, cy = 400;
      const ew = 360, eh = 195;
      const eyePath = `M ${cx - ew},${cy} C ${cx - ew + 80},${cy - eh} ${cx + ew - 80},${cy - eh} ${cx + ew},${cy} C ${cx + ew - 80},${cy + eh} ${cx - ew + 80},${cy + eh} ${cx - ew},${cy} Z`;
      const spokes = 20;
      content = (<>
        <rect width="1200" height="800" fill={bg} />
        <defs>
          <clipPath id={clipId}><path d={eyePath} /></clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          {Array.from({ length: spokes }).map((_, i) => {
            const a = (i / spokes) * Math.PI * 2;
            const sw = (i % 5 === 0) ? 3 : (i % 2 === 0) ? 1.8 : 1;
            return (
              <line key={i} x1={cx} y1={cy}
                x2={cx + Math.cos(a) * 430} y2={cy + Math.sin(a) * 430}
                stroke={ink} strokeWidth={sw} opacity={0.8} />
            );
          })}
        </g>
        <path d={eyePath} fill="none" stroke={ink} strokeWidth={3} />
        <circle cx={cx} cy={cy} r={78} fill={bg} stroke={mid} strokeWidth={2.5} />
        <circle cx={cx} cy={cy} r={28} fill={ink} />
        <rect x={0} y={666} width={1200} height={4} fill={ink} opacity={0.18} />
      </>);
      break;
    }

    default:
      content = <rect width="1200" height="800" fill={bg} />;
  }

  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      {content}
    </svg>
  );
}
