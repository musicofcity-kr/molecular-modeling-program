import type { ExtractedStructureData } from '../../editor/chemical-editor-handle';
import type { MoleculeValidationResult } from '../../chemistry/structure-types';

type StructureInfoPanelProps = {
  extractedStructure: ExtractedStructureData | null;
  validationResult: MoleculeValidationResult | null;
};

function formatExtractionTime(value: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}

export function StructureInfoPanel({
  extractedStructure,
  validationResult,
}: StructureInfoPanelProps) {
  const hasValidatedResult = validationResult?.ok === true;
  const hasFailedValidation = validationResult?.ok === false;
  const canShowExtractedStructure = Boolean(extractedStructure && !hasFailedValidation);

  return (
    <aside className="workspace-panel info-panel" data-testid="structure-info-panel">
      <div className="panel-heading">
        <p className="section-label">우측</p>
        <h2>구조 정보</h2>
      </div>

      <dl className="info-list">
        <div>
          <dt>데이터 상태</dt>
          <dd>
            {hasValidatedResult
              ? 'RDKit.js 검증 완료'
              : extractedStructure
                ? 'Ketcher 추출 완료 / RDKit.js 미검증'
                : '구조 데이터 추출 전 / RDKit.js 미검증'}
          </dd>
        </div>
        {hasValidatedResult ? (
          <>
            <div>
              <dt>분자식</dt>
              <dd data-testid="formula-output">{validationResult.formula}</dd>
            </div>
            <div>
              <dt>분자량</dt>
              <dd data-testid="molecular-weight-output">
                {validationResult.molecularWeight?.toFixed(3)}
              </dd>
            </div>
            <div>
              <dt>Canonical SMILES</dt>
              <dd className="code-output">{validationResult.canonicalSmiles}</dd>
            </div>
          </>
        ) : null}
        <div>
          <dt>SMILES</dt>
          <dd className="code-output">
            {canShowExtractedStructure
              ? extractedStructure?.smiles.trim() || '추출된 SMILES가 비어 있습니다.'
              : hasFailedValidation
                ? '검증 실패로 표시하지 않습니다.'
                : '아직 추출된 SMILES가 없습니다.'}
          </dd>
        </div>
        <div>
          <dt>MOL</dt>
          <dd className="code-output multiline">
            {canShowExtractedStructure
              ? extractedStructure?.molfile.trim() || '추출된 MOL 데이터가 비어 있습니다.'
              : hasFailedValidation
                ? '검증 실패로 표시하지 않습니다.'
                : '아직 추출된 MOL 데이터가 없습니다.'}
          </dd>
        </div>
        <div>
          <dt>검증 안내</dt>
          <dd>
            {hasValidatedResult
              ? 'RDKit.js가 해석한 구조에서 계산한 값만 표시합니다.'
              : hasFailedValidation
                ? validationResult.errors[0]
                : extractedStructure
              ? `${formatExtractionTime(
                  extractedStructure.extractedAt,
                )}에 추출했습니다. 화학 계산에는 아직 사용할 수 없습니다.`
              : '분자식과 분자량은 RDKit.js 검증 단계 이후에만 표시합니다.'}
          </dd>
        </div>
      </dl>
    </aside>
  );
}
