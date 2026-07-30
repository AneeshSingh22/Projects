import type { CatalogItem, ItemDimensionsIn, PlacedItem } from '../../types';
import { effectiveDimensions } from '../../lib/geometry';
import { tvDiagonalToWidthHeight } from '../../lib/units';

/** Common upholstery / finish colors, for one-click recoloring without opening the OS picker. */
const ITEM_SWATCHES = [
  '#5b6b8c', '#2f3e56', '#7a8fa6', '#8a6b5b', '#6b4a33', '#3f342a',
  '#9c6b4a', '#c2b8a3', '#f2efe8', '#3f6b3f', '#7d5a6b', '#2e2f33',
];

export function SelectedItemPanel({
  item,
  catalog,
  onDimensionsChange,
  onRotate90,
  onDuplicate,
  onDelete,
  onMountOnNearestWall,
  onSetWallHeight,
  onUnmountFromWall,
  onColorChange,
}: {
  item: PlacedItem;
  catalog: CatalogItem;
  onDimensionsChange: (dims: ItemDimensionsIn) => void;
  onRotate90: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMountOnNearestWall: () => void;
  onSetWallHeight: (heightOffsetIn: number) => void;
  onUnmountFromWall: () => void;
  onColorChange: (hex: string) => void;
}) {
  const dims = effectiveDimensions(item, catalog.defaultDimensions);

  function setDim(patch: Partial<ItemDimensionsIn>) {
    onDimensionsChange({ ...dims, ...patch });
  }

  function setDiagonal(diagonalIn: number) {
    const { widthIn, heightIn } = tvDiagonalToWidthHeight(diagonalIn);
    onDimensionsChange({ ...dims, widthIn, heightIn, diagonalIn });
  }

  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-l border-neutral-800 bg-neutral-950">
      <div className="border-b border-neutral-800 p-4">
        <h3 className="font-medium text-neutral-100">{item.product?.name ?? catalog.name}</h3>
        <p className="text-xs text-neutral-500">{catalog.category}</p>
        {item.product && (
          <div className="mt-3 space-y-2">
            {item.product.imageDataUrl && (
              <img
                src={item.product.imageDataUrl}
                alt={item.product.name}
                className="h-32 w-full rounded-lg border border-neutral-800 bg-white object-contain"
              />
            )}
            <a
              href={item.product.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="block truncate text-xs text-indigo-400 underline hover:text-indigo-300"
            >
              View product page ↗
            </a>
            {!item.product.dimensionsFound && (
              <p className="text-[11px] leading-snug text-amber-400/90">
                The listing didn't state dimensions — these are estimated. Edit them below if you
                know the real size.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Exact Dimensions
          </h4>

          {catalog.sizeInputMode === 'tv-diagonal' ? (
            <div>
              <label className="mb-1.5 block text-sm text-neutral-300">Screen size (diagonal, inches)</label>
              <input
                type="number"
                min={10}
                step={1}
                value={Math.round(dims.diagonalIn ?? 0)}
                onChange={(e) => setDiagonal(Number(e.target.value))}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-indigo-500"
              />
              <p className="mt-1 text-xs text-neutral-500">
                ≈ {dims.widthIn.toFixed(1)}"W × {dims.heightIn.toFixed(1)}"H
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <NumberField label="Width (in)" value={dims.widthIn} onChange={(v) => setDim({ widthIn: v })} />
              <NumberField label="Depth (in)" value={dims.depthIn} onChange={(v) => setDim({ depthIn: v })} />
              <NumberField label="Height (in)" value={dims.heightIn} onChange={(v) => setDim({ heightIn: v })} />
            </div>
          )}
        </section>

        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Color</h4>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {ITEM_SWATCHES.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => onColorChange(hex)}
                title={hex}
                className={`h-7 w-7 rounded-md border-2 ${
                  (item.color ?? catalog.color).toLowerCase() === hex.toLowerCase()
                    ? 'border-indigo-400'
                    : 'border-neutral-700 hover:border-neutral-500'
                }`}
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={item.color ?? catalog.color}
              onChange={(e) => onColorChange(e.target.value)}
              className="h-8 w-12 cursor-pointer rounded border border-neutral-800 bg-neutral-900"
            />
            <button
              type="button"
              onClick={() => onColorChange(catalog.color)}
              className="text-xs text-neutral-500 underline hover:text-neutral-300"
            >
              Reset to default
            </button>
          </div>
        </section>

        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Orientation</h4>
          <button
            type="button"
            onClick={onRotate90}
            className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 hover:border-indigo-500"
          >
            ↻ Rotate 90°
          </button>
        </section>

        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Wall Mount</h4>
          {item.wallMounted ? (
            <div className="space-y-2">
              <p className="text-xs text-neutral-500">
                Drag it directly to slide along the wall or change height — or re-attach to whichever wall it's
                currently closest to:
              </p>
              <button
                type="button"
                onClick={onMountOnNearestWall}
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 hover:border-indigo-500"
              >
                Re-attach to nearest wall
              </button>
              <NumberField
                label="Height off floor (in)"
                value={item.wallMounted.heightOffsetIn}
                onChange={onSetWallHeight}
              />
              <button
                type="button"
                onClick={onUnmountFromWall}
                className="text-xs text-neutral-500 underline hover:text-neutral-300"
              >
                Move to floor instead
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onMountOnNearestWall}
              className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 hover:border-indigo-500"
            >
              Mount on nearest wall
            </button>
          )}
        </section>

        <section className="flex gap-2">
          <button
            type="button"
            onClick={onDuplicate}
            className="flex-1 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 hover:border-indigo-500"
          >
            Duplicate
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex-1 rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-400 hover:border-red-700 hover:bg-red-950/60"
          >
            Delete
          </button>
        </section>
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] text-neutral-400">{label}</label>
      <input
        type="number"
        min={0}
        step={0.5}
        value={Math.round(value * 10) / 10}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-2 text-sm text-neutral-100 outline-none focus:border-indigo-500"
      />
    </div>
  );
}
