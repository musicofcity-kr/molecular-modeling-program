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
    expect(markup).toContain('3D 좌표 데이터가 없어서 측정 도구를 사용할 수 없습니다.');
    expect(markup).toContain('결합길이/결합각 측정 MVP');
    expect(markup).toContain('결합길이 측정');
    expect(markup).toContain('결합각 측정');
    expect(markup).toContain('disabled=""');
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
          coordinateDimension: '3d',
          coordinateSource: '예제 내장 3D 구조',
          sourceNote:
            '앱 내장 교육용 정적 3D 좌표입니다. 실험값, 에너지 최소화 결과, 결합각 계산용 데이터가 아닙니다.',
        }}
        hasValidatedStructure
        validatedStructureKey="O"
      />,
    );

    expect(markup).toContain('물의 교육용 3D 좌표 데이터를 표시합니다.');
    expect(markup).toContain('표현 방식');
    expect(markup).toContain('Ball-and-stick');
    expect(markup).toContain('원자 라벨 표시');
    expect(markup).toContain('Reset view');
    expect(markup).toContain('Zoom to fit');
    expect(markup).toContain(
      '3D Viewer가 좌표 데이터를 준비하는 중입니다. 준비가 끝나면 측정 도구를 사용할 수 있습니다.',
    );
    expect(markup).toContain('파싱된 원자 수');
    expect(markup).toContain('3개');
    expect(markup).toContain('예제 내장 3D 구조');
    expect(markup).toContain('정적 예제');
    expect(markup).toContain('XYZ');
    expect(markup).toContain('실험값, 에너지 최소화 결과, 결합각 계산용 데이터가 아닙니다.');
    expect(markup).not.toContain('SMILES만으로');
  });

  it('shows teacher-only measurement guidance in teacher mode', () => {
    const coordinateData = {
      format: 'xyz' as const,
      data: '2\nhydrogen\nH 0 0 0\nH 0 0 0.74',
      label: '수소',
      sourceType: 'static-example' as const,
      coordinateDimension: '3d' as const,
      coordinateSource: '예제 내장 3D 구조',
      sourceNote: '교육용 정적 3D 좌표입니다.',
      sourceUrl: 'https://example.test/source.sdf',
    };

    const studentMarkup = renderToStaticMarkup(
      <Molecule3DViewer
        coordinateData={coordinateData}
        hasValidatedStructure
        userMode="student"
        validatedStructureKey="[H][H]"
      />,
    );
    const teacherMarkup = renderToStaticMarkup(
      <Molecule3DViewer
        coordinateData={coordinateData}
        hasValidatedStructure
        userMode="teacher"
        validatedStructureKey="[H][H]"
      />,
    );

    expect(studentMarkup).not.toContain('교사용 안내');
    expect(studentMarkup).not.toContain('https://example.test/source.sdf');
    expect(teacherMarkup).toContain('교사용 안내');
    expect(teacherMarkup).toContain('정적 좌표, PubChem 좌표, VSEPR 예측 모형 좌표');
    expect(teacherMarkup).toContain('https://example.test/source.sdf');
  });

  it('blocks measurement controls when coordinate data is not RDKit-validated', () => {
    const markup = renderToStaticMarkup(
      <Molecule3DViewer
        coordinateData={{
          format: 'xyz',
          data: '2\nhydrogen\nH 0 0 0\nH 0 0 0.74',
          label: '수소',
          sourceType: 'static-example',
          coordinateDimension: '3d',
          coordinateSource: '예제 내장 3D 구조',
          sourceNote: '교육용 정적 3D 좌표입니다.',
        }}
        hasValidatedStructure={false}
        validatedStructureKey="invalid"
      />,
    );

    expect(markup).toContain('RDKit.js 검증을 통과한 3D 좌표 데이터에서만 측정 도구를 사용할 수 있습니다.');
    expect(markup).toContain('disabled=""');
  });

  it('does not treat 2D MOL blocks as actual 3D coordinate data', () => {
    const markup = renderToStaticMarkup(
      <Molecule3DViewer
        coordinateData={{
          format: 'mol',
          data: `ketcher 2D mol
  Ketcher

  2  1  0  0  0  0            999 V2000
    0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    1.0000    0.0000    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0
M  END`,
          label: '2D 구조',
          sourceType: 'review-needed',
          coordinateDimension: '2d',
          coordinateSource: 'Ketcher 2D MOL block',
          sourceNote: '2D 구조 데이터입니다.',
        }}
        hasValidatedStructure
        validatedStructureKey="CO"
      />,
    );

    expect(markup).toContain('3D 좌표로 확인된 데이터가 아니어서 실제/외부 3D 구조로 표시하지 않습니다.');
    expect(markup).toContain('파싱된 원자 수');
    expect(markup).toContain('좌표 없음');
  });
});
