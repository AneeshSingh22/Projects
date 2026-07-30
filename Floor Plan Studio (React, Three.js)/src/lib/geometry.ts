import type { ItemDimensionsIn, PlacedItem } from '../types';

export const GRID_SNAP_IN = 6;

export function snap(value: number, gridIn = GRID_SNAP_IN): number {
  return Math.round(value / gridIn) * gridIn;
}

export function effectiveDimensions(item: PlacedItem, fallback: ItemDimensionsIn): ItemDimensionsIn {
  return item.customDimensions ?? fallback;
}
