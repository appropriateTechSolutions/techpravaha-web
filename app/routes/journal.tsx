import { Link } from 'react-router';
import type { Route } from './+types/journal';
import { pageMeta } from '../lib/site';
import { formatPostDate, POSTS } from '../lib/journal';
import { Pill } from '../components/ui/Pill';
import { Section } from '../components/ui/Section';

export function meta(): Route.MetaDescriptors {
  return pageMeta({
    title: 'Journal',
    description: 'Notes from the Tech Pravaha studio: how we price, build and ship websites, apps and automation.',
    path: '/journal',
    image: '/og/journal.png',
  });
}

export default function JournalIndex() {
  return (
    <>
      <section className="mx-auto max-w-[1280px] px-6 pt-32 pb-8 md:pt-40 md:pb-12">
        <h1 className="display-1 text-[clamp(2.75rem,6.4vw,6rem)]">Journal</h1>
        <p className="mt-8 max-w-[60ch] text-[19px] leading-relaxed text-ink-2">
          Notes from the studio: how we price, build and ship.
        </p>
      </section>

      <Section className="!pt-8 md:!pt-12">
        <ul className="grid max-w-[880px] divide-y divide-line border-y border-line">
          {POSTS.map((post) => (
            <li key={post.slug} className="py-10">
              <article>
                <p className="label-mono mb-4 flex flex-wrap gap-x-3">
                  <time dateTime={post.date}>{formatPostDate(post.date)}</time>
                  <span aria-hidden="true">·</span>
                  <span>{post.readingMinutes} min read</span>
                </p>
                <h2 className="display-3">
                  <Link
                    to={`/journal/${post.slug}`}
                    className="underline decoration-transparent underline-offset-4 transition-colors hover:decoration-ink"
                  >
                    {post.title}
                  </Link>
                </h2>
                <p className="mt-4 max-w-[65ch] text-[17px] leading-relaxed text-ink-2">{post.summary}</p>
                {post.tags.length > 0 && (
                  <ul className="mt-5 flex flex-wrap gap-2" aria-label="Tags">
                    {post.tags.map((tag) => (
                      <li key={tag}>
                        <Pill>{tag}</Pill>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
