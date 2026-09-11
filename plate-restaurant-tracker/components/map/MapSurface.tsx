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
import { AskChat } from "./AskChat"
import { DealsPanel } from "@/components/deals/DealsPanel"
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
  // Which pins a natural-language question narrowed the map to. null means no
  // question is active, which is different from a question that matched
  // nothing - that case must show an empty map, not every pin.
  const [askIds, setAskIds] = useState<string[] | null>(null)


  // Used when a question resolves to one place: move the map there AND open
  // the sheet, rather than leaving the user to find the pin themselves.
  const flyToPlace = useCallback((p: PlaceMarker) => {
    setPanTo({ lat: p.lat, lng: p.lng })
    setSelectedId(p.id)
    setOpenToLog(false)
  }, [])

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
  const visiblePlaces = (() => {
    let out = places
    // Only narrow when a question actually matched something.
    //
    // This previously checked `if (askIds)`, and an empty array is truthy in
    // JavaScript - so a question that matched nothing hid every pin on the map
    // and kept them hidden after switching back to adding places. The pins
    // looked permanently lost when they had only been filtered to zero.
    if (askIds && askIds.length > 0) {
      const keep = new Set(askIds)
      out = out.filter((p) => keep.has(p.id))
    }
    if (filter) out = out.filter((p) => p.category === filter)
    return out
  })()

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
      {/* One top bar rather than three floating blocks.
          
          Deals and the places count anchor to the corners; the search bar sits
          between them on a wide screen and drops to its own row on a phone.
          Measured: squeezed between the pills at phone width the input gets
          135-190px, which is not enough to type a restaurant name into. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 p-4">
        <div className="flex items-start gap-3">
          <DealsPanel onSelectPlace={flyToPlace} />

          {/* Hidden on phones, where it lives in the row below instead. */}
          <div className="hidden min-w-0 flex-1 justify-center sm:flex">
            <div className="w-full max-w-md">
              <SearchPill onAdded={handleAdded} />
            </div>
          </div>

          {/* Pushes the count to the right edge once the bar above is hidden. */}
          <div className="ml-auto sm:ml-0">
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
        </div>

        {/* Phone-only search row, directly under the pills. */}
        <div className="mt-3 sm:hidden">
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

      {/* Sibling of the map, never a wrapper. Opening, closing and dragging the
          sheet re-renders only this subtree - the map instance is never
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

      {/* Ask, bottom-right. Its own surface rather than sharing the search bar:
          adding a place and interrogating the ones you have are different jobs. */}
      <div className="absolute right-4 bottom-4 z-20 flex flex-col items-end">
        <AskChat
          onResults={setAskIds}
          onClear={() => setAskIds(null)}
          onSelectPlace={flyToPlace}
          onFlyTo={flyToPlace}
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
