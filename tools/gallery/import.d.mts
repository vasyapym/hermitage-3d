/** Type declarations for tools/gallery/import.mjs (the test imports the .mjs; allowJs is off). */
export const HANG_PATH: string;
export const ROSTER_PATH: string;
export const LOCK_PATH: string;
export const DIGEST_PATH: string;
export const ATTRIBUTIONS_PATH: string;
export const CACHE_DIR: string;
export const OUT_DIR: string;
export const KTX2_PATH: string;
export const MANIFEST_PATH: string;
export const TOKTX_VERSION: string;
export function TOKTX_ARGS(qlevel: number): string[];
export const ATTRIB_BEGIN: string;
export const ATTRIB_END: string;
export function canonicalJson(value: unknown): string;
export function decodePng(bytes: Buffer): { width: number; height: number; data: Uint8Array };
export function decodeImage(bytes: Buffer): { width: number; height: number; data: Uint8Array };
export function buildRoster(hang: unknown): unknown;
export function computeToneCrop(
  bytes: Buffer,
  contentW: number,
  contentH: number,
): { crop: [number, number, number, number]; tone: { black: number; gain: number } };
export function silkSlotsOfRoster(roster: unknown): Map<number, string>;
export function rosterSlotsMap(roster: unknown): Map<number, string>;
export function wrapSegments(segments: readonly string[]): string;
export function attribBlock(lock: unknown, roster: unknown): string;
