// src/camera/look-param.ts
/**
 * The capture battery's look injection — square-entry-ground: det-only deep links
 * ?look=<yaw>,<pitch> for the right-look frames; clamped by the committed stop's own look row;
 * non-det boots never parse it. Mirrors the ?cam= contract: last value wins, duplicates are an
 * issue, an empty value is absent; a malformed value is an issue and null — never a throw.
 * Grammar: exactly two finite signed decimals separated by one comma, the whole string. The host
 * parses under det=1 only and clamps through the square stop's look row before applying.
 */
import type { LookOffset } from './look';

export type LookParamIssue = 'invalid-look';
const PARAM = 'look';

const SIGNED_DECIMAL = '[-+]?(?:\\d+(?:\\.\\d+)?|\\.\\d+)';
const LOOK_NUMBER = new RegExp(`^${SIGNED_DECIMAL},${SIGNED_DECIMAL}$`);

export function parseLookParam(
  params: URLSearchParams,
): Readonly<{ look: LookOffset | null; issues: readonly LookParamIssue[] }> {
  const values = params.getAll(PARAM);
  const issues: LookParamIssue[] = values.length > 1 ? ['invalid-look'] : [];
  const last = values[values.length - 1];
  if (last === undefined || last === '') return { look: null, issues };
  const hit = LOOK_NUMBER.exec(last);
  if (hit === null) return { look: null, issues: issues.length === 0 ? ['invalid-look'] : issues };
  const comma = hit[0].indexOf(',');
  if (comma === -1) return { look: null, issues };
  const yaw = Number(hit[0].slice(0, comma));
  const pitch = Number(hit[0].slice(comma + 1));
  if (!Number.isFinite(yaw) || !Number.isFinite(pitch)) {
    return { look: null, issues: issues.length === 0 ? ['invalid-look'] : issues };
  }
  return { look: { yaw, pitch }, issues };
}
