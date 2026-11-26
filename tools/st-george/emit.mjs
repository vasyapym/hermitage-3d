/*
 * DECISION-1 step 1 and brief writer amendment.
 * Filesystem effects belong here, never in the imported pure law.
 */

import { writeFileSync } from 'node:fs';
import { buildCensus, buildLaw, serializeCensus, serializeLaw } from './law.mjs';

export function main() {
  const law = buildLaw();
  const census = buildCensus(law);

  // Finish both validations and serializations before the first filesystem write.
  const lawText = serializeLaw(law);
  const censusText = serializeCensus(census);
  const lawPath = new URL('./law.json', import.meta.url);
  const censusPath = new URL('./census.json', import.meta.url);

  writeFileSync(lawPath, lawText, 'utf8');
  writeFileSync(censusPath, censusText, 'utf8');

  return { lawPath, censusPath };
}

main();
