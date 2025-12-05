// src/test/setupTests.js
import '@testing-library/jest-dom/vitest'

// stub alert so components can call it without crashing
if (typeof window !== "undefined") {
  window.alert = vi.fn();
}