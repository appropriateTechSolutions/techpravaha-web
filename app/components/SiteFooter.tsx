import { Link } from 'react-router';
import { Lockup } from './Logo';

// Static until Task 3 replaces it with catalogue data.
const SERVICES = [
  { id: 'websites', name: 'Websites & landing pages' },
  { id: 'apps', name: 'Apps' },
  { id: 'ai', name: 'AI assistants & call centre' },
  { id: 'whatsapp', name: 'WhatsApp marketing & automation' },
  { id: 'content', name: 'Content automation' },
  { id: 'design', name: 'UI/UX design' },
];

const STUDIO = [
  { to: '/work', label: 'Work' },
  { to: '/lab', label: 'Lab' },
  { to: '/journal', label: 'Journal' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

const LEGAL = [
  { to: '/terms', label: 'Terms' },
  { to: '/privacy', label: 'Privacy' },
  { to: '/refunds', label: 'Refunds' },
];

const linkClass = 'inline-flex min-h-11 items-center text-ink-2 transition-colors hover:text-ink sm:min-h-9';

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-ground">
      <div className="mx-auto max-w-[1280px] px-6 py-16">
        <Link to="/" aria-label="Tech Pravaha, home" className="inline-flex min-h-11 items-center">
          <Lockup />
        </Link>

        <div className="mt-10 grid grid-cols-1 gap-10 sm:grid-cols-3">
          <nav aria-label="Services">
            <h2 className="label-mono mb-4">Services</h2>
            <ul className="text-sm">
              {SERVICES.map((s) => (
                <li key={s.id}>
                  <Link className={linkClass} to={`/services/${s.id}`}>
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Studio">
            <h2 className="label-mono mb-4">Studio</h2>
            <ul className="text-sm">
              {STUDIO.map((l) => (
                <li key={l.to}>
                  <Link className={linkClass} to={l.to}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Legal">
            <h2 className="label-mono mb-4">Legal</h2>
            <ul className="text-sm">
              {LEGAL.map((l) => (
                <li key={l.to}>
                  <Link className={linkClass} to={l.to}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-line pt-6 text-[13px] text-muted-2 sm:flex-row sm:justify-between">
          <p>© 2024–2026 Tech Pravaha · Beautiful things, shipped.</p>
          <p>
            Need a system behind it?{' '}
            <a
              href="https://appropriatetechsolutions.com"
              target="_blank"
              rel="noopener"
              className="text-ink-2 transition-colors hover:text-ink"
            >
              <span aria-hidden="true">→ </span>Appropriate Tech Solutions
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
