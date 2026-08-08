// Global setup for Vitest — runs before every test file.

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Every component test that rendered a client component using useRouter() died
// on "invariant expected app router to be mounted". next/navigation's hooks read
// from a context that only App Router provides at runtime, and there is no
// provider to wrap tests in — the router is deliberately not exported. Mocking
// the module is the supported route, and doing it here rather than per-file
// means a component that starts using useRouter() later doesn't silently break
// unrelated suites.
const routerMock = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
};

vi.mock("next/navigation", async () => {
  const actual =
    await vi.importActual<typeof import("next/navigation")>("next/navigation");
  return {
    ...actual,
    useRouter: () => routerMock,
    usePathname: () => "/",
    useSearchParams: () => new URLSearchParams(),
    useParams: () => ({}),
    useSelectedLayoutSegment: () => null,
    useSelectedLayoutSegments: () => [],
  };
});

// Exposed so a test can assert navigation happened, e.g.
//   expect(routerMock.push).toHaveBeenCalledWith("/dreams/123")
export { routerMock };

// Without this, DOM from one test leaks into the next and getBy* queries start
// matching elements a previous test rendered.
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
