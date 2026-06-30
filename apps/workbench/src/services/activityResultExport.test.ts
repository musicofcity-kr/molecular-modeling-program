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
    axeNotation: 'AX2E2',
    electronGeometryKo: '정사면체',
    molecularGeometryKo: '굽은형',
    idealBondAngle: '약 109.5°보다 작음',
    confidence: 'high',
    studentNote: '비공유 전자쌍 때문에 굽은형이다.',
  },
  comparisonObservation: {
    available: true,
    observedSimilarities: '둘 다 굽은형이다.',
    observedDifferences: 'VSEPR은 전자쌍 방향을 강조한다.',
    studentReflection: '실제 3D와 예측 모형은 역할이 다르다.',
  },
  activityAnswers: [
    {
      questionId: 'afterValidationReflection',
      questionText: '검증 후 알게 된 점',
      answer: '예상과 검증값을 비교했다.',
    },
  ],
  finalReflection: '구조 검증이 먼저 필요하다.',
  exportNotice:
    '이 결과는 수업 활동 기록용입니다. RDKit 검증값은 구조 검증 기준이며, 3D 측정값은 현재 로드된 좌표 기준입니다. VSEPR 결과는 교육용 예측 모형입니다.',
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
    expect(markdown).toContain('## 3. RDKit 검증 결과');
    expect(markdown).toContain('## 5. 측정 결과');
    expect(markdown).toContain('VSEPR 결과는 전자쌍 반발 이론에 따른 교육용 예측 모형입니다.');
    expect(txt).toContain('분자구조 모델링 활동 결과');
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
