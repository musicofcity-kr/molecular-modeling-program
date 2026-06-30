import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { activityTemplates } from '../data/activityTemplates';
import { exampleMolecules } from '../data/exampleMolecules';
import { buildStructureComparisonState } from '../services/structureComparison';
import { TeacherPanel } from './TeacherPanel';

const supportedVseprAnalysis = {
  status: 'supported' as const,
  centralAtomId: '1',
  centralAtomSymbol: 'C',
  bondedAtomCount: 4,
  lonePairCount: 0,
  stericNumber: 4,
  axeNotation: 'AX4',
  electronDomainGeometryKo: '정사면체',
  molecularShapeKo: '정사면체',
  idealBondAngles: ['109.5°'],
  confidence: 'high' as const,
  warnings: [],
};

const comparisonState = buildStructureComparisonState({
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
  molecule3DInput: {
    format: 'sdf',
    data: 'methane 3d\n  Workbench\n\n  1  0  0  0  0  0  0  0  0  0999 V2000\n    0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\nM  END',
    label: '메테인',
    sourceType: 'static-example',
    coordinateDimension: '3d',
    coordinateSource: '예제 내장 3D 구조',
    sourceNote: '교육용 정적 좌표입니다.',
  },
  vseprAnalysis: supportedVseprAnalysis,
  selectedExample: exampleMolecules[1],
  selectedActivity: activityTemplates.find((template) => template.id === 'draw-methane'),
});

describe('TeacherPanel', () => {
  it('does not render in student mode', () => {
    const markup = renderToStaticMarkup(
      <TeacherPanel
        userMode="student"
        appMode="activity"
        templates={activityTemplates}
        selectedActivityId="draw-methane"
        examples={exampleMolecules}
        selectedExample={exampleMolecules[1]}
        validationResult={null}
        vseprAnalysis={supportedVseprAnalysis}
        molecule3DInput={null}
        structureComparisonState={comparisonState}
        pubChem3DStatus="idle"
        pubChemCandidateStatus="not_requested"
        onSelectActivity={() => {}}
      />,
    );

    expect(markup).toBe('');
  });

  it('renders teacher guidance without automatic scoring', () => {
    const markup = renderToStaticMarkup(
      <TeacherPanel
        userMode="teacher"
        appMode="activity"
        templates={activityTemplates}
        selectedActivityId="draw-methane"
        examples={exampleMolecules}
        selectedExample={exampleMolecules[1]}
        validationResult={{
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
        }}
        vseprAnalysis={supportedVseprAnalysis}
        molecule3DInput={null}
        structureComparisonState={comparisonState}
        pubChem3DStatus="idle"
        pubChemCandidateStatus="not_requested"
        onSelectActivity={() => {}}
      />,
    );

    expect(markup).toContain('교사용 지도 패널');
    expect(markup).toContain('메테인 분자 구조 그리기');
    expect(markup).toContain('예상 분자식');
    expect(markup).toContain('CH4');
    expect(markup).toContain('AX4 / 정사면체 / 중심 C / 비공유 전자쌍 0쌍');
    expect(markup).toContain('메테인을 평면 십자형으로 이해하는 오류');
    expect(markup).toContain('학생 입력 항목');
    expect(markup).toContain('RDKit 검증 상태');
    expect(markup).toContain('VSEPR 분석 상태');
    expect(markup).toContain('3D 구조 제공 상태');
    expect(markup).toContain('PubChem 연결 상태');
    expect(markup).toContain('비교 모드 가능 여부');
    expect(markup).toContain('비교 추천 여부');
    expect(markup).toContain('정답/오답 판정');
    expect(markup).toContain('자동 채점 없음');
  });

  it('renders teacher diagnostics in free draw mode without exposing a student worksheet', () => {
    const markup = renderToStaticMarkup(
      <TeacherPanel
        userMode="teacher"
        appMode="free_draw"
        templates={activityTemplates}
        selectedActivityId="draw-water"
        examples={exampleMolecules}
        selectedExample={exampleMolecules[0]}
        validationResult={null}
        vseprAnalysis={{
          status: 'not_requested',
          confidence: 'low',
          warnings: [],
        }}
        molecule3DInput={null}
        structureComparisonState={{
          ...comparisonState,
          availability: 'missing_real_3d',
          real3DStructureAvailable: false,
          recommended: true,
          studentMessage:
            '비교 모드는 3D 좌표 데이터와 VSEPR 예측 결과가 모두 있을 때 사용할 수 있습니다.',
        }}
        pubChem3DStatus="idle"
        pubChemCandidateStatus="not_requested"
        onSelectActivity={() => {}}
      />,
    );

    expect(markup).toContain('교사용 지도 패널');
    expect(markup).toContain('작업 모드');
    expect(markup).toContain('자유 그리기');
    expect(markup).toContain('RDKit 검증 상태');
    expect(markup).toContain('VSEPR 분석 상태');
    expect(markup).toContain('PubChem 연결 상태');
    expect(markup).toContain('3D 좌표 데이터 필요');
    expect(markup).not.toContain('수업용 활동 모드');
  });
});
