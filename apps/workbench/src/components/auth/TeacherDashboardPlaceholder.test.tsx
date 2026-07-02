import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ActivitySubmission } from '../../types/feedback';
import { TeacherDashboardPlaceholder } from './TeacherDashboardPlaceholder';

const submission: ActivitySubmission = {
  id: 'activity-submission-test',
  submittedAt: '2026-07-03T06:22:11.000Z',
  updatedAt: '2026-07-03T06:22:11.000Z',
  classCode: 'CHEM-111',
  studentDisplayName: 'QA 학생',
  anonymousStudentId: 'qa-student',
  status: 'submitted',
  snapshot: {
    id: 'result-test',
    createdAt: '2026-07-03T06:20:00.000Z',
    updatedAt: '2026-07-03T06:22:11.000Z',
    appMode: 'activity',
    userMode: 'student',
    activityId: 'draw-carbon-dioxide',
    activityTitle: '이산화탄소 분자 구조 그리기',
    moleculeName: '이산화탄소',
    studentPrediction: {
      predictedFormula: 'CO2',
    },
    rdkitValidation: {
      isValid: true,
      molecularFormula: 'CO2',
      molecularWeight: 44.009,
    },
    threeDObservation: {
      has3DStructure: false,
    },
    measurements: [],
    activityAnswers: [],
    exportNotice: '수업 활동 기록용입니다.',
  },
};

describe('TeacherDashboardPlaceholder', () => {
  it('renders server diagnostic details for teacher-only troubleshooting', () => {
    const markup = renderToStaticMarkup(
      <TeacherDashboardPlaceholder
        authorizationStatus="authorized"
        statusMessage="서버 수업방 생성 중 문제가 발생했습니다."
        statusTone="warning"
        developerLogs={[
          'createClassroom failed: Firestore database is not available',
          'createClassroom endpoint status: 500',
        ]}
      />,
    );

    expect(markup).toContain('교사 권한 확인 완료');
    expect(markup).toContain('activity-result-status warning');
    expect(markup).toContain('교사용 서버 진단 정보 보기');
    expect(markup).toContain(
      'createClassroom failed: Firestore database is not available',
    );
    expect(markup).toContain('createClassroom endpoint status: 500');
  });

  it('keeps diagnostic details hidden when there are no server logs', () => {
    const markup = renderToStaticMarkup(
      <TeacherDashboardPlaceholder authorizationStatus="authorized" />,
    );

    expect(markup).not.toContain('교사용 서버 진단 정보 보기');
  });

  it('renders loaded server submissions inside the classroom dashboard', () => {
    const markup = renderToStaticMarkup(
      <TeacherDashboardPlaceholder
        authorizationStatus="authorized"
        submissions={[submission]}
        selectedSubmissionId={submission.id}
        onCreateClassroom={() => {}}
        onLoadSubmissions={() => {}}
        onSelectSubmission={() => {}}
      />,
    );

    expect(markup).toContain('불러온 제출 자료');
    expect(markup).toContain('1건');
    expect(markup).toContain('teacher-server-submissions');
    expect(markup).toContain('teacher-server-submission-summary');
    expect(markup).toContain('이산화탄소 분자 구조 그리기');
    expect(markup).toContain('QA 학생');
    expect(markup).toContain('CO2');
    expect(markup).toContain('확인 완료');
    expect(markup).toContain('제출됨');
  });
});
