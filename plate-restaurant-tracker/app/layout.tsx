import type { Metadata, Viewport } from "next"
import { Fraunces, Geist } from "next/font/google"
import { MapsProvider } from "@/components/map/MapsProvider"
import "./globals.css"

// plan.md section 8. Two families, clearly distinct.
//
// Geist Sans: every interface element. Neutral by design so it disappears
// behind the content.
const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
})

// Fraunces: place names, rating numerals, section headings. Chosen for the
// weight in its numerals, because the rating is the loudest thing in the app.
// `opsz` is the optical-size axis — pinned high so the large rating numeral
// gets the high-contrast display cut rather than the text cut.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
})

export const metadata: Metadata = {
  title: "Plate",
  description: "A private map of everywhere you have eaten.",
}

export const viewport: Viewport = {
  // Matches --color-ink, so the iOS status bar blends into the map surround
  // instead of sitting on a white band.
  themeColor: "#0e1618",
  // The map is full-bleed; letting the user zoom the document would let them
  // pinch the UI chrome off screen.
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="bg-ink text-text min-h-full font-sans">
        {/* plan.md section 5, Rule 1: the provider wraps everything and never
            unmounts, so the Maps script is fetched once per session. It sits
            above {children} so client-side navigation cannot tear it down. */}
        <MapsProvider>{children}</MapsProvider>
      </body>
    </html>
  )
}
