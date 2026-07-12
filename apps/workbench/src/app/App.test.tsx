import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  App,
  EditorLoadingFallback,
  getReturnedStudentFeedbacksForSession,
  resolveActivityIdForExample,
  resolveActivityTemplateForResult,
  resolveRecommendedExampleIdForActivity,
  resolveValidatedExampleForResult,
  shouldAutoLoadPubChem3DForExample,
} from './App';
import { activityTemplates } from '../data/activityTemplates';
import { exampleMolecules } from '../data/exampleMolecules';
import type { ActivitySubmission } from '../types/feedback';
import type { MoleculeValidationResult } from '../types/molecule';
import type { StudentSession, TeacherSession } from '../types/session';

vi.mock('../components/editor/KetcherEditor', () => ({
  KetcherEditor: () => (
    <section className="workspace-panel editor-panel" data-testid="chemical-editor">
      <h2>분자 편집 영역</h2>
      <p>분자 그리기 도구 mock editor</p>
    </section>
  ),
  normalizeKetcherError: (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback,
}));

describe('App scaffold', () => {
  const studentSession: StudentSession = {
    role: 'student',
    classCode: 'CHEM-101',
    displayName: '익명 학생',
    anonymousStudentId: 'student-test',
    startedAt: '2026-07-01T00:00:00.000Z',
  };
  const teacherSession: TeacherSession = {
    role: 'teacher',
    uid: 'teacher-test',
    idToken: 'teacher-id-token',
    displayName: '테스트 교사',
    email: 'teacher@example.com',
    authProvider: 'firebase-google',
    signedInAt: '2026-07-01T00:00:00.000Z',
    teacherAuthorizationStatus: 'authorized',
  };
  const emergencyTeacherSession: TeacherSession = {
    role: 'teacher',
    uid: 'emergency-teacher-local',
    displayName: '긴급 교사',
    authProvider: 'emergency-local',
    signedInAt: '2026-07-01T00:00:00.000Z',
    teacherAuthorizationStatus: 'authorized',
    isEmergencyAccess: true,
  };

  it('renders the Ketcher loading fallback with the classroom-friendly delay message', () => {
    const markup = renderToStaticMarkup(<EditorLoadingFallback />);

    expect(markup).toContain('data-testid="chemical-editor"');
    expect(markup).toContain('그리기 도구 준비 중');
    expect(markup).toContain('분자 편집기를 불러오는 중입니다');
    expect(markup).toContain('최초 1회');
    expect(markup).toContain('네트워크에 따라 수십 초');
    expect(markup).not.toContain('Ketcher');
  });

  it('renders the ethics guide gate before entering the app', () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain('다양한 분자의 분자구조 모델링');
    expect(markup).toContain('생성형 AI 윤리 핵심가이드');
    expect(markup).toContain('핵심 가치');
    expect(markup).toContain('핵심 가이드');
    expect(markup).toContain('생성형 AI 활용의 목적과 범위를 스스로 설정하고 책임져요.');
    expect(markup).toContain('내가 먼저 시도하고, 생성형 AI의 결과물에 나만의 통찰을 담아 완성해요.');
    expect(markup).toContain('생성형 AI의 한계를 분석하고, 자료를 찾아 결과물을 비판적으로 검증해요.');
    expect(markup).toContain('생성형 AI를 보조 도구로 삼아 사고의 범위와 깊이를 확장해요.');
    expect(markup).toContain('데이터 보안과 정서적 자립을 통해 디지털 시민성을 완성해요.');
    expect(markup).toContain('생성형 AI 활용 사실을 투명하게 공개하며 학술적 정직성을 실천해요.');
    expect(markup).toContain('이 사진에 있는 윤리 핵심가이드를 빠짐없이 읽겠습니다.');
    expect(markup).toContain('개인정보처리방침');
    expect(markup).toContain('이용약관');
    expect(markup).toContain('정보관리책임자');
    expect(markup).toContain('© 2026');
    expect(markup).toContain('disabled=""');
    expect(markup).not.toContain('수업에서 사용할 화면을 선택합니다');
    expect(markup).not.toContain('분자 편집 영역');
  });

  it('renders the role selection screen at the root route after the ethics gate is accepted', () => {
    const markup = renderToStaticMarkup(<App initialEthicsGateAccepted />);

    expect(markup).toContain('다양한 분자의 분자구조 모델링');
    expect(markup).toContain('고1 화학 · 결합의 세계');
    expect(markup).toContain('검증된 값만 표시');
    expect(markup).toContain('수업에서 사용할 화면을 선택합니다');
    expect(markup).toContain('학생으로 입장하기');
    expect(markup).toContain('교사용 로그인으로 이동');
    expect(markup).toContain('개인정보처리방침');
    expect(markup).toContain('이용약관');
    expect(markup).toContain('정보관리책임자');
    expect(markup).toContain('© 2026');
    expect(markup).not.toContain('분자 편집 영역');
  });

  it('renders the student entry gate before the classroom activity starts', () => {
    const markup = renderToStaticMarkup(
      <App initialRoute="student" initialEthicsGateAccepted />,
    );

    expect(markup).toContain('다양한 분자의 분자구조 모델링');
    expect(markup).toContain('학생 입장');
    expect(markup).toContain('수업코드');
    expect(markup).toContain('입장 확인코드');
    expect(markup).toContain('수업용 닉네임 또는 익명 ID');
    expect(markup).toContain('분자구조 모델링 활동 시작하기');
    expect(markup).toContain('교사용 로그인으로 이동');
    expect(markup).not.toContain('오늘의 탐구 흐름');
    expect(markup).not.toContain('분자 편집 영역');
  });

  it('renders the teacher auth preparation screen without exposing teacher-only panels', () => {
    const markup = renderToStaticMarkup(
      <App initialRoute="teacher" initialEthicsGateAccepted />,
    );

    expect(markup).toContain('교사용 로그인');
    expect(markup).toContain('Firebase Auth 기반 교사용 접근을 준비합니다');
    expect(markup).toContain('Firebase 인증 설정이 필요합니다');
    expect(markup).toMatch(
      /data-testid="teacher-google-login-button"[^>]*disabled=""/,
    );
    expect(markup).toMatch(
      /data-testid="teacher-email-login-button"[^>]*disabled=""/,
    );
    expect(markup).toContain('수업방 생성');
    expect(markup).toContain('활동 관리');
    expect(markup).toContain('제출 목록');
    expect(markup).toContain('학생 입장으로 이동');
    expect(markup).not.toContain('긴급 교사용 로그인');
    expect(markup).not.toContain('교사용 지도 패널');
    expect(markup).not.toContain('개발자 로그 보기');
  });

  it('renders the student activity flow after an anonymous classroom session starts without raw chemistry or developer details', () => {
    const markup = renderToStaticMarkup(
      <App
        initialRoute="student-workbench"
        initialSession={studentSession}
        initialEthicsGateAccepted
      />,
    );

    expect(markup).toContain('다양한 분자의 분자구조 모델링');
    expect(markup).toContain('고1 화학 · 결합의 세계');
    expect(markup).toContain('검증된 값만 표시');
    expect(markup).not.toContain('Phase 15: Classroom MVP Release Candidate');
    expect(markup).toContain('교사용 안내');
    expect(markup).toContain('분자 선택');
    expect(markup).toContain('분자 편집 영역');
    expect(markup).toContain('구조 검증');
    expect(markup).toContain('구조 보기');
    expect(markup).toContain('나의 생각 정리');
    expect(markup).toContain('교사에게 제출하기');
    expect(markup).not.toContain('오늘의 탐구 흐름');
    expect(markup).not.toContain('student-wizard-stage');
    expect(markup).not.toContain('student-wizard-action-bar');
    expect(markup).not.toContain('예측 입력하기');
    expect(markup).not.toContain('정리 작성하기');
    expect(markup).not.toContain('구조 비교하기');
    expect(markup).not.toContain('활동 결과 정리');
    expect(markup).not.toContain('임시 저장하기');
    expect(markup).not.toContain('보고서로 저장하기');
    expect(markup).not.toContain('활동지 인쇄하기');
    expect(markup).toContain('이 분자의 3D 자료가 아직 준비되지 않았습니다');
    expect(markup).not.toContain('구조 정보');
    expect(markup).not.toContain('Canonical SMILES');
    expect(markup).not.toContain('아직 추출된 MOL 데이터');
    expect(markup).not.toContain('Ketcher');
    expect(markup).not.toContain('RDKit.js');
    expect(markup).not.toContain('PubChem');
    expect(markup).not.toContain('CID');
    expect(markup).not.toContain('SDF');
    expect(markup).not.toContain('SMILES');
    expect(markup).not.toContain('MOL');
    expect(markup).not.toContain('JSON');
    expect(markup).not.toContain('localStorage');
    expect(markup).not.toContain('Developer log');
    expect(markup).not.toContain('실제/외부');
    expect(markup).not.toContain('개발자 로그 / 검증 결과');
    expect(markup).not.toContain('개발자 로그 보기');
    expect(markup).not.toContain('교사용 지도 패널');
    expect(markup).toContain('분자 예시 불러오기');
    expect(markup).toContain(activityTemplates[0].title);
    expect(markup).toContain(activityTemplates[0].targetMoleculeName);
    expect(markup).toContain('물 (Water)');
    expect(markup).toContain('아스피린 (Aspirin)');
    expect(markup).not.toContain('data-testid="formula-output"');
    expect(markup).not.toContain('data-testid="molecular-weight-output"');
  });

  it('limits the student activity picker to templates selected by the classroom', () => {
    const allowedTemplates = activityTemplates.slice(0, 3);
    const hiddenTemplates = activityTemplates.slice(3);
    const markup = renderToStaticMarkup(
      <App
        initialRoute="student-workbench"
        initialSession={{
          ...studentSession,
          activityTemplateIds: allowedTemplates.map((template) => template.id),
        }}
        initialEthicsGateAccepted
      />,
    );

    allowedTemplates.forEach((template) => {
      expect(markup).toContain(template.title);
    });
    hiddenTemplates.forEach((template) => {
      expect(markup).not.toContain(template.title);
    });
  });

  it('keeps returned teacher feedback visible when a student re-enters with a different anonymous id but the same Firebase uid', () => {
    const returningSession: StudentSession = {
      ...studentSession,
      anonymousStudentId: 'new-browser-anonymous-id',
      firebaseUid: 'student-firebase-uid',
      classroomJoinStatus: 'joined',
    };
    const snapshot = {
      id: 'snapshot-1',
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
      appMode: 'activity',
      userMode: 'student',
      studentPrediction: {},
      rdkitValidation: { isValid: true },
      threeDObservation: { has3DStructure: false },
      measurements: [],
      activityAnswers: [],
      exportNotice: '수업 활동 기록입니다.',
    } satisfies ActivitySubmission['snapshot'];
    const feedback = {
      id: 'feedback-1',
      createdAt: '2026-07-01T00:10:00.000Z',
      updatedAt: '2026-07-01T00:10:00.000Z',
      source: 'local_guardrail_preview',
      summary: '구조 표현을 확인했습니다.',
      strengths: ['분자식 확인을 시도했습니다.'],
      improvementQuestions: ['3D 구조 관찰 내용을 더 적어 보세요.'],
      studentMessage: '교사가 전달한 피드백입니다.',
      teacherReviewNote: '교사 확인 완료',
      reviewRequired: false,
    } satisfies ActivitySubmission['teacherFeedback'];
    const returnedForSameFirebaseUser: ActivitySubmission = {
      id: 'submission-1',
      submittedAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:10:00.000Z',
      classCode: 'CHEM-101',
      studentDisplayName: '익명 학생',
      anonymousStudentId: 'old-browser-anonymous-id',
      studentUid: 'student-firebase-uid',
      snapshot,
      status: 'feedback_returned',
      teacherFeedback: feedback,
      feedbackReturnedAt: '2026-07-01T00:10:00.000Z',
    };
    const returnedForOtherStudent: ActivitySubmission = {
      ...returnedForSameFirebaseUser,
      id: 'submission-2',
      anonymousStudentId: 'other-anonymous-id',
      studentUid: 'other-firebase-uid',
    };
    const returnedFromOtherClass: ActivitySubmission = {
      ...returnedForSameFirebaseUser,
      id: 'submission-3',
      classCode: 'CHEM-999',
    };
    const draftOnly: ActivitySubmission = {
      ...returnedForSameFirebaseUser,
      id: 'submission-4',
      status: 'feedback_draft',
    };

    expect(
      getReturnedStudentFeedbacksForSession(
        [
          returnedForSameFirebaseUser,
          returnedForOtherStudent,
          returnedFromOtherClass,
          draftOnly,
        ],
        returningSession,
      ).map((submission) => submission.id),
    ).toEqual(['submission-1']);
  });

  it('renders the authenticated teacher dashboard with Firestore classroom controls', () => {
    const markup = renderToStaticMarkup(
      <App
        initialRoute="teacher-dashboard"
        initialSession={teacherSession}
        initialEthicsGateAccepted
      />,
    );

    expect(markup).toContain('교사용 대시보드 준비');
    expect(markup).toContain('Firestore 연결 가능');
    expect(markup).toContain('로그아웃');
    expect(markup).toContain('data-testid="teacher-sign-out-button"');
    expect(markup).toContain('수업방 만들기');
    expect(markup).toContain('서버 제출 목록 불러오기');
    expect(markup).toContain('수업코드와 입장 확인코드');
    expect(markup).toContain('수업방 생성');
    expect(markup).toContain('활동 관리');
    expect(markup).toContain('제출 목록');
    expect(markup).toContain('교사용 지도 패널');
  });

  it('renders emergency teacher access without enabling Firestore controls', () => {
    const markup = renderToStaticMarkup(
      <App
        initialRoute="teacher-dashboard"
        initialSession={emergencyTeacherSession}
        initialEthicsGateAccepted
      />,
    );

    expect(markup).toContain('긴급 교사용 보기');
    expect(markup).toContain('Firestore 권한 필요');
    expect(markup).toContain('Firebase ID token이 없으므로');
    expect(markup).toContain('교사용 지도 패널');
    expect(markup).not.toContain('Firestore 연결 가능');
  });

  it('does not expose teacher-only panels when teacher custom claim is still pending', () => {
    const markup = renderToStaticMarkup(
      <App
        initialRoute="teacher-dashboard"
        initialSession={{
          ...teacherSession,
          teacherAuthorizationStatus: 'pending_custom_claim',
        }}
        initialEthicsGateAccepted
      />,
    );

    expect(markup).toContain('교사 권한 승인 대기');
    expect(markup).toContain('아직 teacher custom claim이 없습니다');
    expect(markup).toContain('Firestore 권한 필요');
    expect(markup).toContain('로그아웃');
    expect(markup).toContain('data-testid="teacher-sign-out-button"');
    expect(markup).not.toContain('교사용 지도 패널');
    expect(markup).not.toContain('개발자 로그 보기');
    expect(markup).not.toContain('외부 3D 자료 찾기');
  });

  it('keeps the selected example handoff when a matching structure is confirmed again', () => {
    const water = exampleMolecules.find((example) => example.id === 'water');
    const result = {
      ok: true,
      source: 'smiles',
      canonicalSmiles: 'O',
      smiles: 'O',
      molBlock: '',
      molecularFormula: 'H2O',
      molecularWeight: 18.015,
      warnings: [],
      errors: [],
      developerLogs: [],
      validationStatus: 'valid',
    } satisfies MoleculeValidationResult;

    expect(water).toBeDefined();
    expect(
      resolveValidatedExampleForResult({
        selectedExample: water,
        result,
      })?.id,
    ).toBe('water');
  });

  it('does not attach selected example 3D data when a drawn structure no longer matches it', () => {
    const water = exampleMolecules.find((example) => example.id === 'water');
    const result = {
      ok: true,
      source: 'smiles',
      canonicalSmiles: 'C',
      smiles: 'C',
      molBlock: '',
      molecularFormula: 'CH4',
      molecularWeight: 16.043,
      warnings: [],
      errors: [],
      developerLogs: [],
      validationStatus: 'valid',
    } satisfies MoleculeValidationResult;

    expect(water).toBeDefined();
    expect(
      resolveValidatedExampleForResult({
        selectedExample: water,
        result,
      }),
    ).toBeNull();
  });

  it('selects the activity recommended example when a classroom activity changes', () => {
    expect(
      resolveRecommendedExampleIdForActivity({
        activityId: 'draw-ethanol',
        templates: activityTemplates,
        examples: exampleMolecules,
        fallbackExampleId: 'water',
      }),
    ).toBe('ethanol');

    expect(
      resolveRecommendedExampleIdForActivity({
        activityId: 'unknown-activity',
        templates: activityTemplates,
        examples: exampleMolecules,
        fallbackExampleId: 'water',
      }),
    ).toBe('water');
  });

  it('selects a matching classroom activity when an example molecule is selected', () => {
    expect(
      resolveActivityIdForExample({
        exampleId: 'ethanol',
        templates: activityTemplates,
        fallbackActivityId: 'draw-water',
      }),
    ).toBe('draw-ethanol');

    expect(
      resolveActivityIdForExample({
        exampleId: 'glucose',
        templates: activityTemplates,
        fallbackActivityId: 'draw-water',
      }),
    ).toBe('draw-water');
  });

  it('uses the validated example name in result summaries when no matching activity exists', () => {
    const waterActivity = activityTemplates.find(
      (template) => template.id === 'draw-water',
    );
    const glucose = exampleMolecules.find((example) => example.id === 'glucose');

    expect(waterActivity).toBeDefined();
    expect(glucose).toBeDefined();

    const resultTemplate = resolveActivityTemplateForResult({
      appMode: 'activity',
      selectedActivity: waterActivity,
      validatedExample: glucose,
    });

    expect(resultTemplate?.title).toBe('포도당 분자 구조 확인');
    expect(resultTemplate?.targetMoleculeName).toBe('포도당');
    expect(resultTemplate?.targetSmiles).toBeUndefined();
    expect(resultTemplate?.comparisonMode?.enabled).toBe(false);
  });

  it('auto-loads curated PubChem 3D only for validated examples without static coordinates', () => {
    const water = exampleMolecules.find((example) => example.id === 'water');
    const ethanol = exampleMolecules.find((example) => example.id === 'ethanol');
    const aspirin = exampleMolecules.find((example) => example.id === 'aspirin');

    expect(shouldAutoLoadPubChem3DForExample(water)).toBe(false);
    expect(shouldAutoLoadPubChem3DForExample(ethanol)).toBe(true);
    expect(shouldAutoLoadPubChem3DForExample(aspirin)).toBe(false);
  });
});
