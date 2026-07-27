import { describe, expect, it } from 'vitest';
import { parseStrictV2000Layout } from './v2000MolBlock';

function molBlockWithCountsLine(
  countsLine: string,
  header: string[] = ['molecule', '  Workbench', ''],
): string {
  return [...header, countsLine, 'M  END'].join('\n');
}

describe('parseStrictV2000Layout', () => {
  it('reads atom and bond counts only from the standard fourth line', () => {
    const result = parseStrictV2000Layout(
      molBlockWithCountsLine(
        '  2  1  0  0  0  0            999 V2000',
        [
          'V2000 in the molecule title',
          '  Workbench',
          ' 99 99  0  0  0  0            999 V2000',
        ],
      ),
    );

    expect(result).toMatchObject({
      countsLineIndex: 3,
      atomCount: 2,
      bondCount: 1,
    });
  });

  it.each([
    [
      'counts line at a compact non-standard position',
      [
        'molecule',
        '  Workbench',
        '  2  1  0  0  0  0            999 V2000',
        'M  END',
      ].join('\n'),
    ],
    [
      'non-integer atom field',
      molBlockWithCountsLine(
        ' 2x  1  0  0  0  0            999 V2000',
      ),
    ],
    [
      'version token outside its fixed field',
      molBlockWithCountsLine(
        '  2  1  0  0  0  0           999 V2000 ',
      ),
    ],
  ])('rejects %s', (_case, molBlock) => {
    expect(parseStrictV2000Layout(molBlock)).toBeNull();
  });
});
