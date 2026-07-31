import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { PlacedItem, Room, SavedProduct } from '../types';

interface AppDB extends DBSchema {
  rooms: { key: string; value: Room };
  placedItems: {
    key: string;
    value: PlacedItem;
    indexes: { 'by-room': string };
  };
  images: { key: string; value: Blob };
  /** products imported from store URLs, reusable across every room */
  savedProducts: { key: string; value: SavedProduct };
}

let dbPromise: Promise<IDBPDatabase<AppDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<AppDB>('apartment-planner', 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('rooms', { keyPath: 'id' });
          const items = db.createObjectStore('placedItems', { keyPath: 'id' });
          items.createIndex('by-room', 'roomId');
          db.createObjectStore('images');
        }
        if (oldVersion < 2) {
          db.createObjectStore('savedProducts', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function listSavedProducts(): Promise<SavedProduct[]> {
  const db = await getDb();
  const all = await db.getAll('savedProducts');
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function saveProduct(product: SavedProduct): Promise<void> {
  const db = await getDb();
  await db.put('savedProducts', product);
}

export async function deleteSavedProduct(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('savedProducts', id);
}

export async function listRooms(): Promise<Room[]> {
  const db = await getDb();
  const rooms = await db.getAll('rooms');
  return rooms.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getRoom(id: string): Promise<Room | undefined> {
  const db = await getDb();
  return db.get('rooms', id);
}

export async function saveRoom(room: Room): Promise<void> {
  const db = await getDb();
  await db.put('rooms', room);
}

export async function deleteRoom(id: string): Promise<void> {
  const db = await getDb();
  const room = await db.get('rooms', id);
  const tx = db.transaction(['rooms', 'placedItems', 'images'], 'readwrite');
  await tx.objectStore('rooms').delete(id);
  const itemIndex = tx.objectStore('placedItems').index('by-room');
  let cursor = await itemIndex.openCursor(IDBKeyRange.only(id));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  if (room) {
    const imageIds = [room.floorPlanImageId, ...room.photoIds].filter(Boolean) as string[];
    await Promise.all(imageIds.map((imgId) => tx.objectStore('images').delete(imgId)));
  }
  await tx.done;
}

export async function listPlacedItems(roomId: string): Promise<PlacedItem[]> {
  const db = await getDb();
  return db.getAllFromIndex('placedItems', 'by-room', roomId);
}

export async function savePlacedItem(item: PlacedItem): Promise<void> {
  const db = await getDb();
  await db.put('placedItems', item);
}

export async function deletePlacedItem(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('placedItems', id);
}

export async function saveImage(id: string, blob: Blob): Promise<void> {
  const db = await getDb();
  await db.put('images', blob, id);
}

export async function getImage(id: string): Promise<Blob | undefined> {
  const db = await getDb();
  return db.get('images', id);
}

export async function deleteImage(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('images', id);
}
