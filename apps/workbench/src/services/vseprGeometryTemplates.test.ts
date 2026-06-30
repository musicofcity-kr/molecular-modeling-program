import { describe, expect, it } from 'vitest';
import {
  REQUIRED_VSEPR_TEMPLATE_AXE_NOTATIONS,
  VSEPR_GEOMETRY_TEMPLATES,
  getVseprGeometryTemplate,
  hasVseprGeometryTemplate,
} from './vseprGeometryTemplates';

describe('vseprGeometryTemplates', () => {
  it('defines all required MVP VSEPR templates', () => {
    expect(REQUIRED_VSEPR_TEMPLATE_AXE_NOTATIONS).toEqual([
      'AX2',
      'AX3',
      'AX2E',
      'AX4',
      'AX3E',
      'AX2E2',
    ]);

    for (const axeNotation of REQUIRED_VSEPR_TEMPLATE_AXE_NOTATIONS) {
      expect(hasVseprGeometryTemplate(axeNotation)).toBe(true);
    }
  });

  it('separates bond vectors from lone-pair vectors', () => {
    const bent = getVseprGeometryTemplate('AX2E2');

    expect(bent?.vectors.filter((vector) => vector.kind === 'bond')).toHaveLength(2);
    expect(bent?.vectors.filter((vector) => vector.kind === 'lonePair')).toHaveLength(2);
    expect(bent?.molecularShapeKo).toBe('굽은형');
    expect(bent?.note).toContain('실제 분자 좌표');
  });

  it('contains optional extended templates without treating them as measured coordinates', () => {
    expect(Object.keys(VSEPR_GEOMETRY_TEMPLATES)).toEqual([
      'AX2',
      'AX3',
      'AX2E',
      'AX4',
      'AX3E',
      'AX2E2',
      'AX5',
      'AX4E',
      'AX3E2',
      'AX2E3',
      'AX6',
      'AX5E',
      'AX4E2',
    ]);
    expect(getVseprGeometryTemplate('AX6')?.vectors).toHaveLength(6);
    expect(getVseprGeometryTemplate('AX4E2')?.vectors).toHaveLength(6);
    expect(getVseprGeometryTemplate('AX7')).toBeNull();
  });

  it('accepts Claude-style AXmE0 and AXmE1 notation aliases', () => {
    const aliases = [
      ['AX2E0', 'AX2'],
      ['AX3E0', 'AX3'],
      ['AX2E1', 'AX2E'],
      ['AX4E0', 'AX4'],
      ['AX3E1', 'AX3E'],
      ['AX2E2', 'AX2E2'],
      ['AX5E0', 'AX5'],
      ['AX4E1', 'AX4E'],
      ['AX3E2', 'AX3E2'],
      ['AX2E3', 'AX2E3'],
      ['AX6E0', 'AX6'],
      ['AX5E1', 'AX5E'],
      ['AX4E2', 'AX4E2'],
    ];

    for (const [claudeNotation, appNotation] of aliases) {
      expect(getVseprGeometryTemplate(claudeNotation)?.axeNotation).toBe(
        appNotation,
      );
      expect(hasVseprGeometryTemplate(claudeNotation)).toBe(true);
    }
  });
});
