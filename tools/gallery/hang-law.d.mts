/** Type declarations for tools/gallery/hang-law.mjs (the test imports the .mjs; allowJs is off). */
export type HangFrame = {
  readonly wall: 'east' | 'west';
  readonly row: number;
  readonly col: number;
  readonly silk: boolean;
  readonly key: string;
  readonly sitter: string;
  readonly artist?: string;
  readonly year?: number;
};
export type HangTable = { readonly frames: readonly HangFrame[] };
export type WorldCounts = {
  readonly w: number;
  readonly rowsPerWall: number;
  readonly walls: readonly ('east' | 'west')[];
};
export type RosterSmallFrame = HangFrame & {
  readonly kind: 'painted' | 'silk';
  readonly rank: number;
};
export type RosterOmittedFrame = {
  readonly key: string;
  readonly realCol: number;
  readonly realRow: number;
  readonly realWall: string;
  readonly sitter: string;
};
export function applyHang(
  hang: HangTable,
  worldCounts: WorldCounts,
): {
  frames: RosterSmallFrame[];
  omitted: RosterOmittedFrame[];
};
export const HANG_WALLS: readonly ('east' | 'west')[];
export const HANG_ROWS_PER_WALL: number;
export const HANG_W_PER_ROW: number;
export function smallRankToSlot(rank: number): number;
export function superBlockRankToSlot(rank: number): number;
