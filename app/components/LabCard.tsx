import { ArrowUpRight } from '@phosphor-icons/react';
import type { LabItem } from '../content/lab';
import { track } from '../lib/analytics';

const KIND: Record<LabItem['kind'], string> = {
  play: 'Play in browser',
  extension: 'Chrome extension',
  pwa: 'Web app',
};

const CARD =
  'card flex h-full flex-col p-6 transition-[transform,border-color] duration-150 ease-out';

function Body({ item, linked }: { item: LabItem; linked: boolean }) {
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <span className="label-mono">
          {KIND[item.kind]}
          {!linked && ' · source on request'}
        </span>
        {linked && (
          <ArrowUpRight
            size={18}
            weight="bold"
            aria-hidden="true"
            className="shrink-0 text-muted transition-[color,transform] duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ink motion-reduce:transform-none"
          />
        )}
      </div>
      <h3 className="mt-5 font-display text-[1.375rem] leading-tight font-semibold tracking-[-0.02em] text-ink">
        {item.name}
      </h3>
      <p className="mt-2 text-[15px] text-ink-2">{item.blurb}</p>
      {item.tags.length > 0 && (
        <p className="label-mono mt-auto pt-6 text-muted-2">{item.tags.join(' · ')}</p>
      )}
    </>
  );
}

/** A Lab experiment. Linked cards open in a new tab; `#` hrefs render unlinked. */
export function LabCard({ item }: { item: LabItem }) {
  if (item.href === '#') {
    return (
      <article className={CARD}>
        <Body item={item} linked={false} />
      </article>
    );
  }
  return (
    <a
      href={item.href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => item.kind === 'play' && track('lab_play', { slug: item.slug })}
      className={`${CARD} group hover:-translate-y-0.5 hover:border-line-strong motion-reduce:hover:translate-y-0`}
    >
      <Body item={item} linked />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
