import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Web Crypto API
Object.defineProperty(window, 'crypto', {
  value: {
    subtle: {
      generateKey: vi.fn(),
      exportKey: vi.fn(),
      importKey: vi.fn(),
      encrypt: vi.fn(),
      decrypt: vi.fn(),
    },
    getRandomValues: vi.fn((arr) => arr),
    randomUUID: () => '1234-5678-9012-3456',
  },
});

// Mock Canvas / WebRTC for Kiosk tests
HTMLCanvasElement.prototype.getContext = () => null;
