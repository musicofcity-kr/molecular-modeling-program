export type EditorMode = 'simple' | 'advanced';

export type EditorModeRecoveryPlan = {
  previousMode: EditorMode;
  preservedStructure: string;
};

type PreservedStructureTarget = {
  setMolecule(structure: string): Promise<void | undefined>;
};

export function formatEditorModeName(mode: EditorMode): string {
  return mode === 'simple' ? '간편 모드' : '고급 편집 모드';
}

export function createEditorModeRecoveryPlan(
  previousMode: EditorMode,
  preservedStructure: string,
): EditorModeRecoveryPlan {
  return {
    previousMode,
    preservedStructure,
  };
}

export async function restorePreservedEditorStructure(
  target: PreservedStructureTarget,
  plan: EditorModeRecoveryPlan,
): Promise<void> {
  await target.setMolecule(plan.preservedStructure);
}

export function buildEditorModeRecoveryFailureMessage(
  previousMode: EditorMode,
): string {
  return `새 편집 모드를 준비하지 못했습니다. 새로고침하지 마세요. "${formatEditorModeName(
    previousMode,
  )}로 돌아가기"를 누르면 전환 전에 그린 구조를 복원합니다.`;
}

export function buildEditorModeRecoverySuccessMessage(
  previousMode: EditorMode,
): string {
  return `${formatEditorModeName(
    previousMode,
  )}로 돌아왔습니다. 전환 전에 그린 구조를 복원했습니다.`;
}
