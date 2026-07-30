import { useState } from 'react';
import { AI_COSTS, clearApiKey, getApiKey, looksLikeAnthropicKey, setApiKey } from '../lib/apiKey';

/**
 * Bring-your-own-key panel. The hosted demo ships no key, so AI features are opt-in and paid for
 * by whoever uses them. Everything here is about making that trade explicit *before* someone
 * spends money: what model runs, what each action costs, and what still works with no key.
 */
export function ApiKeyPanel({ onClose, onSaved }: { onClose: () => void; onSaved?: () => void }) {
  const [value, setValue] = useState(getApiKey() ?? '');
  const [saved, setSaved] = useState(false);
  const existing = getApiKey();
  const valid = looksLikeAnthropicKey(value);

  function handleSave() {
    if (!valid) return;
    setApiKey(value);
    setSaved(true);
    onSaved?.();
  }

  function handleClear() {
    clearApiKey();
    setValue('');
    setSaved(false);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-100">Use AI features</h2>
            <p className="mt-1 text-sm text-neutral-400">
              Optional. Add your own Anthropic API key to unlock automatic floor plan reading.
            </p>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 text-neutral-500 hover:text-neutral-300">
            ✕
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            What it costs · {AI_COSTS.model}
          </h3>
          <ul className="space-y-1.5 text-sm text-neutral-300">
            {[AI_COSTS.floorPlan, AI_COSTS.style, AI_COSTS.product].map((c) => (
              <li key={c.label} className="flex items-baseline justify-between gap-3">
                <span>{c.label}</span>
                <span className="shrink-0 font-mono text-xs text-neutral-400">
                  {c.cost} · {c.time}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-neutral-500">
            You are billed by Anthropic directly for what you use. This site never sees your bill
            and adds no markup.
          </p>
        </div>

        <label className="mb-1.5 block text-sm text-neutral-300">Anthropic API key</label>
        <input
          type="password"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
          placeholder="sk-ant-..."
          className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 font-mono text-sm text-neutral-100 outline-none focus:border-indigo-500"
        />
        {value && !valid && (
          <p className="mt-1.5 text-xs text-amber-400">
            That doesn't look like an Anthropic key — they start with <code>sk-ant-</code>.
          </p>
        )}

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            disabled={!valid}
            onClick={handleSave}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {saved ? 'Saved ✓' : 'Save key'}
          </button>
          {existing && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-lg border border-neutral-800 px-3 py-2 text-sm text-neutral-400 hover:text-neutral-200"
            >
              Remove key
            </button>
          )}
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noreferrer"
            className="ml-auto text-xs text-indigo-400 underline hover:text-indigo-300"
          >
            Get a key ↗
          </a>
        </div>

        <div className="mt-4 space-y-2 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 text-xs leading-relaxed text-neutral-400">
          <p>
            <span className="font-medium text-neutral-300">Where your key goes.</span> It's stored
            only in this browser and sent with your requests so they can be forwarded to Anthropic.
            It is never saved on the server or shared with anyone.
          </p>
          <p>
            <span className="font-medium text-neutral-300">No key? The app still works.</span> You
            can trace any floor plan by hand, place furniture, walk around in 3D, and edit finishes
            — all of that is free and needs no key. The example apartment is already set up for you
            to explore.
          </p>
          <p>
            <span className="font-medium text-neutral-300">Note on cost.</span> Anthropic API
            credit is separate from a Claude Pro/Max subscription — a subscription does not include
            API usage.
          </p>
        </div>
      </div>
    </div>
  );
}
