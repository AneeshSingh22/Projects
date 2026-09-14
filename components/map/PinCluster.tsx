"use client"

import { useEffect, useMemo, useRef } from "react"
import { createRoot, type Root } from "react-dom/client"
import { useMap } from "@vis.gl/react-google-maps"
import {
  MarkerClusterer,
  type Cluster,
  type ClusterStats,
  type Renderer,
} from "@googlemaps/markerclusterer"
import { ratingColor, RATING_NONE, formatRating } from "@/lib/rating/ramp"
import { PinBody } from "./PinBody"
import type { PlaceMarker } from "@/types/db"

// Clustering, using Google's own @googlemaps/markerclusterer.
//
// Zoomed out, nearby pins merge into one bubble carrying the count AND the
// average rating of what it contains. The second part matters more than it
// sounds: a plain count tells you where you have been, while a coloured count
// tells you whether a cluster is worth zooming into - which is the actual
// question when scanning a city.
//
// Lives INSIDE <Map> and uses useMap(), the same pattern as MapController.
// Clustering only ever creates markers on an existing map, never a map, so it
// cannot affect the mount count section 2.2 depends on.
//
// Each marker's content is a React root rendering the SAME PinBody the
// unclustered pins use. Writing a second copy as an HTML string was tried
// first and immediately dropped the category badge - the thing that makes a bar
// distinguishable from a restaurant. One component, one source of truth.

function bubbleElement(count: number, avg: number | null): HTMLElement {
  const el = document.createElement("div")
  const color = avg == null ? RATING_NONE : ratingColor(avg)

  // Scaled by how much it holds, but clamped: a 40-place cluster should read as
  // bigger than a 3-place one without becoming a screen-filling disc.
  const size = Math.min(64, 38 + Math.log2(count + 1) * 7)

  el.style.cssText = `
    position: relative;
    display: grid;
    place-items: center;
    width: ${size}px;
    height: ${size}px;
    border-radius: 9999px;
    background: ${color};
    border: 3px solid rgba(255,255,255,0.95);
    box-shadow: 0 2px 8px rgb(14 22 24 / 0.45);
    color: #0E1618;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    line-height: 1;
    cursor: pointer;
    transition: transform 160ms ease-out;
  `

  const n = document.createElement("span")
  n.textContent = String(count)
  n.style.fontSize = `${Math.min(18, 12 + Math.log2(count + 1))}px`
  el.appendChild(n)

  if (avg != null) {
    const r = document.createElement("span")
    r.textContent = formatRating(avg)
    r.style.cssText = `
      position:absolute; bottom:-6px; right:-6px;
      background:#172427; color:#EDE8E0;
      border-radius:9999px; padding:1px 5px; font-size:10px; font-weight:600;
      border:1px solid #172427;
    `
    el.appendChild(r)
  }

  // A quiet grow on hover. Section 8 keeps the motion budget small, but a
  // cluster that does not respond at all reads as decoration rather than
  // something you can open.
  el.addEventListener("mouseenter", () => {
    el.style.transform = "scale(1.08)"
  })
  el.addEventListener("mouseleave", () => {
    el.style.transform = "scale(1)"
  })

  return el
}

export function PinCluster({
  places,
  selectedId,
  onSelect,
}: {
  places: PlaceMarker[]
  selectedId: string | null
  onSelect: (place: PlaceMarker) => void
}) {
  const map = useMap()
  const rootsRef = useRef<Root[]>([])

  // Rating by rounded position, so the cluster renderer can colour a bubble by
  // what is inside it - the library hands back markers, not our place objects.
  const ratingByKey = useMemo(() => {
    const m = new Map<string, number | null>()
    for (const p of places) {
      m.set(`${p.lat.toFixed(5)},${p.lng.toFixed(5)}`, p.avg_rating)
    }
    return m
  }, [places])

  const renderer: Renderer = useMemo(
    () => ({
      render(cluster: Cluster, _stats: ClusterStats, renderMap: google.maps.Map) {
        const { count, position, markers } = cluster

        // Unrated places are excluded from the average rather than counted as
        // zero, which would drag any cluster containing a wishlist pin toward
        // grey and misrepresent the places that ARE rated.
        const vals: number[] = []
        for (const mk of markers ?? []) {
          const pos = (mk as google.maps.marker.AdvancedMarkerElement).position
          if (!pos) continue
          const lat = typeof pos.lat === "function" ? pos.lat() : pos.lat
          const lng = typeof pos.lng === "function" ? pos.lng() : pos.lng
          const r = ratingByKey.get(
            `${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`,
          )
          if (r != null) vals.push(r)
        }
        const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null

        return new google.maps.marker.AdvancedMarkerElement({
          map: renderMap,
          position,
          content: bubbleElement(count, avg),
          // Above individual pins, so a bubble is never hidden behind one.
          zIndex: 100 + count,
        })
      },
    }),
    [ratingByKey],
  )

  useEffect(() => {
    if (!map) return

    const roots: Root[] = []
    const markers = places.map((p) => {
      const host = document.createElement("div")
      host.style.cursor = "pointer"
      host.addEventListener("click", () => onSelect(p))

      const root = createRoot(host)
      root.render(<PinBody place={p} selected={p.id === selectedId} />)
      roots.push(root)

      return new google.maps.marker.AdvancedMarkerElement({
        position: { lat: p.lat, lng: p.lng },
        content: host,
        title: p.name,
        zIndex: p.id === selectedId ? 50 : 1,
      })
    })

    rootsRef.current = roots

    const clusterer = new MarkerClusterer({
      map,
      markers,
      renderer,
      // Clicking a bubble zooms to fit its contents, which is what makes the
      // merge and split read as one continuous gesture rather than two states.
      onClusterClick: (_e, cluster, clickedMap) => {
        if (cluster.bounds) clickedMap.fitBounds(cluster.bounds, 64)
      },
    })

    return () => {
      clusterer.clearMarkers()
      clusterer.setMap(null)
      for (const m of markers) m.map = null
      // Unmounted in a microtask: React warns if a root is torn down while it
      // is still rendering, which happens when this effect re-runs quickly.
      const toUnmount = roots
      queueMicrotask(() => {
        for (const r of toUnmount) r.unmount()
      })
      rootsRef.current = []
    }
  }, [map, places, selectedId, onSelect, renderer])

  return null
}
