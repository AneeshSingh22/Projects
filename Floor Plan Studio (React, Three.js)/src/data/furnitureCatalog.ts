import type { CatalogItem } from '../types';

// All dimensions are realistic real-world defaults, in inches (w x d x h).
export const FURNITURE_CATALOG: CatalogItem[] = [
  // Seating
  { id: 'sofa-3seat', name: '3-Seat Sofa', category: 'seating', geometry: { kind: 'sofa' }, sizeInputMode: 'wdh', color: '#5b6b8c', defaultDimensions: { widthIn: 84, depthIn: 36, heightIn: 34 } },
  { id: 'loveseat', name: 'Loveseat', category: 'seating', geometry: { kind: 'sofa' }, sizeInputMode: 'wdh', color: '#6b7a99', defaultDimensions: { widthIn: 58, depthIn: 36, heightIn: 34 } },
  { id: 'armchair', name: 'Armchair', category: 'seating', geometry: { kind: 'armchair' }, sizeInputMode: 'wdh', color: '#8a6b5b', defaultDimensions: { widthIn: 32, depthIn: 34, heightIn: 33 } },
  { id: 'dining-chair', name: 'Dining Chair', category: 'seating', geometry: { kind: 'chair' }, sizeInputMode: 'wdh', color: '#7a5c44', defaultDimensions: { widthIn: 18, depthIn: 20, heightIn: 34 } },
  { id: 'office-chair', name: 'Office Chair', category: 'seating', geometry: { kind: 'chair' }, sizeInputMode: 'wdh', color: '#2e2f33', defaultDimensions: { widthIn: 26, depthIn: 26, heightIn: 40 } },

  // Tables
  { id: 'coffee-table', name: 'Coffee Table', category: 'tables', geometry: { kind: 'coffeeTable' }, sizeInputMode: 'wdh', color: '#6b4a33', defaultDimensions: { widthIn: 48, depthIn: 24, heightIn: 18 } },
  { id: 'side-table', name: 'Side Table', category: 'tables', geometry: { kind: 'sideTable' }, sizeInputMode: 'wdh', color: '#6b4a33', defaultDimensions: { widthIn: 22, depthIn: 22, heightIn: 24 } },
  { id: 'dining-table', name: 'Dining Table', category: 'tables', geometry: { kind: 'diningTable' }, sizeInputMode: 'wdh', color: '#5c3f2c', defaultDimensions: { widthIn: 60, depthIn: 36, heightIn: 30 } },
  { id: 'desk', name: 'Desk', category: 'tables', geometry: { kind: 'desk' }, sizeInputMode: 'wdh', color: '#4a4438', defaultDimensions: { widthIn: 48, depthIn: 24, heightIn: 30 } },

  // Storage
  { id: 'bookshelf', name: 'Bookshelf', category: 'storage', geometry: { kind: 'bookshelf' }, sizeInputMode: 'wdh', color: '#4a3b2c', defaultDimensions: { widthIn: 36, depthIn: 12, heightIn: 72 } },
  { id: 'dresser', name: 'Dresser', category: 'storage', geometry: { kind: 'dresser' }, sizeInputMode: 'wdh', color: '#3f342a', defaultDimensions: { widthIn: 60, depthIn: 20, heightIn: 32 } },
  { id: 'tv-stand', name: 'TV Stand', category: 'storage', geometry: { kind: 'tvStand' }, sizeInputMode: 'wdh', color: '#2e2a24', defaultDimensions: { widthIn: 60, depthIn: 18, heightIn: 22 } },

  // Bedroom
  { id: 'bed-twin', name: 'Twin Bed', category: 'bedroom', geometry: { kind: 'bed' }, sizeInputMode: 'wdh', color: '#7e8ba3', defaultDimensions: { widthIn: 39, depthIn: 75, heightIn: 24 } },
  { id: 'bed-full', name: 'Full Bed', category: 'bedroom', geometry: { kind: 'bed' }, sizeInputMode: 'wdh', color: '#7e8ba3', defaultDimensions: { widthIn: 54, depthIn: 75, heightIn: 24 } },
  { id: 'bed-queen', name: 'Queen Bed', category: 'bedroom', geometry: { kind: 'bed' }, sizeInputMode: 'wdh', color: '#7e8ba3', defaultDimensions: { widthIn: 60, depthIn: 80, heightIn: 24 } },
  { id: 'bed-king', name: 'King Bed', category: 'bedroom', geometry: { kind: 'bed' }, sizeInputMode: 'wdh', color: '#7e8ba3', defaultDimensions: { widthIn: 76, depthIn: 80, heightIn: 24 } },
  { id: 'nightstand', name: 'Nightstand', category: 'bedroom', geometry: { kind: 'nightstand' }, sizeInputMode: 'wdh', color: '#4a3b2c', defaultDimensions: { widthIn: 20, depthIn: 16, heightIn: 24 } },

  // Kitchen
  { id: 'kitchen-counter', name: 'Counter / Cabinets', category: 'kitchen', geometry: { kind: 'kitchenCounter' }, sizeInputMode: 'wdh', color: '#e8e6e1', defaultDimensions: { widthIn: 72, depthIn: 25, heightIn: 36 } },
  { id: 'kitchen-island', name: 'Kitchen Island', category: 'kitchen', geometry: { kind: 'kitchenIsland' }, sizeInputMode: 'wdh', color: '#eceae5', defaultDimensions: { widthIn: 60, depthIn: 36, heightIn: 36 } },
  { id: 'fridge', name: 'Refrigerator', category: 'kitchen', geometry: { kind: 'fridge' }, sizeInputMode: 'wdh', color: '#c8cacc', defaultDimensions: { widthIn: 36, depthIn: 30, heightIn: 70 } },
  { id: 'stove', name: 'Stove / Range', category: 'kitchen', geometry: { kind: 'stove' }, sizeInputMode: 'wdh', color: '#dcdcda', defaultDimensions: { widthIn: 30, depthIn: 26, heightIn: 36 } },
  { id: 'washer-dryer', name: 'Washer / Dryer', category: 'kitchen', geometry: { kind: 'washerDryer' }, sizeInputMode: 'wdh', color: '#e2e2e0', defaultDimensions: { widthIn: 27, depthIn: 30, heightIn: 38 } },

  // Bathroom
  { id: 'toilet', name: 'Toilet', category: 'bathroom', geometry: { kind: 'toilet' }, sizeInputMode: 'wdh', color: '#f4f3ef', defaultDimensions: { widthIn: 16, depthIn: 28, heightIn: 30 } },
  { id: 'vanity', name: 'Vanity / Sink', category: 'bathroom', geometry: { kind: 'vanity' }, sizeInputMode: 'wdh', color: '#d9d5cd', defaultDimensions: { widthIn: 36, depthIn: 21, heightIn: 34 } },
  { id: 'bathtub', name: 'Bathtub', category: 'bathroom', geometry: { kind: 'bathtub' }, sizeInputMode: 'wdh', color: '#f4f3ef', defaultDimensions: { widthIn: 60, depthIn: 30, heightIn: 20 } },
  { id: 'shower', name: 'Shower', category: 'bathroom', geometry: { kind: 'shower' }, sizeInputMode: 'wdh', color: '#dfe8ec', defaultDimensions: { widthIn: 36, depthIn: 36, heightIn: 80 } },

  // Electronics
  // Wall-mounted by default (the common setup); use "Move to floor instead" in the side panel
  // to sit it on a TV stand.
  { id: 'tv-55', name: 'TV', category: 'electronics', geometry: { kind: 'tv' }, sizeInputMode: 'tv-diagonal', color: '#111214', defaultDimensions: { widthIn: 48, depthIn: 2.5, heightIn: 28, diagonalIn: 55 }, defaultWallMounted: true },

  // Decor
  { id: 'rug', name: 'Area Rug', category: 'decor', geometry: { kind: 'rug' }, sizeInputMode: 'wdh', color: '#9c6b4a', defaultDimensions: { widthIn: 96, depthIn: 60, heightIn: 0.5 } },
  { id: 'floor-lamp', name: 'Floor Lamp', category: 'decor', geometry: { kind: 'lamp' }, sizeInputMode: 'wdh', color: '#d8c69a', defaultDimensions: { widthIn: 14, depthIn: 14, heightIn: 60 } },
  { id: 'plant', name: 'Potted Plant', category: 'decor', geometry: { kind: 'plant' }, sizeInputMode: 'wdh', color: '#3f6b3f', defaultDimensions: { widthIn: 18, depthIn: 18, heightIn: 48 } },
  { id: 'painting', name: 'Painting / Wall Art', category: 'decor', geometry: { kind: 'painting' }, sizeInputMode: 'wdh', color: '#c9a15a', defaultDimensions: { widthIn: 24, depthIn: 1.5, heightIn: 30 }, defaultWallMounted: true },

  // Openings
  { id: 'window', name: 'Window', category: 'openings', geometry: { kind: 'window' }, sizeInputMode: 'wdh', color: '#bcdcec', defaultDimensions: { widthIn: 36, depthIn: 4, heightIn: 48 }, defaultWallMounted: true, cutsWall: true },
  { id: 'doorway', name: 'Doorway', category: 'openings', geometry: { kind: 'doorway' }, sizeInputMode: 'wdh', color: '#8a7256', defaultDimensions: { widthIn: 36, depthIn: 6, heightIn: 80 }, defaultWallMounted: true, cutsWall: true },
];

export function getCatalogItem(id: string): CatalogItem | undefined {
  return FURNITURE_CATALOG.find((c) => c.id === id);
}

export const CATEGORY_LABELS: Record<string, string> = {
  seating: 'Seating',
  tables: 'Tables',
  storage: 'Storage',
  bedroom: 'Bedroom',
  kitchen: 'Kitchen',
  bathroom: 'Bathroom',
  electronics: 'Electronics',
  decor: 'Decor',
  openings: 'Openings',
};

/** Maps the AI floor-plan analyzer's fixture type names to catalog items. */
export const FIXTURE_TYPE_TO_CATALOG_ID: Record<string, string> = {
  kitchen_counter: 'kitchen-counter',
  kitchen_island: 'kitchen-island',
  fridge: 'fridge',
  stove: 'stove',
  washer_dryer: 'washer-dryer',
  toilet: 'toilet',
  sink_vanity: 'vanity',
  bathtub: 'bathtub',
  shower: 'shower',
  closet_shelving: 'bookshelf',
  desk: 'desk',
};
