import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const testFilePath = fileURLToPath(import.meta.url);
const rulesPath = resolve(
  dirname(testFilePath),
  '../../../../../firebase/firestore.rules',
);
const projectId = 'demo-molecule-workbench';
const classroomId = 'classA';
const teacherUid = 'teacherA';
const otherTeacherUid = 'teacherB';
const studentUid = 'studentA';
const otherStudentUid = 'studentB';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: readFileSync(rulesPath, 'utf8'),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

function nowIso() {
  return '2026-07-01T00:00:00.000Z';
}

function classroomData(ownerUid = teacherUid) {
  return {
    ownerTeacherUid: ownerUid,
    teacherUids: {
      [ownerUid]: true,
    },
    title: '고1 화학 수업',
    joinCodeHash: 'sha256-class-code-hash',
    joinEnabled: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function studentMembershipData(uid = studentUid) {
  return {
    uid,
    displayName: uid === studentUid ? '익명학생1' : '익명학생2',
    anonymousStudentId: `anon-${uid}`,
    joinedAt: nowIso(),
    lastActiveAt: nowIso(),
  };
}

function submissionData(uid = studentUid, id = 'submissionA') {
  return {
    classroomId,
    studentUid: uid,
    studentDisplayName: uid === studentUid ? '익명학생1' : '익명학생2',
    anonymousStudentId: `anon-${uid}`,
    activityId: 'water-structure',
    snapshot: {
      id,
      activityTitle: '물 분자 구조 그리기',
      moleculeName: '물',
      rdkitValidation: {
        isValid: true,
        molecularFormula: 'H2O',
        molecularWeight: '18.015',
      },
    },
    status: 'submitted',
    submittedAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function unauthDb() {
  return testEnv.unauthenticatedContext().firestore();
}

function studentDb(uid = studentUid) {
  return testEnv
    .authenticatedContext(uid, {
      firebase: { sign_in_provider: 'anonymous' },
    })
    .firestore();
}

function teacherDb(uid = teacherUid) {
  return testEnv
    .authenticatedContext(uid, {
      teacher: true,
      role: 'teacher',
    })
    .firestore();
}

function googleUserWithoutTeacherClaimDb(uid = teacherUid) {
  return testEnv
    .authenticatedContext(uid, {
      firebase: { sign_in_provider: 'google.com' },
    })
    .firestore();
}

function userWithFalseTeacherClaimDb(uid = teacherUid) {
  return testEnv
    .authenticatedContext(uid, {
      teacher: false,
      role: 'student',
    })
    .firestore();
}

async function seedClassroom() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();

    await setDoc(
      doc(adminDb, `classrooms/${classroomId}`),
      classroomData(),
    );
    await setDoc(
      doc(adminDb, `classrooms/${classroomId}/public/info`),
      {
        title: '고1 화학 수업',
        currentActivityTitle: '물 분자 구조 그리기',
        updatedAt: nowIso(),
      },
    );
    await setDoc(
      doc(adminDb, `classrooms/${classroomId}/students/${studentUid}`),
      studentMembershipData(studentUid),
    );
    await setDoc(
      doc(adminDb, `classrooms/${classroomId}/activityTemplates/published`),
      {
        title: '물 분자 구조 그리기',
        targetMoleculeName: '물',
        published: true,
        activityData: {},
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
    );
    await setDoc(
      doc(adminDb, `classrooms/${classroomId}/activityTemplates/draft`),
      {
        title: '교사용 비공개 활동',
        targetMoleculeName: '벤젠',
        published: false,
        activityData: {},
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
    );
    await setDoc(
      doc(adminDb, `classrooms/${classroomId}/submissions/submissionA`),
      submissionData(studentUid, 'submissionA'),
    );
    await setDoc(
      doc(adminDb, `classrooms/${classroomId}/submissions/submissionB`),
      submissionData(otherStudentUid, 'submissionB'),
    );
  });
}

describe('Firestore Security Rules for classroom persistence', () => {
  it('blocks unauthenticated classroom and submission access', async () => {
    await seedClassroom();
    const db = unauthDb();

    await assertFails(getDoc(doc(db, `classrooms/${classroomId}`)));
    await assertFails(
      setDoc(
        doc(db, `classrooms/${classroomId}/submissions/newSubmission`),
        submissionData(studentUid, 'newSubmission'),
      ),
    );
  });

  it('allows a teacher claim holder to create a classroom for themself', async () => {
    const db = teacherDb();

    await assertSucceeds(
      setDoc(doc(db, 'classrooms/newClass'), classroomData(teacherUid)),
    );
  });

  it('blocks non-teachers from creating classrooms', async () => {
    const db = studentDb();

    await assertFails(
      setDoc(doc(db, 'classrooms/newClass'), classroomData(studentUid)),
    );
  });

  it('blocks Google-authenticated users when teacher custom claim is missing', async () => {
    const db = googleUserWithoutTeacherClaimDb();

    await assertFails(
      setDoc(doc(db, 'classrooms/newClass'), classroomData(teacherUid)),
    );
  });

  it('blocks users with an explicit non-teacher claim', async () => {
    const db = userWithFalseTeacherClaimDb();

    await assertFails(
      setDoc(doc(db, 'classrooms/newClass'), classroomData(teacherUid)),
    );
  });

  it('blocks student submission writes when membership does not exist', async () => {
    await seedClassroom();
    const db = studentDb(otherStudentUid);

    await assertFails(
      setDoc(
        doc(db, `classrooms/${classroomId}/submissions/noMembership`),
        submissionData(otherStudentUid, 'noMembership'),
      ),
    );
  });

  it('allows a member student to create only their own submitted snapshot', async () => {
    await seedClassroom();
    const db = studentDb();

    await assertSucceeds(
      setDoc(
        doc(db, `classrooms/${classroomId}/submissions/newSubmission`),
        submissionData(studentUid, 'newSubmission'),
      ),
    );
  });

  it('blocks student submissions that include teacher feedback or raw debug data', async () => {
    await seedClassroom();
    const db = studentDb();
    const submissionRef = doc(
      db,
      `classrooms/${classroomId}/submissions/unsafeSubmission`,
    );

    await assertFails(
      setDoc(submissionRef, {
        ...submissionData(studentUid, 'unsafeSubmission'),
        teacherFeedback: { summary: '자동 피드백' },
      }),
    );
    await assertFails(
      setDoc(submissionRef, {
        ...submissionData(studentUid, 'unsafeSubmission'),
        rawMolBlock: 'raw mol data',
      }),
    );
    await assertFails(
      setDoc(submissionRef, {
        ...submissionData(studentUid, 'unsafeSubmission'),
        developerLogs: ['debug'],
      }),
    );
  });

  it('lets students read public class info and published activities, but not class root or drafts', async () => {
    await seedClassroom();
    const db = studentDb();

    await assertFails(getDoc(doc(db, `classrooms/${classroomId}`)));
    await assertSucceeds(
      getDoc(doc(db, `classrooms/${classroomId}/public/info`)),
    );
    await assertSucceeds(
      getDoc(
        doc(db, `classrooms/${classroomId}/activityTemplates/published`),
      ),
    );
    await assertFails(
      getDoc(doc(db, `classrooms/${classroomId}/activityTemplates/draft`)),
    );
  });

  it('blocks students from reading other student submissions', async () => {
    await seedClassroom();
    const db = studentDb();

    await assertSucceeds(
      getDoc(doc(db, `classrooms/${classroomId}/submissions/submissionA`)),
    );
    await assertFails(
      getDoc(doc(db, `classrooms/${classroomId}/submissions/submissionB`)),
    );
  });

  it('blocks students from updating or deleting submitted snapshots', async () => {
    await seedClassroom();
    const db = studentDb();
    const ownSubmission = doc(
      db,
      `classrooms/${classroomId}/submissions/submissionA`,
    );

    await assertFails(updateDoc(ownSubmission, { updatedAt: nowIso() }));
    await assertFails(deleteDoc(ownSubmission));
  });

  it('allows assigned teachers to read submissions and update only feedback status fields', async () => {
    await seedClassroom();
    const db = teacherDb();
    const submissionRef = doc(
      db,
      `classrooms/${classroomId}/submissions/submissionA`,
    );

    await assertSucceeds(getDoc(doc(db, `classrooms/${classroomId}`)));
    await assertSucceeds(getDoc(submissionRef));
    await assertSucceeds(
      updateDoc(submissionRef, {
        status: 'feedback_returned',
        updatedAt: nowIso(),
        teacherFeedback: {
          id: 'feedbackA',
          source: 'local_guardrail_preview',
          summary: '분자식과 입체 구조 비교가 잘 정리되었습니다.',
          strengths: ['구조 확인 결과를 근거로 설명함'],
          improvementQuestions: ['비공유 전자쌍의 영향을 한 문장 더 써 보세요.'],
          studentMessage: '확인 결과와 관찰 내용을 연결해 설명했습니다.',
          teacherReviewNote: '교사 검토 완료',
          reviewRequired: false,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        },
        feedbackReturnedAt: nowIso(),
      }),
    );
  });

  it('blocks teachers from changing student ownership or submitted snapshot content', async () => {
    await seedClassroom();
    const db = teacherDb();
    const submissionRef = doc(
      db,
      `classrooms/${classroomId}/submissions/submissionA`,
    );

    await assertFails(
      updateDoc(submissionRef, {
        studentUid: otherStudentUid,
        status: 'feedback_returned',
        updatedAt: nowIso(),
      }),
    );
    await assertFails(
      updateDoc(submissionRef, {
        snapshot: {
          id: 'tampered',
          activityTitle: '변조된 제출',
        },
        status: 'feedback_returned',
        updatedAt: nowIso(),
      }),
    );
  });

  it('blocks teachers who are not assigned to the classroom', async () => {
    await seedClassroom();
    const db = teacherDb(otherTeacherUid);

    await assertFails(getDoc(doc(db, `classrooms/${classroomId}`)));
    await assertFails(
      getDoc(doc(db, `classrooms/${classroomId}/submissions/submissionA`)),
    );
  });

  it('blocks direct client creation of student membership documents', async () => {
    await seedClassroom();
    const db = studentDb(otherStudentUid);

    await assertFails(
      setDoc(
        doc(db, `classrooms/${classroomId}/students/${otherStudentUid}`),
        studentMembershipData(otherStudentUid),
      ),
    );
  });

  it('blocks teachers from directly creating student membership documents', async () => {
    await seedClassroom();
    const db = teacherDb();

    await assertFails(
      setDoc(
        doc(db, `classrooms/${classroomId}/students/${otherStudentUid}`),
        studentMembershipData(otherStudentUid),
      ),
    );
  });

  it('blocks students from changing membership ownership fields', async () => {
    await seedClassroom();
    const db = studentDb();

    await assertFails(
      updateDoc(doc(db, `classrooms/${classroomId}/students/${studentUid}`), {
        uid: otherStudentUid,
        displayName: '다른 학생',
        lastActiveAt: nowIso(),
      }),
    );
  });
});
