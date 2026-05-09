/**
 * Spectrum — visual list for tapering enforcement / intensity blocks.
 *
 * Items render as a vertical list with a graphite bar to the left of each row;
 * the bar tapers from fat (top) to thin (bottom), reinforcing the spectrum
 * metaphor. Used by toolbox articles where the body argues across a range of
 * options rather than a binary choice.
 */

export interface SpectrumItem {
  label: string;
  body:  string;
}

interface Props {
  items: SpectrumItem[];
}

const BAR_WIDTHS_PX = [8, 6, 4, 2.5, 1.5];

export default function Spectrum({ items }: Props) {
  return (
    <ol className="do-spectrum" role="list">
      {items.map((item, i) => {
        const w = BAR_WIDTHS_PX[i] ?? BAR_WIDTHS_PX[BAR_WIDTHS_PX.length - 1];
        return (
          <li key={i} className="do-spectrum-item">
            <span
              className="do-spectrum-bar"
              style={{ width: `${w}px` }}
              aria-hidden="true"
            />
            <p className="do-spectrum-text">
              <strong className="do-spectrum-label">{item.label}</strong>{' '}
              <span className="do-spectrum-body">{item.body}</span>
            </p>
          </li>
        );
      })}
    </ol>
  );
}
