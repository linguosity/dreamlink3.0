import { ReactNode } from "react";

export function SectionHead({
  eyebrow,
  title,
  desc,
  action,
}: {
  eyebrow?: string;
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        {eyebrow && (
          <div className="text-[11px] font-semibold tracking-[0.12em] uppercase text-gold mb-1.5">
            {eyebrow}
          </div>
        )}
        <h2 className="font-serif text-[26px] font-normal leading-[1.15] text-foreground">
          {title}
        </h2>
        {desc && (
          <p className="text-[13.5px] text-muted-foreground mt-1 max-w-[560px]">
            {desc}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
