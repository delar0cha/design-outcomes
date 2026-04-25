// Renders the Design Outcomes mark by referencing the favicon SVG at
// /public/design-outcomes.svg — single source of truth shared with the
// Astro variant (SiteLogo.astro) and the browser favicon.

interface Props {
  width?: number;
  height?: number;
  className?: string;
}

export default function SiteLogoSvg({
  width = 34,
  height = 38,
  className = '',
}: Props) {
  return (
    <img
      src="/design-outcomes.svg"
      alt=""
      width={width}
      height={height}
      className={className}
      aria-hidden="true"
    />
  );
}
