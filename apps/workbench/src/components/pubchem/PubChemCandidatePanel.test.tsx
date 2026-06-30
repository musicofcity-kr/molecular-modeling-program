import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PubChemCandidatePanel } from './PubChemCandidatePanel';

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

    expect(markup).toContain('PubChem 후보 검색');
    expect(markup).toContain('외부 데이터베이스에서 3D 구조 후보를 찾아봅니다.');
    expect(markup).toContain('RDKit.js 검증을 통과한 구조에서만');
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
    expect(markup).toContain('CID');
    expect(markup).toContain('702');
    expect(markup).toContain('C2H6O');
    expect(markup).toContain('46.069');
    expect(markup).toContain('CCO');
    expect(markup).toContain('이 후보로 3D 불러오기');
    expect(markup).toContain('자동 선택하지 않고 직접 확인해야 합니다.');
  });
});
