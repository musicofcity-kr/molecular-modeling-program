import { describe, expect, it } from 'vitest';
import {
  SUPPORTED_AXE_NOTATIONS,
  analyzeVseprFromMolBlock,
} from './vseprEngine';

function molBlock(input: {
  title: string;
  atoms: string[];
  bonds: Array<[number, number, number]>;
  chargeLine?: string;
}): string {
  const atomLines = input.atoms.map(
    (symbol) =>
      `    0.0000    0.0000    0.0000 ${symbol.padEnd(
        3,
        ' ',
      )} 0  0  0  0  0  0  0  0  0  0  0  0`,
  );
  const bondLines = input.bonds.map(
    ([from, to, order]) =>
      `${String(from).padStart(3, ' ')}${String(to).padStart(3, ' ')}${String(
        order,
      ).padStart(3, ' ')}  0  0  0  0`,
  );

  return `${input.title}
  Workbench

${String(input.atoms.length).padStart(3, ' ')}${String(input.bonds.length).padStart(
    3,
    ' ',
  )}  0  0  0  0            999 V2000
${atomLines.join('\n')}
${bondLines.join('\n')}
${input.chargeLine ? `${input.chargeLine}\n` : ''}M  END`;
}

describe('vseprEngine', () => {
  it('exports the supported MVP AXE notation set', () => {
    expect(SUPPORTED_AXE_NOTATIONS).toEqual([
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
  });

  it('infers water as AX2E2 from an oxygen-only mol block with implicit hydrogens', () => {
    const result = analyzeVseprFromMolBlock({
      molBlock: molBlock({ title: 'water', atoms: ['O'], bonds: [] }),
    });

    expect(result.status).toBe('supported');
    expect(result.centralAtomSymbol).toBe('O');
    expect(result.bondedAtomCount).toBe(2);
    expect(result.lonePairCount).toBe(2);
    expect(result.stericNumber).toBe(4);
    expect(result.axeNotation).toBe('AX2E2');
    expect(result.electronDomainGeometryKo).toBe('정사면체');
    expect(result.molecularShapeKo).toBe('굽은형');
    expect(result.idealBondAngles).toEqual(['<109.5°']);
  });

  it('keeps explicit hydrogens as bonded atoms instead of subtracting them', () => {
    const result = analyzeVseprFromMolBlock({
      molBlock: molBlock({
        title: 'explicit water',
        atoms: ['O', 'H', 'H'],
        bonds: [
          [1, 2, 1],
          [1, 3, 1],
        ],
      }),
      selectedCentralAtomId: '1',
    });

    expect(result.status).toBe('supported');
    expect(result.bondedAtomCount).toBe(2);
    expect(result.axeNotation).toBe('AX2E2');
  });

  it('infers methane as AX4 from a carbon-only mol block with implicit hydrogens', () => {
    const result = analyzeVseprFromMolBlock({
      molBlock: molBlock({ title: 'methane', atoms: ['C'], bonds: [] }),
    });

    expect(result.status).toBe('supported');
    expect(result.axeNotation).toBe('AX4');
    expect(result.molecularShapeKo).toBe('정사면체');
    expect(result.idealBondAngles).toEqual(['109.5°']);
  });

  it('infers ammonia as AX3E, not AX3E1, from a nitrogen-only mol block with implicit hydrogens', () => {
    const result = analyzeVseprFromMolBlock({
      molBlock: molBlock({ title: 'ammonia', atoms: ['N'], bonds: [] }),
    });

    expect(result.status).toBe('supported');
    expect(result.centralAtomSymbol).toBe('N');
    expect(result.bondedAtomCount).toBe(3);
    expect(result.lonePairCount).toBe(1);
    expect(result.stericNumber).toBe(4);
    expect(result.axeNotation).toBe('AX3E');
    expect(result.electronDomainGeometryKo).toBe('정사면체');
    expect(result.molecularShapeKo).toBe('삼각뿔형');
    expect(result.idealBondAngles).toEqual(['<109.5°']);
  });

  it('treats a double bond as one VSEPR electron domain for carbon dioxide', () => {
    const result = analyzeVseprFromMolBlock({
      molBlock: molBlock({
        title: 'carbon dioxide',
        atoms: ['O', 'C', 'O'],
        bonds: [
          [1, 2, 2],
          [2, 3, 2],
        ],
      }),
      selectedCentralAtomId: '2',
    });

    expect(result.status).toBe('supported');
    expect(result.centralAtomSymbol).toBe('C');
    expect(result.bondedAtomCount).toBe(2);
    expect(result.lonePairCount).toBe(0);
    expect(result.axeNotation).toBe('AX2');
    expect(result.molecularShapeKo).toBe('선형');
  });

  it('treats sulfur dioxide as AX2E with two bonded domains and one lone pair', () => {
    const result = analyzeVseprFromMolBlock({
      molBlock: molBlock({
        title: 'sulfur dioxide',
        atoms: ['O', 'S', 'O'],
        bonds: [
          [1, 2, 2],
          [2, 3, 2],
        ],
      }),
    });

    expect(result.status).toBe('supported');
    expect(result.centralAtomSymbol).toBe('S');
    expect(result.bondedAtomCount).toBe(2);
    expect(result.lonePairCount).toBe(1);
    expect(result.stericNumber).toBe(3);
    expect(result.axeNotation).toBe('AX2E');
    expect(result.electronDomainGeometryKo).toBe('삼각 평면');
    expect(result.molecularShapeKo).toBe('굽은형');
    expect(result.idealBondAngles).toEqual(['<120°']);
  });

  it('requires user selection for ethanol-like multiple local centers', () => {
    const ethanolMolBlock = molBlock({
      title: 'ethanol skeleton',
      atoms: ['C', 'C', 'O'],
      bonds: [
        [1, 2, 1],
        [2, 3, 1],
      ],
    });

    const needsSelection = analyzeVseprFromMolBlock({ molBlock: ethanolMolBlock });
    expect(needsSelection.status).toBe('needs_central_atom');
    expect(needsSelection.centralAtomCandidates?.map((item) => item.atomLabel)).toEqual([
      'C1',
      'C2',
      'O3',
    ]);

    const oxygen = analyzeVseprFromMolBlock({
      molBlock: ethanolMolBlock,
      selectedCentralAtomId: '3',
    });

    expect(oxygen.status).toBe('supported');
    expect(oxygen.centralAtomSymbol).toBe('O');
    expect(oxygen.axeNotation).toBe('AX2E2');
    expect(oxygen.warnings).toContain(
      '2D MOL block에서 생략된 수소를 일반 원자가 규칙으로 추정했습니다.',
    );
  });

  it('auto-selects a clear center atom when all other heavy atoms are terminal ligands', () => {
    const result = analyzeVseprFromMolBlock({
      molBlock: molBlock({
        title: 'boron trifluoride',
        atoms: ['B', 'F', 'F', 'F'],
        bonds: [
          [1, 2, 1],
          [1, 3, 1],
          [1, 4, 1],
        ],
      }),
    });

    expect(result.status).toBe('supported');
    expect(result.centralAtomSymbol).toBe('B');
    expect(result.centralAtomId).toBe('1');
    expect(result.axeNotation).toBe('AX3');
    expect(result.molecularShapeKo).toBe('삼각 평면');
  });

  it('covers Claude classroom presets for Be, B, P, S, Cl, Br, and Xe centers', () => {
    const cases = [
      {
        title: 'beryllium chloride',
        atoms: ['Be', 'Cl', 'Cl'],
        bonds: [
          [1, 2, 1],
          [1, 3, 1],
        ] as Array<[number, number, number]>,
        shape: '선형',
        axeNotation: 'AX2',
        center: 'Be',
      },
      {
        title: 'phosphorus pentachloride',
        atoms: ['P', 'Cl', 'Cl', 'Cl', 'Cl', 'Cl'],
        bonds: [
          [1, 2, 1],
          [1, 3, 1],
          [1, 4, 1],
          [1, 5, 1],
          [1, 6, 1],
        ] as Array<[number, number, number]>,
        shape: '삼각쌍뿔',
        axeNotation: 'AX5',
        center: 'P',
      },
      {
        title: 'sulfur tetrafluoride',
        atoms: ['S', 'F', 'F', 'F', 'F'],
        bonds: [
          [1, 2, 1],
          [1, 3, 1],
          [1, 4, 1],
          [1, 5, 1],
        ] as Array<[number, number, number]>,
        shape: '시소형',
        axeNotation: 'AX4E',
        center: 'S',
      },
      {
        title: 'chlorine trifluoride',
        atoms: ['Cl', 'F', 'F', 'F'],
        bonds: [
          [1, 2, 1],
          [1, 3, 1],
          [1, 4, 1],
        ] as Array<[number, number, number]>,
        shape: 'T자형',
        axeNotation: 'AX3E2',
        center: 'Cl',
      },
      {
        title: 'xenon difluoride',
        atoms: ['Xe', 'F', 'F'],
        bonds: [
          [1, 2, 1],
          [1, 3, 1],
        ] as Array<[number, number, number]>,
        shape: '선형',
        axeNotation: 'AX2E3',
        center: 'Xe',
      },
      {
        title: 'sulfur hexafluoride',
        atoms: ['S', 'F', 'F', 'F', 'F', 'F', 'F'],
        bonds: [
          [1, 2, 1],
          [1, 3, 1],
          [1, 4, 1],
          [1, 5, 1],
          [1, 6, 1],
          [1, 7, 1],
        ] as Array<[number, number, number]>,
        shape: '팔면체',
        axeNotation: 'AX6',
        center: 'S',
      },
      {
        title: 'bromine pentafluoride',
        atoms: ['Br', 'F', 'F', 'F', 'F', 'F'],
        bonds: [
          [1, 2, 1],
          [1, 3, 1],
          [1, 4, 1],
          [1, 5, 1],
          [1, 6, 1],
        ] as Array<[number, number, number]>,
        shape: '사각뿔형',
        axeNotation: 'AX5E',
        center: 'Br',
      },
      {
        title: 'xenon tetrafluoride',
        atoms: ['Xe', 'F', 'F', 'F', 'F'],
        bonds: [
          [1, 2, 1],
          [1, 3, 1],
          [1, 4, 1],
          [1, 5, 1],
        ] as Array<[number, number, number]>,
        shape: '사각평면형',
        axeNotation: 'AX4E2',
        center: 'Xe',
      },
    ];

    for (const item of cases) {
      const result = analyzeVseprFromMolBlock({
        molBlock: molBlock({
          title: item.title,
          atoms: item.atoms,
          bonds: item.bonds,
        }),
      });

      expect(result.status, item.title).toBe('supported');
      expect(result.centralAtomSymbol, item.title).toBe(item.center);
      expect(result.axeNotation, item.title).toBe(item.axeNotation);
      expect(result.molecularShapeKo, item.title).toBe(item.shape);
    }
  });

  it('returns unsupported for transition-metal centers and non-integer lone pair estimates', () => {
    const metal = analyzeVseprFromMolBlock({
      molBlock: molBlock({
        title: 'unsupported metal',
        atoms: ['Fe', 'Cl'],
        bonds: [[1, 2, 1]],
      }),
      selectedCentralAtomId: '1',
    });

    expect(metal.status).toBe('unsupported');
    expect(metal.warnings.join(' ')).toContain('지원하지 않는 중심 원소');

    const oddElectron = analyzeVseprFromMolBlock({
      molBlock: molBlock({
        title: 'odd electron',
        atoms: ['O', 'O'],
        bonds: [[1, 2, 1]],
      }),
      selectedCentralAtomId: '1',
      disableImplicitHydrogenInference: true,
    });

    expect(oddElectron.status).toBe('unsupported');
    expect(oddElectron.warnings.join(' ')).toContain('비공유 전자쌍 수를 정수로 추정할 수 없습니다');
  });
});
