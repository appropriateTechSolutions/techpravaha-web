/**
 * Writes the chatbot's catalogue facts for the Worker:
 *   npm run prompt:data  -> workers/techpravaha-api/src/prompt-data.json
 * deploy-worker.yml runs it before every Worker deploy, so a catalogue edit needs no manual step.
 * Run it locally to see the change in `npm run worker:dev`.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { promptDataJson } from './lib/prompt-data';

const OUT = join(process.cwd(), 'workers/techpravaha-api/src/prompt-data.json');
writeFileSync(OUT, promptDataJson());
console.log(`prompt-data: wrote ${OUT}`);
