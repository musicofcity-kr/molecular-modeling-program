import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { activityTemplates } from '../../data/activityTemplates';
import { ActivityPanel } from './ActivityPanel';

describe('ActivityPanel', () => {
  it('does not render outside activity mode', () => {
    const markup = renderToStaticMarkup(
      <ActivityPanel
        appMode="free_draw"
        templates={activityTemplates}
        selectedActivityId="draw-water"
        responses={{}}
        validationResult={null}
        onSelectActivity={() => {}}
        onResponseChange={() => {}}
      />,
    );

    expect(markup).toBe('');
  });

  it('renders activity prompts and an unvalidated comparison state', () => {
    const markup = renderToStaticMarkup(
      <ActivityPanel
        appMode="activity"
        templates={activityTemplates}
        selectedActivityId="draw-water"
        responses={{ predictedFormula: 'H2O', predictedMolecularWeight: '18.015' }}
        validationResult={null}
        onSelectActivity={() => {}}
        onResponseChange={() => {}}
      />,
    );

    expect(markup).toContain('수업용 활동 모드');
    expect(markup).toContain('물 분자 구조 그리기');
    expect(markup).toContain('예상 분자식');
    expect(markup).toContain('중심 원자는 무엇인가요?');
    expect(markup).toContain('VSEPR 이론에 따른 분자 구조는 무엇인가요?');
    expect(markup).toContain('2D 구조와 VSEPR 예측 구조는 어떻게 다른가요?');
    expect(markup).toContain('RDKit 검증 분자식');
    expect(markup).toContain('아직 검증 전');
    expect(markup).toContain('자동 채점 없음');
  });

  it('compares student predictions with RDKit validation output by simple text match', () => {
    const markup = renderToStaticMarkup(
      <ActivityPanel
        appMode="activity"
        templates={activityTemplates}
        selectedActivityId="draw-ethanol"
        responses={{
          predictedFormula: 'C2H6O',
          predictedMolecularWeight: '46.000',
        }}
        validationResult={{
          ok: true,
          validationStatus: 'valid',
          source: 'smiles',
          smiles: 'CCO',
          canonicalSmiles: 'CCO',
          molecularFormula: 'C2H6O',
          molecularWeight: 46.069,
          warnings: [],
          errors: [],
          developerLogs: [],
        }}
        onSelectActivity={() => {}}
        onResponseChange={() => {}}
      />,
    );

    expect(markup).toContain('C2H6O');
    expect(markup).toContain('46.069');
    expect(markup).toContain('분자식 비교 결과');
    expect(markup).toContain('분자량 비교 결과');
    expect(markup).toContain('일치');
    expect(markup).toContain('다름');
    expect(markup).toContain('비교는 단순 문자열 비교입니다.');
  });
});
