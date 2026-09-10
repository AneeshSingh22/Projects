"use client"

import imageCompression from "browser-image-compression"

// Client-side compression - plan.md section 9, Phase 4.
//
// Compressing in the browser rather than on the server matters for more than
// storage: a modern phone camera produces 3-5MB per shot, and uploading that
// over a patchy connection outside a restaurant is the difference between
// "logged in 15 seconds" and "gave up". Section 1 puts a 15-second log at the
// top of the app's jobs.
//
// Two outputs per photo:
//   full  - long edge 1600px, quality 0.8, target ~300KB. What you see when you
//           tap a photo.
//   thumb - long edge 400px, target ~30KB. What the strip in the sheet loads.
//
// The split exists because the sheet may show a dozen thumbnails at once.
// Loading full-size images there would cost megabytes to render a row of
// 60px squares.

export type CompressedPair = {
  full: File
  thumb: File
  width: number
  height: number
}

async function dimensions(file: File): Promise<{ w: number; h: number }> {
  // createImageBitmap is the cheap path and avoids the object-URL dance. It
  // decodes without attaching anything to the DOM.
  const bitmap = await createImageBitmap(file)
  const out = { w: bitmap.width, h: bitmap.height }
  bitmap.close()
  return out
}

export async function compressForUpload(file: File): Promise<CompressedPair> {
  if (!file.type.startsWith("image/")) {
    throw new Error("That file is not an image.")
  }

  const full = await imageCompression(file, {
    maxWidthOrHeight: 1600,
    maxSizeMB: 0.3,
    initialQuality: 0.8,
    useWebWorker: true,
    // HEIC from an iPhone is converted here. Left as-is it would upload fine
    // and then fail to render in most browsers.
    fileType: "image/jpeg",
  })

  const thumb = await imageCompression(file, {
    maxWidthOrHeight: 400,
    maxSizeMB: 0.03,
    initialQuality: 0.7,
    useWebWorker: true,
    fileType: "image/jpeg",
  })

  const { w, h } = await dimensions(full)

  return { full, thumb, width: w, height: h }
}
