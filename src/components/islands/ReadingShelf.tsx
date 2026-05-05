import { useState } from 'react';
import { getAmazonUrl, getCoverUrl } from '@lib/reading-shelf';

export interface ShelfBook {
  title: string;
  author: string;
  isbn: string;
  note?: string;
}

interface Props {
  books: ShelfBook[];
}

export default function ReadingShelf({ books }: Props) {
  return (
    <section className="do-shelf" aria-label="On the shelf">
      <header className="do-shelf-header">
        <p className="do-eyebrow do-shelf-eyebrow">The shelf</p>
      </header>
      <ol className="do-shelf-list" role="list">
        {books.map((book) => (
          <li key={book.isbn} className="do-shelf-item">
            <BookCard book={book} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function BookCard({ book }: { book: ShelfBook }) {
  // Open Library returns a 1x1 transparent pixel for missing covers. The
  // browser still fires `load` for those, so we measure naturalWidth and
  // treat anything narrower than 50px as the missing-cover sentinel.
  const [coverState, setCoverState] = useState<'loading' | 'ok' | 'missing'>('loading');

  return (
    <a
      className="do-shelf-card"
      href={getAmazonUrl(book.isbn)}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="do-shelf-cover">
        {coverState !== 'missing' && (
          <img
            src={getCoverUrl(book.isbn)}
            alt=""
            className="do-shelf-cover-img"
            loading="lazy"
            onLoad={(e) => {
              const img = e.currentTarget;
              setCoverState(img.naturalWidth < 50 ? 'missing' : 'ok');
            }}
            onError={() => setCoverState('missing')}
          />
        )}
        {coverState === 'missing' && (
          <div className="do-shelf-cover-fallback" aria-hidden="true">
            <span className="do-shelf-cover-fallback-title">{book.title}</span>
            <span className="do-shelf-cover-fallback-author">{book.author}</span>
          </div>
        )}
      </div>
      <div className="do-shelf-meta">
        <h3 className="do-shelf-title">{book.title}</h3>
        <p className="do-shelf-author">{book.author}</p>
        {book.note && <p className="do-shelf-note">{book.note}</p>}
      </div>
    </a>
  );
}
