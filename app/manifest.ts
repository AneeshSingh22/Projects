import type { MetadataRoute } from "next"

// plan.md section 9, Phase 6. Next 16 generates /manifest.webmanifest from this
// file, so there is no static file in public/ to keep in sync.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Plate",
    short_name: "Plate",
    description: "A private map of everywhere you have eaten.",
    start_url: "/",
    // standalone is what removes Safari's chrome when launched from the home
    // screen - section 9's acceptance criterion.
    display: "standalone",
    orientation: "portrait",
    // Both match --color-ink, so the splash screen and status bar are the same
    // deep blue-green as the map surround rather than flashing white.
    background_color: "#0E1618",
    theme_color: "#0E1618",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        // maskable lets Android crop to whatever shape the launcher uses
        // without clipping the artwork.
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
