"use client"

import { useCallback, useState } from "react"
import { Map, type MapMouseEvent } from "@vis.gl/react-google-maps"
import { MapMountCounter } from "./MapMountCounter"
import { SearchPill } from "./SearchPill"
import { PlacePin } from "./PlacePin"
import { PoiPrompt, type PoiCandidate } from "./PoiPrompt"
import { CustomPinPrompt, type PinCandidate } from "./CustomPinPrompt"
import { PlaceSheet } from "@/components/visit/PlaceSheet"
import { getPlaces } from "@/app/actions/refresh"
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
  const [dropped, setDropped] = useState<PinCandidate | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Long-press to drop a custom pin - plan.md section 9, Phase 2.
  //
  // Implemented with the map's own `contextmenu` event rather than hand-rolled
  // pointer timers. Browsers already synthesise contextmenu from a touch
  // long-press, and Google delivers an exact latLng with it.
  //
  // The hand-rolled version this replaces had two bugs worth remembering:
  // React nulls `event.currentTarget` once the handler returns, so reading it
  // inside the timer always failed; and converting a pixel to a coordinate by
  // interpolating linearly between the viewport bounds is wrong in latitude,
  // because Mercator is non-linear on that axis. Both disappear here.
  const handleLongPress = useCallback((e: MapMouseEvent) => {
    const latLng = e.detail.latLng
    if (!latLng) return
    e.stop()
    setPoi(null)
    setDropped({ lat: latLng.lat, lng: latLng.lng })
  }, [])

  // Re-read places after a visit is logged: logging flips want_to_try to
  // visited, and the pin has to recolour to match (section 9, Phase 3).
  const refreshPlaces = useCallback(async () => {
    const fresh = await getPlaces()
    setPlaces(fresh)
  }, [])

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

  const selected = places.find((p) => p.id === selectedId) ?? null

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
        onContextmenu={handleLongPress}
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

      {dropped && (
        <CustomPinPrompt
          candidate={dropped}
          onAdded={handleAdded}
          onDismiss={() => setDropped(null)}
        />
      )}

      {poi && !dropped && (
        <PoiPrompt
          candidate={poi}
          onAdded={handleAdded}
          onDismiss={() => setPoi(null)}
        />
      )}

      {/* Sibling of the map, never a wrapper. Opening, closing and dragging
          the sheet re-renders only this subtree - the map instance is never
          touched, which is what keeps the mount count at 1. */}
      <PlaceSheet
        place={selected}
        onClose={() => setSelectedId(null)}
        onChanged={refreshPlaces}
      />

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
