// React version of SiteLogo — used inside React islands.
// Astro templates use SiteLogo.astro. Both pull paths from @lib/logo.

import { LOGO_PATHS, LOGO_VIEW_BOX, LOGO_DEFAULT_FILL } from '@lib/logo';

interface Props {
  width?: number;
  height?: number;
  fill?: string;
  className?: string;
}

export default function SiteLogoSvg({
  width = 34,
  height = 38,
  fill = LOGO_DEFAULT_FILL,
  className = '',
}: Props) {
  return (
    <svg
      width={width}
      height={height}
      viewBox={LOGO_VIEW_BOX}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <g fill={fill}>
        {LOGO_PATHS.map((d, i) => <path key={i} d={d} />)}
      </g>
    </svg>
  );
}
