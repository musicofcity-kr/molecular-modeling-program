import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { App, resolveValidatedExampleForResult } from './App';
import { exampleMolecules } from '../data/exampleMolecules';
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
    displayName: '테스트 교사',
    email: 'teacher@example.com',
    authProvider: 'firebase-google',
    signedInAt: '2026-07-01T00:00:00.000Z',
  };

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
    expect(markup).toContain('수업방 생성');
    expect(markup).toContain('활동 관리');
    expect(markup).toContain('제출 목록');
    expect(markup).toContain('학생 입장으로 이동');
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
    expect(markup).toContain('오늘의 탐구 흐름');
    expect(markup).toContain('student-step-tab');
    expect(markup).toContain('panel-tab-button');
    expect(markup).toContain('aria-expanded="true"');
    expect(markup).toContain('접기');
    expect(markup).toContain('01');
    expect(markup).toContain('활동 선택');
    expect(markup).toContain('01 활동 선택 단계로 이동');
    expect(markup).toContain('id="student-step-1"');
    expect(markup).toContain('02');
    expect(markup).toContain('예측 입력');
    expect(markup).toContain('02 예측 입력 단계로 이동');
    expect(markup).toContain('id="student-step-2"');
    expect(markup).toContain('03');
    expect(markup).toContain('구조 그리기');
    expect(markup).toContain('03 구조 그리기 단계로 이동');
    expect(markup).toContain('id="student-step-3"');
    expect(markup).toContain('04');
    expect(markup).toContain('구조 확인');
    expect(markup).toContain('04 구조 확인 단계로 이동');
    expect(markup).toContain('id="student-step-4"');
    expect(markup).toContain('05');
    expect(markup).toContain('입체 구조 보기');
    expect(markup).toContain('05 입체 구조 보기 단계로 이동');
    expect(markup).toContain('id="student-step-5"');
    expect(markup).toContain('06');
    expect(markup).toContain('비교 기록');
    expect(markup).toContain('06 비교 기록 단계로 이동');
    expect(markup).toContain('id="student-step-6"');
    expect(markup).toContain('07');
    expect(markup).toContain('결과 정리');
    expect(markup).toContain('07 결과 정리 단계로 이동');
    expect(markup).toContain('id="student-step-7"');
    expect(markup).toContain('오늘의 활동 선택하기');
    expect(markup).toContain('예측 입력하기');
    expect(markup).toContain('분자 편집 영역');
    expect(markup).toContain('분자 그리기');
    expect(markup).toContain('내 구조 확인하기');
    expect(markup).toContain('확인된 값만 결과로 봅니다');
    expect(markup).toContain('입체 구조 보기');
    expect(markup).toContain('정리 작성하기');
    expect(markup).toContain('예상 입체 모형 보기');
    expect(markup).toContain('참고 3D 구조 보기');
    expect(markup).toContain('구조 비교하기');
    expect(markup).toContain('활동 결과 정리');
    expect(markup).toContain('임시 저장하기');
    expect(markup).toContain('보고서로 저장하기');
    expect(markup).toContain('활동지 인쇄하기');
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
    expect(markup).toContain('기본 분자');
    expect(markup).toContain('유기 기초');
    expect(markup).toContain('생활 속 분자');
    expect(markup).toContain('물 (Water)');
    expect(markup).toContain('아스피린 (Aspirin)');
    expect(markup).not.toContain('data-testid="formula-output"');
    expect(markup).not.toContain('data-testid="molecular-weight-output"');
  });

  it('renders the authenticated teacher dashboard placeholder without enabling server persistence', () => {
    const markup = renderToStaticMarkup(
      <App
        initialRoute="teacher-dashboard"
        initialSession={teacherSession}
        initialEthicsGateAccepted
      />,
    );

    expect(markup).toContain('교사용 대시보드 준비');
    expect(markup).toContain('Firestore 저장 비활성');
    expect(markup).toContain('수업방 생성');
    expect(markup).toContain('활동 관리');
    expect(markup).toContain('제출 목록');
    expect(markup).toContain('교사용 지도 패널');
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
});
