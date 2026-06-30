import { describe, expect, it } from 'vitest';
import { activityTemplates } from './activityTemplates';

describe('activityTemplates', () => {
  it('contains the initial classroom activity MVP set', () => {
    expect(
      activityTemplates.map((template) => ({
        id: template.id,
        title: template.title,
        targetMoleculeName: template.targetMoleculeName,
        targetSmiles: template.targetSmiles,
        recommendedExampleId: template.recommendedExampleId,
      })),
    ).toEqual([
      {
        id: 'draw-water',
        title: '물 분자 구조 그리기',
        targetMoleculeName: '물',
        targetSmiles: 'O',
        recommendedExampleId: 'water',
      },
      {
        id: 'draw-ethanol',
        title: '에탄올 분자 구조 그리기',
        targetMoleculeName: '에탄올',
        targetSmiles: 'CCO',
        recommendedExampleId: 'ethanol',
      },
      {
        id: 'draw-benzene',
        title: '벤젠 분자 구조 그리기',
        targetMoleculeName: '벤젠',
        targetSmiles: 'c1ccccc1',
        recommendedExampleId: 'benzene',
      },
    ]);
  });

  it('keeps classroom prompts independent from calculated chemistry outputs', () => {
    for (const template of activityTemplates) {
      expect(template.learningGoal).toBeTruthy();
      expect(template.prompt).toBeTruthy();
      expect(template.predictionQuestions.map((question) => question.id)).toEqual([
        'predictedFormula',
        'predictedMolecularWeight',
        'drawingReason',
        'predictedCentralAtom',
        'predictedBondingDomains',
        'predictedLonePairs',
        'predictedVseprShape',
      ]);
      expect(template.reflectionQuestions.map((question) => question.id)).toEqual([
        'afterValidationReflection',
        'vseprReflection',
      ]);
      expect('molecularWeight' in template).toBe(false);
      expect('expectedFormula' in template).toBe(false);
    }
  });
});
