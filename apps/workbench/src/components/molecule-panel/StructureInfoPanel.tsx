import type { ExtractedStructureData } from '../../editor/chemical-editor-handle';

type StructureInfoPanelProps = {
  extractedStructure: ExtractedStructureData | null;
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
}: StructureInfoPanelProps) {
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
            {extractedStructure
              ? 'Ketcher 추출 완료 / RDKit.js 미검증'
              : '구조 데이터 추출 전 / RDKit.js 미검증'}
          </dd>
        </div>
        <div>
          <dt>SMILES</dt>
          <dd className="code-output">
            {extractedStructure
              ? extractedStructure?.smiles.trim() || '추출된 SMILES가 비어 있습니다.'
              : '아직 추출된 SMILES가 없습니다.'}
          </dd>
        </div>
        <div>
          <dt>MOL</dt>
          <dd className="code-output multiline">
            {extractedStructure
              ? extractedStructure?.molBlock.trim() || '추출된 MOL 데이터가 비어 있습니다.'
              : '아직 추출된 MOL 데이터가 없습니다.'}
          </dd>
        </div>
        <div>
          <dt>검증 안내</dt>
          <dd>
            {extractedStructure
              ? `${formatExtractionTime(
                  extractedStructure.extractedAt,
                )}에 추출했습니다. 화학 계산과 분자량 표시는 아직 실행하지 않습니다.`
              : '분자식과 분자량은 RDKit.js 검증 단계 이후에만 표시합니다.'}
          </dd>
        </div>
      </dl>
    </aside>
  );
}
