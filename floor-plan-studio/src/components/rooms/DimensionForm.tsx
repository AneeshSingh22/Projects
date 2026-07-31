import type { RoomDimensions, Unit } from '../../types';

export function DimensionForm({
  unit,
  dimensions,
  onUnitChange,
  onDimensionsChange,
}: {
  unit: Unit;
  dimensions: RoomDimensions;
  onUnitChange: (unit: Unit) => void;
  onDimensionsChange: (dims: RoomDimensions) => void;
}) {
  const field = (key: keyof RoomDimensions, label: string) => (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-neutral-300">{label}</label>
      <div className="relative">
        <input
          type="number"
          min={0}
          step={0.1}
          value={dimensions[key]}
          onChange={(e) => onDimensionsChange({ ...dimensions, [key]: Number(e.target.value) })}
          className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2.5 pr-10 text-neutral-100 outline-none focus:border-indigo-500"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500">
          {unit}
        </span>
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-5 flex items-center gap-2">
        <span className="text-sm font-medium text-neutral-300">Units</span>
        <div className="flex overflow-hidden rounded-lg border border-neutral-800">
          {(['ft', 'm'] as Unit[]).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => onUnitChange(u)}
              className={`px-3 py-1.5 text-sm ${
                unit === u ? 'bg-indigo-500 text-white' : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {u === 'ft' ? 'Feet' : 'Meters'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {field('width', 'Width')}
        {field('length', 'Length')}
        {field('height', 'Ceiling Height')}
      </div>

      <div className="mt-5 rounded-lg bg-neutral-900 p-4 text-sm text-neutral-400">
        Floor area:{' '}
        <span className="font-medium text-neutral-200">
          {(dimensions.width * dimensions.length).toFixed(1)} {unit === 'ft' ? 'sq ft' : 'sq m'}
        </span>
      </div>
    </div>
  );
}
