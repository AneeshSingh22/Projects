import { useEffect, useState } from 'react';
import { importProductFromUrl } from '../../lib/floorPlanAi';
import { useRoomsStore } from '../../store/useRoomsStore';
import { formatInches } from '../../lib/units';

/** Paste a furniture product URL (Amazon, IKEA, Wayfair…) and drop the real item — correct
 * dimensions, colour, and photo — straight into the room. */
export function ProductImport() {
  const saveImportedProduct = useRoomsStore((s) => s.saveImportedProduct);
  const savedProducts = useRoomsStore((s) => s.savedProducts);
  const loadSavedProducts = useRoomsStore((s) => s.loadSavedProducts);
  const placeSavedProduct = useRoomsStore((s) => s.placeSavedProduct);
  const removeSavedProduct = useRoomsStore((s) => s.removeSavedProduct);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    void loadSavedProducts();
  }, [loadSavedProducts]);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function handleImport() {
    if (!url.trim()) return;
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const p = await importProductFromUrl(url.trim());
      await saveImportedProduct(p);
      setNote(
        `Saved ${p.name} to My Imports — ${formatInches(p.widthIn)} × ${formatInches(p.depthIn)} × ` +
          `${formatInches(p.heightIn)}${p.dimensionsFound ? '' : ' (estimated)'}. ` +
          `Click it below to place it.`,
      );
      setUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-b border-neutral-800 px-3 pb-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 hover:border-indigo-500"
      >
        🛒 Add from a store link
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !busy && handleImport()}
            placeholder="Paste an Amazon / IKEA / Wayfair link"
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-2 text-xs text-neutral-100 outline-none focus:border-indigo-500"
          />
          <button
            type="button"
            disabled={busy || !url.trim()}
            onClick={handleImport}
            className="w-full rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {busy ? 'Reading the page…' : 'Import product'}
          </button>
          {error && (
            <p className="rounded-lg border border-red-900/50 bg-red-950/40 p-2 text-xs text-red-300">{error}</p>
          )}
          {note && (
            <p className="rounded-lg border border-emerald-900/50 bg-emerald-950/30 p-2 text-xs text-emerald-300">
              {note}
            </p>
          )}
          <p className="text-[11px] leading-snug text-neutral-500">
            Reads the product's real dimensions and colour so it's sized correctly in your room.
            Works with IKEA and most retailers; Amazon blocks automated access.
          </p>
        </div>
      )}

      {savedProducts.length > 0 && (
        <div className="mt-3">
          <h4 className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            My Imports
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {savedProducts.map((p) => (
              <div key={p.id} className="group relative">
                <button
                  type="button"
                  onClick={() => placeSavedProduct(p.id)}
                  title={`Place ${p.name}`}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-left hover:border-indigo-500"
                >
                  {p.imageDataUrl ? (
                    <img
                      src={p.imageDataUrl}
                      alt={p.name}
                      className="mb-1.5 h-14 w-full rounded bg-white object-contain"
                    />
                  ) : (
                    <div className="mb-1.5 h-14 w-full rounded" style={{ backgroundColor: p.colorHex }} />
                  )}
                  <div className="truncate text-[11px] font-medium text-neutral-200">{p.name}</div>
                  <div className="text-[10px] text-neutral-500">
                    {formatInches(p.dimensions.widthIn)} × {formatInches(p.dimensions.depthIn)}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => removeSavedProduct(p.id)}
                  title="Remove from My Imports"
                  className="absolute right-1 top-1 hidden rounded bg-black/70 px-1.5 text-xs text-neutral-300 hover:text-red-400 group-hover:block"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
