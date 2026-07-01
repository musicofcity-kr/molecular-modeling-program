import { describe, expect, it } from 'vitest';
import {
  normalizeClassCode,
  normalizeStudentDisplayName,
  validateStudentEntryInput,
} from './session';

describe('student session input helpers', () => {
  it('normalizes class code without storing identifying student data', () => {
    expect(normalizeClassCode(' chem 101 ')).toBe('CHEM-101');
    expect(normalizeStudentDisplayName('  3조   학생A  ')).toBe('3조 학생A');
  });

  it('requires only class code and falls back to an anonymous display name', () => {
    expect(
      validateStudentEntryInput({
        classCode: 'chem-101',
        nickname: '',
      }),
    ).toEqual({
      ok: true,
      classCode: 'CHEM-101',
      displayName: '익명 학생',
    });
  });

  it('blocks entry when class code is missing', () => {
    expect(
      validateStudentEntryInput({
        classCode: '   ',
        nickname: '테스트',
      }),
    ).toEqual({
      ok: false,
      studentMessage: '수업코드를 입력해 주세요.',
    });
  });
});
