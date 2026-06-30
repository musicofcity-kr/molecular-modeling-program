import { describe, expect, it } from 'vitest';
import type { ActivityTemplate } from './activity';
import { shouldShowVseprModule } from './activity';

const baseTemplate: ActivityTemplate = {
  id: 'template',
  title: '테스트 활동',
  targetMoleculeName: '테스트 분자',
  learningGoal: '검증 흐름을 확인한다.',
  prompt: '구조를 그려 보세요.',
  predictionQuestions: [],
  reflectionQuestions: [],
};

describe('shouldShowVseprModule', () => {
  it('keeps VSEPR hidden in free draw until the user opens the optional module', () => {
    expect(
      shouldShowVseprModule({
        appMode: 'free_draw',
        isModuleOpen: false,
        selectedTemplate: { ...baseTemplate, requiresVsepr: true },
      }),
    ).toBe(false);

    expect(
      shouldShowVseprModule({
        appMode: 'free_draw',
        isModuleOpen: true,
        selectedTemplate: { ...baseTemplate, requiresVsepr: false },
      }),
    ).toBe(true);
  });

  it('shows VSEPR in activity mode only when the activity template requires it', () => {
    expect(
      shouldShowVseprModule({
        appMode: 'activity',
        isModuleOpen: false,
        selectedTemplate: { ...baseTemplate, requiresVsepr: true },
      }),
    ).toBe(true);

    expect(
      shouldShowVseprModule({
        appMode: 'activity',
        isModuleOpen: true,
        selectedTemplate: { ...baseTemplate, requiresVsepr: false },
      }),
    ).toBe(false);
  });
});
