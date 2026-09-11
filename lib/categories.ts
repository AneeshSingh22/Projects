import type { LucideIcon } from "lucide-react"
import { UtensilsCrossed, Drama, Dumbbell, Trees, MapPin } from "lucide-react"

// Categories, and how a Google place type maps onto one.
//
// The app began as a restaurant map. The data model was always general - a
// place is a location, a visit is one occasion there - so this adds a dimension
// rather than changing the shape of anything.

export type PlaceCategory =
  | "food_drink"
  | "entertainment"
  | "sports"
  | "outdoors"
  | "other"

export const CATEGORY_ORDER: PlaceCategory[] = [
  "food_drink",
  "entertainment",
  "sports",
  "outdoors",
  "other",
]

type CategoryMeta = {
  label: string
  icon: LucideIcon
  // What the "dishes" field is called here. Section 8 wants sentence case and
  // plain language, not jargon.
  detailLabel: string
  detailPlaceholder: string
  // Google's includedPrimaryTypes for autocomplete when this filter is active.
  searchTypes: string[]
}

export const CATEGORIES: Record<PlaceCategory, CategoryMeta> = {
  food_drink: {
    label: "Food & drink",
    icon: UtensilsCrossed,
    detailLabel: "Dishes",
    detailPlaceholder: "tonkotsu, gyoza",
    searchTypes: ["restaurant", "cafe", "bar", "bakery"],
  },
  entertainment: {
    label: "Entertainment",
    icon: Drama,
    detailLabel: "What did you see or do",
    detailPlaceholder: "concert, late show",
    searchTypes: [
      "movie_theater",
      "performing_arts_theater",
      "night_club",
      "museum",
      "art_gallery",
      "tourist_attraction",
    ],
  },
  sports: {
    label: "Sports",
    icon: Dumbbell,
    detailLabel: "Activity",
    detailPlaceholder: "pickup basketball",
    searchTypes: ["stadium", "gym", "sports_complex", "arena"],
  },
  outdoors: {
    label: "Parks & nature",
    icon: Trees,
    detailLabel: "What did you do",
    detailPlaceholder: "walked the loop",
    searchTypes: ["park", "hiking_area", "national_park", "beach"],
  },
  other: {
    label: "Other",
    icon: MapPin,
    detailLabel: "What stood out",
    detailPlaceholder: "anything worth remembering",
    searchTypes: [],
  },
}

// Google's primaryType is a long tail of specific values - ramen_restaurant,
// sushi_restaurant, performing_arts_theater. Matching on whole underscore-
// separated words rather than raw substrings.
//
// Raw substring matching was tried first and was wrong: "bar" matches inside
// "barber_shop", filing a barber under food and drink. Splitting on underscores
// and comparing whole words fixes that class of bug, which is otherwise silent
// - the place just lands in the wrong list and nobody notices.
//
// An unrecognised type falling through to "other" is a fine outcome, since the
// UI lets the category be changed in one tap.
const RULES: { match: string[]; category: PlaceCategory }[] = [
  {
    category: "food_drink",
    match: [
      "restaurant", "cafe", "coffee", "bar", "bakery", "food", "meal",
      "ice_cream", "dessert", "brewery", "winery", "pub", "diner", "deli",
    ],
  },
  {
    category: "entertainment",
    match: [
      "theater", "theatre", "cinema", "movie", "night_club", "museum",
      "gallery", "casino", "bowling", "amusement", "concert", "comedy",
      "tourist_attraction", "aquarium", "zoo", "library",
    ],
  },
  {
    category: "sports",
    match: [
      "stadium", "arena", "gym", "fitness", "sports", "golf", "swimming",
      "athletic", "skate", "tennis", "basketball", "soccer", "climbing",
    ],
  },
  {
    category: "outdoors",
    match: [
      "park", "hiking", "trail", "beach", "campground", "garden",
      "natural_feature", "national_park", "forest", "lake", "marina",
    ],
  },
]

// Best guess from Google's type. Deliberately a guess: the UI always lets the
// user change it, because no rule table gets every place right.
export function categoryFromGoogleType(
  primaryType: string | null | undefined,
): PlaceCategory {
  if (!primaryType) return "other"
  const words = primaryType.toLowerCase().split("_")
  for (const rule of RULES) {
    // A rule entry may itself be multi-word ("ice_cream", "night_club"), so
    // those are matched against the whole string; single words are matched
    // against the split parts.
    if (
      rule.match.some((m) =>
        m.includes("_")
          ? primaryType.toLowerCase().includes(m)
          : words.includes(m),
      )
    ) {
      return rule.category
    }
  }
  return "other"
}

// The union of every category's search types, used when no filter is active so
// searching finds anything rather than only restaurants.
export const ALL_SEARCH_TYPES = Array.from(
  new Set(CATEGORY_ORDER.flatMap((c) => CATEGORIES[c].searchTypes)),
)

export function categoryLabel(c: PlaceCategory): string {
  return CATEGORIES[c].label
}
