import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock server-only so server utilities and fallback resolvers can be unit tested in Vitest jsdom
vi.mock("server-only", () => ({}));

if (typeof window !== "undefined") {
  class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = window.ResizeObserver || MockResizeObserver;
  global.ResizeObserver = global.ResizeObserver || MockResizeObserver;

  if (!window.HTMLElement.prototype.scrollIntoView) {
    window.HTMLElement.prototype.scrollIntoView = () => {};
  }
}

