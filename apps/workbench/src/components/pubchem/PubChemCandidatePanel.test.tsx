import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PubChemCandidatePanel } from './PubChemCandidatePanel';

function getVisibleText(markup: string): string {
  return markup.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

describe('PubChemCandidatePanel', () => {
  it('shows the search control as disabled before RDKit validation succeeds', () => {
    const markup = renderToStaticMarkup(
      <PubChemCandidatePanel
        canSearch={false}
        status="not_requested"
        candidates={[]}
        warnings={[]}
        isLoading3D={false}
        onSearch={() => {}}
        onSelectCandidate={() => {}}
      />,
    );

    expect(markup).toContain('외부 3D 자료 찾기');
    expect(markup).toContain('외부 데이터베이스에서 3D 구조 후보를 찾아봅니다.');
    expect(markup).toContain('구조 확인을 통과한 구조에서만');
    expect(markup).toContain('disabled=""');
  });

  it('renders candidates as external data without auto-selecting them', () => {
    const markup = renderToStaticMarkup(
      <PubChemCandidatePanel
        canSearch
        status="single_candidate"
        candidates={[
          {
            cid: 702,
            title: 'Ethanol',
            molecularFormula: 'C2H6O',
            molecularWeight: '46.069',
            canonicalSmiles: 'CCO',
            isomericSmiles: 'CCO',
            source: 'pubchem',
          },
        ]}
        warnings={['외부 데이터 후보이므로 수업용 시각화 자료로만 사용하세요.']}
        isLoading3D={false}
        studentMessage="외부 데이터 후보 1개를 찾았습니다. 자동 선택하지 않고 직접 확인해야 합니다."
        onSearch={() => {}}
        onSelectCandidate={() => {}}
      />,
    );

    expect(markup).toContain('외부 데이터 후보: Ethanol');
    expect(markup).toContain('3D 자료 후보 번호');
    expect(markup).toContain('702');
    expect(markup).toContain('C2H6O');
    expect(markup).toContain('46.069');
    expect(markup).toContain('CCO');
    expect(markup).toContain('이 3D 자료 불러오기');
    expect(markup).toContain('자동 선택하지 않고 직접 확인해야 합니다.');
  });

  it('hides technical PubChem details in student display mode', () => {
    let selectedCandidateCid: number | null = null;

    const markup = renderToStaticMarkup(
      <PubChemCandidatePanel
        canSearch
        status="single_candidate"
        displayMode="student"
        candidates={[
          {
            cid: 702,
            molecularFormula: 'C2H6O',
            molecularWeight: '46.069',
            canonicalSmiles: 'CCO',
            isomericSmiles: 'CCO',
            source: 'pubchem',
          },
        ]}
        warnings={[
          'PubChem SMILES 표기가 RDKit.js canonical SMILES와 다를 수 있습니다.',
        ]}
        isLoading3D={false}
        studentMessage="PubChem 후보를 보려면 RDKit.js 검증을 통과해야 합니다."
        onSearch={() => {}}
        onSelectCandidate={(candidate) => {
          selectedCandidateCid = candidate.cid;
        }}
      />,
    );
    const visibleText = getVisibleText(markup);

    expect(selectedCandidateCid).toBeNull();
    expect(visibleText).toContain('외부 데이터 후보: 3D 자료 후보 1');
    expect(visibleText).toContain('분자식');
    expect(visibleText).toContain('C2H6O');
    expect(visibleText).toContain('분자량');
    expect(visibleText).toContain('46.069');
    expect(visibleText).toContain('이 자료 선택');
    expect(visibleText).toContain('구조 확인을 통과해야 합니다.');
    expect(visibleText).not.toContain('PubChem');
    expect(visibleText).not.toContain('CID');
    expect(visibleText).not.toContain('SMILES');
    expect(visibleText).not.toContain('RDKit.js');
    expect(visibleText).not.toContain('3D 자료 후보 번호');
    expect(visibleText).not.toContain('외부 자료 구조 문자열');
    expect(visibleText).not.toContain('702');
    expect(visibleText).not.toContain('CCO');
  });
});
