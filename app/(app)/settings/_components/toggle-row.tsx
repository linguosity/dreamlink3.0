"use client";

import { LucideIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export function ToggleRow({
  Icon,
  title,
  desc,
  value,
  onChange,
  id,
}: {
  Icon?: LucideIcon;
  title: string;
  desc?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  id?: string;
}) {
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-3.5 px-3.5 py-3 rounded-[var(--radius-lg)] cursor-pointer transition-colors hover:bg-muted"
    >
      {Icon && (
        <span className="w-8 h-8 rounded-lg bg-accent text-accent-foreground grid place-items-center shrink-0">
          <Icon className="w-4 h-4" />
        </span>
      )}
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium">{title}</span>
        {desc && (
          <span className="block text-[12.5px] text-muted-foreground mt-0.5">
            {desc}
          </span>
        )}
      </span>
      <Switch id={id} checked={value} onCheckedChange={onChange} />
    </label>
  );
}
