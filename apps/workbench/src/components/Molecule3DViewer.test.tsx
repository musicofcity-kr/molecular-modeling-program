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

    expect(markup).toContain('3D Viewer');
    expect(markup).toContain('3D 좌표 데이터가 아직 없습니다');
    expect(markup).toContain('좌표 출처');
    expect(markup).toContain('없음');
    expect(markup).toContain('입력 형식');
    expect(markup).toContain('대기 중');
  });

  it('labels coordinate-bearing inputs without claiming generated geometry', () => {
    const markup = renderToStaticMarkup(
      <Molecule3DViewer
        coordinateData={{
          format: 'xyz',
          data: '3\nwater\nO 0 0 0\nH 0 0 1\nH 1 0 0',
          label: '물',
          coordinateSource: '사용자가 가져온 파일',
        }}
        hasValidatedStructure
        validatedStructureKey="O"
      />,
    );

    expect(markup).toContain('물의 3D 좌표 데이터를 표시합니다.');
    expect(markup).toContain('사용자가 가져온 파일');
    expect(markup).toContain('XYZ');
    expect(markup).not.toContain('SMILES만으로');
  });
});

