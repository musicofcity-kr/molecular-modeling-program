import type { JSMol } from '@rdkit/rdkit';
import { loadRDKit } from './rdkit-loader';
import { formulaFromRDKitJson } from './molecular-formula';
import type {
  MoleculeInput,
  MoleculeValidationResult,
  MoleculeValidationSource,
} from './structure-types';

const studentValidationFailure =
  '현재 구조는 계산에 사용할 수 있는 분자 구조로 검증되지 않았습니다. 결합 수, 전하, 원자 표기를 확인해 주세요.';

type DescriptorResult = {
  amw?: number;
  exactmw?: number;
};

function selectValidationInput(input: MoleculeInput): {
  source?: MoleculeValidationSource;
  value?: string;
} {
  if (input.molfile?.trim()) {
    return { source: 'molfile', value: input.molfile };
  }

  if (input.smiles?.trim()) {
    return { source: 'smiles', value: input.smiles };
  }

  return {};
}

function parseDescriptors(value: string): DescriptorResult {
  return JSON.parse(value) as DescriptorResult;
}

function buildFailure(developerLog: string): MoleculeValidationResult {
  return {
    ok: false,
    warnings: [],
    errors: [studentValidationFailure],
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
    const rdkit = await loadRDKit();
    mol = rdkit.get_mol(selectedInput.value);

    if (!mol || !mol.is_valid()) {
      return buildFailure(`RDKit could not parse ${selectedInput.source} input.`);
    }

    const descriptors = parseDescriptors(mol.get_descriptors());
    const molecularWeight = descriptors.amw;

    if (typeof molecularWeight !== 'number' || Number.isNaN(molecularWeight)) {
      return buildFailure('RDKit descriptors did not include average molecular weight.');
    }

    const formula = formulaFromRDKitJson(mol.get_json());

    return {
      ok: true,
      source: selectedInput.source,
      canonicalSmiles: mol.get_smiles(),
      formula,
      molecularWeight,
      warnings: [],
      errors: [],
      developerLogs: [`RDKit ${rdkit.version()} validated ${selectedInput.source} input.`],
    };
  } catch (error) {
    const developerLog =
      error instanceof Error ? error.message : 'Unknown RDKit validation error.';

    return buildFailure(developerLog);
  } finally {
    mol?.delete();
  }
}
