"use client"

import { useCallback, useState } from "react"
import { Map, type MapMouseEvent } from "@vis.gl/react-google-maps"
import { MapMountCounter } from "./MapMountCounter"
import { SearchPill } from "./SearchPill"
import { PlacePin } from "./PlacePin"
import { PoiPrompt, type PoiCandidate } from "./PoiPrompt"
import type { PlaceMarker } from "@/types/db"

const SHAW_DC = { lat: 38.9126, lng: -77.0219 }
const DEFAULT_ZOOM = 15

// The one component that owns map-adjacent state.
//
// plan.md section 5: selected-place state lives in a component BESIDE the map,
// never in one that wraps it. Here the <Map> and the overlays are siblings, so
// selection and search re-render the overlays while the map instance is
// untouched.
export function MapSurface({ initialPlaces }: { initialPlaces: PlaceMarker[] }) {
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID

  const [places, setPlaces] = useState<PlaceMarker[]>(initialPlaces)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [poi, setPoi] = useState<PoiCandidate | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const handleAdded = useCallback(
    (place: PlaceMarker, alreadyExisted: boolean) => {
      setPlaces((prev) =>
        prev.some((p) => p.id === place.id) ? prev : [place, ...prev],
      )
      setSelectedId(place.id)
      setToast(
        alreadyExisted ? `${place.name} is already on your map` : `Added ${place.name}`,
      )
      setTimeout(() => setToast(null), 2600)
    },
    [],
  )

  // Tapping one of Google's own restaurant labels. plan.md section 9 Phase 2,
  // and the gotcha in section 10.
  const handleMapClick = useCallback(
    (e: MapMouseEvent) => {
      const placeId = e.detail.placeId
      if (!placeId) {
        setPoi(null)
        setSelectedId(null)
        return
      }

      // Without stop(), Google opens its own info window on top of our UI.
      e.stop()

      const existing = places.find((p) => p.google_place_id === placeId)
      if (existing) {
        setSelectedId(existing.id)
        setPoi(null)
        return
      }

      const latLng = e.detail.latLng
      setPoi({
        placeId,
        lat: latLng?.lat ?? SHAW_DC.lat,
        lng: latLng?.lng ?? SHAW_DC.lng,
      })
    },
    [places],
  )

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      {/* Always mounted. Never conditional, never keyed. Section 5, Rule 2. */}
      <Map
        mapId={mapId}
        defaultCenter={SHAW_DC}
        defaultZoom={DEFAULT_ZOOM}
        gestureHandling="greedy"
        disableDefaultUI
        reuseMaps
        onClick={handleMapClick}
        className="absolute inset-0 h-full w-full"
      >
        <MapMountCounter />
        {/* Data-driven children. Section 5, Rule 3. */}
        {places.map((p) => (
          <PlacePin
            key={p.id}
            place={p}
            selected={p.id === selectedId}
            onSelect={(pl) => {
              setSelectedId(pl.id)
              setPoi(null)
            }}
          />
        ))}
      </Map>

      {/* Overlays: siblings of the map, free to re-render and unmount. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-4">
        <div className="mx-auto max-w-md">
          <SearchPill onAdded={handleAdded} />
        </div>
      </div>

      {poi && (
        <PoiPrompt
          candidate={poi}
          onAdded={handleAdded}
          onDismiss={() => setPoi(null)}
        />
      )}

      {toast && (
        <div className="pointer-events-none absolute inset-x-0 bottom-8 z-20 flex justify-center px-4">
          <div className="bg-surface/95 border-line text-text rounded-full border px-4 py-2 text-sm shadow-lg backdrop-blur-md">
            {toast}
          </div>
        </div>
      )}
    </div>
  )
}
