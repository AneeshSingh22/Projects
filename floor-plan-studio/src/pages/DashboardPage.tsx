import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { RoomCard } from '../components/rooms/RoomCard';
import { ApiKeyPanel } from '../components/ApiKeyPanel';
import { useRoomsStore } from '../store/useRoomsStore';
import { seedExampleRoomIfNeeded } from '../lib/exampleRoom';
import { hasApiKey } from '../lib/apiKey';

export function DashboardPage() {
  const rooms = useRoomsStore((s) => s.rooms);
  const roomsLoaded = useRoomsStore((s) => s.roomsLoaded);
  const imageUrls = useRoomsStore((s) => s.imageUrls);
  const loadRooms = useRoomsStore((s) => s.loadRooms);
  const deleteRoom = useRoomsStore((s) => s.deleteRoom);
  const [showKeyPanel, setShowKeyPanel] = useState(false);
  const [keySet, setKeySet] = useState(hasApiKey());

  useEffect(() => {
    // Give first-time visitors a real apartment to explore instead of an empty dashboard.
    void seedExampleRoomIfNeeded().then(() => loadRooms());
  }, [loadRooms]);

  return (
    <AppShell>
      {showKeyPanel && (
        <ApiKeyPanel onClose={() => setShowKeyPanel(false)} onSaved={() => setKeySet(true)} />
      )}
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-50">Your spaces</h1>
            <p className="mt-1.5 text-neutral-400">
              Model a real apartment, try furniture layouts, and walk through it in 3D before you
              buy or rearrange anything.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowKeyPanel(true)}
              className={`rounded-lg border px-3 py-2.5 text-sm ${
                keySet
                  ? 'border-emerald-800 bg-emerald-950/30 text-emerald-300'
                  : 'border-neutral-800 text-neutral-300 hover:border-neutral-600'
              }`}
            >
              {keySet ? '🔑 API key set' : '🔑 Add API key'}
            </button>
            <Link
              to="/rooms/new"
              className="rounded-lg bg-gradient-to-b from-indigo-400 to-indigo-600 px-4 py-2.5 font-medium text-white shadow-sm shadow-indigo-500/25 transition hover:from-indigo-300 hover:to-indigo-500"
            >
              + New Room
            </Link>
          </div>
        </div>

        {/* Set expectations before anyone hits a paywall-ish error mid-flow. */}
        <div className="mb-8 rounded-xl border border-neutral-800 bg-gradient-to-b from-neutral-900/70 to-neutral-900/30 p-4 text-sm text-neutral-400">
          <p>
            <span className="font-medium text-neutral-200">Everything here is free to use.</span>{' '}
            Explore the example apartment, trace your own floor plan by hand, place furniture, and
            walk around in 3D — no account, no key. Your work saves in this browser only.
          </p>
          <p className="mt-2">
            Want the floor plan read <span className="italic">automatically</span> from an image?
            That uses Claude and needs{' '}
            <button
              type="button"
              onClick={() => setShowKeyPanel(true)}
              className="text-indigo-400 underline hover:text-indigo-300"
            >
              your own Anthropic API key
            </button>{' '}
            — roughly 25¢ per plan, billed to you by Anthropic.
          </p>
        </div>

        {roomsLoaded && rooms.length === 0 && (
          <div className="rounded-xl border border-dashed border-neutral-800 py-20 text-center">
            <p className="text-lg font-medium text-neutral-200">No rooms yet</p>
            <p className="mt-1 text-neutral-500">
              Create your first room with its real dimensions to start placing furniture.
            </p>
            <Link
              to="/rooms/new"
              className="mt-6 inline-block rounded-lg bg-indigo-500 px-4 py-2.5 font-medium text-white hover:bg-indigo-400"
            >
              + New Room
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              thumbnailUrl={imageUrls[room.photoIds[0] ?? room.floorPlanImageId ?? '']}
              onDelete={deleteRoom}
            />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
