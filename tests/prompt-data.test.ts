import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildPromptData, type PromptData } from '../scripts/lib/prompt-data';
import { catalogue } from '../app/lib/catalogue';

const FILE = join(process.cwd(), 'workers/techpravaha-api/src/prompt-data.json');

describe('chatbot prompt data', () => {
  // Structure only, not byte-equality: a price or copy edit in catalogue.json (even one made on
  // github.com) must not fail CI. deploy-worker.yml regenerates the file (npm run prompt:data) before
  // every Worker deploy, so the bundled facts always match the catalogue that ships.
  it('the checked-in JSON has every service, and every buyable tier with a price and a checkout path', () => {
    const onDisk = JSON.parse(readFileSync(FILE, 'utf8')) as PromptData;
    expect(typeof onDisk.gstPct).toBe('number');
    expect(onDisk.services.map((s) => s.id).sort()).toEqual(catalogue.services.map((s) => s.id).sort());
    for (const source of catalogue.services) {
      const s = onDisk.services.find((x) => x.id === source.id)!;
      expect(s.name, source.id).toBeTruthy();
      for (const tier of source.tiers.filter((t) => t.buyable)) {
        const t = s.tiers.find((x) => x.id === tier.id);
        expect(t, tier.id).toBeDefined();
        expect(t!.buyable, tier.id).toBe(true);
        expect(Number.isInteger(t!.price) && t!.price! > 0, tier.id).toBe(true);
        expect(Number.isInteger(t!.totalWithGst) && Number.isInteger(t!.dueAtCheckout), tier.id).toBe(true);
        expect(t!.checkout, tier.id).toBe(`/checkout/${tier.id}`);
      }
    }
  });

  it('covers every service and every tier, with a checkout path only on buyable tiers', () => {
    const data = buildPromptData();
    expect(data.services.map((s) => s.id).sort()).toEqual(catalogue.services.map((s) => s.id).sort());
    for (const s of data.services) {
      expect(s.faq).toHaveLength(3);
      expect(s.afterPay).toHaveLength(4);
      const source = catalogue.services.find((c) => c.id === s.id)!;
      expect(s.tiers.map((t) => t.id)).toEqual(source.tiers.map((t) => t.id));
      for (const t of s.tiers) {
        if (t.buyable) {
          expect(t.checkout).toBe(`/checkout/${t.id}`);
          expect(t.totalWithGst).toBe(Math.round(t.price! * (1 + catalogue.gst)));
        } else {
          expect(t.checkout).toBeUndefined();
          expect(t.price).toBeNull();
        }
      }
    }
  });

  it('contains no em-dash', () => {
    expect(JSON.stringify(buildPromptData())).not.toMatch(/[\u2013\u2014]/);
  });
});
