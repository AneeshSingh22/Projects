import type { Unit } from '../types';

/** All internal geometry (positions, sizes) is stored/calculated in inches. */

export function roomUnitToInches(value: number, unit: Unit): number {
  return unit === 'ft' ? value * 12 : value * 39.3700787;
}

export function inchesToRoomUnit(inches: number, unit: Unit): number {
  return unit === 'ft' ? inches / 12 : inches / 39.3700787;
}

/** 1 scene unit = 1 foot, so R3F meshes stay human-scale and easy to reason about. */
export function inchesToScene(inches: number): number {
  return inches / 12;
}

export function sceneToInches(sceneUnits: number): number {
  return sceneUnits * 12;
}

export function formatInches(inches: number): string {
  const feet = Math.floor(inches / 12);
  const remIn = Math.round(inches - feet * 12);
  if (feet <= 0) return `${Math.round(inches)}"`;
  if (remIn === 0) return `${feet}'`;
  return `${feet}'${remIn}"`;
}

export function formatRoomDimension(value: number, unit: Unit): string {
  return unit === 'ft' ? `${value} ft` : `${value} m`;
}

/** TVs are conventionally sized by diagonal screen measurement, 16:9 aspect. */
export function tvDiagonalToWidthHeight(diagonalIn: number): { widthIn: number; heightIn: number } {
  const ratio = Math.sqrt(16 * 16 + 9 * 9);
  return {
    widthIn: (diagonalIn * 16) / ratio,
    heightIn: (diagonalIn * 9) / ratio,
  };
}
