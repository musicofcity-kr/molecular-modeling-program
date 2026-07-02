import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TeacherDashboardPlaceholder } from './TeacherDashboardPlaceholder';

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
});
