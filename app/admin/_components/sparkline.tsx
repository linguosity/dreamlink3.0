// Inline-SVG sparkline. Stateless, server-renderable.
// Variant "primary" uses --primary blue; "gold" uses --gold for accent metrics.
export function Sparkline({
  data,
  width = 220,
  height = 36,
  variant = "primary",
}: {
  data: number[];
  width?: number;
  height?: number;
  variant?: "primary" | "gold";
}) {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const stepX = width / Math.max(data.length - 1, 1);
  const points = data
    .map(
      (v, i) =>
        `${i * stepX},${height - ((v - min) / range) * (height - 4) - 2}`,
    )
    .join(" ");
  const areaPoints = `0,${height} ${points} ${width},${height}`;
  const stroke =
    variant === "gold" ? "var(--gold)" : "var(--primary)";
  const gradId = `spark-grad-${variant}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ display: "block", width: "100%" }}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.18" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradId})`} />
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
