import { useEffect, useRef, useState } from 'react';
import type { RoomSpace } from '../../types';

/** Compact room picker. A long apartment can have 10-15 spaces, and rendering them as a flat
 * list pushes the furniture catalog almost entirely off-screen — so this collapses to a single
 * dropdown row that only expands on demand. */
export function RoomSwitcher({
  spaces,
  activeSpaceId,
  onSelect,
}: {
  spaces: RoomSpace[];
  activeSpaceId: string | null;
  onSelect: (spaceId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocPointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDocPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDocPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (spaces.length <= 1) return null;

  const active = spaces.find((s) => s.id === activeSpaceId);

  return (
    <div ref={containerRef} className="relative border-b border-neutral-800 p-3">
      <h4 className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">Room</h4>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-left text-sm text-neutral-200 hover:border-indigo-500"
      >
        <span className="truncate">{active?.name ?? 'Select a room'}</span>
        <span className="shrink-0 text-xs text-neutral-500">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="absolute left-3 right-3 z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-neutral-700 bg-neutral-900 py-1 shadow-xl">
          {spaces.map((space) => (
            <button
              key={space.id}
              type="button"
              onClick={() => {
                onSelect(space.id);
                setOpen(false);
              }}
              className={`block w-full truncate px-3 py-1.5 text-left text-sm ${
                space.id === activeSpaceId
                  ? 'bg-indigo-500/15 text-indigo-300'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
              }`}
            >
              {space.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
