import type { ExampleMolecule } from '../data/exampleMolecules';
import type {
  ActivityTemplate,
  AppMode,
  UserMode,
} from '../types/activity';
import type {
  Molecule3DInput,
  MoleculeValidationResult,
  PubChemMatchStatus,
} from '../types/molecule';
import type { PubChem3DLoadStatus } from '../services/pubchem3d';
import type { VseprAnalysis } from '../types/vsepr';

type TeacherPanelProps = {
  userMode: UserMode;
  appMode: AppMode;
  templates: ActivityTemplate[];
  selectedActivityId: string;
  examples: ExampleMolecule[];
  selectedExample?: ExampleMolecule;
  validationResult: MoleculeValidationResult | null;
  vseprAnalysis: VseprAnalysis;
  molecule3DInput: Molecule3DInput | null;
  pubChem3DStatus: PubChem3DLoadStatus;
  pubChemCandidateStatus: PubChemMatchStatus;
  onSelectActivity: (activityId: string) => void;
};

export function TeacherPanel({
  userMode,
  appMode,
  templates,
  selectedActivityId,
  examples,
  selectedExample,
  validationResult,
  vseprAnalysis,
  molecule3DInput,
  pubChem3DStatus,
  pubChemCandidateStatus,
  onSelectActivity,
}: TeacherPanelProps) {
  if (userMode !== 'teacher') {
    return null;
  }

  const selectedTemplate =
    templates.find((template) => template.id === selectedActivityId) ?? templates[0];
  const recommendedExample = examples.find(
    (example) => example.id === selectedTemplate?.recommendedExampleId,
  );

  if (!selectedTemplate) {
    return null;
  }

  const studentInputItems = [
    ...selectedTemplate.predictionQuestions,
    ...selectedTemplate.reflectionQuestions,
  ];

  return (
    <section className="workspace-panel teacher-panel" data-testid="teacher-panel">
      <div className="panel-heading teacher-heading">
        <div>
          <p className="section-label">교사용</p>
          <h2>교사용 지도 패널</h2>
        </div>
        <span className="status-pill">자동 채점 없음</span>
      </div>

      <div className="teacher-layout">
        <nav className="activity-list" aria-label="교사용 활동 목록">
          {templates.map((template) => (
            <button
              className={
                template.id === selectedTemplate.id
                  ? 'activity-template-button active'
                  : 'activity-template-button'
              }
              data-testid={`teacher-activity-template-${template.id}`}
              key={template.id}
              type="button"
              onClick={() => {
                onSelectActivity(template.id);
              }}
            >
              <span>{template.title}</span>
              <small>{template.targetMoleculeName}</small>
            </button>
          ))}
        </nav>

        <div className="teacher-content">
          <div className="teacher-card">
            <p className="section-label">현재 활동 템플릿</p>
            <h3>{selectedTemplate.title}</h3>
            <dl className="teacher-info-grid">
              <div>
                <dt>작업 모드</dt>
                <dd>{appMode === 'activity' ? '수업 활동' : '자유 그리기'}</dd>
              </div>
              <div>
                <dt>그려야 할 분자</dt>
                <dd>{selectedTemplate.targetMoleculeName}</dd>
              </div>
              <div>
                <dt>Target SMILES</dt>
                <dd>{selectedTemplate.targetSmiles ?? '없음'}</dd>
              </div>
              <div>
                <dt>예상 분자식(예제 메타데이터)</dt>
                <dd>{recommendedExample?.expectedFormula ?? '예제 메타데이터 없음'}</dd>
              </div>
              <div>
                <dt>예상 VSEPR</dt>
                <dd>
                  {formatExpectedVsepr(selectedTemplate)}
                </dd>
              </div>
              <div>
                <dt>추천 예제</dt>
                <dd>{recommendedExample?.nameKo ?? '없음'}</dd>
              </div>
            </dl>
          </div>

          <div className="teacher-card">
            <p className="section-label">학습 목표</p>
            <p>{selectedTemplate.learningGoal}</p>
            <p>{selectedTemplate.prompt}</p>
          </div>

          <div className="teacher-grid">
            <TeacherList title="핵심 개념" items={selectedTemplate.coreConcepts} />
            <TeacherList title="지도 참고 정보" items={selectedTemplate.teacherNotes} />
            <TeacherList
              title="오개념 체크 포인트"
              items={selectedTemplate.misconceptionChecks}
            />
            <TeacherList
              title="학생 입력 항목"
              items={studentInputItems.map((question) => question.label)}
            />
          </div>

          <div className="teacher-card">
            <p className="section-label">활동 질문 목록</p>
            <div className="teacher-question-columns">
              <TeacherList
                title="예측 질문"
                items={selectedTemplate.predictionQuestions.map(
                  (question) => question.label,
                )}
              />
              <TeacherList
                title="정리 질문"
                items={selectedTemplate.reflectionQuestions.map(
                  (question) => question.label,
                )}
              />
            </div>
          </div>

          <div className="teacher-card">
            <p className="section-label">현재 상태 점검</p>
            <dl className="teacher-info-grid">
              <div>
                <dt>RDKit 검증 상태</dt>
                <dd>{formatValidationStatus(validationResult)}</dd>
              </div>
              <div>
                <dt>VSEPR 분석 상태</dt>
                <dd>{formatVseprStatus(vseprAnalysis)}</dd>
              </div>
              <div>
                <dt>3D 구조 제공 상태</dt>
                <dd>{format3DStatus(molecule3DInput, recommendedExample)}</dd>
              </div>
              <div>
                <dt>PubChem 연결 상태</dt>
                <dd>
                  {formatPubChemStatus(
                    selectedExample,
                    recommendedExample,
                    pubChem3DStatus,
                    pubChemCandidateStatus,
                  )}
                </dd>
              </div>
            </dl>
            <p className="teacher-boundary-note">
              교사용 정보는 지도 참고용입니다. 이 단계에서는 정답/오답 판정,
              학생별 저장, 점수화를 수행하지 않습니다.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function TeacherList({
  title,
  items,
}: {
  title: string;
  items?: string[];
}) {
  return (
    <div className="teacher-card compact">
      <p className="section-label">{title}</p>
      {items?.length ? (
        <ul className="teacher-list">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>등록된 항목이 없습니다.</p>
      )}
    </div>
  );
}

function formatExpectedVsepr(template: ActivityTemplate): string {
  const expected = template.expectedVsepr;

  if (!expected) {
    return '등록된 예상 VSEPR 정보 없음';
  }

  return [
    expected.axeNotation,
    expected.molecularShapeKo,
    expected.centralAtom ? `중심 ${expected.centralAtom}` : null,
    typeof expected.lonePairCount === 'number'
      ? `비공유 전자쌍 ${expected.lonePairCount}쌍`
      : null,
  ]
    .filter(Boolean)
    .join(' / ');
}

function formatValidationStatus(
  validationResult: MoleculeValidationResult | null,
): string {
  if (!validationResult) {
    return '아직 검증 전';
  }

  if (!validationResult.ok) {
    return '검증 실패 또는 오류';
  }

  return `검증 완료: ${validationResult.molecularFormula}, 평균 분자량 ${validationResult.molecularWeight.toFixed(3)}`;
}

function formatVseprStatus(analysis: VseprAnalysis): string {
  if (analysis.status === 'supported') {
    return `${analysis.axeNotation ?? 'AXE 미정'} / ${
      analysis.molecularShapeKo ?? '구조 미정'
    }`;
  }

  if (analysis.status === 'needs_central_atom') {
    return '중심 원자 선택 필요';
  }

  if (analysis.status === 'unsupported') {
    return '현재 MVP 규칙에서 지원하지 않음';
  }

  if (analysis.status === 'error') {
    return '분석 오류';
  }

  return '아직 분석 전';
}

function format3DStatus(
  molecule3DInput: Molecule3DInput | null,
  recommendedExample?: ExampleMolecule,
): string {
  if (molecule3DInput) {
    return `${molecule3DInput.coordinateSource} / ${molecule3DInput.format.toUpperCase()}`;
  }

  if (recommendedExample?.structure3D) {
    return '추천 예제에 정적 3D 좌표 있음, 아직 표시 전';
  }

  return '현재 표시 중인 3D 좌표 없음';
}

function formatPubChemStatus(
  selectedExample: ExampleMolecule | undefined,
  recommendedExample: ExampleMolecule | undefined,
  pubChem3DStatus: PubChem3DLoadStatus,
  pubChemCandidateStatus: PubChemMatchStatus,
): string {
  const cid = selectedExample?.pubchemCid ?? recommendedExample?.pubchemCid;
  const cidText = cid ? `CID ${cid}` : '준비된 CID 없음';

  return `${cidText} / 3D 로딩: ${pubChem3DStatus} / 후보 검색: ${pubChemCandidateStatus}`;
}
