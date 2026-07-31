import { Link } from 'react-router-dom';
import type { Room } from '../../types';
import { formatRoomDimension } from '../../lib/units';
import { getRoomLayout, polygonArea } from '../../lib/floorPlan';

function roomSummary(room: Room): string {
  if (room.dimensions) {
    return `${formatRoomDimension(room.dimensions.width, room.unit)} × ${formatRoomDimension(room.dimensions.length, room.unit)}`;
  }
  const layout = getRoomLayout(room);
  const sqFt = layout.spaces.reduce((sum, s) => sum + polygonArea(s.polygon), 0) / 144;
  const roomWord = layout.spaces.length === 1 ? 'room' : 'rooms';
  return `${layout.spaces.length} ${roomWord} · ${Math.round(sqFt)} sq ft`;
}

export function RoomCard({
  room,
  thumbnailUrl,
  onDelete,
}: {
  room: Room;
  thumbnailUrl?: string;
  onDelete: (id: string) => void;
}) {
  return (
    <Link
      to={`/rooms/${room.id}`}
      className="group relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 transition hover:border-neutral-700"
    >
      <div className="aspect-video w-full overflow-hidden bg-neutral-800">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={room.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-neutral-600">
            <span className="text-4xl">🛋️</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-medium text-neutral-100">{room.name}</h3>
        <p className="mt-1 text-sm text-neutral-400">{roomSummary(room)}</p>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (confirm(`Delete "${room.name}"? This can't be undone.`)) onDelete(room.id);
        }}
        className="absolute right-3 top-3 hidden h-8 w-8 place-items-center rounded-full bg-black/60 text-neutral-300 backdrop-blur hover:bg-red-600 hover:text-white group-hover:grid"
        aria-label={`Delete ${room.name}`}
      >
        ✕
      </button>
    </Link>
  );
}
