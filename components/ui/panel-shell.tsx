"use client"

import { useEffect } from "react"
import { X } from "lucide-react"

// Shared shell for the floating panels (Deals, History, Places).
//
// The bug this fixes: each panel rendered its expanded body as a flex child in
// the top bar, a row laid out for small pills. On a phone that row is roughly
// 360px wide, so a panel asking for 92vw got squeezed by flexbox - the header
// compressed and its close button became unreachable. It looked like a missing
// X; it was actually a layout that never had room for one.
//
// So an open panel stops being a pill in a row and becomes a positioned surface:
//
//   phone   a bottom sheet pinned to the viewport, height capped against the
//           dynamic viewport and the safe area, header and footer fixed with
//           only the middle scrolling. Works in portrait AND landscape because
//           nothing assumes a height - it is all max-height plus flex.
//   desktop the anchored dropdown it already was, which had room all along.
//
// The close button lives here rather than in each panel, so it cannot be
// forgotten or pushed out of reach again.
export function PanelShell({
  title,
  onClose,
  headerExtra,
  footer,
  children,
  widthClass = "sm:w-72",
  alignClass = "sm:left-0",
}: {
  title: React.ReactNode
  onClose: () => void
  headerExtra?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
  widthClass?: string
  // Which edge the desktop dropdown hangs from. The right-hand pill needs
  // sm:right-0 or its panel runs off the viewport.
  alignClass?: string
}) {
  // Escape closes, matching every other dismissible surface in the app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <>
      {/* Phone-only scrim. Gives a tap target to dismiss and separates the
          sheet from a busy map behind it. Hidden on desktop, where the panel
          is a dropdown and the map must stay interactive. */}
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        className="bg-ink/40 pointer-events-auto fixed inset-0 z-30 sm:hidden"
      />

      <div
        className={`bg-surface/97 border-line pointer-events-auto z-40 flex flex-col overflow-hidden border backdrop-blur-xl duration-200 animate-in fade-in
          fixed inset-x-0 bottom-0 rounded-t-3xl slide-in-from-bottom-4
          sm:absolute sm:inset-x-auto sm:bottom-auto sm:top-full sm:mt-2 sm:rounded-2xl sm:slide-in-from-top-2 ${widthClass} ${alignClass}`}
        style={{
          // Capped, never fixed. A fixed height is what made this unusable in
          // landscape, where 78dvh of a 393px viewport leaves no room for a
          // header. max-height plus flex-col means the sheet is as tall as its
          // content up to the cap, in any orientation.
          maxHeight: "min(82dvh, 100dvh - 5rem)",
          boxShadow: "var(--shadow-float)",
        }}
        role="dialog"
        aria-modal="false"
      >
        {/* Grab affordance, phone only. Purely a signal that this is a sheet;
            dragging is not wired up because tapping the scrim or the X is more
            reliable than a gesture for a panel this size. */}
        <div className="flex shrink-0 justify-center pt-2 sm:hidden">
          <span className="bg-line-strong h-1 w-10 rounded-full" />
        </div>

        <header className="border-line flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">{title}</div>
          <div className="flex shrink-0 items-center gap-1">
            {headerExtra}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              // 44px target. The old one was p-1.5 around a 16px icon, roughly
              // 28px, which is under the minimum for a thumb even when it was
              // on screen.
              className="text-text-dim hover:text-text hover:bg-surface-raised -mr-1.5 grid h-11 w-11 place-items-center rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* The only scrolling region. Header and footer stay put, so the close
            button is reachable no matter how long the content is. */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>

        {footer && (
          <div className="border-line shrink-0 border-t">{footer}</div>
        )}

        {/* Clears the home indicator on a phone. Without it the last row of a
            list sits under the gesture bar and cannot be tapped. */}
        <div
          className="shrink-0 sm:hidden"
          style={{ height: "env(safe-area-inset-bottom, 0px)" }}
        />
      </div>
    </>
  )
}
