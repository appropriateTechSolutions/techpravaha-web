import type { Route } from './+types/catchall';
import { pageMeta } from '../lib/site';
import { NotFound } from '../components/NotFound';

// Any unmatched URL renders the 404 page. `/404` is prerendered through this route too
// (it is in STATIC_PATHS), and postbuild copies it to 404.html. Because 404.html is baked
// from this route, an unknown URL served that file hydrates against the same route and
// does not throw a hydration mismatch. Residual case: an unknown slug under a param route
// (e.g. /services/nope) still matches that route on the client and mismatches; accepted.
export function meta(): Route.MetaDescriptors {
  return pageMeta({
    title: 'Page not found',
    description: 'That page did not ship. Try the links below.',
    path: '/404',
    noindex: true,
  });
}

export default NotFound;
