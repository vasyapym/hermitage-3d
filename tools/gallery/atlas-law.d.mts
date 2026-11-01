/** Type declarations for tools/gallery/atlas-law.mjs (the test imports the .mjs; allowJs is off). */
export type Rgb = readonly [number, number, number];
export type SlotRole = 'block' | 'roster' | 'spare' | 'missing';
export interface StandInParams {
  readonly silhouette: number;
  readonly shoulder: number;
  readonly uniform: number;
  readonly facing: number;
  readonly epaulettes: boolean;
  readonly umber: number;
  readonly face: number;
  readonly umberValue: number;
  readonly headOffset: number;
}
/** §3.8 tile kinds: an image tile carries the content rect's RGBA; silk is procedural. */
export type MockTile = { readonly kind: 'mock' };
export type SilkTile = { readonly kind: 'silk'; readonly key: string };
export type ImageTile = { readonly kind: 'image'; readonly rgba: Uint8Array };
export type Tile = MockTile | SilkTile | ImageTile;
export type TileProvider = (
  slot: number,
  rect: { readonly w: number; readonly h: number },
) => Tile | null;
export const ATLAS_LAW_VERSION: number;
export const ATLAS_SIZE_PX: number;
export const ATLAS_COLUMNS: number;
export const ATLAS_ROWS: number;
export const SLOT_W_PX: number;
export const SLOT_H_PX: number;
export const ATLAS_GUTTER_PX: number;
export const ATLAS_INSET_PX: number;
export const SLOT_INSET_PX: number;
export const SUPER_BLOCK_SLOTS: number;
export const SUPER_BLOCK_COUNT: number;
export const MISSING_SLOT: number;
export const SLOT_COUNT: number;
export const ROSTER_COUNT: number;
export const MIP_LEVELS: number;
export const QLEVEL_LADDER: readonly number[];
export const ATLAS_BYTES_MAX: number;
export const SILK_COUNT: number;
export const SALT_1812: string;
export const MONARCH_X_SCALE: number;
export const LICENSE_STEMS: readonly string[];
export function isFamilyLicense(name: string): boolean;
export const GUTTER_RGB: Rgb;
export const SILK_A: Rgb;
export const SILK_B: Rgb;
export const SILK_EDGE: Rgb;
export const SILK_SHEEN_STEPS: number;
export const SILK_NOISE: number;
export const SILK_BORDER_PX: number;
export function hash32(salt: string, ...ints: number[]): number;
export function bits(h: number, shift: number, count: number): number;
export function superBlockSlots(block: number): readonly number[];
export function reservedSlotSet(): ReadonlySet<number>;
export function slotRoles(): readonly SlotRole[];
export function rosterSlots(): readonly number[];
export function standInParams(slot: number): StandInParams;
export function silkShade(key: string): (x: number, y: number, vw: number, vh: number) => Rgb;
export function mockTiles(): MockTile;
export function paintAtlas(options?: { readonly tiles?: TileProvider }): Uint8Array;
export function encodePng(rgba: Uint8Array, width: number, height: number): Uint8Array;
