import { Fragment } from 'react';
import { Link } from 'react-router';
import { breadcrumbSchema } from '../lib/schema';
import { JsonLd } from './ui/JsonLd';

export interface Crumb {
  name: string;
  path: string;
}

/**
 * Visible trail (parent / current page) plus BreadcrumbList JSON-LD with Home in
 * front. JSON-LD item URLs use the trailing-slash form via `breadcrumbSchema`.
 * `items` runs from the section index to the current page.
 */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  const current = items[items.length - 1];
  const parents = items.slice(0, -1);
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: 'Home', path: '/' }, ...items])} />
      <nav aria-label="Breadcrumb" className="mb-10">
        <ol className="label-mono flex flex-wrap items-center gap-2">
          {parents.map((c) => (
            <Fragment key={c.path}>
              <li>
                <Link
                  to={c.path}
                  className="inline-flex min-h-6 items-center underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink hover:decoration-ink"
                >
                  {c.name}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
            </Fragment>
          ))}
          <li aria-current="page" className="text-ink-2">
            {current.name}
          </li>
        </ol>
      </nav>
    </>
  );
}
