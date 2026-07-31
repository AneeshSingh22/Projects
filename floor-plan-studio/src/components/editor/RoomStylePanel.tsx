import { useState } from 'react';
import type { RoomSpace, SpaceStyleOverride, StyleProfile } from '../../types';

const WALL_SWATCHES = [
  '#f2f0ec', '#ffffff', '#eae6de', '#dfe3e6', '#cfd8dc',
  '#c3cfc5', '#e8dcd0', '#d6c8b8', '#b8c4d0', '#8f9aa6',
  '#5c6672', '#3a4550',
];

const FLOOR_PRESETS: { label: string; floor: StyleProfile['floor'] }[] = [
  { label: 'Light oak', floor: { material: 'wood', colorHex: '#c39a6b', accentHex: '#ab8256' } },
  { label: 'Med. walnut', floor: { material: 'wood', colorHex: '#a97e58', accentHex: '#8f6847' } },
  { label: 'Dark wood', floor: { material: 'wood', colorHex: '#6f5137', accentHex: '#5b412c' } },
  { label: 'Grey wood', floor: { material: 'wood', colorHex: '#9a9186', accentHex: '#847c72' } },
  { label: 'White tile', floor: { material: 'tile', colorHex: '#eceae5', accentHex: '#c9c6c0' } },
  { label: 'Slate tile', floor: { material: 'tile', colorHex: '#8d9196', accentHex: '#6d7175' } },
  { label: 'Beige carpet', floor: { material: 'carpet', colorHex: '#c8bda9', accentHex: '#b0a693' } },
  { label: 'Grey carpet', floor: { material: 'carpet', colorHex: '#9d9d9c', accentHex: '#8a8a89' } },
  { label: 'Concrete', floor: { material: 'concrete', colorHex: '#a8a8a5', accentHex: '#949491' } },
];

/** Per-room finishes: paint one room a different color, tile a bathroom, carpet a bedroom.
 * Overrides sit on top of the apartment-wide style profile. */
export function RoomStylePanel({
  spaces,
  activeSpaceId,
  spaceStyles,
  baseStyle,
  onChange,
  onClose,
}: {
  spaces: RoomSpace[];
  activeSpaceId: string | null;
  spaceStyles?: Record<string, SpaceStyleOverride>;
  baseStyle: StyleProfile;
  onChange: (spaceId: string, patch: SpaceStyleOverride | null) => void;
  onClose: () => void;
}) {
  const [targetId, setTargetId] = useState(activeSpaceId ?? spaces[0]?.id ?? '');
  const target = spaces.find((s) => s.id === targetId);
  const override = spaceStyles?.[targetId];
  if (!target) return null;

  const currentWall = override?.wallHex ?? baseStyle.wallHex;
  const currentFloor = override?.floor ?? baseStyle.floor;

  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-l border-neutral-800 bg-neutral-950">
      <div className="flex items-center justify-between border-b border-neutral-800 p-4">
        <div>
          <h3 className="font-medium text-neutral-100">Room finishes</h3>
          <p className="text-xs text-neutral-500">Paint and flooring, per room</p>
        </div>
        <button type="button" onClick={onClose} className="text-neutral-500 hover:text-neutral-300">
          ✕
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Room</label>
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-indigo-500"
          >
            {spaces.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Wall paint</h4>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {WALL_SWATCHES.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => onChange(targetId, { wallHex: hex })}
                title={hex}
                className={`h-7 w-7 rounded-md border-2 ${
                  currentWall.toLowerCase() === hex.toLowerCase() ? 'border-indigo-400' : 'border-neutral-700 hover:border-neutral-500'
                }`}
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
          <input
            type="color"
            value={currentWall}
            onChange={(e) => onChange(targetId, { wallHex: e.target.value })}
            className="h-8 w-12 cursor-pointer rounded border border-neutral-800 bg-neutral-900"
          />
        </section>

        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Flooring</h4>
          <div className="grid grid-cols-3 gap-2">
            {FLOOR_PRESETS.map((preset) => {
              const active =
                currentFloor.material === preset.floor.material &&
                currentFloor.colorHex.toLowerCase() === preset.floor.colorHex.toLowerCase();
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => onChange(targetId, { floor: preset.floor })}
                  className={`rounded-lg border p-1.5 text-left ${
                    active ? 'border-indigo-400' : 'border-neutral-800 hover:border-neutral-600'
                  }`}
                >
                  <div
                    className="mb-1 h-8 w-full rounded"
                    style={{
                      background: `linear-gradient(135deg, ${preset.floor.colorHex} 0%, ${preset.floor.accentHex} 100%)`,
                    }}
                  />
                  <span className="text-[10px] leading-tight text-neutral-400">{preset.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {override && (
          <button
            type="button"
            onClick={() => onChange(targetId, null)}
            className="text-xs text-neutral-500 underline hover:text-neutral-300"
          >
            Reset {target.name} to the apartment default
          </button>
        )}
      </div>
    </div>
  );
}
