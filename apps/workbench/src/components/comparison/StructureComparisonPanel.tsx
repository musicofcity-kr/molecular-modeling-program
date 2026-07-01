import { Molecule3DViewer } from '../Molecule3DViewer';
import { Vsepr3DModelViewer } from '../Vsepr3DModelViewer';
import type { UserMode } from '../../types/activity';
import type { Molecule3DInput } from '../../types/molecule';
import type {
  StructureComparisonObservation,
  StructureComparisonState,
} from '../../types/structureComparison';
import type { VseprAnalysis, VseprModelViewStatus } from '../../types/vsepr';
import { isComparisonAvailable } from '../../services/structureComparison';

type StructureComparisonPanelProps = {
  userMode: UserMode;
  state: StructureComparisonState;
  molecule3DInput: Molecule3DInput | null;
  vseprAnalysis: VseprAnalysis;
  vseprModelStatus: VseprModelViewStatus;
  isOpen: boolean;
  observation: StructureComparisonObservation;
  focusQuestion?: string;
  onToggleOpen: () => void;
  onObservationChange: (
    field: keyof Pick<
      StructureComparisonObservation,
      'observedSimilarities' | 'observedDifferences' | 'studentReflection'
    >,
    value: string,
  ) => void;
  onDeveloperLog?: (message: string) => void;
};

const STUDENT_GUIDANCE = [
  '예상 입체 모형은 전자쌍 반발 이론으로 분자 모양을 예측하는 도구입니다. 참고 3D 구조와 항상 완전히 같지는 않습니다.',
  '참고 3D 구조는 3D 자료를 시각화한 것입니다. 예상 입체 모형은 이론에 따른 교육용 예측입니다.',
  '비교 모드는 어느 쪽이 무조건 정답인지 고르는 활동이 아니라, 두 표현의 의미를 구분하는 활동입니다.',
];

const TEACHER_GUIDANCE = [
  'VSEPR은 중심 원자 주변 전자쌍 영역을 단순화한 교육용 모델입니다.',
  'PubChem/정적 좌표 구조는 외부 좌표 데이터 또는 교육용 좌표를 시각화한 것입니다.',
  '두 구조가 유사해도 같은 출처의 데이터가 아닙니다.',
  '물, 메테인, 암모니아, 이산화탄소처럼 단일 중심 원자 구조는 비교 활동에 적합합니다.',
  '에탄올, 벤젠, 아스피린처럼 중심 원자가 여러 개이거나 구조가 복잡한 분자는 전체 분자를 하나의 VSEPR 모형으로 단정하지 않도록 지도해야 합니다.',
  'VSEPR 예측은 분자 전체의 실제 입체배치를 완전히 설명하지 못할 수 있습니다.',
];

function formatAvailability(state: StructureComparisonState): string {
  switch (state.availability) {
    case 'available':
      return '비교 가능';
    case 'missing_real_3d':
      return '3D 자료 필요';
    case 'missing_vsepr':
      return '입체 구조 예상 필요';
    case 'low_confidence_vsepr':
      return '입체 구조 예상 확인 필요';
    case 'multi_center_not_recommended':
      return '단일 중심 비교 비추천';
    case 'rdkit_invalid':
      return '구조 확인 필요';
    case 'not_supported':
      return '지원하지 않음';
  }
}

function formatStudentComparisonText(text: string): string {
  return text
    .replace(/3D 좌표 데이터/g, '3D 자료')
    .replace(/VSEPR 예측/g, '입체 구조 예상')
    .replace(/실제\/외부 3D 자료/g, '참고 3D 자료')
    .replace(/실제\/외부 3D 구조/g, '참고 3D 구조')
    .replace(/RDKit\.js 검증/g, '구조 확인')
    .replace(/RDKit 검증/g, '구조 확인')
    .replace(/RDKit/g, '구조 확인')
    .replace(/VSEPR/g, '입체 구조 예상')
    .replace(/PubChem/g, '외부 자료')
    .replace(/3D 좌표/g, '3D 자료')
    .replace(/좌표 데이터/g, '3D 자료')
    .replace(/canonical SMILES/g, '표준 구조 표현')
    .replace(/SMILES/g, '구조 문자열')
    .replace(/실제\/외부/g, '참고')
    .replace(/검증 전/g, '확인 전')
    .replace(/검증/g, '확인');
}

export function StructureComparisonPanel({
  userMode,
  state,
  molecule3DInput,
  vseprAnalysis,
  vseprModelStatus,
  isOpen,
  observation,
  focusQuestion,
  onToggleOpen,
  onObservationChange,
  onDeveloperLog,
}: StructureComparisonPanelProps) {
  const available = isComparisonAvailable(state);
  const comparisonModelStatus: VseprModelViewStatus =
    available && isOpen ? 'rendered' : vseprModelStatus;

  return (
    <section
      className={`structure-comparison-panel ${state.availability}`}
      data-testid="structure-comparison-panel"
    >
      <div className="panel-heading comparison-heading">
        <div>
          <p className="section-label">구조 비교하기</p>
          <h2>
            {userMode === 'teacher'
              ? '실제/외부 3D 구조 vs VSEPR 예측 모형'
              : '참고 3D 구조와 예상 입체 모형 비교'}
          </h2>
        </div>
        <div className="comparison-heading-actions">
          <span className={available ? 'status-pill ready' : 'status-pill'}>
            {formatAvailability(state)}
          </span>
          <button
            className="secondary-action"
            data-testid="toggle-structure-comparison-button"
            disabled={!available}
            type="button"
            onClick={onToggleOpen}
          >
            {isOpen ? '구조 비교 닫기' : '구조 비교하기'}
          </button>
        </div>
      </div>

      <p className="comparison-student-message">
        {userMode === 'teacher'
          ? state.studentMessage
          : formatStudentComparisonText(state.studentMessage)}
      </p>

      <dl className="comparison-summary-grid">
        <div>
          <dt>{userMode === 'teacher' ? 'RDKit 기준 분자식' : '구조 확인 분자식'}</dt>
          <dd>{state.rdkitFormula ?? (userMode === 'teacher' ? '검증 전' : '확인 전')}</dd>
        </div>
        <div>
          <dt>{userMode === 'teacher' ? '실제/외부 3D 출처' : '참고 3D 자료'}</dt>
          <dd>
            {userMode === 'teacher'
              ? state.real3DSourceLabel
              : formatStudentComparisonText(state.real3DSourceLabel)}
          </dd>
        </div>
        <div>
          <dt>{userMode === 'teacher' ? 'VSEPR 출처' : '예상 입체 모형'}</dt>
          <dd>
            {userMode === 'teacher'
              ? state.vseprSourceLabel
              : formatStudentComparisonText(state.vseprSourceLabel)}
          </dd>
        </div>
        <div>
          <dt>비교 추천</dt>
          <dd>{state.recommended ? '추천' : '조건부 또는 주의'}</dd>
        </div>
      </dl>

      {state.warnings.length > 0 ? (
        <ul className="comparison-warning-list">
          {state.warnings.map((warning) => (
            <li key={warning}>
              {userMode === 'teacher' ? warning : formatStudentComparisonText(warning)}
            </li>
          ))}
        </ul>
      ) : null}

      {isOpen && available ? (
        <div className="comparison-viewer-grid">
          <div className="comparison-viewer-column">
            <div className="comparison-viewer-intro">
              <p className="section-label">왼쪽</p>
              <h3>{userMode === 'teacher' ? '실제/외부 3D 좌표 기반 구조' : '참고 3D 구조'}</h3>
              <p>
                {userMode === 'teacher'
                  ? '이 구조는 정적 좌표 또는 PubChem 외부 3D 좌표를 3Dmol.js로 시각화한 것입니다.'
                  : '이 구조는 내장 자료 또는 외부 자료에서 가져온 참고 3D 구조입니다.'}
              </p>
            </div>
            <Molecule3DViewer
              coordinateData={molecule3DInput}
              hasValidatedStructure={state.availability === 'available'}
              userMode={userMode}
              validatedStructureKey={state.rdkitCanonicalSmiles}
              onDeveloperLog={onDeveloperLog}
            />
          </div>

          <div className="comparison-viewer-column">
            <div className="comparison-viewer-intro">
              <p className="section-label">오른쪽</p>
              <h3>{userMode === 'teacher' ? 'VSEPR 교육용 예측 모형' : '예상 입체 모형'}</h3>
              <p>
                이 모형은 중심 원자 주변 전자쌍 반발을 단순화하여 예측한
                교육용 모형입니다.
              </p>
            </div>
            <Vsepr3DModelViewer
              analysis={vseprAnalysis}
              modelStatus={comparisonModelStatus}
              onDeveloperLog={onDeveloperLog}
            />
          </div>
        </div>
      ) : null}

      {isOpen && available ? (
        <div className="comparison-observation-panel">
          <div>
            <p className="section-label">학생 관찰</p>
            <h3>비교 관찰 기록</h3>
            <p>
              {focusQuestion ??
                '두 표현이 비슷하거나 다르게 보이는 지점을 출처와 한계까지 함께 적어 보세요.'}
            </p>
          </div>

          <label className="comparison-question">
            <span>참고 3D 구조와 예상 입체 모형에서 비슷하게 보이는 점은 무엇인가요?</span>
            <textarea
              value={observation.observedSimilarities}
              placeholder="예: 중심 원자 주변 원자 배치가 비슷해 보인다."
              onChange={(event) => {
                onObservationChange('observedSimilarities', event.currentTarget.value);
              }}
            />
          </label>
          <label className="comparison-question">
            <span>다르게 보이는 점은 무엇인가요?</span>
            <textarea
              value={observation.observedDifferences}
              placeholder="예: 예상 입체 모형은 비공유 전자쌍 방향을 강조하지만 참고 3D 구조에는 전자쌍 입자가 보이지 않는다."
              onChange={(event) => {
                onObservationChange('observedDifferences', event.currentTarget.value);
              }}
            />
          </label>
          <label className="comparison-question">
            <span>예상 입체 모형이 참고 3D 구조를 완전히 대신할 수 없는 이유는 무엇일까요?</span>
            <textarea
              value={observation.studentReflection}
              placeholder="예: 예상 입체 모형은 단순화한 예측이고, 참고 3D 구조는 별도 자료 출처가 있기 때문이다."
              onChange={(event) => {
                onObservationChange('studentReflection', event.currentTarget.value);
              }}
            />
          </label>

          <ul className="comparison-guidance-list">
            {STUDENT_GUIDANCE.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {userMode === 'teacher' ? (
        <div className="comparison-teacher-panel" data-testid="comparison-teacher-panel">
          <p className="section-label">교사용 비교 안내</p>
          {state.teacherNote ? <p>{state.teacherNote}</p> : null}
          <dl className="comparison-summary-grid">
            <div>
              <dt>비교 가능 여부</dt>
              <dd>{formatAvailability(state)}</dd>
            </div>
            <div>
              <dt>VSEPR confidence</dt>
              <dd>{vseprAnalysis.confidence}</dd>
            </div>
            <div>
              <dt>3D 좌표 출처</dt>
              <dd>{state.real3DSourceLabel}</dd>
            </div>
            <div>
              <dt>비추천 사유</dt>
              <dd>{state.availability === 'available' ? '없음' : state.studentMessage}</dd>
            </div>
          </dl>
          <ul className="comparison-guidance-list">
            {TEACHER_GUIDANCE.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
