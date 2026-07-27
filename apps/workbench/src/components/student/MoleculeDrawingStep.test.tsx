import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { exampleMolecules } from '../../data/exampleMolecules';
import { MoleculeDrawingStep } from './MoleculeDrawingStep';

describe('MoleculeDrawingStep construction guidance', () => {
  it('gives beginners a direct chain-drawing path and warns against isolated clicks', () => {
    const markup = renderToStaticMarkup(
      <MoleculeDrawingStep
        drawingSlot={<div>editor</div>}
        examples={exampleMolecules}
        selectedExampleId={exampleMolecules[0].id}
        onSelectExample={vi.fn()}
        onLoadExample={vi.fn()}
        onConfirmStructure={vi.fn()}
      />,
    );

    expect(markup).toContain('data-testid="direct-chain-drawing-guide"');
    expect(markup).toContain('사슬(Chain) 도구');
    expect(markup).toContain('누른 채 드래그');
    expect(markup).toContain('원자를 따로 여러 번 놓으면');
    expect(markup).toContain('서로 연결되지 않은 조각');
  });
});
