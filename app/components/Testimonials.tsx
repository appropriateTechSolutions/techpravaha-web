import type { Testimonial } from '../content/testimonials';
import { Section } from './ui/Section';

/** The fields the section renders; every Testimonial satisfies it. */
export type TestimonialItem = Pick<Testimonial, 'quote' | 'name' | 'role' | 'company' | 'country'>;

/** Real client words only. Renders nothing until there are at least two. */
export function Testimonials({ items }: { items: TestimonialItem[] }) {
  if (items.length < 2) return null;
  return (
    <Section eyebrow="Clients" title="In their words.">
      <div className="grid gap-6 md:grid-cols-2">
        {items.map((t) => {
          const meta = [t.role, t.company, t.country].filter(Boolean).join(' · ');
          return (
            <figure key={`${t.name}-${t.quote.slice(0, 24)}`} className="card flex flex-col p-7 md:p-8">
              <blockquote className="text-[19px] leading-relaxed text-ink">“{t.quote}”</blockquote>
              <figcaption className="mt-auto pt-8">
                <span className="block font-medium text-ink">{t.name}</span>
                {meta && <span className="label-mono mt-1 block">{meta}</span>}
              </figcaption>
            </figure>
          );
        })}
      </div>
    </Section>
  );
}
