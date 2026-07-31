const STORAGE_KEY = 'anthropic-api-key';

/**
 * The user's own Anthropic API key, kept in localStorage on their machine.
 *
 * It is sent as a request header to this app's own backend, which forwards it to Anthropic and
 * never stores it. The deployed demo ships no key of its own, so nobody can spend the deployer's
 * credit — and every AI feature degrades to a clearly-explained manual path without one.
 */
export function getApiKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setApiKey(key: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, key.trim());
  } catch {
    // Private-browsing / storage disabled — the key just won't persist between reloads.
  }
}

export function clearApiKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // nothing to do
  }
}

export function hasApiKey(): boolean {
  return !!getApiKey();
}

/** Anthropic keys look like `sk-ant-...`; catch obvious paste mistakes before spending a request. */
export function looksLikeAnthropicKey(key: string): boolean {
  return /^sk-ant-[A-Za-z0-9_\-]{20,}$/.test(key.trim());
}

/** Headers for a backend call, including the user's key when they've provided one. */
export function authHeaders(): Record<string, string> {
  const key = getApiKey();
  return key ? { 'x-anthropic-key': key } : {};
}

/** What each AI action costs, so the UI can tell users before they spend anything. */
export const AI_COSTS = {
  model: 'Claude Opus 5 · product import uses Haiku 4.5',
  floorPlan: { label: 'Analyze a floor plan', cost: '~$0.25', time: '1–2 min' },
  style: { label: 'Match style from photos', cost: '~$0.02', time: '~20 sec' },
  product: { label: 'Import a product from a URL', cost: '~$0.01', time: '~15 sec' },
} as const;
