import type { RDKitLoader, RDKitModule } from '@rdkit/rdkit';

let rdkitModulePromise: Promise<RDKitModule> | null = null;
let rdkitInitializationCount = 0;
let browserScriptPromise: Promise<void> | null = null;

function locateRDKitWasm(): string {
  if (typeof window === 'undefined') {
    return 'node_modules/@rdkit/rdkit/dist/RDKit_minimal.wasm';
  }

  return '/rdkit/RDKit_minimal.wasm';
}

async function getNodeRDKitLoader(): Promise<RDKitLoader> {
  const packageName = '@rdkit/rdkit';
  const rdkitPackage = (await import(/* @vite-ignore */ packageName)) as unknown as
    | { default: RDKitLoader }
    | RDKitLoader;

  if (typeof rdkitPackage === 'function') {
    return rdkitPackage;
  }

  return rdkitPackage.default;
}

function loadBrowserRDKitScript(): Promise<void> {
  const browserWindow = window as unknown as { initRDKitModule?: RDKitLoader };

  if (browserWindow.initRDKitModule) {
    return Promise.resolve();
  }

  if (!browserScriptPromise) {
    browserScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/rdkit/RDKit_minimal.js';
      script.async = true;
      script.onload = () => {
        resolve();
      };
      script.onerror = () => {
        reject(new Error('RDKit.js script asset failed to load.'));
      };
      document.head.appendChild(script);
    });
  }

  return browserScriptPromise;
}

async function getRDKitLoader(): Promise<RDKitLoader> {
  if (typeof window === 'undefined') {
    return getNodeRDKitLoader();
  }

  await loadBrowserRDKitScript();
  const browserWindow = window as unknown as { initRDKitModule?: RDKitLoader };

  if (!browserWindow.initRDKitModule) {
    throw new Error('RDKit.js loader was not initialized on window.');
  }

  return browserWindow.initRDKitModule;
}

export function loadRDKit(): Promise<RDKitModule> {
  if (!rdkitModulePromise) {
    rdkitInitializationCount += 1;
    const initializationPromise = getRDKitLoader()
      .then((initRDKitModule) =>
        initRDKitModule({
          locateFile: locateRDKitWasm,
        }),
      )
      .catch((error: unknown) => {
        rdkitModulePromise = null;
        throw error;
      });

    rdkitModulePromise = initializationPromise;
  }

  return rdkitModulePromise;
}

export function getRDKitInitializationCountForTests(): number {
  return rdkitInitializationCount;
}

export function resetRDKitLoaderForTests(): void {
  rdkitModulePromise = null;
  rdkitInitializationCount = 0;
  browserScriptPromise = null;
}
