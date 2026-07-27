import { describe, expect, it, vi } from 'vitest';
import {
  buildEditorModeRecoveryFailureMessage,
  buildEditorModeRecoverySuccessMessage,
  createEditorModeRecoveryPlan,
  restorePreservedEditorStructure,
} from './editorModeRecovery';

describe('editorModeRecovery', () => {
  it('keeps the exact KET structure and original mode in the recovery plan', () => {
    const preservedStructure =
      '{"root":{"nodes":[{"type":"atom","label":"O"}],"connections":[]}}';

    expect(createEditorModeRecoveryPlan('simple', preservedStructure)).toEqual({
      previousMode: 'simple',
      preservedStructure,
    });
  });

  it('restores the preserved KET without converting or rewriting it', async () => {
    const preservedStructure =
      '{"root":{"nodes":[{"type":"atom","label":"C"}],"connections":[]}}';
    const setMolecule = vi.fn(async () => undefined);

    await restorePreservedEditorStructure(
      { setMolecule },
      createEditorModeRecoveryPlan('advanced', preservedStructure),
    );

    expect(setMolecule).toHaveBeenCalledOnce();
    expect(setMolecule).toHaveBeenCalledWith(preservedStructure);
  });

  it('gives actionable Korean guidance without telling the student to refresh', () => {
    const message = buildEditorModeRecoveryFailureMessage('simple');

    expect(message).toContain('간편 모드로 돌아가기');
    expect(message).toContain('전환 전에 그린 구조');
    expect(message).toContain('새로고침하지 마세요');
  });

  it('confirms the original mode and structure after recovery succeeds', () => {
    const message = buildEditorModeRecoverySuccessMessage('advanced');

    expect(message).toContain('고급 편집 모드로 돌아왔습니다');
    expect(message).toContain('전환 전에 그린 구조를 복원했습니다');
  });
});
