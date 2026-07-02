import { describe, expect, it } from 'vitest';
import {
  isTeacherAuthorized,
  normalizeClassCode,
  normalizeStudentDisplayName,
  resolveTeacherAuthorizationStatus,
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

describe('teacher authorization helpers', () => {
  it('maps Firebase custom claims to teacher authorization status', () => {
    expect(resolveTeacherAuthorizationStatus({ teacher: true })).toBe(
      'authorized',
    );
    expect(resolveTeacherAuthorizationStatus({ role: 'teacher' })).toBe(
      'authorized',
    );
    expect(resolveTeacherAuthorizationStatus({ teacher: false })).toBe(
      'pending_custom_claim',
    );
    expect(resolveTeacherAuthorizationStatus(undefined)).toBe('not_checked');
  });

  it('treats only authorized teacher sessions as teacher-authorized', () => {
    expect(
      isTeacherAuthorized({
        role: 'teacher',
        uid: 'teacher-1',
        authProvider: 'firebase-google',
        signedInAt: '2026-07-02T00:00:00.000Z',
        teacherAuthorizationStatus: 'authorized',
      }),
    ).toBe(true);
    expect(
      isTeacherAuthorized({
        role: 'teacher',
        uid: 'teacher-2',
        authProvider: 'firebase-email',
        signedInAt: '2026-07-02T00:00:00.000Z',
        teacherAuthorizationStatus: 'pending_custom_claim',
      }),
    ).toBe(false);
    expect(isTeacherAuthorized(null)).toBe(false);
  });
});
