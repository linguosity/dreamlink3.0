export default function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-baseline gap-0 font-blanka tracking-wider ${className}`}
      aria-label="DreamRiver"
    >
      <span>DREAMR</span>
      <span
        aria-hidden="true"
        className="not-italic [text-shadow:0_0_0.5px_currentColor]"
      >
        I
      </span>
      <span>VER</span>
    </span>
  );
}
