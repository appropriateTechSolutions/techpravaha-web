import type { Service } from './catalogue';
import { ATS_URL, CONTACT_EMAIL, SITE_NAME, SITE_URL, siteUrl } from './site';

const CONTEXT = 'https://schema.org';
const FOUNDER = 'Yogesh Laddha';

const orgRef = () => ({ '@type': 'Organization', name: SITE_NAME, url: SITE_URL });

export function organizationSchema(): object {
  return {
    '@context': CONTEXT,
    '@type': 'ProfessionalService',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/favicons/icon-512.png`,
    description:
      'A design and build studio for things you launch: websites, apps, AI front doors and WhatsApp automation, delivered in weeks at a price you can see.',
    founder: { '@type': 'Person', name: FOUNDER },
    areaServed: 'IN',
    parentOrganization: { '@type': 'Organization', name: 'Appropriate Tech Solutions', url: ATS_URL },
    email: CONTACT_EMAIL,
  };
}

export function serviceSchema(service: Service): object {
  const url = siteUrl(service.route);
  return {
    '@context': CONTEXT,
    '@type': 'Service',
    name: service.name,
    description: service.short,
    provider: orgRef(),
    areaServed: 'IN',
    url,
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: service.name,
      itemListElement: service.tiers.map((tier) => ({
        '@type': 'Offer',
        name: tier.label,
        description: tier.tagline,
        ...(tier.price !== null
          ? { price: tier.price, priceCurrency: 'INR', availability: 'https://schema.org/InStock' }
          : {
              priceSpecification: {
                '@type': 'PriceSpecification',
                minPrice: tier.from,
                priceCurrency: 'INR',
              },
            }),
        url: siteUrl(`${service.route}#${tier.id}`),
      })),
    },
  };
}

export function faqSchema(items: { q: string; a: string }[]): object {
  return {
    '@context': CONTEXT,
    '@type': 'FAQPage',
    mainEntity: items.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

export function breadcrumbSchema(crumbs: { name: string; path: string }[]): object {
  return {
    '@context': CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: siteUrl(c.path),
    })),
  };
}

export function articleSchema(post: { title: string; date: string; summary: string; slug: string }): object {
  return {
    '@context': CONTEXT,
    '@type': 'Article',
    headline: post.title,
    datePublished: post.date,
    description: post.summary,
    url: siteUrl(`/journal/${post.slug}`),
    author: { '@type': 'Person', name: FOUNDER },
    publisher: orgRef(),
  };
}
