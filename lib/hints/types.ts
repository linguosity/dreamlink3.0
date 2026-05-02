export const HINT_IDS = [
  "depth-tier",
  "dream-tabs",
  "share-dream",
] as const;

export type HintId = (typeof HINT_IDS)[number];

// Lower index = higher priority. Only the highest-priority registered,
// undismissed hint is shown at any one time.
export const HINT_PRIORITY: HintId[] = [
  "depth-tier",
  "dream-tabs",
  "share-dream",
];
