// Validates catalogue.json with the site's own rules before the Worker deploys (deploy-worker.yml).
// The Worker bundles the file as-is, so without this a catalogue the site build would refuse could
// still reach the Worker. Importing app/lib/catalogue.ts runs validateCatalogue on the file and throws
// (exit 1) on the first problem. Run: npx tsx scripts/validate-catalogue.ts
import { catalogue } from '../app/lib/catalogue';

const tiers = catalogue.services.flatMap((s) => s.tiers);
console.log(
  `catalogue.json ok: ${catalogue.services.length} services, ${tiers.length} tiers, ${tiers.filter((t) => t.buyable).length} buyable`,
);
