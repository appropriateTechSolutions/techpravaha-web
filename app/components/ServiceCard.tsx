import { Link } from 'react-router';
import { ArrowUpRight } from '@phosphor-icons/react';
import { formatINR, tierFromPrice, type Service } from '../lib/catalogue';

/** Lowest entry price across a service's tiers, or null if none is priced. */
function fromPrice(service: Service): number | null {
  const prices = service.tiers.map(tierFromPrice).filter((p): p is number => p !== null);
  return prices.length ? Math.min(...prices) : null;
}

export function ServiceCard({ service }: { service: Service }) {
  const from = fromPrice(service);
  return (
    <Link
      to={service.route}
      className="card group flex h-full flex-col p-7 transition-[transform,border-color] duration-150 ease-out hover:-translate-y-0.5 hover:border-line-strong motion-reduce:hover:translate-y-0"
    >
      <div className="flex items-start justify-between gap-6">
        <h3 className="display-3">{service.name}</h3>
        <ArrowUpRight
          size={20}
          weight="bold"
          aria-hidden="true"
          className="mt-1 shrink-0 text-muted transition-[color,transform] duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ink motion-reduce:transform-none"
        />
      </div>
      <p className="mt-3 text-ink-2">{service.short}</p>
      {from !== null && <p className="label-mono mt-auto pt-8">From {formatINR(from)}</p>}
    </Link>
  );
}
