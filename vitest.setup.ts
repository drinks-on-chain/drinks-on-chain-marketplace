import "@testing-library/jest-dom/vitest";

// jsdom no trae `ResizeObserver` y las primitivas de Radix (casilla, hoja) lo usan al medir.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
