import { describe, expect, it } from 'vitest';
import { formulaFromRDKitJson } from './molecularFormula';

describe('formulaFromRDKitJson', () => {
  it('formats beryllium chloride from RDKit atom data', () => {
    const rdkitJson = JSON.stringify({
      defaults: {
        atom: {
          z: 6,
          impHs: 0,
          isotope: 0,
        },
      },
      molecules: [
        {
          atoms: [{ z: 17 }, { z: 4 }, { z: 17 }],
        },
      ],
    });

    expect(formulaFromRDKitJson(rdkitJson)).toBe('BeCl2');
  });
});
