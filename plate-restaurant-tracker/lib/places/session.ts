"use client"

// Autocomplete session tokens - plan.md section 6, and the gotcha in section 10.
//
// How Google bills this: every keystroke you send to autocomplete is a request.
// If those requests carry a shared session token AND the session is closed by a
// Place Details call carrying the same token, the autocomplete requests inside
// that session bill at zero and you pay only for the Details call. Without a
// token, every keystroke bills separately.
//
// The trap (section 10): a token is single-use. Reusing one after its Details
// call has completed silently reverts to per-request billing. Silently - there
// is no error, the bill just changes. So the token is destroyed the moment the
// session closes, and the next search allocates a fresh one.
//
// This lives in its own module so the whole token lifecycle is auditable in one
// place rather than scattered through component state.

let current: google.maps.places.AutocompleteSessionToken | null = null

// Called when the search field gains focus, and again after each completed
// search. Cheap and idempotent.
export function beginSession(): google.maps.places.AutocompleteSessionToken | null {
  if (typeof google === "undefined" || !google.maps?.places) return null
  current ??= new google.maps.places.AutocompleteSessionToken()
  return current
}

export function currentSession(): google.maps.places.AutocompleteSessionToken | null {
  return current
}

// Call immediately after the closing fetchFields() call. Not calling this is
// the expensive mistake.
export function endSession(): void {
  current = null
}
