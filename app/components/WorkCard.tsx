import { Link } from 'react-router';
import { ArrowUpRight } from '@phosphor-icons/react';
import { STATUS_LABEL, type WorkItem } from '../content/work';
import { getService } from '../lib/catalogue';

/** The fields the card renders; every WorkItem satisfies it. */
export type WorkCardItem = Pick<
  WorkItem,
  'slug' | 'name' | 'oneLiner' | 'services' | 'images' | 'client' | 'status'
>;

export function WorkCard({ item }: { item: WorkCardItem }) {
  const cover = item.images[0];
  return (
    <Link
      to={`/work/${item.slug}`}
      className="group block transition-transform duration-150 ease-out hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
    >
      <div className="card aspect-[16/10] overflow-hidden transition-colors duration-150 group-hover:border-line-strong">
        {cover ? (
          <img
            src={cover}
            alt={`${item.name} screenshot`}
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <span className="label-mono text-muted-2">Screenshot pending</span>
          </div>
        )}
      </div>
      <div className="mt-5 flex items-start justify-between gap-6">
        <div>
          <p className="label-mono mb-2">
            {item.client ? `${item.client} · ` : ''}
            {STATUS_LABEL[item.status]}
          </p>
          <h3 className="display-3">{item.name}</h3>
          <p className="mt-2 text-ink-2">{item.oneLiner}</p>
        </div>
        <ArrowUpRight
          size={20}
          weight="bold"
          aria-hidden="true"
          className="mt-1.5 shrink-0 text-muted transition-[color,transform] duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ink motion-reduce:transform-none"
        />
      </div>
      {item.services.length > 0 && (
        <p className="label-mono mt-4 text-muted-2">{item.services.map((id) => getService(id)?.name ?? id).join(' · ')}</p>
      )}
    </Link>
  );
}
