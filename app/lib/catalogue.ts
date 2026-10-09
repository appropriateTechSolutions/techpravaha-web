import raw from '../../catalogue.json';

export interface Tier {
  id: string;
  name: 'Launch' | 'Growth' | 'Bespoke' | string;
  label: string;
  tagline: string;
  price: number | null;
  from?: number;
  buyable: boolean;
  weeks?: number;
  days?: number;
  badge?: string | null;
  includes: string[];
  terms?: string;
  payment?: string;
}

export interface Service {
  id: string;
  name: string;
  short: string;
  route: string;
  order: number;
  tiers: Tier[];
}

export interface Addon {
  id: string;
  name: string;
  from: number;
  per: string;
  buyable: boolean;
  blurb: string;
}

export interface Catalogue {
  currency: 'INR';
  gst: number;
  services: Service[];
  addons: Addon[];
}

const fail = (msg: string): never => {
  throw new Error(`catalogue: ${msg}`);
};

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

const isMoney = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v > 0;

export function validateCatalogue(c: unknown): Catalogue {
  if (!isObj(c)) return fail('root must be an object');
  if (c.currency !== 'INR') fail('currency must be INR');
  if (typeof c.gst !== 'number' || !(c.gst >= 0 && c.gst < 1)) fail('gst must be a fraction between 0 and 1');
  if (!Array.isArray(c.services) || c.services.length === 0) fail('services must be a non-empty array');
  if (!Array.isArray(c.addons)) fail('addons must be an array');

  const serviceIds = new Set<string>();
  const tierIds = new Set<string>();

  for (const s of c.services as unknown[]) {
    if (!isObj(s)) return fail('service must be an object');
    if (!isStr(s.id)) fail('service id missing');
    const sid = s.id as string;
    if (serviceIds.has(sid)) fail(`duplicate service id ${sid}`);
    serviceIds.add(sid);
    for (const k of ['name', 'short', 'route'] as const) {
      if (!isStr(s[k])) fail(`service ${sid} missing ${k}`);
    }
    if (typeof s.order !== 'number') fail(`service ${sid} missing order`);
    if (!Array.isArray(s.tiers) || s.tiers.length === 0) fail(`service ${sid} has no tiers`);

    for (const t of s.tiers as unknown[]) {
      if (!isObj(t)) return fail(`service ${sid} has a tier that is not an object`);
      if (!isStr(t.id)) fail(`service ${sid} has a tier without id`);
      const tid = t.id as string;
      if (tierIds.has(tid)) fail(`duplicate tier id ${tid}`);
      tierIds.add(tid);
      for (const k of ['name', 'label', 'tagline'] as const) {
        if (!isStr(t[k])) fail(`tier ${tid} missing ${k}`);
      }
      if (typeof t.buyable !== 'boolean') fail(`tier ${tid} buyable must be boolean`);
      if (t.price !== null && !isMoney(t.price)) fail(`tier ${tid} price must be a positive integer or null`);
      if (t.from !== undefined && !isMoney(t.from)) fail(`tier ${tid} from must be a positive integer`);
      if (t.buyable && t.price === null) fail(`tier ${tid} buyable without price`);
      if (t.price === null && t.from === undefined) fail(`tier ${tid} needs a price or a from`);
      if (!Array.isArray(t.includes) || t.includes.length === 0 || !t.includes.every(isStr)) {
        fail(`tier ${tid} includes must be a non-empty array of strings`);
      }
    }
  }

  for (const a of c.addons as unknown[]) {
    if (!isObj(a) || !isStr(a.id) || !isStr(a.name) || !isMoney(a.from) || !isStr(a.per)) {
      fail('addon is malformed');
    }
  }

  return c as unknown as Catalogue;
}

export const catalogue: Catalogue = validateCatalogue(raw);

export function getService(id: string): Service | undefined {
  return catalogue.services.find((s) => s.id === id);
}

export function getTier(tierId: string): { service: Service; tier: Tier } | undefined {
  for (const service of catalogue.services) {
    const tier = service.tiers.find((t) => t.id === tierId);
    if (tier) return { service, tier };
  }
  return undefined;
}

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatINR(n: number): string {
  return inr.format(n);
}

export function withGst(n: number, gst: number = catalogue.gst): number {
  return Math.round(n * (1 + gst));
}

export function tierFromPrice(t: Tier): number | null {
  return t.price ?? t.from ?? null;
}
