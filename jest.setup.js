// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    };
  },
  usePathname() {
    return '';
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: props => {
     
    return <img {...props} />;
  },
}));

// Provide a minimal global fetch to satisfy libraries that default to it.
// Unit tests should stub network at the client level; this is a safety net.
if (typeof globalThis.fetch === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.fetch = jest.fn(async () => {
    throw new Error('Unexpected global fetch call in tests');
  });
}
