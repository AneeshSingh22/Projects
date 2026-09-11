"use client"

import { useCallback, useState } from "react"
import { Map, type MapMouseEvent } from "@vis.gl/react-google-maps"
import { MapMountCounter } from "./MapMountCounter"
import { SearchPill } from "./SearchPill"
import { PlacePin } from "./PlacePin"
import { PoiPrompt, type PoiCandidate } from "./PoiPrompt"
import { CustomPinPrompt, type PinCandidate } from "./CustomPinPrompt"
import { PlaceSheet } from "@/components/visit/PlaceSheet"
import { StorageMeter } from "@/components/visit/StorageMeter"
import { OfflineBanner } from "@/components/pwa/OfflineBanner"
import { CategoryPanel } from "./CategoryPanel"
import { MapController } from "./MapController"
import type { PlaceCategory } from "@/lib/categories"
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

  // When true, the sheet opens straight into the visit form rather than the
  // history view. Set by the "I ate here" path so adding a place and recording
  // the meal is one continuous action.
  const [openToLog, setOpenToLog] = useState(false)
  const [filter, setFilter] = useState<PlaceCategory | null>(null)
  const [panTo, setPanTo] = useState<{ lat: number; lng: number } | null>(null)

  const handleAdded = useCallback(
    (place: PlaceMarker, alreadyExisted: boolean, thenLog = false) => {
      setPlaces((prev) =>
        prev.some((p) => p.id === place.id) ? prev : [place, ...prev],
      )
      setSelectedId(place.id)
      setOpenToLog(thenLog)
      // No toast when going straight to the form - the sheet opening is
      // feedback enough, and a toast would cover the fields.
      if (!thenLog) {
        setToast(
          alreadyExisted
            ? `${place.name} is already on your map`
            : `Added ${place.name}`,
        )
        setTimeout(() => setToast(null), 2600)
      }
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
        // Already on the map: open its sheet rather than offering to add it
        // again. The sheet's own "Log a visit" button is right there.
        setSelectedId(existing.id)
        setOpenToLog(false)
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

  // Filtering hides pins from the map; it never refetches. Everything is
  // already in memory, so this is a render-time concern only.
  const visiblePlaces = filter
    ? places.filter((p) => p.category === filter)
    : places

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
        <MapController target={panTo} onDone={() => setPanTo(null)} />
        {/* Data-driven children. Section 5, Rule 3. */}
        {visiblePlaces.map((p) => (
          <PlacePin
            key={p.id}
            place={p}
            selected={p.id === selectedId}
            onSelect={(pl) => {
              setSelectedId(pl.id)
              setOpenToLog(false)
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
        openToLog={openToLog}
        onClose={() => {
          setSelectedId(null)
          setOpenToLog(false)
        }}
        onChanged={refreshPlaces}
      />

      {/* Storage total - section 9, Phase 4. Free tier is 1GB and knowing where
          you stand is the difference between noticing and being surprised. */}
      {/* Counts panel. A sibling of the map like every other overlay. */}
      <div className="pointer-events-none absolute top-20 right-4 z-10 flex justify-end">
        <CategoryPanel
          places={places}
          activeFilter={filter}
          onFilterChange={setFilter}
          onSelectPlace={(p) => {
            setPanTo({ lat: p.lat, lng: p.lng })
            setSelectedId(p.id)
            setOpenToLog(false)
          }}
        />
      </div>

      <OfflineBanner />
      <StorageMeter />

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
