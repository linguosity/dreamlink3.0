"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { dismissHintAction } from "@/app/actions/dismiss-hint";
import { HINT_PRIORITY, type HintId } from "./types";

type Ctx = {
  isActive: (id: HintId) => boolean;
  dismiss: (id: HintId) => void;
  register: (id: HintId) => () => void;
};

const HintsContext = createContext<Ctx | null>(null);

export function HintsProvider({
  initialDismissed,
  children,
}: {
  initialDismissed: HintId[];
  children: React.ReactNode;
}) {
  const [dismissed, setDismissed] = useState<Set<HintId>>(
    () => new Set(initialDismissed),
  );
  const [registered, setRegistered] = useState<Set<HintId>>(() => new Set());

  const register = useCallback((id: HintId) => {
    setRegistered((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    return () => {
      setRegistered((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    };
  }, []);

  const activeId = useMemo<HintId | null>(() => {
    for (const id of HINT_PRIORITY) {
      if (registered.has(id) && !dismissed.has(id)) return id;
    }
    return null;
  }, [registered, dismissed]);

  const dismiss = useCallback((id: HintId) => {
    setDismissed((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    void dismissHintAction(id);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      isActive: (id) => activeId === id,
      dismiss,
      register,
    }),
    [activeId, dismiss, register],
  );

  return (
    <HintsContext.Provider value={value}>{children}</HintsContext.Provider>
  );
}

export function useHints(): Ctx {
  const ctx = useContext(HintsContext);
  // Hints are optional — tree without provider should no-op silently.
  if (!ctx) {
    return {
      isActive: () => false,
      dismiss: () => {},
      register: () => () => {},
    };
  }
  return ctx;
}

// Re-export so consumers only import from this module.
export { HINT_PRIORITY };
export type { HintId };
