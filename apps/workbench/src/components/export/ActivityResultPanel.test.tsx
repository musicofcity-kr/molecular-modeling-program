import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ActivityResultPanel } from './ActivityResultPanel';
import type { ActivityResultSnapshot } from '../../types/activityResult';

const snapshot: ActivityResultSnapshot = {
  id: 'result-1',
  createdAt: '2026-06-30T13:00:00.000Z',
  updatedAt: '2026-06-30T13:00:00.000Z',
  appMode: 'activity',
  userMode: 'student',
  activityTitle: '메테인 분자 구조 그리기',
  moleculeName: '메테인',
  studentPrediction: {
    predictedFormula: 'CH4',
    predictedMolecularWeight: '16.043',
    drawingReason: '탄소가 수소 네 개와 결합한다.',
  },
  rdkitValidation: {
    isValid: true,
    canonicalSmiles: 'C',
    molecularFormula: 'CH4',
    molecularWeight: 16.043,
  },
  threeDObservation: {
    has3DStructure: true,
    sourceLabel: '예제 내장 3D 구조',
    sourceNote: '교육용 정적 좌표입니다.',
    studentObservation: '정사면체처럼 보인다.',
  },
  measurements: [
    {
      type: 'bond_angle',
      label: 'H2-C1-H3',
      value: 109.47,
      unit: 'degree',
      sourceNote: '현재 로드된 3D 좌표 기준입니다.',
    },
  ],
  vseprResult: {
    available: true,
    axeNotation: 'AX4',
    electronGeometryKo: '정사면체',
    molecularGeometryKo: '정사면체',
    idealBondAngle: '109.5°',
    confidence: 'high',
  },
  comparisonObservation: {
    available: true,
    observedSimilarities: '둘 다 정사면체이다.',
    observedDifferences: '출처가 다르다.',
    studentReflection: '입체 구조 예상은 예측 모형이다.',
  },
  activityAnswers: [],
  afterValidationReflection: '예상과 구조 확인값을 비교해 생각을 수정했다.',
  finalReflection: '구조 확인값을 기준으로 정리했다.',
  exportNotice:
    '이 결과는 수업 활동 기록용입니다. 구조 확인값은 분자식과 평균 분자량의 기준이며, 3D 측정값은 현재 로드된 참고 자료 기준입니다. 입체 구조 예상은 교육용 예측 모형입니다.',
};

describe('ActivityResultPanel', () => {
  it('shows student save and export actions without developer logs', () => {
    const markup = renderToStaticMarkup(
      <ActivityResultPanel
        userMode="student"
        currentSnapshot={snapshot}
        savedResults={[snapshot]}
        onSave={() => undefined}
        onPreviewSavedResult={() => undefined}
        onExportJson={() => undefined}
        onExportMarkdown={() => undefined}
        onExportTxt={() => undefined}
        onCopyMarkdown={() => undefined}
        onPrint={() => undefined}
      />,
    );

    expect(markup).toContain('활동 결과 정리');
    expect(markup).toContain('임시 저장하기');
    expect(markup).toContain('보고서로 저장하기');
    expect(markup).toContain('활동지 인쇄하기');
    expect(markup).toContain('구조 확인 결과');
    expect(markup).not.toContain('원자료 저장');
    expect(markup).not.toContain('텍스트로 저장');
    expect(markup).not.toContain('결과 복사하기');
    expect(markup).not.toContain('RDKit 검증 결과');
    expect(markup).not.toContain('canonical SMILES');
    expect(markup).not.toContain('결합길이/결합각 측정 결과');
    expect(markup).toContain('최근 결과는 최대 10개까지만 보관');
    expect(markup).toContain('확인 후 수정한 생각');
    expect(markup).toContain('최종 소감');
    expect(markup).not.toContain('개발자 로그');
    expect(markup).not.toContain('HTTP status');
    expect(markup).not.toContain('raw SDF');
  });

  it('summarizes external 3D coordinate source details in student mode', () => {
    const externalSnapshot: ActivityResultSnapshot = {
      ...snapshot,
      moleculeName: '에탄올',
      threeDObservation: {
        ...snapshot.threeDObservation,
        sourceLabel: 'PubChem CID 702',
        sourceNote:
          'PubChem PUG-REST에서 CID 기반으로 가져온 3D SDF 좌표입니다. PubChem name: Ethanol.',
      },
    };
    const markup = renderToStaticMarkup(
      <ActivityResultPanel
        userMode="student"
        currentSnapshot={externalSnapshot}
        savedResults={[]}
        onSave={() => undefined}
        onPreviewSavedResult={() => undefined}
        onExportJson={() => undefined}
        onExportMarkdown={() => undefined}
        onExportTxt={() => undefined}
        onCopyMarkdown={() => undefined}
        onPrint={() => undefined}
      />,
    );

    expect(markup).toContain('외부 3D 자료');
    expect(markup).toContain('외부 데이터베이스에서 불러온 교육용 참고 3D 자료입니다.');
    expect(markup).not.toContain('PubChem');
    expect(markup).not.toContain('CID');
    expect(markup).not.toContain('SDF');
  });

  it('shows teacher export scope guidance in teacher mode', () => {
    const markup = renderToStaticMarkup(
      <ActivityResultPanel
        userMode="teacher"
        currentSnapshot={snapshot}
        savedResults={[]}
        onSave={() => undefined}
        onPreviewSavedResult={() => undefined}
        onExportJson={() => undefined}
        onExportMarkdown={() => undefined}
        onExportTxt={() => undefined}
        onCopyMarkdown={() => undefined}
        onPrint={() => undefined}
      />,
    );

    expect(markup).toContain('교사용 확인');
    expect(markup).toContain('원자료 저장');
    expect(markup).toContain('보고서로 저장');
    expect(markup).toContain('텍스트로 저장');
    expect(markup).toContain('구조 확인 결과');
    expect(markup).toContain('자동 채점 결과가 아니라');
    expect(markup).toContain('내보내기 포함 항목');
    expect(markup).toContain('개발자 로그와 원본 API 응답은 포함하지 않습니다.');
  });
});
