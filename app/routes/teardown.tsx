import type { Route } from './+types/teardown';
import { pageMeta } from '../lib/site';
import { TEARDOWN_POINTS } from '../content/teardown';
import { Eyebrow } from '../components/ui/Eyebrow';
import { Section } from '../components/ui/Section';
import { ClosingCta } from '../components/ClosingCta';
import { TeardownForm } from '../components/TeardownForm';

export function meta(): Route.MetaDescriptors {
  return pageMeta({
    title: 'Free 10-point site teardown',
    description:
      'Send us your link. Tech Pravaha, a studio for Indian founders, sends a free, plain 10-point teardown of your current site within two working days.',
    path: '/teardown',
  });
}

export default function Teardown() {
  return (
    <>
      <section className="mx-auto max-w-[1280px] px-6 pt-32 pb-16 md:pt-40 md:pb-20">
        <div className="max-w-[880px]">
          <Eyebrow dot className="mb-8">
            Free teardown
          </Eyebrow>
          <h1 className="display-2">A 10-point teardown of your current site.</h1>
          <p className="mt-8 max-w-[60ch] text-[19px] leading-relaxed text-ink-2">
            Send us the link. Within two working days you get a plain list of what helps, what hurts, and what
            to fix first. No pitch unless you ask for one.
          </p>
        </div>

        <div className="mt-16 grid gap-16 border-t border-line pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)] lg:gap-20">
          <div>
            <h2 className="display-3 mb-8">What we check.</h2>
            <ol aria-label="The ten checks" className="grid divide-y divide-line border-y border-line">
              {TEARDOWN_POINTS.map((p, i) => (
                <li key={p.title} className="grid grid-cols-[3rem_1fr] gap-4 py-5">
                  <span aria-hidden="true" className="label-mono is-accent pt-1">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="font-medium text-ink">
                      <span className="sr-only">{i + 1}. </span>
                      {p.title}
                    </h3>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{p.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <h2 className="display-3 mb-8">Get yours.</h2>
            <TeardownForm />
          </div>
        </div>
      </section>

      <ClosingCta
        eyebrow="Rather talk"
        title="Prefer to talk it through?"
        intro="One call to agree the scope, the price and a start date."
        message="Hi Tech Pravaha, I'd like to talk about my site."
        page="/teardown"
      />
    </>
  );
}
