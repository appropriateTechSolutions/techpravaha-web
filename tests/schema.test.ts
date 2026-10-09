import { describe, expect, it } from 'vitest';
import { getService } from '../app/lib/catalogue';
import {
  articleSchema,
  breadcrumbSchema,
  faqSchema,
  organizationSchema,
  serviceSchema,
} from '../app/lib/schema';

type Json = Record<string, any>;

describe('organizationSchema', () => {
  const o = organizationSchema() as Json;
  it('describes the studio', () => {
    expect(o['@context']).toBe('https://schema.org');
    expect(o['@type']).toBe('ProfessionalService');
    expect(o.name).toBe('Tech Pravaha');
    expect(o.areaServed).toBe('IN');
    expect(o.founder.name).toBe('Yogesh Laddha');
    expect(o.parentOrganization).toEqual({
      '@type': 'Organization',
      name: 'Appropriate Tech Solutions',
      url: 'https://appropriatetechsolutions.com',
    });
    expect(o.email).toBe('hello@techpravaha.com');
    expect(o.logo).toBe('https://techpravaha.com/favicons/icon-512.png');
  });
  it('has no em-dashes', () => {
    expect(JSON.stringify(o)).not.toContain('—');
  });
});

describe('serviceSchema', () => {
  const service = getService('websites')!;
  const s = serviceSchema(service) as Json;
  const offers: Json[] = s.hasOfferCatalog.itemListElement;

  it('is a Service with provider and url', () => {
    expect(s['@type']).toBe('Service');
    expect(s.name).toBe(service.name);
    expect(s.areaServed).toBe('IN');
    expect(s.url).toBe('https://techpravaha.com/services/websites/');
    expect(s.provider.name).toBe('Tech Pravaha');
    expect(s.hasOfferCatalog['@type']).toBe('OfferCatalog');
  });

  it('has one Offer per tier', () => {
    expect(offers).toHaveLength(service.tiers.length);
    expect(offers.every((o) => o['@type'] === 'Offer')).toBe(true);
  });

  it('prices numeric tiers in INR ex-GST', () => {
    const launch = offers.find((o) => o.name === 'Launch')!;
    expect(launch.price).toBe(service.tiers.find((t) => t.name === 'Launch')!.price);
    expect(launch.priceCurrency).toBe('INR');
    expect(launch.availability).toBe('https://schema.org/InStock');
    expect(launch.url).toBe('https://techpravaha.com/services/websites/#websites-launch');
  });

  it('omits price for quote tiers and uses priceSpecification from `from`', () => {
    const tier = service.tiers.find((t) => t.price === null)!;
    const o = offers.find((x) => x.name === tier.label)!;
    expect(o).not.toHaveProperty('price');
    expect(o.priceSpecification).toEqual({
      '@type': 'PriceSpecification',
      minPrice: tier.from,
      priceCurrency: 'INR',
    });
  });
});

describe('faqSchema', () => {
  it('builds FAQPage mainEntity', () => {
    const f = faqSchema([{ q: 'Q1?', a: 'A1.' }, { q: 'Q2?', a: 'A2.' }]) as Json;
    expect(f['@type']).toBe('FAQPage');
    expect(f.mainEntity).toHaveLength(2);
    expect(f.mainEntity[0]).toEqual({
      '@type': 'Question',
      name: 'Q1?',
      acceptedAnswer: { '@type': 'Answer', text: 'A1.' },
    });
  });
});

describe('breadcrumbSchema', () => {
  it('numbers items from 1 with absolute trailing-slash urls', () => {
    const b = breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Services', path: '/services' },
    ]) as Json;
    expect(b['@type']).toBe('BreadcrumbList');
    expect(b.itemListElement[0]).toEqual({
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: 'https://techpravaha.com/',
    });
    expect(b.itemListElement[1].position).toBe(2);
    expect(b.itemListElement[1].item).toBe('https://techpravaha.com/services/');
  });
});

describe('articleSchema', () => {
  it('builds an Article', () => {
    const a = articleSchema({ title: 'T', date: '2026-10-01', summary: 'S', slug: 'hello' }) as Json;
    expect(a['@type']).toBe('Article');
    expect(a.headline).toBe('T');
    expect(a.datePublished).toBe('2026-10-01');
    expect(a.description).toBe('S');
    expect(a.url).toBe('https://techpravaha.com/journal/hello/');
    expect(a.author).toEqual({ '@type': 'Person', name: 'Yogesh Laddha' });
    expect(a.publisher.name).toBe('Tech Pravaha');
  });
});
