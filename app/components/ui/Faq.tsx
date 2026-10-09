import { Plus } from '@phosphor-icons/react';
import { faqSchema } from '../../lib/schema';
import { JsonLd } from './JsonLd';

interface FaqProps {
  items: { q: string; a: string }[];
}

/** Native disclosure list plus matching FAQPage JSON-LD. */
export function Faq({ items }: FaqProps) {
  return (
    <div>
      <div className="border-t border-line">
        {items.map((item) => (
          <details key={item.q} className="group border-b border-line">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-6 py-5 text-[17px] font-medium text-ink transition-colors hover:text-ink-2 [&::-webkit-details-marker]:hidden">
              {item.q}
              <Plus
                size={16}
                weight="bold"
                aria-hidden="true"
                className="shrink-0 text-muted transition-transform duration-200 group-open:rotate-45"
              />
            </summary>
            <p className="max-w-[68ch] pr-10 pb-6 text-ink-2">{item.a}</p>
          </details>
        ))}
      </div>
      <JsonLd data={faqSchema(items)} />
    </div>
  );
}
