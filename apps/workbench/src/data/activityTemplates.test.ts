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
        id: 'draw-methane',
        title: '메테인 분자 구조 그리기',
        targetMoleculeName: '메테인',
        targetSmiles: 'C',
        recommendedExampleId: 'methane',
      },
      {
        id: 'draw-ammonia',
        title: '암모니아 분자 구조 그리기',
        targetMoleculeName: '암모니아',
        targetSmiles: 'N',
        recommendedExampleId: 'ammonia',
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
        'vseprModelElectronDomainObservation',
        'vseprModelLonePairEffect',
        'vseprModelVsPubChemObservation',
      ]);
      expect(template.coreConcepts?.length).toBeGreaterThan(0);
      expect(template.teacherNotes?.length).toBeGreaterThan(0);
      expect(template.misconceptionChecks?.length).toBeGreaterThan(0);
      expect(template.expectedVsepr).toBeTruthy();
      expect('molecularWeight' in template).toBe(false);
      expect('expectedFormula' in template).toBe(false);
    }
  });

  it('includes teacher VSEPR guidance for the first classroom misconception set', () => {
    const guidance = Object.fromEntries(
      activityTemplates.map((template) => [template.id, template.expectedVsepr]),
    );

    expect(guidance['draw-methane']).toMatchObject({
      axeNotation: 'AX4',
      molecularShapeKo: '정사면체',
      centralAtom: 'C',
      lonePairCount: 0,
    });
    expect(guidance['draw-water']).toMatchObject({
      axeNotation: 'AX2E2',
      molecularShapeKo: '굽은형',
      centralAtom: 'O',
      lonePairCount: 2,
    });
    expect(guidance['draw-ammonia']).toMatchObject({
      axeNotation: 'AX3E',
      molecularShapeKo: '삼각뿔형',
      centralAtom: 'N',
      lonePairCount: 1,
    });

    expect(
      activityTemplates
        .find((template) => template.id === 'draw-methane')
        ?.misconceptionChecks?.join(' '),
    ).toContain('평면 십자형');
  });
});
