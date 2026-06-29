import type { ExtractedStructureData } from '../../editor/chemical-editor-handle';
import type { MoleculeValidationResult } from '../../types/molecule';

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
  const isValid = validationResult?.ok === true;
  const isInvalid = validationResult?.ok === false;
  const dataStatus = isValid
    ? 'RDKit.js 검증 완료'
    : isInvalid
      ? 'RDKit.js 검증 실패'
      : extractedStructure
        ? 'Ketcher 추출 완료 / RDKit.js 미검증'
        : '구조 데이터 추출 전 / RDKit.js 미검증';
  const smilesDisplay = isInvalid
    ? '검증 실패로 학생용 패널에 표시하지 않습니다.'
    : extractedStructure
      ? extractedStructure.smiles.trim() || '추출된 SMILES가 비어 있습니다.'
      : '아직 추출된 SMILES가 없습니다.';
  const molDisplay = isInvalid
    ? '검증 실패로 학생용 패널에 표시하지 않습니다.'
    : extractedStructure
      ? extractedStructure.molBlock.trim() || '추출된 MOL 데이터가 비어 있습니다.'
      : '아직 추출된 MOL 데이터가 없습니다.';
  const validationMessage = isValid
    ? '분자식, 평균 분자량, canonical SMILES는 RDKit.js가 파싱한 구조에서 계산했습니다.'
    : isInvalid
      ? validationResult.studentMessage
      : extractedStructure
        ? `${formatExtractionTime(
            extractedStructure.extractedAt,
          )}에 추출했습니다. 분자식과 평균 분자량은 RDKit.js 검증 성공 후 표시합니다.`
        : '분자식과 평균 분자량은 RDKit.js 검증 단계 이후에만 표시합니다.';

  return (
    <aside className="workspace-panel info-panel" data-testid="structure-info-panel">
      <div className="panel-heading">
        <p className="section-label">우측</p>
        <h2>구조 정보</h2>
      </div>

      <dl className="info-list">
        <div>
          <dt>데이터 상태</dt>
          <dd>{dataStatus}</dd>
        </div>
        {isValid ? (
          <>
            <div>
              <dt>분자식</dt>
              <dd data-testid="formula-output">{validationResult.molecularFormula}</dd>
            </div>
            <div>
              <dt>평균 분자량</dt>
              <dd data-testid="molecular-weight-output">
                {validationResult.molecularWeight.toFixed(3)}
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
          <dd className="code-output">{smilesDisplay}</dd>
        </div>
        <div>
          <dt>MOL</dt>
          <dd className="code-output multiline">{molDisplay}</dd>
        </div>
        <div>
          <dt>검증 안내</dt>
          <dd>{validationMessage}</dd>
        </div>
      </dl>
    </aside>
  );
}
