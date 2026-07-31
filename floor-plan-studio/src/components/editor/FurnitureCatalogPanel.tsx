import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { CATEGORY_LABELS, FURNITURE_CATALOG } from '../../data/furnitureCatalog';
import { formatInches } from '../../lib/units';

export function FurnitureCatalogPanel({
  onAdd,
  topSlot,
}: {
  onAdd: (catalogItemId: string) => void;
  topSlot?: ReactNode;
}) {
  const [query, setQuery] = useState('');

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? FURNITURE_CATALOG.filter((c) => c.name.toLowerCase().includes(q)) : FURNITURE_CATALOG;
    const map = new Map<string, typeof FURNITURE_CATALOG>();
    for (const item of filtered) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return map;
  }, [query]);

  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-r border-neutral-800 bg-neutral-950">
      {topSlot}
      <div className="border-b border-neutral-800 p-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search furniture…"
          className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-indigo-500"
        />
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {[...grouped.entries()].map(([category, list]) => (
          <div key={category} className="mb-4">
            <h4 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {CATEGORY_LABELS[category] ?? category}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {list.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onAdd(item.id)}
                  className="flex flex-col items-start gap-1 rounded-lg border border-neutral-800 bg-neutral-900 p-2.5 text-left transition hover:border-indigo-500 hover:bg-neutral-800"
                >
                  <span
                    className="h-6 w-6 rounded"
                    style={{ backgroundColor: item.color }}
                    aria-hidden
                  />
                  <span className="text-xs font-medium text-neutral-200">{item.name}</span>
                  <span className="text-[10px] text-neutral-500">
                    {formatInches(item.defaultDimensions.widthIn)} × {formatInches(item.defaultDimensions.depthIn)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
        {grouped.size === 0 && <p className="px-1 text-sm text-neutral-500">No matches.</p>}
      </div>
    </div>
  );
}
