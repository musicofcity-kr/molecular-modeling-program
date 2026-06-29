import type { JSMol, RDKitLoader, RDKitModule } from '@rdkit/rdkit';
import type {
  MoleculeInput,
  MoleculeValidationResult,
  MoleculeValidationSource,
} from '../types/molecule';
import { formulaFromRDKitJson } from './molecularFormula';

export const STUDENT_VALIDATION_FAILURE_MESSAGE =
  '현재 구조는 계산에 사용할 수 있는 분자 구조로 검증되지 않았습니다. 결합 수, 전하, 원자 표기를 확인해 주세요.';

type DescriptorResult = {
  amw?: number;
  exactmw?: number;
};

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
        browserScriptPromise = null;
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

export function initializeRDKit(): Promise<RDKitModule> {
  if (!rdkitModulePromise) {
    rdkitInitializationCount += 1;
    rdkitModulePromise = getRDKitLoader()
      .then((initRDKitModule) =>
        initRDKitModule({
          locateFile: locateRDKitWasm,
        }),
      )
      .catch((error: unknown) => {
        rdkitModulePromise = null;
        throw error;
      });
  }

  return rdkitModulePromise;
}

function selectValidationInput(input: MoleculeInput): {
  source?: MoleculeValidationSource;
  value?: string;
} {
  if (input.molBlock?.trim()) {
    return { source: 'mol-block', value: input.molBlock };
  }

  if (input.smiles?.trim()) {
    return { source: 'smiles', value: input.smiles };
  }

  return {};
}

function parseDescriptors(value: string): DescriptorResult {
  return JSON.parse(value) as DescriptorResult;
}

function buildFailure(
  developerLog: string,
  source?: MoleculeValidationSource,
  validationStatus: 'invalid' | 'error' = 'invalid',
): MoleculeValidationResult {
  return {
    ok: false,
    validationStatus,
    source,
    studentMessage: STUDENT_VALIDATION_FAILURE_MESSAGE,
    warnings: [],
    errors: [STUDENT_VALIDATION_FAILURE_MESSAGE],
    developerLogs: [developerLog],
  };
}

export async function validateMoleculeInput(
  input: MoleculeInput,
): Promise<MoleculeValidationResult> {
  const selectedInput = selectValidationInput(input);

  if (!selectedInput.value || !selectedInput.source) {
    return buildFailure('RDKit validation failed before parsing: empty molecule input.');
  }

  let mol: JSMol | null = null;

  try {
    const rdkit = await initializeRDKit();
    mol = rdkit.get_mol(selectedInput.value);

    if (!mol || !mol.is_valid()) {
      return buildFailure(
        `RDKit could not parse ${selectedInput.source} input.`,
        selectedInput.source,
      );
    }

    const descriptors = parseDescriptors(mol.get_descriptors());
    const molecularWeight = descriptors.amw;

    if (typeof molecularWeight !== 'number' || Number.isNaN(molecularWeight)) {
      return buildFailure(
        'RDKit descriptors did not include average molecular weight.',
        selectedInput.source,
        'error',
      );
    }

    const molecularFormula = formulaFromRDKitJson(mol.get_json());

    return {
      ok: true,
      validationStatus: 'valid',
      source: selectedInput.source,
      smiles: input.smiles,
      molBlock: input.molBlock,
      canonicalSmiles: mol.get_smiles(),
      molecularFormula,
      molecularWeight,
      warnings: [],
      errors: [],
      developerLogs: [`RDKit ${rdkit.version()} validated ${selectedInput.source} input.`],
    };
  } catch (error) {
    const developerLog =
      error instanceof Error ? error.message : 'Unknown RDKit validation error.';

    return buildFailure(developerLog, selectedInput.source, 'error');
  } finally {
    mol?.delete();
  }
}

export function getRDKitInitializationCountForTests(): number {
  return rdkitInitializationCount;
}

export function resetRDKitForTests(): void {
  rdkitModulePromise = null;
  rdkitInitializationCount = 0;
  browserScriptPromise = null;
}
