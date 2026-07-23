"use client";

// components/LocalDateTime.tsx
//
// Renders an ISO timestamp in the viewer's local timezone. Server-rendered
// HTML (and the first client paint) shows a deterministic UTC label so
// hydration matches, then an effect swaps in the local-timezone formatting.
// Used for blog scheduling surfaces (admin list, editor badge, draft-preview
// banner) where Justin should see the go-live time in HIS timezone, not the
// server's.

import { useEffect, useState } from "react";

const FORMAT: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
};

export function LocalDateTime({
  iso,
  className,
}: {
  iso: string;
  className?: string;
}) {
  const [label, setLabel] = useState(
    () =>
      new Date(iso).toLocaleString("en-US", { ...FORMAT, timeZone: "UTC" }) +
      " UTC"
  );
  useEffect(() => {
    setLabel(new Date(iso).toLocaleString(undefined, FORMAT));
  }, [iso]);

  return (
    <time dateTime={iso} className={className}>
      {label}
    </time>
  );
}
