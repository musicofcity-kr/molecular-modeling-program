import { describe, expect, it, vi } from 'vitest';
import type { ActivityResultSnapshot } from '../types/activityResult';
import {
  buildActivityResultFileName,
  copyActivityResultMarkdown,
  formatActivityResultJson,
  formatActivityResultMarkdown,
  formatActivityResultTxt,
} from './activityResultExport';

const snapshot: ActivityResultSnapshot = {
  id: 'result-1',
  createdAt: '2026-06-30T13:00:00.000Z',
  updatedAt: '2026-06-30T13:00:00.000Z',
  appMode: 'activity',
  userMode: 'student',
  activityId: 'draw-water',
  activityTitle: '물 분자 구조 그리기',
  moleculeName: '물',
  studentPrediction: {
    predictedFormula: 'H2O',
    predictedMolecularWeight: '18.015',
    drawingReason: '산소와 수소 두 개가 결합한다.',
  },
  rdkitValidation: {
    isValid: true,
    canonicalSmiles: 'O',
    molecularFormula: 'H2O',
    molecularWeight: 18.015,
    structureIntent: 'single-molecule',
    graphSummary: {
      atomCount: 3,
      bondCount: 2,
      componentCount: 1,
      componentAtomCounts: [3],
      isSingleComponent: true,
      isolatedAtomCount: 0,
    },
    connectivityStatus: 'single-component',
    warnings: ['전체 형식전하가 0인 전하 분리 구조는 교사와 함께 검토해 주세요.'],
  },
  threeDObservation: {
    has3DStructure: true,
    sourceLabel: '예제 내장 3D 구조',
    sourceNote: '교육용 정적 좌표입니다.',
    studentObservation: '굽은형으로 보인다.',
  },
  measurements: [
    {
      type: 'bond_angle',
      label: 'H2-O1-H3',
      value: 104.5,
      unit: 'degree',
      sourceNote: '현재 로드된 3D 좌표 기준입니다.',
    },
  ],
  vseprResult: {
    available: true,
    scope: 'local-center',
    selectedCenter: {
      atomId: '1',
      atomSymbol: 'O',
      atomLabel: 'O1',
    },
    axeNotation: 'AX2E2',
    electronGeometryKo: '정사면체',
    molecularGeometryKo: '굽은형',
    idealBondAngle: '약 109.5°보다 작음',
    angleEvidence: {
      vseprIdealAngles: ['<109.5°'],
      generatedCoordinateMeasurements: [104.5],
    },
    confidence: 'high',
    studentNote: '비공유 전자쌍 때문에 굽은형이다.',
  },
  comparisonObservation: {
    available: true,
    observedSimilarities: '둘 다 굽은형이다.',
    observedDifferences: '예상 입체 모형은 전자쌍 방향을 강조한다.',
    studentReflection: '실제 3D와 예측 모형은 역할이 다르다.',
  },
  activityAnswers: [
    {
      questionId: 'afterValidationReflection',
      questionText: '확인 후 알게 된 점',
      answer: '예상과 검증값을 비교했다.',
    },
  ],
  afterValidationReflection: '예상과 검증값을 비교한 뒤 생각이 바뀌었다.',
  finalReflection: '구조 검증이 먼저 필요하다.',
  exportNotice:
    '이 결과는 수업 활동 기록용입니다. 구조 확인값은 분자식과 평균 분자량의 기준이며, 3D 측정값은 현재 로드된 참고 자료 기준입니다. 입체 구조 예상은 교육용 예측 모형입니다.',
};

describe('activity result export', () => {
  it('formats JSON without developer-only payloads', () => {
    const json = formatActivityResultJson(snapshot);
    const parsed = JSON.parse(json) as ActivityResultSnapshot;

    expect(parsed.rdkitValidation.molecularFormula).toBe('H2O');
    expect(json).not.toContain('HTTP status');
    expect(json).not.toContain('raw SDF');
    expect(json).not.toContain('M  END');
  });

  it('formats Markdown and TXT with required classroom sections and notices', () => {
    const markdown = formatActivityResultMarkdown(snapshot);
    const txt = formatActivityResultTxt(snapshot);

    expect(markdown).toContain('# 분자구조 모델링 활동 결과');
    expect(markdown).toContain('## 3. 구조 확인 결과');
    expect(markdown).toContain('- 구조 의도: 단일 분자');
    expect(markdown).toContain(
      '- 연결 근거: 원자 3개 · 결합 2개 · 연결 성분 1개 · 하나의 연결된 구조',
    );
    expect(markdown).toContain(
      '- 구조 확인 참고: 전체 형식전하가 0인 전하 분리 구조는 교사와 함께 검토해 주세요.',
    );
    expect(markdown).toContain('## 5. 측정 결과');
    expect(markdown).toContain('- 선택 중심 원자: O1');
    expect(markdown).toContain('- 분석 범위: 선택 중심 원자 주변의 국소 VSEPR 예측');
    expect(markdown).toContain('- 선택 중심 주변 분자 모양: 굽은형');
    expect(markdown).toContain('- VSEPR 이상각(이론): <109.5°');
    expect(markdown).toContain(
      '- 확인 후 수정한 생각: 예상과 검증값을 비교한 뒤 생각이 바뀌었다.',
    );
    expect(markdown).toContain('- 최종 소감: 구조 검증이 먼저 필요하다.');
    expect(markdown).toContain('입체 구조 예상은 전자쌍 반발 이론에 따른 교육용 예측 모형입니다.');
    expect(txt).toContain('분자구조 모델링 활동 결과');
    expect(txt).toContain(
      '연결 근거: 원자 3개 · 결합 2개 · 연결 성분 1개 · 하나의 연결된 구조',
    );
    expect(txt).toContain('이 결과는 수업 활동 기록용입니다.');
  });

  it('builds stable export file names and copies Markdown to the clipboard adapter', async () => {
    const fileName = buildActivityResultFileName(snapshot, 'md');
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue();

    expect(fileName).toBe('molecule-activity-result-20260630-1300.md');

    const result = await copyActivityResultMarkdown(snapshot, { writeText });

    expect(result.ok).toBe(true);
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('# 분자구조 모델링 활동 결과'));
  });
});
