import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Molecule3DViewer } from './Molecule3DViewer';

describe('Molecule3DViewer', () => {
  it('shows a student-facing message when no 3D coordinates are available', () => {
    const markup = renderToStaticMarkup(
      <Molecule3DViewer
        coordinateData={null}
        hasValidatedStructure
        validatedStructureKey="CCO"
      />,
    );

    expect(markup).toContain('실제/외부 3D 구조 Viewer');
    expect(markup).toContain('3D 좌표 데이터가 아직 없습니다');
    expect(markup).toContain('좌표 출처');
    expect(markup).toContain('없음');
    expect(markup).toContain('출처 유형');
    expect(markup).toContain('입력 형식');
    expect(markup).toContain('대기 중');
    expect(markup).toContain('분자식과 분자량은 RDKit.js 검증 결과입니다.');
    expect(markup).toContain('3Dmol.js는 전달받은 좌표 데이터만 시각화합니다.');
    expect(markup).toContain('표시할 3D 좌표 데이터가 없습니다.');
  });

  it('labels coordinate-bearing inputs without claiming generated geometry', () => {
    const markup = renderToStaticMarkup(
      <Molecule3DViewer
        coordinateData={{
          format: 'xyz',
          data: '3\nwater\nO 0 0 0\nH 0 0 1\nH 1 0 0',
          label: '물',
          sourceType: 'static-example',
          coordinateSource: '예제 내장 3D 구조',
          sourceNote:
            '앱 내장 교육용 정적 3D 좌표입니다. 실험값, 에너지 최소화 결과, 결합각 계산용 데이터가 아닙니다.',
        }}
        hasValidatedStructure
        validatedStructureKey="O"
      />,
    );

    expect(markup).toContain('물의 교육용 3D 좌표 데이터를 표시합니다.');
    expect(markup).toContain('예제 내장 3D 구조');
    expect(markup).toContain('정적 예제');
    expect(markup).toContain('XYZ');
    expect(markup).toContain('실험값, 에너지 최소화 결과, 결합각 계산용 데이터가 아닙니다.');
    expect(markup).not.toContain('SMILES만으로');
  });
});
