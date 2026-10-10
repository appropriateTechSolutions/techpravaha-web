import { index, route, type RouteConfig } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('services', 'routes/services.tsx'),
  route('services/:slug', 'routes/services.$slug.tsx'),
  route('pricing', 'routes/pricing.tsx'),
  route('work', 'routes/work.tsx'),
  route('work/:slug', 'routes/work.$slug.tsx'),
  route('lab', 'routes/lab.tsx'),
  route('journal', 'routes/journal.tsx'),
  route('journal/:slug', 'routes/journal.$slug.tsx'),
  route('about', 'routes/about.tsx'),
  route('contact', 'routes/contact.tsx'),
  route('teardown', 'routes/teardown.tsx'),
  route('terms', 'routes/terms.tsx'),
  route('privacy', 'routes/privacy.tsx'),
  route('refunds', 'routes/refunds.tsx'),
  route('checkout/:tierId', 'routes/checkout.$tierId.tsx'),
  route('thanks', 'routes/thanks.tsx'),
  route('styleguide', 'routes/styleguide.tsx'),
  route('*', 'routes/catchall.tsx'),
] satisfies RouteConfig;
