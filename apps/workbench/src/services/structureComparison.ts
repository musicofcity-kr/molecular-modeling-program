import type { ExampleMolecule } from '../data/exampleMolecules';
import type { ActivityTemplate } from '../types/activity';
import type {
  Molecule3DInput,
  MoleculeValidationResult,
} from '../types/molecule';
import type {
  StructureComparisonAvailability,
  StructureComparisonState,
} from '../types/structureComparison';
import type { VseprAnalysis } from '../types/vsepr';
import { hasVseprGeometryTemplate } from './vseprGeometryTemplates';

export const RECOMMENDED_COMPARISON_MOLECULE_IDS = [
  'water',
  'methane',
  'ammonia',
  'carbon-dioxide',
] as const;

export const CONDITIONAL_COMPARISON_MOLECULE_LABELS = [
  'BF3',
  'PCl5',
  'SF6',
  'XeF4',
] as const;

export const CAUTION_COMPARISON_MOLECULE_IDS = [
  'ethanol',
  'benzene',
  'aspirin',
  'glucose',
  'acetic-acid',
] as const;

const DEFAULT_REAL_3D_SOURCE_LABEL = '실제/외부 3D 좌표 없음';
const DEFAULT_VSEPR_SOURCE_LABEL = 'VSEPR 예측 결과 없음';
const COMPARISON_AVAILABLE_MESSAGE =
  '실제/외부 3D 구조와 VSEPR 교육용 예측 모형을 나란히 비교할 수 있습니다.';
const COMPARISON_UNAVAILABLE_MESSAGE =
  '비교 모드는 3D 좌표 데이터와 VSEPR 예측 결과가 모두 있을 때 사용할 수 있습니다.';
const MULTI_CENTER_STUDENT_MESSAGE =
  '이 분자는 중심 원자가 여러 개이거나 구조가 복잡하여 하나의 VSEPR 모형으로 전체 구조를 비교하기 어렵습니다.';
const MULTI_CENTER_TEACHER_NOTE =
  '이 구조는 단일 중심 원자 기준 VSEPR 비교에 적합하지 않을 수 있습니다. 에탄올, 벤젠 등은 전체 분자를 하나의 AXE 구조로 단정하지 않도록 지도하세요.';

export function buildStructureComparisonState(input: {
  validationResult: MoleculeValidationResult | null;
  molecule3DInput: Molecule3DInput | null;
  vseprAnalysis: VseprAnalysis;
  selectedExample?: ExampleMolecule;
  selectedActivity?: ActivityTemplate | null;
}): StructureComparisonState {
  const real3DStructureAvailable =
    input.molecule3DInput?.coordinateDimension === '3d' &&
    is3DSourceAllowedForComparison(input.molecule3DInput);
  const vseprModelAvailable =
    input.vseprAnalysis.status === 'supported' &&
    hasVseprGeometryTemplate(input.vseprAnalysis.axeNotation);
  const recommended = isRecommendedForComparison(
    input.selectedExample,
    input.selectedActivity,
  );
  const rdkitValues =
    input.validationResult?.ok === true
      ? {
          rdkitFormula: input.validationResult.molecularFormula,
          rdkitCanonicalSmiles: input.validationResult.canonicalSmiles,
        }
      : {};
  const commonState = {
    real3DSourceLabel:
      input.molecule3DInput?.coordinateSource ?? DEFAULT_REAL_3D_SOURCE_LABEL,
    vseprSourceLabel:
      input.vseprAnalysis.status === 'supported'
        ? `VSEPR ${input.vseprAnalysis.axeNotation ?? 'AXE 미정'} 교육용 예측`
        : DEFAULT_VSEPR_SOURCE_LABEL,
    real3DStructureAvailable,
    vseprModelAvailable,
    recommended,
    ...rdkitValues,
  };

  const availability = getComparisonAvailability({
    validationResult: input.validationResult,
    molecule3DInput: input.molecule3DInput,
    vseprAnalysis: input.vseprAnalysis,
    selectedExample: input.selectedExample,
    selectedActivity: input.selectedActivity,
  });

  if (availability === 'available') {
    return {
      availability,
      ...commonState,
      warnings: [
        '두 화면은 서로 다른 출처의 구조입니다. 모양이 비슷해 보여도 의미와 한계가 다릅니다.',
        '비교 모드는 어느 쪽이 무조건 정답인지 고르는 활동이 아니라, 두 표현의 의미를 구분하는 활동입니다.',
      ],
      studentMessage: COMPARISON_AVAILABLE_MESSAGE,
      teacherNote:
        input.selectedActivity?.comparisonMode?.teacherNote ??
        'VSEPR 예측 모형과 실제/외부 3D 좌표 구조의 출처 차이를 학생이 설명하도록 지도하세요.',
    };
  }

  return {
    availability,
    ...commonState,
    warnings: buildComparisonWarnings(availability, input.vseprAnalysis),
    studentMessage: getStudentMessageForAvailability(availability),
    teacherNote: getTeacherNoteForAvailability(availability),
  };
}

export function isComparisonAvailable(state: StructureComparisonState): boolean {
  return state.availability === 'available';
}

function getComparisonAvailability(input: {
  validationResult: MoleculeValidationResult | null;
  molecule3DInput: Molecule3DInput | null;
  vseprAnalysis: VseprAnalysis;
  selectedExample?: ExampleMolecule;
  selectedActivity?: ActivityTemplate | null;
}): StructureComparisonAvailability {
  if (input.validationResult?.ok !== true) {
    return 'rdkit_invalid';
  }

  if (
    input.molecule3DInput?.coordinateDimension !== '3d' ||
    !is3DSourceAllowedForComparison(input.molecule3DInput)
  ) {
    return 'missing_real_3d';
  }

  if (isMultiCenterOrCautionMolecule(input)) {
    return 'multi_center_not_recommended';
  }

  if (input.vseprAnalysis.status === 'not_requested') {
    return 'missing_vsepr';
  }

  if (
    input.vseprAnalysis.status === 'unsupported' ||
    input.vseprAnalysis.status === 'error'
  ) {
    return 'not_supported';
  }

  if (
    input.vseprAnalysis.status === 'needs_central_atom' ||
    !hasVseprGeometryTemplate(input.vseprAnalysis.axeNotation)
  ) {
    return 'missing_vsepr';
  }

  if (input.vseprAnalysis.confidence === 'low') {
    return 'low_confidence_vsepr';
  }

  return 'available';
}

function isRecommendedForComparison(
  selectedExample?: ExampleMolecule,
  selectedActivity?: ActivityTemplate | null,
): boolean {
  if (selectedActivity?.comparisonMode) {
    return selectedActivity.comparisonMode.enabled &&
      selectedActivity.comparisonMode.recommended;
  }

  return selectedExample
    ? RECOMMENDED_COMPARISON_MOLECULE_IDS.includes(
        selectedExample.id as (typeof RECOMMENDED_COMPARISON_MOLECULE_IDS)[number],
      )
    : false;
}

function is3DSourceAllowedForComparison(input: Molecule3DInput | null): boolean {
  if (!input || input.coordinateDimension !== '3d') {
    return false;
  }

  if (input.sourceType === 'static-example') {
    return input.structureMatchStatus !== 'review-needed';
  }

  if (input.sourceType === 'pubchem') {
    return input.structureMatchStatus === 'verified';
  }

  return input.structureMatchStatus === 'verified';
}

function isMultiCenterOrCautionMolecule(input: {
  vseprAnalysis: VseprAnalysis;
  selectedExample?: ExampleMolecule;
  selectedActivity?: ActivityTemplate | null;
}): boolean {
  if (input.selectedActivity?.comparisonMode?.enabled === false) {
    return true;
  }

  if (
    input.selectedActivity?.comparisonMode?.enabled === true &&
    input.selectedActivity.comparisonMode.recommended
  ) {
    return false;
  }

  if (
    input.selectedExample &&
    RECOMMENDED_COMPARISON_MOLECULE_IDS.includes(
      input.selectedExample.id as (typeof RECOMMENDED_COMPARISON_MOLECULE_IDS)[number],
    )
  ) {
    return false;
  }

  if ((input.vseprAnalysis.centralAtomCandidates?.length ?? 0) > 1) {
    return true;
  }

  if (!input.selectedExample) {
    return false;
  }

  return CAUTION_COMPARISON_MOLECULE_IDS.includes(
    input.selectedExample.id as (typeof CAUTION_COMPARISON_MOLECULE_IDS)[number],
  );
}

function buildComparisonWarnings(
  availability: StructureComparisonAvailability,
  analysis: VseprAnalysis,
): string[] {
  const warnings = [
    'PubChem 또는 정적 3D 구조는 좌표 데이터를 시각화한 것입니다. VSEPR 모형은 이론에 따른 교육용 예측입니다.',
  ];

  if (availability === 'low_confidence_vsepr') {
    warnings.push('VSEPR 신뢰도가 낮아 비교 활동에는 교사 확인이 필요합니다.');
  }

  if (availability === 'missing_vsepr' && analysis.studentMessage) {
    warnings.push(analysis.studentMessage);
  }

  if (availability === 'multi_center_not_recommended') {
    warnings.push(MULTI_CENTER_STUDENT_MESSAGE);
  }

  return warnings;
}

function getStudentMessageForAvailability(
  availability: StructureComparisonAvailability,
): string {
  switch (availability) {
    case 'rdkit_invalid':
      return 'RDKit.js 검증을 통과한 구조에서만 비교 모드를 사용할 수 있습니다.';
    case 'missing_real_3d':
      return COMPARISON_UNAVAILABLE_MESSAGE;
    case 'missing_vsepr':
      return 'VSEPR 예측 결과가 준비되면 실제/외부 3D 구조와 비교할 수 있습니다.';
    case 'low_confidence_vsepr':
      return 'VSEPR 예측 신뢰도가 낮아 비교 모드를 바로 사용하지 않습니다.';
    case 'multi_center_not_recommended':
      return MULTI_CENTER_STUDENT_MESSAGE;
    case 'not_supported':
      return '현재 구조는 VSEPR 비교 모드에서 지원하지 않습니다.';
    case 'available':
      return COMPARISON_AVAILABLE_MESSAGE;
  }
}

function getTeacherNoteForAvailability(
  availability: StructureComparisonAvailability,
): string | undefined {
  if (availability === 'multi_center_not_recommended') {
    return MULTI_CENTER_TEACHER_NOTE;
  }

  if (availability === 'low_confidence_vsepr') {
    return 'VSEPR confidence가 낮은 구조는 학생에게 단정적으로 제시하지 말고 토론 또는 검토 대상으로 다루세요.';
  }

  if (availability === 'not_supported') {
    return '전이금속, 라디칼, 복잡한 공명 구조 등은 이 MVP의 VSEPR 비교 대상으로 적합하지 않을 수 있습니다.';
  }

  return undefined;
}
