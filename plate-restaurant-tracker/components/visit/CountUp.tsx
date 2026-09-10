"use client"

import { useEffect, useRef, useState } from "react"
import { formatRating } from "@/lib/rating/ramp"

// plan.md section 8: "One orchestrated moment: the sheet sliding up on pin tap,
// with the rating numeral counting up from 0 to its value over ~400ms. That is
// the whole motion budget."
//
// And: "honor prefers-reduced-motion by skipping the count-up."
//
// Progress is held in a ref and mirrored into a single state value only while
// the animation is running. The reduced-motion case never calls setState at
// all - it renders the final value on the first pass, so there is no extra
// render and no flash of an animating number for someone who asked for less
// motion.
export function CountUp({
  value,
  durationMs = 400,
}: {
  value: number
  durationMs?: number
}) {
  // Initialised from the final value, so the very first render is already
  // correct if motion is reduced or the effect never runs.
  const [progress, setProgress] = useState(1)
  const started = useRef(false)

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduced) return

    started.current = true
    let raf = 0
    const start = performance.now()

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      // Ease-out cubic: fast at first, settling at the end. A linear count
      // reads mechanical.
      setProgress(1 - Math.pow(1 - t, 3))
      if (t < 1) raf = requestAnimationFrame(tick)
    }

    // Kicked off in a frame rather than synchronously, so the effect body
    // itself never calls setState.
    raf = requestAnimationFrame((now) => {
      setProgress(0)
      tick(now)
    })

    return () => cancelAnimationFrame(raf)
  }, [value, durationMs])

  const shown = value * progress
  return <>{formatRating(Math.round(shown * 10) / 10)}</>
}
