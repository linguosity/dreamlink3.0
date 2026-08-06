// components/Wordmark.tsx
//
// The DreamRiver wordmark — v3 "Deep Current" spec.
//
// Renders "DreamRiver" in Quicksand 500, mixed case, never italic (see
// HANDOFF-v3.md §3/§4). Pairs with the mark (see <BrandIcon/> or
// <DrLogo variant="icon"/>) to form the canonical brand lockup. Use the
// .wordmark utility class for one-off inline cases (e.g. in marketing
// prose); use this component for every navigational/UI usage so the type
// is consistent.
//
// History: Blanka all-caps `DREAMR-I-VER` (v1) → italic serif (v2
// "Moonwater") → Quicksand upright (v3 "Deep Current", current). The v2
// italic serif read as "sacred / journaling"; Quicksand keeps that warmth
// without sacrificing the 16px-floor legibility rule.

export default function Wordmark({
  className = "",
}: {
  className?: string;
}) {
  return (
    <span
      className={`wordmark inline-block ${className}`}
      aria-label="DreamRiver"
    >
      DreamRiver
    </span>
  );
}
