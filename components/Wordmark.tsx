// components/Wordmark.tsx
//
// The DreamRiver wordmark — v2 Moonwater spec.
//
// Renders "DreamRiver" in Cormorant Garamond italic 500, mixed case. Pairs
// with the contained Moonwater squircle (see <AppIcon><MoonwaterMark/>) to
// form the canonical brand lockup. Use the .wordmark utility class for
// one-off inline cases (e.g. in marketing prose); use this component for
// every navigational/UI usage so the type is consistent.
//
// Previously: Blanka all-caps `DREAMR-I-VER` composition. Retired with
// the v2 audit rollout; the italic serif reads as "sacred / journaling"
// rather than "modern / techy" and matches the brand audit's reference.

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
