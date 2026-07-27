import { describe, expect, it } from 'vitest';
import {
  SUPPORTED_AXE_NOTATIONS,
  analyzeVseprFromMolBlock,
} from './vseprEngine';

function molBlock(input: {
  title: string;
  atoms: string[];
  bonds: Array<[number, number, number]>;
  atomValences?: number[];
  comment?: string;
  chargeLine?: string;
  radicalLine?: string;
  queryPropertyLine?: string;
}): string {
  const atomLines = input.atoms.map(
    (symbol, index) =>
      `    0.0000    0.0000    0.0000 ${symbol.padEnd(
        3,
        ' ',
      )} 0  0  0  0  0 ${input.atomValences?.[index] ?? 0}  0  0  0  0  0  0`,
  );
  const bondLines = input.bonds.map(
    ([from, to, order]) =>
      `${String(from).padStart(3, ' ')}${String(to).padStart(3, ' ')}${String(
        order,
      ).padStart(3, ' ')}  0  0  0  0`,
  );

  return `${input.title}
  Workbench
${input.comment ?? ''}
${String(input.atoms.length).padStart(3, ' ')}${String(input.bonds.length).padStart(
    3,
    ' ',
  )}  0  0  0  0            999 V2000
${atomLines.join('\n')}
${bondLines.join('\n')}
${input.chargeLine ? `${input.chargeLine}\n` : ''}${input.radicalLine ? `${input.radicalLine}\n` : ''}${input.queryPropertyLine ? `${input.queryPropertyLine}\n` : ''}M  END`;
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
    expect(result.scope).toBe('local-center');
    expect(result.centralAtomSymbol).toBe('O');
    expect(result.centralAtomLabel).toBe('O1');
    expect(result.bondedAtomCount).toBe(2);
    expect(result.lonePairCount).toBe(2);
    expect(result.stericNumber).toBe(4);
    expect(result.axeNotation).toBe('AX2E2');
    expect(result.electronDomainGeometryKo).toBe('정사면체');
    expect(result.molecularShapeKo).toBe('굽은형');
    expect(result.idealBondAngles).toEqual(['<109.5°']);
    expect(result.angleEvidence).toEqual({
      vseprIdealAngles: ['<109.5°'],
    });
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
    });

    expect(result.status).toBe('supported');
    expect(result.centralAtomSymbol).toBe('C');
    expect(result.centralAtomLabel).toBe('C2');
    expect(result.centralAtomCandidates?.map((item) => item.atomLabel)).toEqual([
      'C2',
    ]);
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
    expect(result.centralAtomLabel).toBe('S2');
    expect(result.centralAtomCandidates?.map((item) => item.atomLabel)).toEqual([
      'S2',
    ]);
    expect(result.confidence).toBe('medium');
    expect(result.warnings.join(' ')).toContain('공명');
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
    expect(needsSelection.scope).toBe('local-center');
    expect(needsSelection.axeNotation).toBeUndefined();
    expect(needsSelection.molecularShapeKo).toBeUndefined();
    expect(needsSelection.angleEvidence).toBeUndefined();
    expect(needsSelection.centralAtomCandidates?.map((item) => item.atomLabel)).toEqual([
      'C1',
      'C2',
      'O3',
    ]);

    const localCenterCases = [
      { atomId: '1', atomLabel: 'C1', axeNotation: 'AX4' },
      { atomId: '2', atomLabel: 'C2', axeNotation: 'AX4' },
      { atomId: '3', atomLabel: 'O3', axeNotation: 'AX2E2' },
    ] as const;

    for (const localCenterCase of localCenterCases) {
      const result = analyzeVseprFromMolBlock({
        molBlock: ethanolMolBlock,
        selectedCentralAtomId: localCenterCase.atomId,
      });

      expect(result.status, localCenterCase.atomLabel).toBe('supported');
      expect(result.scope, localCenterCase.atomLabel).toBe('local-center');
      expect(result.centralAtomLabel, localCenterCase.atomLabel).toBe(
        localCenterCase.atomLabel,
      );
      expect(result.axeNotation, localCenterCase.atomLabel).toBe(
        localCenterCase.axeNotation,
      );
      expect(result.studentMessage, localCenterCase.atomLabel).toContain(
        '중심 원자 주변',
      );
    }
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
    expect(result.centralAtomLabel).toBe('B1');
    expect(result.centralAtomCandidates?.map((item) => item.atomLabel)).toEqual([
      'B1',
    ]);
    expect(result.axeNotation).toBe('AX3');
    expect(result.molecularShapeKo).toBe('삼각 평면');
  });

  it('blocks a disconnected atom graph before local VSEPR inference', () => {
    const result = analyzeVseprFromMolBlock({
      molBlock: molBlock({
        title: 'disconnected carbon atoms',
        atoms: ['C', 'C', 'C', 'C'],
        bonds: [],
      }),
      selectedCentralAtomId: '1',
    });

    expect(result.status).toBe('unsupported');
    expect(result.scope).toBe('local-center');
    expect(result.confidence).toBe('low');
    expect(result.centralAtomId).toBeUndefined();
    expect(result.axeNotation).toBeUndefined();
    expect(result.studentMessage).toContain('여러 조각');
    expect(result.developerLogs?.join(' ')).toContain('componentCount=4');
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

  it('blocks radical structures instead of presenting a confident VSEPR shape', () => {
    const result = analyzeVseprFromMolBlock({
      molBlock: molBlock({
        title: 'methyl radical',
        atoms: ['C'],
        bonds: [],
        radicalLine: 'M  RAD  1   1   2',
      }),
      selectedCentralAtomId: '1',
    });

    expect(result.status).toBe('unsupported');
    expect(result.confidence).toBe('low');
    expect(result.axeNotation).toBeUndefined();
    expect(result.molecularShapeKo).toBeUndefined();
    expect(result.studentMessage).toContain('현재 교육용 VSEPR 분석 범위 밖');
  });

  it.each(['O', 'Be'])(
    'honors V2000 zero-valence on [%s] and does not invent implicit hydrogens',
    (symbol) => {
      const result = analyzeVseprFromMolBlock({
        molBlock: molBlock({
          title: `zero-valence ${symbol}`,
          atoms: [symbol],
          atomValences: [15],
          bonds: [],
        }),
        selectedCentralAtomId: '1',
      });

      expect(result.status).toBe('unsupported');
      expect(result.axeNotation).toBeUndefined();
      expect(result.molecularShapeKo).toBeUndefined();
      expect((result.developerLogs ?? []).join('\n')).toContain(
        'declared zero valence',
      );
    },
  );

  it.each([5, 6, 7, 8])(
    'blocks V2000 query or ambiguous bond type %s before VSEPR inference',
    (bondType) => {
      const result = analyzeVseprFromMolBlock({
        molBlock: molBlock({
          title: `query bond ${bondType}`,
          atoms: ['C', 'O'],
          bonds: [[1, 2, bondType]],
        }),
        selectedCentralAtomId: '1',
      });

      expect(result.status).toBe('unsupported');
      expect(result.axeNotation).toBeUndefined();
      expect(result.studentMessage).toContain('질의 또는 모호한');
      expect((result.developerLogs ?? []).join('\n')).toContain(
        `query bond type ${bondType}`,
      );
    },
  );

  it.each([
    ['SUB', 'M  SUB  1   1   2'],
    ['UNS', 'M  UNS  1   1   1'],
    ['RBC', 'M  RBC  1   1   2'],
  ])(
    'blocks V2000 M %s query properties before VSEPR inference',
    (propertyTag, queryPropertyLine) => {
      const result = analyzeVseprFromMolBlock({
        molBlock: molBlock({
          title: `query property ${propertyTag}`,
          atoms: ['C', 'O'],
          bonds: [[1, 2, 1]],
          queryPropertyLine,
        }),
        selectedCentralAtomId: '1',
      });

      expect(result.status).toBe('unsupported');
      expect(result.confidence).toBe('low');
      expect(result.axeNotation).toBeUndefined();
      expect(result.molecularShapeKo).toBeUndefined();
      expect(result.studentMessage).toContain('질의 또는 모호한');
      expect((result.developerLogs ?? []).join('\n')).toContain(
        `query property M ${propertyTag}`,
      );
    },
  );

  it.each([
    ['title text', { title: 'V2000 bypass title' }],
    [
      'counts-shaped comment',
      {
        title: 'query property in hostile comment fixture',
        comment: ' 99 99  0  0  0  0            999 V2000',
      },
    ],
  ])(
    'uses only the standard counts-line position when %s also contains V2000',
    (_headerCase, header) => {
      const result = analyzeVseprFromMolBlock({
        molBlock: molBlock({
          ...header,
          atoms: ['C', 'O'],
          bonds: [[1, 2, 1]],
          queryPropertyLine: 'M  SUB  1   1   2',
        }),
        selectedCentralAtomId: '1',
      });

      expect(result.status).toBe('unsupported');
      expect(result.confidence).toBe('low');
      expect(result.axeNotation).toBeUndefined();
      expect(result.molecularShapeKo).toBeUndefined();
      expect(result.studentMessage).toContain('질의 또는 모호한');
      expect((result.developerLogs ?? []).join('\n')).toContain(
        'query property M SUB',
      );
    },
  );

  it('blocks dummy/query atoms before VSEPR inference', () => {
    const result = analyzeVseprFromMolBlock({
      molBlock: molBlock({
        title: 'dummy atom',
        atoms: ['C', '*'],
        bonds: [[1, 2, 1]],
      }),
      selectedCentralAtomId: '1',
    });

    expect(result.status).toBe('unsupported');
    expect(result.axeNotation).toBeUndefined();
    expect(result.studentMessage).toContain('질의 또는 모호한');
    expect((result.developerLogs ?? []).join('\n')).toContain(
      'query atom symbol *',
    );
  });

  it.each([
    {
      molecule: 'BeCl2',
      atoms: ['Be', 'Cl', 'Cl'],
      bonds: [
        [1, 2, 1],
        [1, 3, 1],
      ] as Array<[number, number, number]>,
      center: '1',
      stericNumber: 2,
      lonePairs: 0,
      electronGeometry: '선형',
      molecularShape: '선형',
    },
    {
      molecule: 'CO2',
      atoms: ['O', 'C', 'O'],
      bonds: [
        [1, 2, 2],
        [2, 3, 2],
      ] as Array<[number, number, number]>,
      center: '2',
      stericNumber: 2,
      lonePairs: 0,
      electronGeometry: '선형',
      molecularShape: '선형',
    },
    {
      molecule: 'HCN',
      atoms: ['H', 'C', 'N'],
      bonds: [
        [1, 2, 1],
        [2, 3, 3],
      ] as Array<[number, number, number]>,
      center: '2',
      stericNumber: 2,
      lonePairs: 0,
      electronGeometry: '선형',
      molecularShape: '선형',
    },
    {
      molecule: 'BF3',
      atoms: ['B', 'F', 'F', 'F'],
      bonds: [
        [1, 2, 1],
        [1, 3, 1],
        [1, 4, 1],
      ] as Array<[number, number, number]>,
      center: '1',
      stericNumber: 3,
      lonePairs: 0,
      electronGeometry: '삼각 평면',
      molecularShape: '삼각 평면',
    },
    {
      molecule: 'BCl3',
      atoms: ['B', 'Cl', 'Cl', 'Cl'],
      bonds: [
        [1, 2, 1],
        [1, 3, 1],
        [1, 4, 1],
      ] as Array<[number, number, number]>,
      center: '1',
      stericNumber: 3,
      lonePairs: 0,
      electronGeometry: '삼각 평면',
      molecularShape: '삼각 평면',
    },
    {
      molecule: 'CH2O',
      atoms: ['C', 'O'],
      bonds: [[1, 2, 2]] as Array<[number, number, number]>,
      center: '1',
      stericNumber: 3,
      lonePairs: 0,
      electronGeometry: '삼각 평면',
      molecularShape: '삼각 평면',
    },
    {
      molecule: 'CH4',
      atoms: ['C'],
      bonds: [] as Array<[number, number, number]>,
      center: '1',
      stericNumber: 4,
      lonePairs: 0,
      electronGeometry: '정사면체',
      molecularShape: '정사면체',
    },
    {
      molecule: 'CCl4',
      atoms: ['C', 'Cl', 'Cl', 'Cl', 'Cl'],
      bonds: [
        [1, 2, 1],
        [1, 3, 1],
        [1, 4, 1],
        [1, 5, 1],
      ] as Array<[number, number, number]>,
      center: '1',
      stericNumber: 4,
      lonePairs: 0,
      electronGeometry: '정사면체',
      molecularShape: '정사면체',
    },
    {
      molecule: 'CH3Cl',
      atoms: ['C', 'Cl'],
      bonds: [[1, 2, 1]] as Array<[number, number, number]>,
      center: '1',
      stericNumber: 4,
      lonePairs: 0,
      electronGeometry: '정사면체',
      molecularShape: '정사면체',
    },
    {
      molecule: 'NH3',
      atoms: ['N'],
      bonds: [] as Array<[number, number, number]>,
      center: '1',
      stericNumber: 4,
      lonePairs: 1,
      electronGeometry: '정사면체',
      molecularShape: '삼각뿔형',
    },
    {
      molecule: 'PCl3',
      atoms: ['P', 'Cl', 'Cl', 'Cl'],
      bonds: [
        [1, 2, 1],
        [1, 3, 1],
        [1, 4, 1],
      ] as Array<[number, number, number]>,
      center: '1',
      stericNumber: 4,
      lonePairs: 1,
      electronGeometry: '정사면체',
      molecularShape: '삼각뿔형',
    },
    {
      molecule: 'H2O',
      atoms: ['O'],
      bonds: [] as Array<[number, number, number]>,
      center: '1',
      stericNumber: 4,
      lonePairs: 2,
      electronGeometry: '정사면체',
      molecularShape: '굽은형',
    },
    {
      molecule: 'H2S',
      atoms: ['S'],
      bonds: [] as Array<[number, number, number]>,
      center: '1',
      stericNumber: 4,
      lonePairs: 2,
      electronGeometry: '정사면체',
      molecularShape: '굽은형',
    },
  ])(
    'matches the required classroom VSEPR result for $molecule',
    ({
      molecule,
      atoms,
      bonds,
      center,
      stericNumber,
      lonePairs,
      electronGeometry,
      molecularShape,
    }) => {
      const result = analyzeVseprFromMolBlock({
        molBlock: molBlock({ title: molecule, atoms, bonds }),
        selectedCentralAtomId: center,
      });

      expect(result.status).toBe('supported');
      expect(result.stericNumber).toBe(stericNumber);
      expect(result.lonePairCount).toBe(lonePairs);
      expect(result.electronDomainGeometryKo).toBe(electronGeometry);
      expect(result.molecularShapeKo).toBe(molecularShape);
    },
  );
});
