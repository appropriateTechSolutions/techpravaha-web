import { Link } from 'react-router';
import { linkify } from '../../lib/chat';
import { LINK_CLASS } from './HumanLink';

/** Model text as plain text with line breaks; only vetted paths and hosts become links. */
export function AssistantText({ text, onNavigate }: { text: string; onNavigate: () => void }) {
  return (
    <>
      {linkify(text).map((part, i) =>
        typeof part === 'string' ? (
          part
        ) : part.external ? (
          <a key={i} href={part.href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
            {part.text}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : (
          <Link key={i} to={part.href} onClick={onNavigate} className={LINK_CLASS}>
            {part.text}
          </Link>
        ),
      )}
    </>
  );
}
