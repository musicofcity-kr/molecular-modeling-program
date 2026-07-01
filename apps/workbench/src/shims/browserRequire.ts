import Raphael from 'raphael';

type BrowserRequire = (moduleName: string) => unknown;

declare global {
  interface Window {
    Raphael?: unknown;
  }
}

const raphaelModule = (Raphael as { default?: unknown }).default ?? Raphael;

if (typeof window !== 'undefined') {
  const browserGlobal = globalThis as unknown as {
    require?: BrowserRequire;
  };
  const previousRequire = browserGlobal.require;

  window.Raphael = raphaelModule;
  browserGlobal.require = (moduleName: string) => {
    if (moduleName === 'raphael') {
      return raphaelModule;
    }

    if (previousRequire) {
      return previousRequire(moduleName);
    }

    throw new Error(`Browser require shim does not provide module: ${moduleName}`);
  };
}
