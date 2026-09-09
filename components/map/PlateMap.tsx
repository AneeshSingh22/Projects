"use client"

import { Map } from "@vis.gl/react-google-maps"
import { MapMountCounter } from "./MapMountCounter"

// Shaw, DC — plan.md section 9, Phase 1.
const SHAW_DC = { lat: 38.9126, lng: -77.0219 }
const DEFAULT_ZOOM = 15

// plan.md section 5, Rule 2: this is mounted once and never conditionally
// rendered. Overlays belong beside it as siblings, never as wrappers.
//
// Forbidden, all of which remount the map and bill again:
//   {isSheetOpen && <PlateMap />}
//   <PlateMap key={selectedPlaceId} />
//   {loading ? <Spinner /> : <PlateMap />}
export function PlateMap() {
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID

  return (
    <Map
      // A vector Map ID is required for both AdvancedMarker and cloud styling
      // (section 10). Styling is configured on the Map ID in the Cloud console,
      // never in JS — passing `styles` here would silently downgrade the map to
      // raster and break advanced markers.
      mapId={mapId}
      defaultCenter={SHAW_DC}
      defaultZoom={DEFAULT_ZOOM}
      // `default*` props, not `center`/`zoom`. The controlled versions would
      // make every pan a React state update and fight the user's gestures.
      gestureHandling="greedy"
      disableDefaultUI
      // Tilt and rotation are off at the Map ID level too. Their two-finger
      // gestures collide with pinch-zoom on a phone, and section 8 wants a flat
      // map.
      reuseMaps
      className="absolute inset-0 h-full w-full"
    >
      <MapMountCounter />
    </Map>
  )
}
