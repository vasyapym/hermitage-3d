// src/camera/portrait-frame.ts
/**
 * Portrait frame law — brief 19 §A (Stage 1 §1.1–1.2); DEC-portrait (number at merge).
 *
 * Frames whose horizontal half-FOV at S0 cannot reach the Alexander Column (portrait phones and
 * tablets, narrow windows) get a boot SUBJECT re-aimed by the shortfall so the declared share of
 * the shaft's base width stands inside the right edge. Derived stop data: the arrival law stays
 * camera-blind; this module returns SQUARE_RAIL ITSELF (identity by reference) for every aspect
 * that already witnesses the Column, and a rail with only S0's subject replaced otherwise.
 * Yaw only — pitch (subject y and horizontal range), eye, Sh, S1, look rows, ids untouched.
 * Pure: three-free, DOM-free; re-types none of the imported literals.
 */
import { COLUMN_SHAFT, COLUMN_X, COLUMN_Z } from '../world/column';
import type { Rail, Vec3 } from '../world/registry';
import { SQUARE_RAIL, SQUARE_S0_GAZE } from './square-rail';
/** LAW: the one source of the vertical FOV; main.ts's PerspectiveCamera reads it. */
export const CAMERA_VFOV_DEG = 55;
/** DECLARED by the owner («maybe 1/3»): share of the shaft base width inside the right edge. */
export const COLUMN_WITNESS_FRACTION = 1 / 3;
/** DECLARED ceiling: bounds the S0→Sh glide swing at degenerate aspects. */
export const S0_YAW_DELTA_MAX_DEG = 12;
const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;
const s0 = SQUARE_RAIL.stops[0];
if (s0 === undefined) throw new Error('portrait-frame: SQUARE_RAIL has no S0');
const eye: Vec3 = s0.position;
const gaze: Vec3 = SQUARE_S0_GAZE;
const gazeYawRad = Math.atan2(gaze[0] - eye[0], -(gaze[2] - eye[2]));
const gazeRangeM = Math.hypot(gaze[0] - eye[0], gaze[2] - eye[2]);
const columnYawRad = Math.atan2(COLUMN_X - eye[0], -(COLUMN_Z - eye[2]));
const columnRangeM = Math.hypot(COLUMN_X - eye[0], COLUMN_Z - eye[2]);
const shaftHalfRad = Math.atan(COLUMN_SHAFT.baseRadiusM / columnRangeM);
const assertAspect = (aspect: number): void => {
  if (!Number.isFinite(aspect) || aspect <= 0) {
    throw new RangeError(`portrait-frame: aspect must be finite and > 0, got ${aspect}`);
  }
};
/** Yaw right of the S0 gaze (deg) at which the declared shaft share stands inside the frame. */
export const s0ColumnWitnessDeg = (): number =>
  (columnYawRad - shaftHalfRad + 2 * shaftHalfRad * COLUMN_WITNESS_FRACTION - gazeYawRad) * DEG;
export const halfHorizontalFovDeg = (aspect: number): number => {
  assertAspect(aspect);
  return Math.atan(Math.tan((CAMERA_VFOV_DEG / 2) * RAD) * aspect) * DEG;
};
/** δ = 0 for every aspect ≥ this: identity by reference. */
export const WITNESS_ASPECT =
  Math.tan(s0ColumnWitnessDeg() * RAD) / Math.tan((CAMERA_VFOV_DEG / 2) * RAD);
export const s0YawDeltaDeg = (aspect: number): number =>
  Math.min(S0_YAW_DELTA_MAX_DEG, Math.max(0, s0ColumnWitnessDeg() - halfHorizontalFovDeg(aspect)));
export const squareRailForAspect = (aspect: number): Rail => {
  const delta = s0YawDeltaDeg(aspect);
  if (delta === 0) return SQUARE_RAIL;
  const yaw = gazeYawRad + delta * RAD;
  const subject: Vec3 = [
    eye[0] + gazeRangeM * Math.sin(yaw),
    gaze[1],
    eye[2] - gazeRangeM * Math.cos(yaw),
  ];
  const [, ...rest] = SQUARE_RAIL.stops;
  return { ...SQUARE_RAIL, stops: [{ ...s0, subject }, ...rest] };
};
