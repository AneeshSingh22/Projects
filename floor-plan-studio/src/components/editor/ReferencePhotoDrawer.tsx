import { useState } from 'react';
import type { Room } from '../../types';
import { useRoomsStore } from '../../store/useRoomsStore';

export function ReferencePhotoDrawer({
  room,
  imageUrls,
  open,
  onClose,
}: {
  room: Room;
  imageUrls: Record<string, string>;
  open: boolean;
  onClose: () => void;
}) {
  const matchStyleFromPhotos = useRoomsStore((s) => s.matchStyleFromPhotos);
  const [matching, setMatching] = useState(false);
  const [matchMessage, setMatchMessage] = useState<string | null>(null);

  if (!open) return null;

  const images = [
    room.floorPlanImageId && { id: room.floorPlanImageId, label: 'Floor Plan' },
    ...room.photoIds.map((id, i) => ({ id, label: `Photo ${i + 1}` })),
  ].filter(Boolean) as { id: string; label: string }[];

  async function handleMatchStyle() {
    setMatching(true);
    setMatchMessage(null);
    try {
      await matchStyleFromPhotos();
      setMatchMessage('Style applied — floors, walls, and trim now match your photos.');
    } catch (err) {
      setMatchMessage(err instanceof Error ? err.message : 'Style match failed.');
    } finally {
      setMatching(false);
    }
  }

  return (
    <div className="absolute inset-x-0 bottom-0 z-10 max-h-72 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur">
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-neutral-300">Reference Photos</span>
          {room.photoIds.length > 0 && (
            <button
              type="button"
              disabled={matching}
              onClick={handleMatchStyle}
              className="rounded-full bg-indigo-500 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
              title="Ask AI to read the finishes in your photos and restyle the 3D scene to match"
            >
              {matching ? 'Matching style… (up to a minute)' : '✨ Match 3D style to photos'}
            </button>
          )}
          {matchMessage && <span className="text-xs text-neutral-400">{matchMessage}</span>}
        </div>
        <button type="button" onClick={onClose} className="text-neutral-500 hover:text-neutral-300">
          ✕
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto p-4">
        {images.length === 0 && <p className="text-sm text-neutral-500">No reference images uploaded for this room.</p>}
        {images.map((img) => (
          <figure key={img.id} className="shrink-0">
            <img
              src={imageUrls[img.id]}
              alt={img.label}
              className="h-40 w-auto rounded-lg border border-neutral-800 object-cover"
            />
            <figcaption className="mt-1 text-center text-xs text-neutral-500">{img.label}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
