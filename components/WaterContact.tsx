import type { IntroPhase } from "@/hooks/useFirstScrollIntro";

type Props = { state: IntroPhase };

export default function WaterContact({ state }: Props) {
  return (
    <div
      aria-hidden="true"
      data-state={state}
      className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-[-6px] w-[86%] h-16"
    >
      <div
        data-state={state}
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px]
                   rounded-full
                   bg-[radial-gradient(ellipse_at_center,#ffffff_0%,transparent_70%)]
                   opacity-70 blur-[1.5px]
                   animate-foam-pulse
                   data-[state=highlight]:animate-foam-burst"
      />

      <span className="ripple ripple-1" />
      <span className="ripple ripple-2" />

      <span
        data-state={state}
        className="ripple-burst data-[state=highlight]:animate-ripple-once"
      />
    </div>
  );
}
