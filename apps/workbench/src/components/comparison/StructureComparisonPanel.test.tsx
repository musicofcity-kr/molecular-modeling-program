import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { StructureComparisonPanel } from './StructureComparisonPanel';
import type { Molecule3DInput } from '../../types/molecule';
import type { StructureComparisonObservation } from '../../types/structureComparison';
import type { VseprAnalysis } from '../../types/vsepr';
import { buildStructureComparisonState } from '../../services/structureComparison';

const methane3D: Molecule3DInput = {
  format: 'sdf',
  data: 'methane 3d\n  Workbench\n\n  5  4  0  0  0  0  0  0  0  0999 V2000\n    0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    0.6291    0.6291    0.6291 H   0  0  0  0  0  0  0  0  0  0  0  0\nM  END',
  label: '메테인',
  sourceType: 'static-example',
  coordinateDimension: '3d',
  coordinateSource: '예제 내장 3D 구조',
  sourceNote: '교육용 정적 좌표입니다.',
};

const methaneVsepr: VseprAnalysis = {
  status: 'supported',
  centralAtomId: '1',
  centralAtomSymbol: 'C',
  bondedAtomCount: 4,
  lonePairCount: 0,
  stericNumber: 4,
  axeNotation: 'AX4',
  electronDomainGeometryKo: '정사면체',
  molecularShapeKo: '정사면체',
  idealBondAngles: ['109.5°'],
  confidence: 'high',
  warnings: [],
};

const observation: StructureComparisonObservation = {
  moleculeName: '메테인',
  rdkitFormula: 'CH4',
  real3DSourceLabel: '예제 내장 3D 구조',
  vseprAxeNotation: 'AX4',
  vseprShapeKo: '정사면체',
  idealBondAngle: '109.5°',
  observedSimilarities: '',
  observedDifferences: '',
  studentReflection: '',
};

const availableState = buildStructureComparisonState({
  validationResult: {
    ok: true,
    validationStatus: 'valid',
    source: 'smiles',
    smiles: 'C',
    canonicalSmiles: 'C',
    molecularFormula: 'CH4',
    molecularWeight: 16.043,
    warnings: [],
    errors: [],
    developerLogs: [],
  },
  molecule3DInput: methane3D,
  vseprAnalysis: methaneVsepr,
  selectedExample: {
    id: 'methane',
    nameKo: '메테인',
    nameEn: 'Methane',
    smiles: 'C',
    expectedFormula: 'CH4',
    teachingUse: '정사면체 비교',
    category: '기본 분자',
  },
});

describe('StructureComparisonPanel', () => {
  it('shows separate titles for actual/external 3D and VSEPR model viewers', () => {
    const markup = renderToStaticMarkup(
      <StructureComparisonPanel
        userMode="student"
        state={availableState}
        molecule3DInput={methane3D}
        vseprAnalysis={methaneVsepr}
        vseprModelStatus="ready"
        isOpen
        observation={observation}
        onToggleOpen={() => undefined}
        onObservationChange={() => undefined}
      />,
    );

    expect(markup).toContain('실제/외부 3D 좌표 기반 구조');
    expect(markup).toContain('VSEPR 교육용 예측 모형');
    expect(markup).toContain('두 화면은 서로 다른 출처의 구조입니다.');
    expect(markup).toContain('비교 관찰 기록');
    expect(markup).toContain('결합길이/결합각 측정 MVP');
    expect(markup).toContain('VSEPR 예측 모형');
  });

  it('hides teacher-only comparison guidance in student mode', () => {
    const studentMarkup = renderToStaticMarkup(
      <StructureComparisonPanel
        userMode="student"
        state={availableState}
        molecule3DInput={methane3D}
        vseprAnalysis={methaneVsepr}
        vseprModelStatus="ready"
        isOpen={false}
        observation={observation}
        onToggleOpen={() => undefined}
        onObservationChange={() => undefined}
      />,
    );
    const teacherMarkup = renderToStaticMarkup(
      <StructureComparisonPanel
        userMode="teacher"
        state={availableState}
        molecule3DInput={methane3D}
        vseprAnalysis={methaneVsepr}
        vseprModelStatus="ready"
        isOpen={false}
        observation={observation}
        onToggleOpen={() => undefined}
        onObservationChange={() => undefined}
      />,
    );

    expect(studentMarkup).not.toContain('교사용 비교 안내');
    expect(teacherMarkup).toContain('교사용 비교 안내');
    expect(teacherMarkup).toContain('VSEPR confidence');
    expect(teacherMarkup).toContain('복잡한 분자는 전체 분자를 하나의 VSEPR 모형');
  });

  it('disables the open button when comparison mode is unavailable', () => {
    const unavailableState = {
      ...availableState,
      availability: 'missing_real_3d' as const,
      real3DStructureAvailable: false,
      studentMessage:
        '비교 모드는 3D 좌표 데이터와 VSEPR 예측 결과가 모두 있을 때 사용할 수 있습니다.',
    };
    const markup = renderToStaticMarkup(
      <StructureComparisonPanel
        userMode="student"
        state={unavailableState}
        molecule3DInput={null}
        vseprAnalysis={methaneVsepr}
        vseprModelStatus="ready"
        isOpen={false}
        observation={observation}
        onToggleOpen={() => undefined}
        onObservationChange={() => undefined}
      />,
    );

    expect(markup).toContain('3D 좌표 필요');
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('비교 모드는 3D 좌표 데이터와 VSEPR 예측 결과가 모두 있을 때');
    expect(markup).not.toContain('비교 관찰 기록');
    expect(markup).not.toContain('실제/외부 3D 구조와 VSEPR 예측 모형에서 비슷하게 보이는 점');
  });
});
