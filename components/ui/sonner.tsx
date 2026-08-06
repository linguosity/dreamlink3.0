// components/ui/sonner.tsx
"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

export function Toaster({ ...props }: ToasterProps) {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="bottom-right"
      className="toaster group"
      toastOptions={{
        // Toasts are cards, and cards are theme tokens. These classes were
        // hardcoded bg-white / text-black / gray-200, which meant every toast
        // in dark mode was a white slab — the one element on screen that
        // ignored the theme, and it appears over the top of everything else.
        classNames: {
          toast:
            "group bg-card text-card-foreground border border-border rounded-2xl shadow-md p-4 flex items-start gap-3",
          title: "font-medium text-base",
          description: "text-sm text-muted-foreground",
          // Action button (e.g. Undo) in the brand primary — Indigo in light,
          // Violet Light in dark, via the token swap.
          actionButton:
            "ml-auto bg-primary text-primary-foreground px-3 py-1 rounded-lg text-sm font-semibold hover:bg-primary-hover",
          cancelButton: "text-muted-foreground hover:text-foreground",
          closeButton:
            "bg-card text-muted-foreground border-border hover:text-foreground",
        },
        // auto-dismiss after 8 seconds (long enough to read, short enough to not block)
        duration: 8000,
        // show a close (×) button by default
        closeButton: true,
      }}
      {...props}
    />
  );
}