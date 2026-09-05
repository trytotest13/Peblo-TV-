import '@testing-library/jest-dom'

// jsdom does not implement localStorage — polyfill it for API client tests.
const localStorageStore: Record<string, string> = {}
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => localStorageStore[key] ?? null,
    setItem: (key: string, value: string) => {
      localStorageStore[key] = value
    },
    removeItem: (key: string) => {
      delete localStorageStore[key]
    },
    clear: () => {
      Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k])
    },
    get length() {
      return Object.keys(localStorageStore).length
    },
    key: (i: number) => Object.keys(localStorageStore)[i] ?? null,
  },
  writable: true,
})
