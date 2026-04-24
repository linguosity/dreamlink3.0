export default function WaterLayer() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-[-10%] bottom-[-24px] h-28 overflow-hidden"
    >
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 400 112"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(191, 219, 254)" stopOpacity="0.15" />
            <stop offset="60%" stopColor="rgb(96, 165, 250)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="rgb(37, 99, 235)" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <path
          d="M0 70 Q 100 50 200 65 T 400 60 L 400 112 L 0 112 Z"
          fill="url(#waterGrad)"
          opacity="0.55"
          className="animate-wave-back"
        />
        <path
          d="M0 82 Q 100 66 200 78 T 400 72 L 400 112 L 0 112 Z"
          fill="url(#waterGrad)"
          opacity="0.85"
          className="animate-wave-front"
        />
      </svg>
    </div>
  );
}
