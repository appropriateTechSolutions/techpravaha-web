import { data, Link, useParams } from 'react-router';
import type { Route } from './+types/journal.$slug';
import { pageMeta } from '../lib/site';
import { articleSchema } from '../lib/schema';
import { formatPostDate, getPost, POSTS } from '../lib/journal';
import { JsonLd } from '../components/ui/JsonLd';
import { Breadcrumb } from '../components/Breadcrumb';
import { ClosingCta } from '../components/ClosingCta';

export function meta({ params }: Route.MetaArgs): Route.MetaDescriptors {
  const post = getPost(params.slug);
  if (!post) return [{ title: 'Page not found | Tech Pravaha' }];
  return pageMeta({
    title: post.title,
    description: post.summary,
    path: `/journal/${post.slug}`,
    image: '/og/journal.png',
  });
}

export default function JournalPost() {
  const { slug } = useParams();
  const post = getPost(slug);
  if (!post) throw data(null, { status: 404 });

  // POSTS is newest first: the previous post is the older one, the next is the newer one.
  const index = POSTS.indexOf(post);
  const prev = POSTS[index + 1];
  const next = index > 0 ? POSTS[index - 1] : undefined;
  const path = `/journal/${post.slug}`;

  return (
    <>
      <JsonLd data={articleSchema(post)} />

      <section className="mx-auto max-w-[1280px] px-6 pt-32 pb-12 md:pt-40 md:pb-16">
        <Breadcrumb
          items={[
            { name: 'Journal', path: '/journal' },
            { name: post.title, path },
          ]}
        />

        <div className="max-w-[1040px]">
          <h1 className="display-2">{post.title}</h1>
          <p className="label-mono mt-8 flex flex-wrap gap-x-3">
            <time dateTime={post.date}>{formatPostDate(post.date)}</time>
            <span aria-hidden="true">·</span>
            <span>{post.readingMinutes} min read</span>
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1280px] px-6 pb-8">
        {/* Safe to inject: the HTML is rendered at build time from our own markdown in
            app/content/journal, never from user input. */}
        <article className="prose-tp" dangerouslySetInnerHTML={{ __html: post.html }} />
      </div>

      {(prev || next) && (
        <nav aria-label="More from the journal" className="mx-auto max-w-[1280px] px-6 pt-12">
          <ul className="grid max-w-[880px] gap-6 border-t border-line pt-10 sm:grid-cols-2">
            {prev && (
              <li>
                <p className="label-mono mb-2">Previous</p>
                <Link
                  to={`/journal/${prev.slug}`}
                  className="text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink"
                >
                  {prev.title}
                </Link>
              </li>
            )}
            {next && (
              <li className="sm:col-start-2 sm:text-right">
                <p className="label-mono mb-2">Next</p>
                <Link
                  to={`/journal/${next.slug}`}
                  className="text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink"
                >
                  {next.title}
                </Link>
              </li>
            )}
          </ul>
        </nav>
      )}

      <ClosingCta
        title="Want to talk it through?"
        message={`Hi Tech Pravaha, I read "${post.title}" and want to talk about a project.`}
        page={path}
      />
    </>
  );
}
