import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppHeader } from '../components/header/AppHeader';
import { StructureInfoPanel } from '../components/molecule-panel/StructureInfoPanel';
import type { WorkbenchLogEntry } from '../components/validation/ValidationLogPanel';
import { PubChemCandidatePanel } from '../components/pubchem/PubChemCandidatePanel';
import { StructureComparisonPanel } from '../components/comparison/StructureComparisonPanel';
import { ActivityResultPanel } from '../components/export/ActivityResultPanel';
import { ActivityPanel } from '../components/activity/ActivityPanel';
import { VseprPanel } from '../components/vsepr/VseprPanel';
import { TeacherPanel } from '../components/TeacherPanel';
import { DeveloperDetailsPanel } from '../components/advanced/DeveloperDetailsPanel';
import { TeacherAdvancedPanel } from '../components/advanced/TeacherAdvancedPanel';
import { EthicsGuideGate } from '../components/auth/EthicsGuideGate';
import { RoleGate } from '../components/auth/RoleGate';
import { RoleSelectionScreen } from '../components/auth/RoleSelectionScreen';
import { StudentEntryScreen } from '../components/auth/StudentEntryScreen';
import { TeacherDashboardPlaceholder } from '../components/auth/TeacherDashboardPlaceholder';
import { TeacherEntryScreen } from '../components/auth/TeacherEntryScreen';
import { TeacherFeedbackPanel } from '../components/feedback/TeacherFeedbackPanel';
import { LegalDocumentPanel } from '../components/legal/LegalDocumentPanel';
import { LegalFooter } from '../components/legal/LegalFooter';
import { StudentActivityShell } from '../components/student/StudentActivityShell';
import { MoleculeDrawingStep } from '../components/student/MoleculeDrawingStep';
import { ShapeViewerSection } from '../components/student/ShapeViewerSection';
import { StudentReturnedFeedback } from '../components/student/StudentReturnedFeedback';
import { ValidationResultCards } from '../components/student/ValidationResultCards';
import type {
  ChemicalEditorHandle,
  ExtractedStructureData,
} from '../editor/chemical-editor-handle';
import { normalizeKetcherError } from '../editor/ketcher-structure-extraction';
import {
  buildExpectedFormulaWarning,
  exampleMolecules,
} from '../data/exampleMolecules';
import { activityTemplates } from '../data/activityTemplates';
import type { ExampleMolecule } from '../data/exampleMolecules';
import { validateMoleculeInput } from '../services/rdkitService';
import {
  fetchPubChem3DSdf,
  type PubChem3DLoadStatus,
} from '../services/pubchem3d';
import {
  evaluatePubChemCandidateForCurrentStructure,
  searchPubChemCandidatesByCanonicalSmiles,
} from '../services/pubchemSearch';
import { analyzeVseprFromMolBlock } from '../services/vseprEngine';
import { hasVseprGeometryTemplate } from '../services/vseprGeometryTemplates';
import { buildStructureComparisonState } from '../services/structureComparison';
import {
  copyActivityResultMarkdown,
  downloadActivityResultFile,
} from '../services/activityResultExport';
import {
  createActivityResultSnapshot,
  loadActivityResults,
  saveActivityResult,
} from '../services/activityResultStorage';
import {
  cacheActivitySubmissionForSession,
  clearLegacyActivitySubmissionStorage,
  createActivitySubmission,
} from '../services/activitySubmissionStorage';
import {
  updateSubmissionFeedbackInFirestore,
  type ClassroomDraft,
} from '../services/firebase/classroomRepository';
import { createClassroomWithTrustedEndpoint } from '../services/firebase/createClassroomService';
import { createFeedbackDraftWithTrustedEndpoint } from '../services/firebase/feedbackDraftService';
import { loadClassroomSubmissionsWithTrustedEndpoint } from '../services/firebase/listSubmissionsService';
import { saveSubmissionWithTrustedEndpoint } from '../services/firebase/saveSubmissionService';
import { loadStudentFeedbackWithTrustedEndpoint } from '../services/firebase/studentFeedbackService';
import { updateFeedbackWithTrustedEndpoint } from '../services/firebase/updateFeedbackService';
import { createTeacherFeedbackDraft } from '../services/aiFeedbackService';
import {
  UserSessionProvider,
  useUserSession,
} from '../contexts/UserSessionContext';
import type {
  GeometryMeasurementResult,
  Molecule3DInput,
  Molecule3DStructureMatchStatus,
  MoleculeValidationResult,
  PubChemCandidate,
  PubChemMatchStatus,
} from '../types/molecule';
import {
  shouldShowVseprModule,
  type ActivityTemplate,
  type ActivityResponseState,
  type AppMode,
  type UserMode,
} from '../types/activity';
import type { StructureComparisonObservation } from '../types/structureComparison';
import type { ActivityResultSnapshot } from '../types/activityResult';
import {
  isTeacherAuthorized,
  normalizeClassCode,
  type AppRoute,
  type StudentSession,
  type UserSession,
} from '../types/session';
import type { VseprAnalysis, VseprModelViewStatus } from '../types/vsepr';
import type { LegalDocumentId } from '../content/legalDocuments';
import type {
  ActivitySubmission,
  AiFeedbackDraftStatus,
  TeacherFeedbackDraft,
} from '../types/feedback';

const LazyKetcherEditor = lazy(() =>
  import('../components/editor/KetcherEditor').then((module) => ({
    default: module.KetcherEditor,
  })),
);

const LazyMolecule3DViewer = lazy(() =>
  import('../components/Molecule3DViewer').then((module) => ({
    default: module.Molecule3DViewer,
  })),
);

const LazyVsepr3DModelViewer = lazy(() =>
  import('../components/Vsepr3DModelViewer').then((module) => ({
    default: module.Vsepr3DModelViewer,
  })),
);

type PubChem3DState = {
  status: PubChem3DLoadStatus;
  studentMessage?: string;
};

type PubChemCandidateSearchState = {
  status: PubChemMatchStatus;
  candidates: PubChemCandidate[];
  warnings: string[];
  studentMessage?: string;
  selectedCandidateCid?: number;
};

const INITIAL_PUBCHEM_3D_STATE: PubChem3DState = { status: 'idle' };
const INITIAL_PUBCHEM_CANDIDATE_STATE: PubChemCandidateSearchState = {
  status: 'not_requested',
  candidates: [],
  warnings: [],
};
const INITIAL_VSEPR_ANALYSIS: VseprAnalysis = {
  status: 'not_requested',
  confidence: 'low',
  warnings: [],
  studentMessage: '구조 확인을 마치면 입체 구조 예상을 볼 수 있습니다.',
};
const INITIAL_STRUCTURE_COMPARISON_OBSERVATION = {
  observedSimilarities: '',
  observedDifferences: '',
  studentReflection: '',
};
const EMPTY_ACTIVITY_RESPONSES_BY_ID: Record<string, ActivityResponseState> = {};
const ACTIVITY_SUBMISSION_CONTENT_KEY_VERSION = 3;

type ActivityResponseDraftState = {
  scopeKey: string;
  responsesById: Record<string, ActivityResponseState>;
};

type StudentSubmissionCacheState = {
  scopeKey: string | null;
  submissions: ActivitySubmission[];
};

type CompletedStudentSubmission = {
  submissionId: string;
  snapshotId: string;
  contentKey: string;
  deliveryPolicy: 'trusted-server';
};

export type TeacherSubmissionIdentity = {
  teacherUid: string;
  idToken: string;
};

export type TeacherSubmissionRequestScope = TeacherSubmissionIdentity & {
  classCode: string;
  requestId: number;
};

type TeacherServerSubmissionState = TeacherSubmissionRequestScope & {
  submissions: ActivitySubmission[];
};

export function getTrustedTeacherSubmissionIdentity(
  session: UserSession | null | undefined,
): TeacherSubmissionIdentity | null {
  if (
    session?.role !== 'teacher' ||
    !isTeacherAuthorized(session) ||
    session.isEmergencyAccess === true ||
    !session.uid ||
    !session.idToken
  ) {
    return null;
  }

  return {
    teacherUid: session.uid,
    idToken: session.idToken,
  };
}

export function isTeacherSubmissionRequestScopeCurrent(
  scope: TeacherSubmissionRequestScope,
  identity: TeacherSubmissionIdentity | null,
  currentRequestId: number,
): boolean {
  return (
    identity !== null &&
    scope.teacherUid === identity.teacherUid &&
    scope.idToken === identity.idToken &&
    scope.requestId === currentRequestId
  );
}

export function getActivitySubmissionContentKey(
  snapshot: ActivityResultSnapshot,
): string {
  const normalizedMeasurements = snapshot.measurements
    .map((measurement) => ({
      type: measurement.type,
      label: normalizeContentKeyText(measurement.label),
      value: Number.isFinite(measurement.value) ? measurement.value : null,
      unit: measurement.unit,
      sourceNote: normalizeContentKeyText(measurement.sourceNote),
    }))
    .sort((left, right) =>
      JSON.stringify(left).localeCompare(JSON.stringify(right)),
    );
  const normalizedAnswers = snapshot.activityAnswers
    .map((answer) => ({
      questionId: normalizeContentKeyText(answer.questionId),
      answer: normalizeContentKeyText(answer.answer),
    }))
    .sort((left, right) => {
      const questionOrder = (left.questionId ?? '').localeCompare(
        right.questionId ?? '',
      );

      return questionOrder !== 0
        ? questionOrder
        : (left.answer ?? '').localeCompare(right.answer ?? '');
    });
  const normalizedValidationWarnings = (
    snapshot.rdkitValidation.warnings ?? []
  )
    .map((warning) => normalizeContentKeyText(warning))
    .filter((warning): warning is string => warning !== null)
    .sort((left, right) => left.localeCompare(right));
  const normalizedGraphSummary = snapshot.rdkitValidation.graphSummary
    ? {
        atomCount: Number.isFinite(
          snapshot.rdkitValidation.graphSummary.atomCount,
        )
          ? snapshot.rdkitValidation.graphSummary.atomCount
          : null,
        bondCount: Number.isFinite(
          snapshot.rdkitValidation.graphSummary.bondCount,
        )
          ? snapshot.rdkitValidation.graphSummary.bondCount
          : null,
        componentCount: Number.isFinite(
          snapshot.rdkitValidation.graphSummary.componentCount,
        )
          ? snapshot.rdkitValidation.graphSummary.componentCount
          : null,
        componentAtomCounts:
          snapshot.rdkitValidation.graphSummary.componentAtomCounts.map(
            (count) => (Number.isFinite(count) ? count : null),
          ),
        isSingleComponent:
          snapshot.rdkitValidation.graphSummary.isSingleComponent,
        isolatedAtomCount: Number.isFinite(
          snapshot.rdkitValidation.graphSummary.isolatedAtomCount,
        )
          ? snapshot.rdkitValidation.graphSummary.isolatedAtomCount
          : null,
      }
    : null;
  const content = {
    schemaVersion: ACTIVITY_SUBMISSION_CONTENT_KEY_VERSION,
    context: {
      appMode: snapshot.appMode,
      userMode: snapshot.userMode,
      activityId: normalizeContentKeyText(snapshot.activityId),
      activityTitle: normalizeContentKeyText(snapshot.activityTitle),
      moleculeName: normalizeContentKeyText(snapshot.moleculeName),
    },
    studentPrediction: {
      predictedFormula: normalizeContentKeyText(
        snapshot.studentPrediction.predictedFormula,
      ),
      predictedMolecularWeight: normalizeContentKeyText(
        snapshot.studentPrediction.predictedMolecularWeight,
      ),
      drawingReason: normalizeContentKeyText(
        snapshot.studentPrediction.drawingReason,
      ),
    },
    rdkitValidation: {
      isValid: snapshot.rdkitValidation.isValid,
      canonicalSmiles: normalizeContentKeyText(
        snapshot.rdkitValidation.canonicalSmiles,
      ),
      molecularFormula: normalizeContentKeyText(
        snapshot.rdkitValidation.molecularFormula,
      ),
      molecularWeight: Number.isFinite(snapshot.rdkitValidation.molecularWeight)
        ? snapshot.rdkitValidation.molecularWeight
        : null,
      structureIntent: normalizeContentKeyText(
        snapshot.rdkitValidation.structureIntent,
      ),
      graphSummary: normalizedGraphSummary,
      connectivityStatus: normalizeContentKeyText(
        snapshot.rdkitValidation.connectivityStatus,
      ),
      warnings: normalizedValidationWarnings,
    },
    threeDObservation: {
      has3DStructure: snapshot.threeDObservation.has3DStructure,
      sourceLabel: normalizeContentKeyText(snapshot.threeDObservation.sourceLabel),
      sourceNote: normalizeContentKeyText(snapshot.threeDObservation.sourceNote),
      studentObservation: normalizeContentKeyText(
        snapshot.threeDObservation.studentObservation,
      ),
    },
    measurements: normalizedMeasurements,
    vseprResult: snapshot.vseprResult
      ? {
          available: snapshot.vseprResult.available,
          scope: normalizeContentKeyText(snapshot.vseprResult.scope),
          selectedCenter: snapshot.vseprResult.selectedCenter
            ? {
                atomId: normalizeContentKeyText(
                  snapshot.vseprResult.selectedCenter.atomId,
                ),
                atomSymbol: normalizeContentKeyText(
                  snapshot.vseprResult.selectedCenter.atomSymbol,
                ),
                atomLabel: normalizeContentKeyText(
                  snapshot.vseprResult.selectedCenter.atomLabel,
                ),
              }
            : null,
          axeNotation: normalizeContentKeyText(snapshot.vseprResult.axeNotation),
          electronGeometryKo: normalizeContentKeyText(
            snapshot.vseprResult.electronGeometryKo,
          ),
          molecularGeometryKo: normalizeContentKeyText(
            snapshot.vseprResult.molecularGeometryKo,
          ),
          idealBondAngle: normalizeContentKeyText(
            snapshot.vseprResult.idealBondAngle,
          ),
          angleEvidence: snapshot.vseprResult.angleEvidence
            ? {
                vseprIdealAngles:
                  snapshot.vseprResult.angleEvidence.vseprIdealAngles.map(
                    (angle) => normalizeContentKeyText(angle),
                  ),
                generatedCoordinateMeasurements:
                  snapshot.vseprResult.angleEvidence.generatedCoordinateMeasurements?.map(
                    (angle) => (Number.isFinite(angle) ? angle : null),
                  ) ?? [],
                curatedReferenceAngles:
                  snapshot.vseprResult.angleEvidence.curatedReferenceAngles?.map(
                    (angle) => ({
                      value: Number.isFinite(angle.value) ? angle.value : null,
                      unit: angle.unit,
                      sourceLabel: normalizeContentKeyText(angle.sourceLabel),
                    }),
                  ) ?? [],
              }
            : null,
          confidence: normalizeContentKeyText(snapshot.vseprResult.confidence),
          studentNote: normalizeContentKeyText(snapshot.vseprResult.studentNote),
        }
      : null,
    comparisonObservation: snapshot.comparisonObservation
      ? {
          available: snapshot.comparisonObservation.available,
          observedSimilarities: normalizeContentKeyText(
            snapshot.comparisonObservation.observedSimilarities,
          ),
          observedDifferences: normalizeContentKeyText(
            snapshot.comparisonObservation.observedDifferences,
          ),
          studentReflection: normalizeContentKeyText(
            snapshot.comparisonObservation.studentReflection,
          ),
        }
      : null,
    activityAnswers: normalizedAnswers,
    afterValidationReflection: normalizeContentKeyText(
      snapshot.afterValidationReflection,
    ),
    finalReflection: normalizeContentKeyText(snapshot.finalReflection),
  };

  return `activity-submission-content:v${ACTIVITY_SUBMISSION_CONTENT_KEY_VERSION}:${JSON.stringify(
    content,
  )}`;
}

function normalizeContentKeyText(value: string | undefined): string | null {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

export function getActivityDraftScopeKey(
  session: UserSession | null | undefined,
): string {
  if (session?.role === 'student') {
    const studentIdentity =
      session.firebaseUid?.trim() || session.anonymousStudentId.trim();

    return `student:${normalizeClassCode(session.classCode)}:${studentIdentity}`;
  }

  if (session?.role === 'teacher') {
    return `teacher:${session.uid}`;
  }

  return 'signed-out';
}

export function EditorLoadingFallback() {
  return (
    <section className="workspace-panel editor-panel" data-testid="chemical-editor">
      <div className="panel-heading editor-heading">
        <div>
          <p className="section-label">좌측</p>
          <h2>분자 편집 영역</h2>
        </div>
        <span
          className="status-pill"
          data-testid="chemical-editor-status"
          data-ready="false"
        >
          그리기 도구 준비 중
        </span>
      </div>
      <div className="ketcher-host editor-loading-state">
        <span className="loading-spinner" aria-hidden="true" />
        <span>
          분자 편집기를 불러오는 중입니다 (최초 1회, 네트워크에 따라 수십 초
          소요될 수 있습니다)
        </span>
      </div>
    </section>
  );
}

type ViewerLoadingFallbackProps = {
  label?: string;
  title?: string;
  message?: string;
};

function ViewerLoadingFallback({
  label = '3D 구조 보기',
  title = '참고 3D 구조 보기',
  message = '3D 구조 보기를 불러오는 중입니다.',
}: ViewerLoadingFallbackProps) {
  return (
    <section className="workspace-panel molecule-3d-panel">
      <div className="panel-heading viewer-heading">
        <div>
          <p className="section-label">{label}</p>
          <h2>{title}</h2>
        </div>
        <span className="status-pill">준비 중</span>
      </div>
      <div className="viewer-placeholder">{message}</div>
    </section>
  );
}

function createLog(level: WorkbenchLogEntry['level'], message: string): WorkbenchLogEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    level,
    message,
  };
}

function buildExample3DInput(example: ExampleMolecule): Molecule3DInput | null {
  if (!example.structure3D) {
    return null;
  }

  return {
    format: example.structure3D.format,
    data: example.structure3D.data,
    label: example.nameKo,
    sourceType: example.structure3D.sourceType,
    coordinateDimension: example.structure3D.coordinateDimension,
    structureMatchStatus: example.structure3D.structureMatchStatus,
    coordinateSource: '예제 내장 3D 구조',
    sourceNote: example.structure3D.sourceNote,
    sourceUrl: example.structure3D.sourceUrl,
  };
}

export function getStudentStructureAnalysisErrorMessage(error: unknown): string {
  const message = normalizeKetcherError(error, '');

  if (/구조를 먼저|empty molecule|비어/i.test(message)) {
    return '분석할 구조가 비어 있습니다. 원자와 결합을 먼저 그리거나 예시 구조를 불러온 뒤 다시 2D 구조 분석하기를 눌러 주세요.';
  }

  if (/아직 준비|not ready/i.test(message)) {
    return '분자 그리기 도구가 아직 준비되지 않았습니다. 준비됨 표시가 나타난 뒤 다시 시도해 주세요.';
  }

  return '분자 구조를 읽지 못했습니다. 원자와 결합이 편집 영역에 보이는지 확인한 뒤 다시 2D 구조 분석하기를 눌러 주세요.';
}

export function shouldAutoLoadPubChem3DForExample(
  example: ExampleMolecule | null | undefined,
): example is ExampleMolecule & { pubchemCid: number } {
  return (
    example?.external3DSource === 'pubchem' &&
    typeof example.pubchemCid === 'number' &&
    !example.structure3D
  );
}

export function resolvePubChem3DExpectedCanonicalSmiles(
  validationKey: string | null | undefined,
): string | null {
  const canonicalSmiles = validationKey?.trim();

  return canonicalSmiles || null;
}

function formatStudentExternal3DMessage(message: string): string {
  return message
    .replace(/PubChem 3D 구조 데이터를/g, '외부 3D 자료를')
    .replace(/PubChem 3D/g, '외부 3D 자료')
    .replace(/PubChem/g, '외부 자료')
    .replace(/\bCID\b/g, '후보 번호')
    .replace(/\bSDF\b/g, '3D 자료')
    .replace(/RDKit\.js/g, '구조 확인')
    .replace(/canonical SMILES/g, '표준 구조 표현')
    .replace(/\bSMILES\b/g, '구조 문자열');
}

export function resolveValidatedExampleForResult(input: {
  explicitExample?: ExampleMolecule;
  selectedExample?: ExampleMolecule;
  result: MoleculeValidationResult;
}): ExampleMolecule | null {
  if (!input.result.ok) {
    return null;
  }

  const candidate = input.explicitExample ?? input.selectedExample;

  if (!candidate) {
    return null;
  }

  if (buildExpectedFormulaWarning(candidate, input.result.molecularFormula)) {
    return null;
  }

  if (input.explicitExample) {
    return candidate;
  }

  return candidate.smiles === input.result.canonicalSmiles ? candidate : null;
}

export function resolveRecommendedExampleIdForActivity(input: {
  activityId: string;
  templates: Pick<ActivityTemplate, 'id' | 'recommendedExampleId'>[];
  examples: Pick<ExampleMolecule, 'id'>[];
  fallbackExampleId: string;
}): string {
  const template = input.templates.find((item) => item.id === input.activityId);
  const recommendedExampleId = template?.recommendedExampleId;

  if (
    recommendedExampleId &&
    input.examples.some((example) => example.id === recommendedExampleId)
  ) {
    return recommendedExampleId;
  }

  return input.fallbackExampleId;
}

export function resolveActivityIdForExample(input: {
  exampleId: string;
  templates: Pick<ActivityTemplate, 'id' | 'recommendedExampleId'>[];
  fallbackActivityId: string;
}): string {
  const matchingTemplate = input.templates.find(
    (template) => template.recommendedExampleId === input.exampleId,
  );

  return matchingTemplate?.id ?? input.fallbackActivityId;
}

export function resolveActivityTemplateForResult(input: {
  appMode: AppMode;
  selectedActivity?: ActivityTemplate | null;
  validatedExample?: Pick<ExampleMolecule, 'id' | 'nameKo'> | null;
}): ActivityTemplate | null {
  if (input.appMode !== 'activity' || !input.selectedActivity) {
    return null;
  }

  if (!input.validatedExample) {
    return input.selectedActivity;
  }

  if (input.selectedActivity.recommendedExampleId === input.validatedExample.id) {
    return input.selectedActivity;
  }

  return {
    ...input.selectedActivity,
    id: `direct-example-${input.validatedExample.id}`,
    title: `${input.validatedExample.nameKo} 분자 구조 확인`,
    targetMoleculeName: input.validatedExample.nameKo,
    targetSmiles: undefined,
    coreConcepts: ['직접 선택한 분자 예시', '구조 확인 결과 해석'],
    teacherNotes: [
      '학생이 활동 템플릿과 다른 예제 분자를 직접 선택했습니다. 제출 결과는 선택한 분자 기준으로 확인하세요.',
    ],
    misconceptionChecks: [
      '이전 활동명과 직접 선택한 예제 분자를 같은 활동으로 혼동하는 오류',
    ],
    comparisonMode: {
      enabled: false,
      recommended: false,
      focusQuestion:
        '직접 선택한 분자 예시는 구조 확인 결과와 참고 3D 자료 제공 여부를 구분해 기록하세요.',
      teacherNote:
        '직접 선택한 예제는 기존 활동 템플릿의 정답 구조로 자동 판정하지 않습니다.',
    },
    expectedVsepr: undefined,
    recommendedExampleId: input.validatedExample.id,
  };
}

function getVseprModelStatusForAnalysis(
  analysis: VseprAnalysis,
  options: { renderModel?: boolean } = {},
): VseprModelViewStatus {
  if (analysis.status === 'not_requested') {
    return 'not_requested';
  }

  if (analysis.status !== 'supported') {
    return 'unsupported';
  }

  if (!hasVseprGeometryTemplate(analysis.axeNotation)) {
    return 'unsupported';
  }

  return options.renderModel ? 'rendered' : 'ready';
}

function getInitialAppRoute(): AppRoute {
  if (typeof window === 'undefined') {
    return 'home';
  }

  const { pathname } = window.location;

  if (pathname.startsWith('/teacher/dashboard')) {
    return 'teacher-dashboard';
  }

  if (pathname.startsWith('/teacher')) {
    return 'teacher';
  }

  if (pathname.startsWith('/student/workbench')) {
    return 'student-workbench';
  }

  if (pathname.startsWith('/student')) {
    return 'student';
  }

  return 'home';
}

function getUserModeForRoute(route: AppRoute): UserMode {
  return route === 'teacher' || route === 'teacher-dashboard'
    ? 'teacher'
    : 'student';
}

function getPathForRoute(route: AppRoute): string {
  switch (route) {
    case 'home':
      return '/';
    case 'student':
      return '/student';
    case 'student-workbench':
      return '/student/workbench';
    case 'teacher':
      return '/teacher';
    case 'teacher-dashboard':
      return '/teacher/dashboard';
  }
}

function mergeActivitySubmissions(
  current: ActivitySubmission[],
  incoming: ActivitySubmission[],
): ActivitySubmission[] {
  const submissionsById = new Map<string, ActivitySubmission>();

  [...current, ...incoming].forEach((submission) => {
    submissionsById.set(submission.id, submission);
  });

  return Array.from(submissionsById.values()).sort((left, right) =>
    right.submittedAt.localeCompare(left.submittedAt),
  );
}

export function getReturnedStudentFeedbacksForSession(
  submissions: ActivitySubmission[],
  session: StudentSession | null | undefined,
): ActivitySubmission[] {
  if (!session) {
    return [];
  }

  return submissions.filter((submission) => {
    if (submission.status !== 'feedback_returned') {
      return false;
    }

    const isSameClass =
      !submission.classCode || submission.classCode === session.classCode;
    const isSameAnonymousStudent =
      Boolean(submission.anonymousStudentId) &&
      submission.anonymousStudentId === session.anonymousStudentId;
    const isSameFirebaseStudent =
      Boolean(submission.studentUid && session.firebaseUid) &&
      submission.studentUid === session.firebaseUid;

    return isSameClass && (isSameAnonymousStudent || isSameFirebaseStudent);
  });
}

type AppProps = {
  initialRoute?: AppRoute;
  initialSession?: UserSession | null;
  initialEthicsGateAccepted?: boolean;
};

export function App({
  initialRoute,
  initialSession = null,
  initialEthicsGateAccepted = false,
}: AppProps = {}) {
  return (
    <UserSessionProvider initialSession={initialSession}>
      <WorkbenchApp
        initialRoute={initialRoute}
        initialEthicsGateAccepted={initialEthicsGateAccepted}
      />
    </UserSessionProvider>
  );
}

function WorkbenchApp({
  initialRoute,
  initialEthicsGateAccepted,
}: {
  initialRoute?: AppRoute;
  initialEthicsGateAccepted: boolean;
}) {
  const { session, clearSession } = useUserSession();
  const activityDraftScopeKey = getActivityDraftScopeKey(session);
  const studentSubmissionScopeKey =
    session?.role === 'student' ? activityDraftScopeKey : null;
  const trustedTeacherSubmissionIdentity =
    getTrustedTeacherSubmissionIdentity(session);
  const currentTeacherSubmissionIdentityRef =
    useRef<TeacherSubmissionIdentity | null>(
      trustedTeacherSubmissionIdentity,
    );
  currentTeacherSubmissionIdentityRef.current =
    trustedTeacherSubmissionIdentity;
  const editorRef = useRef<ChemicalEditorHandle | null>(null);
  const hasLoggedEditorReadyRef = useRef(false);
  const validationKeyRef = useRef<string | null>(null);
  const structureAnalysisRequestIdRef = useRef(0);
  const activitySubmissionRequestIdRef = useRef(0);
  const isActivitySubmissionPendingRef = useRef(false);
  const teacherSubmissionRequestIdRef = useRef(0);
  const feedbackReturnRequestIdRef = useRef(0);
  const isFeedbackReturnPendingRef = useRef(false);
  const pubChem3DRequestIdRef = useRef(0);
  const autoLoadedPubChemExampleIdRef = useRef<string | null>(null);
  const pubChemCandidateRequestIdRef = useRef(0);
  const [appRoute, setAppRoute] = useState<AppRoute>(
    initialRoute ?? getInitialAppRoute(),
  );
  const [appMode, setAppMode] = useState<AppMode>('activity');
  const [userMode, setUserMode] = useState<UserMode>(
    getUserModeForRoute(initialRoute ?? getInitialAppRoute()),
  );
  const [isEthicsGateAccepted, setIsEthicsGateAccepted] = useState(
    initialEthicsGateAccepted,
  );
  const [activeLegalDocumentId, setActiveLegalDocumentId] =
    useState<LegalDocumentId | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState(
    activityTemplates[0]?.id ?? '',
  );
  const [activityResponseDraftState, setActivityResponseDraftState] =
    useState<ActivityResponseDraftState>(() => ({
      scopeKey: activityDraftScopeKey,
      responsesById: {},
    }));
  const activityResponsesById =
    activityResponseDraftState.scopeKey === activityDraftScopeKey
      ? activityResponseDraftState.responsesById
      : EMPTY_ACTIVITY_RESPONSES_BY_ID;
  const [selectedExampleId, setSelectedExampleId] = useState(
    exampleMolecules[0]?.id ?? '',
  );
  const [extractedStructure, setExtractedStructure] =
    useState<ExtractedStructureData | null>(null);
  const [validationResult, setValidationResult] =
    useState<MoleculeValidationResult | null>(null);
  const [isStructureAnalysisPending, setIsStructureAnalysisPending] =
    useState(false);
  const [structureAnalysisErrorMessage, setStructureAnalysisErrorMessage] =
    useState('');
  const [vseprAnalysis, setVseprAnalysis] = useState<VseprAnalysis>(
    INITIAL_VSEPR_ANALYSIS,
  );
  const [vseprModelStatus, setVseprModelStatus] =
    useState<VseprModelViewStatus>('not_requested');
  const [isVseprModuleOpen, setIsVseprModuleOpen] = useState(false);
  const [isStructureComparisonOpen, setIsStructureComparisonOpen] = useState(false);
  const [
    structureComparisonObservationText,
    setStructureComparisonObservationText,
  ] = useState(INITIAL_STRUCTURE_COMPARISON_OBSERVATION);
  const [selectedVseprCentralAtomId, setSelectedVseprCentralAtomId] =
    useState<string>('');
  const [validatedExampleId, setValidatedExampleId] = useState<string | null>(null);
  const [molecule3DInput, setMolecule3DInput] = useState<Molecule3DInput | null>(
    null,
  );
  const [measurementResults, setMeasurementResults] = useState<
    GeometryMeasurementResult[]
  >([]);
  const [hasVisitedCurrent3DStep, setHasVisitedCurrent3DStep] = useState(false);
  const [savedActivityResults, setSavedActivityResults] = useState<
    ActivityResultSnapshot[]
  >([]);
  const [studentSubmissionCacheState, setStudentSubmissionCacheState] =
    useState<StudentSubmissionCacheState>(() => ({
      scopeKey: studentSubmissionScopeKey,
      submissions: [],
    }));
  const activitySubmissions =
    studentSubmissionCacheState.scopeKey === studentSubmissionScopeKey
      ? studentSubmissionCacheState.submissions
      : [];
  const [teacherServerSubmissionState, setTeacherServerSubmissionState] =
    useState<TeacherServerSubmissionState | null>(null);
  const teacherServerSubmissionStateRef =
    useRef<TeacherServerSubmissionState | null>(null);
  const [previewActivityResultId, setPreviewActivityResultId] =
    useState<string | null>(null);
  const [activityResultStatusMessage, setActivityResultStatusMessage] =
    useState<string>('');
  const [activitySubmissionStatusMessage, setActivitySubmissionStatusMessage] =
    useState<string>('');
  const [isActivitySubmissionPending, setIsActivitySubmissionPending] =
    useState(false);
  const [completedStudentSubmission, setCompletedStudentSubmission] =
    useState<CompletedStudentSubmission | null>(null);
  const [teacherFeedbackStatusMessage, setTeacherFeedbackStatusMessage] =
    useState<string>('');
  const [teacherClassroomStatusMessage, setTeacherClassroomStatusMessage] =
    useState<string>('');
  const [teacherClassroomStatusTone, setTeacherClassroomStatusTone] =
    useState<'info' | 'success' | 'warning'>('info');
  const [teacherClassroomDeveloperLogs, setTeacherClassroomDeveloperLogs] =
    useState<string[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(
    null,
  );
  const [aiFeedbackDraftStatus, setAiFeedbackDraftStatus] =
    useState<AiFeedbackDraftStatus>('idle');
  const [pubChem3DState, setPubChem3DState] = useState<PubChem3DState>(
    INITIAL_PUBCHEM_3D_STATE,
  );
  const [pubChemCandidateState, setPubChemCandidateState] =
    useState<PubChemCandidateSearchState>(INITIAL_PUBCHEM_CANDIDATE_STATE);
  const [logs, setLogs] = useState<WorkbenchLogEntry[]>([
    createLog(
      'info',
      'Ketcher에서 구조를 추출한 뒤 RDKit.js 검증을 실행합니다.',
    ),
  ]);
  const teacherServerSubmissions =
    teacherServerSubmissionState &&
    isTeacherSubmissionRequestScopeCurrent(
      teacherServerSubmissionState,
      trustedTeacherSubmissionIdentity,
      teacherSubmissionRequestIdRef.current,
    )
      ? teacherServerSubmissionState.submissions
      : [];
  const studentActivityTemplates = useMemo(() => {
    const activityTemplateIds =
      session?.role === 'student' ? session.activityTemplateIds : undefined;

    if (!activityTemplateIds || activityTemplateIds.length === 0) {
      return activityTemplates;
    }

    const allowedTemplateIds = new Set(activityTemplateIds);
    const filteredTemplates = activityTemplates.filter((template) =>
      allowedTemplateIds.has(template.id),
    );

    return filteredTemplates.length > 0 ? filteredTemplates : activityTemplates;
  }, [session]);
  const currentActivityTemplates =
    userMode === 'student' ? studentActivityTemplates : activityTemplates;
  const selectedActivity =
    currentActivityTemplates.find(
      (template) => template.id === selectedActivityId,
    ) ?? currentActivityTemplates[0];
  const selectedActivityUsesVsepr =
    appMode === 'activity' && selectedActivity?.requiresVsepr === true;

  useEffect(() => {
    if (
      currentActivityTemplates.length > 0 &&
      !currentActivityTemplates.some(
        (template) => template.id === selectedActivityId,
      )
    ) {
      setSelectedActivityId(currentActivityTemplates[0].id);
    }
  }, [currentActivityTemplates, selectedActivityId]);

  const commitTeacherServerSubmissionState = useCallback(
    (nextState: TeacherServerSubmissionState | null) => {
      teacherServerSubmissionStateRef.current = nextState;
      setTeacherServerSubmissionState(nextState);
    },
    [],
  );

  const resetTeacherSubmissionSessionState = useCallback(() => {
    teacherSubmissionRequestIdRef.current += 1;
    feedbackReturnRequestIdRef.current += 1;
    isFeedbackReturnPendingRef.current = false;
    commitTeacherServerSubmissionState(null);
    setSelectedSubmissionId(null);
    setAiFeedbackDraftStatus('idle');
    setTeacherFeedbackStatusMessage('');
    setTeacherClassroomStatusMessage('');
    setTeacherClassroomStatusTone('info');
    setTeacherClassroomDeveloperLogs([]);
  }, [commitTeacherServerSubmissionState]);

  useEffect(() => {
    resetTeacherSubmissionSessionState();
  }, [
    resetTeacherSubmissionSessionState,
    trustedTeacherSubmissionIdentity?.idToken,
    trustedTeacherSubmissionIdentity?.teacherUid,
  ]);

  const appendLog = (entry: WorkbenchLogEntry) => {
    setLogs((currentLogs) => [entry, ...currentLogs].slice(0, 6));
  };

  const navigateToRoute = useCallback((nextRoute: AppRoute) => {
    setAppRoute(nextRoute);
    setUserMode(getUserModeForRoute(nextRoute));

    if (typeof window === 'undefined') {
      return;
    }

    const nextPath = getPathForRoute(nextRoute);

    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath);
    }
  }, []);

  const resetPubChem3DState = () => {
    pubChem3DRequestIdRef.current += 1;
    autoLoadedPubChemExampleIdRef.current = null;
    setPubChem3DState(INITIAL_PUBCHEM_3D_STATE);
  };

  const resetPubChemCandidateState = () => {
    pubChemCandidateRequestIdRef.current += 1;
    setPubChemCandidateState(INITIAL_PUBCHEM_CANDIDATE_STATE);
  };

  const resetVseprAnalysis = () => {
    setSelectedVseprCentralAtomId('');
    setVseprAnalysis(INITIAL_VSEPR_ANALYSIS);
    setVseprModelStatus('not_requested');
  };

  const resetCurrentStructureState = () => {
    structureAnalysisRequestIdRef.current += 1;
    activitySubmissionRequestIdRef.current += 1;
    validationKeyRef.current = null;
    isActivitySubmissionPendingRef.current = false;
    setIsStructureAnalysisPending(false);
    setIsActivitySubmissionPending(false);
    setHasVisitedCurrent3DStep(false);
    setMolecule3DInput(null);
    setValidatedExampleId(null);
    resetPubChem3DState();
    resetPubChemCandidateState();
    resetStructureComparison();
    setExtractedStructure(null);
    setValidationResult(null);
    setStructureAnalysisErrorMessage('');
    setActivitySubmissionStatusMessage('');
    setCompletedStudentSubmission(null);
    resetVseprAnalysis();
    setMeasurementResults([]);
  };

  const handleEditorStructureChange = () => {
    const hadDerivedStructureState =
      isStructureAnalysisPending ||
      extractedStructure !== null ||
      validationResult !== null ||
      molecule3DInput !== null ||
      completedStudentSubmission !== null;

    resetCurrentStructureState();

    if (hadDerivedStructureState) {
      appendLog(
        createLog(
          'info',
          '편집기 구조가 바뀌어 이전 분석·3D·제출 완료 상태를 초기화했습니다. 현재 구조를 다시 분석해 주세요.',
        ),
      );
    }
  };

  const resetStructureComparison = () => {
    setIsStructureComparisonOpen(false);
    setStructureComparisonObservationText(INITIAL_STRUCTURE_COMPARISON_OBSERVATION);
  };

  const previousActivityDraftScopeKeyRef = useRef(activityDraftScopeKey);

  useEffect(() => {
    if (previousActivityDraftScopeKeyRef.current === activityDraftScopeKey) {
      return;
    }

    previousActivityDraftScopeKeyRef.current = activityDraftScopeKey;
    resetCurrentStructureState();
    setActivityResponseDraftState({
      scopeKey: activityDraftScopeKey,
      responsesById: {},
    });
    setStudentSubmissionCacheState({
      scopeKey: studentSubmissionScopeKey,
      submissions: [],
    });
    setPreviewActivityResultId(null);
    setActivityResultStatusMessage('');
  }, [activityDraftScopeKey, studentSubmissionScopeKey]);

  const handleStudentEntered = () => {
    resetCurrentStructureState();
    setActivityResponseDraftState({
      scopeKey: activityDraftScopeKey,
      responsesById: {},
    });
    setStudentSubmissionCacheState({
      scopeKey: studentSubmissionScopeKey,
      submissions: [],
    });
    setPreviewActivityResultId(null);
    setActivityResultStatusMessage('');
    setAppMode('activity');
    navigateToRoute('student-workbench');
  };

  const handleTeacherSignOut = () => {
    resetCurrentStructureState();
    setActivityResponseDraftState({
      scopeKey: 'signed-out',
      responsesById: {},
    });
    setStudentSubmissionCacheState({
      scopeKey: null,
      submissions: [],
    });
    setPreviewActivityResultId(null);
    setActivityResultStatusMessage('');
    resetTeacherSubmissionSessionState();
    clearSession();
    navigateToRoute('teacher');
  };

  const handleUserModeChange = (nextMode: UserMode) => {
    resetCurrentStructureState();
    navigateToRoute(nextMode === 'teacher' ? 'teacher' : 'student');
  };

  const handleAppModeChange = (nextMode: AppMode) => {
    if (nextMode !== appMode) {
      resetCurrentStructureState();
    }

    setAppMode(nextMode);
  };

  const handle3DDeveloperLog = useCallback((message: string) => {
    console.info('[3Dmol viewer]', message);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handlePopState = () => {
      resetCurrentStructureState();
      const nextRoute = getInitialAppRoute();
      setAppRoute(nextRoute);
      setUserMode(getUserModeForRoute(nextRoute));
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    validationKeyRef.current =
      validationResult?.ok === true ? validationResult.canonicalSmiles : null;
  }, [validationResult]);

  useEffect(() => {
    const result = loadActivityResults();

    setSavedActivityResults(result.data);

    if (!result.ok) {
      setActivityResultStatusMessage(result.studentMessage);
      console.info('[Activity result storage]', result.developerLogs);
    }
  }, []);

  useEffect(() => {
    const result = clearLegacyActivitySubmissionStorage();

    if (!result.ok) {
      setActivitySubmissionStatusMessage(result.studentMessage);
      console.info('[Activity submission storage]', result.developerLogs);
    }
  }, []);

  useEffect(() => {
    if (
      session?.role !== 'student' ||
      session.classroomJoinStatus !== 'joined' ||
      !session.idToken
    ) {
      return undefined;
    }

    let cancelled = false;

    void loadStudentFeedbackWithTrustedEndpoint({
      classCode: session.classCode,
      idToken: session.idToken,
    }).then((result) => {
      if (cancelled) {
        return;
      }

      console.info('[Student feedback]', result.developerLogs);

      if (result.ok && result.data.length > 0) {
        setStudentSubmissionCacheState((currentCache) => ({
          scopeKey: studentSubmissionScopeKey,
          submissions: mergeActivitySubmissions(
            currentCache.scopeKey === studentSubmissionScopeKey
              ? currentCache.submissions
              : [],
            result.data,
          ),
        }));
        setActivitySubmissionStatusMessage(result.studentMessage);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    session?.role,
    session?.role === 'student' ? session.classCode : undefined,
    session?.role === 'student' ? session.classroomJoinStatus : undefined,
    session?.role === 'student' ? session.idToken : undefined,
    studentSubmissionScopeKey,
  ]);

  useEffect(() => {
    setVseprModelStatus((currentStatus) => {
      const canRenderModel =
        vseprAnalysis.status === 'supported' &&
        hasVseprGeometryTemplate(vseprAnalysis.axeNotation);

      if (!canRenderModel) {
        return currentStatus;
      }

      if (selectedActivityUsesVsepr) {
        return 'rendered';
      }

      if (!isVseprModuleOpen && currentStatus === 'rendered') {
        return 'ready';
      }

      return currentStatus;
    });
  }, [isVseprModuleOpen, selectedActivityUsesVsepr, vseprAnalysis]);

  const extractAndValidateCurrentStructure = async (
    example?: ExampleMolecule,
    requestId = structureAnalysisRequestIdRef.current,
  ): Promise<boolean> => {
    setStructureAnalysisErrorMessage('');
    const structure = await editorRef.current?.extractStructure();

    if (requestId !== structureAnalysisRequestIdRef.current) {
      return false;
    }

    if (!structure) {
      throw new Error('분자 그리기 도구가 아직 준비되지 않았습니다.');
    }

    const structureIntent =
      appMode === 'activity'
        ? (selectedActivity?.structureIntent ?? 'single-molecule')
        : 'single-molecule';
    const labeledStructure = example
      ? { ...structure, label: example.nameKo, structureIntent }
      : { ...structure, structureIntent };
    const previousValidationKey = validationKeyRef.current;
    const previous3DInput = molecule3DInput;

    setMolecule3DInput(null);
    setValidatedExampleId(null);
    resetPubChem3DState();
    resetPubChemCandidateState();
    resetStructureComparison();
    setExtractedStructure(labeledStructure);
    setValidationResult(null);
    resetVseprAnalysis();
    appendLog(
      createLog(
        'info',
        example
          ? `${example.nameKo} 예제를 Ketcher에서 추출했습니다. RDKit.js 검증을 시작합니다.`
          : 'Ketcher에서 SMILES/MOL 데이터를 추출했습니다. RDKit.js 검증을 시작합니다.',
      ),
    );

    const result = await validateMoleculeInput(labeledStructure);

    if (requestId !== structureAnalysisRequestIdRef.current) {
      return false;
    }

    setValidationResult(result);

    if (result.ok) {
      setStructureAnalysisErrorMessage('');
      const initialVseprAnalysis = analyzeVseprFromMolBlock({
        molBlock: labeledStructure.molBlock,
      });
      const shouldAutoRenderVseprModel = selectedActivityUsesVsepr;
      const selectedExampleForHandoff = exampleMolecules.find(
        (item) => item.id === selectedExampleId,
      );
      const validatedExampleForHandoff = resolveValidatedExampleForResult({
        explicitExample: example,
        selectedExample: selectedExampleForHandoff,
        result,
      });
      const expectedFormulaWarning = example
        ? buildExpectedFormulaWarning(example, result.molecularFormula)
        : null;
      const retained3DInput =
        !validatedExampleForHandoff &&
        previous3DInput &&
        previousValidationKey === result.canonicalSmiles
          ? previous3DInput
          : null;

      appendLog(
        createLog(
          'info',
          `RDKit.js 검증 완료: ${result.molecularFormula}, 평균 분자량 ${result.molecularWeight.toFixed(3)}`,
        ),
      );

      if (expectedFormulaWarning) {
        appendLog(createLog('warning', expectedFormulaWarning));
      }

      setVseprAnalysis(initialVseprAnalysis);
      setVseprModelStatus(
        getVseprModelStatusForAnalysis(initialVseprAnalysis, {
          renderModel: shouldAutoRenderVseprModel,
        }),
      );
      setSelectedVseprCentralAtomId(initialVseprAnalysis.centralAtomId ?? '');
      if (initialVseprAnalysis.status === 'supported') {
        appendLog(
          createLog(
            'info',
            `VSEPR 예측 완료: ${initialVseprAnalysis.axeNotation}, ${initialVseprAnalysis.molecularShapeKo}`,
          ),
        );
        appendLog(
          createLog(
            'info',
            shouldAutoRenderVseprModel
              ? `수업 활동 모드에서 VSEPR 교육용 3D 예측 모형을 자동 표시합니다: ${initialVseprAnalysis.axeNotation}`
              : `VSEPR 예측은 선택 교육 모듈에 준비되었습니다: ${initialVseprAnalysis.axeNotation}`,
          ),
        );
      } else if (initialVseprAnalysis.studentMessage) {
        appendLog(
          createLog(
            initialVseprAnalysis.status === 'needs_central_atom' ? 'warning' : 'info',
            initialVseprAnalysis.studentMessage,
          ),
        );
      }

      setValidatedExampleId(validatedExampleForHandoff?.id ?? null);
      setMolecule3DInput(
        validatedExampleForHandoff
          ? buildExample3DInput(validatedExampleForHandoff)
          : retained3DInput,
      );
      return true;
    } else {
      console.info('[RDKit validation]', result.developerLogs);
      appendLog(createLog('error', result.studentMessage));
      setStructureAnalysisErrorMessage(
        result.validationStatus === 'error' ? result.studentMessage : '',
      );
      setValidatedExampleId(null);
      setMolecule3DInput(null);
      resetVseprAnalysis();
      return result.validationStatus === 'invalid';
    }
  };

  const handleExtractAndValidate = async (): Promise<boolean> => {
    if (isStructureAnalysisPending) {
      return false;
    }

    const requestId = structureAnalysisRequestIdRef.current + 1;
    structureAnalysisRequestIdRef.current = requestId;
    setIsStructureAnalysisPending(true);
    setStructureAnalysisErrorMessage('');
    try {
      return await extractAndValidateCurrentStructure(undefined, requestId);
    } catch (error) {
      if (requestId !== structureAnalysisRequestIdRef.current) {
        return false;
      }

      setMolecule3DInput(null);
      setValidatedExampleId(null);
      resetPubChem3DState();
      resetPubChemCandidateState();
      resetStructureComparison();
      setExtractedStructure(null);
      setValidationResult(null);
      setStructureAnalysisErrorMessage(getStudentStructureAnalysisErrorMessage(error));
      resetVseprAnalysis();
      appendLog(
        createLog(
          'error',
          normalizeKetcherError(error, '구조 데이터 추출 중 오류가 발생했습니다.'),
        ),
      );
      return false;
    } finally {
      if (requestId === structureAnalysisRequestIdRef.current) {
        setIsStructureAnalysisPending(false);
      }
    }
  };

  const findSelectedExample = (): ExampleMolecule | undefined =>
    exampleMolecules.find((example) => example.id === selectedExampleId);

  const getPubChem3DStatusMessage = (
    example: ExampleMolecule | undefined,
  ): string => {
    if (!example) {
      return '참고 3D 구조를 불러올 분자 예시를 선택해 주세요.';
    }

    if (!example.pubchemCid) {
      return '이 분자 예시는 참고 3D 구조 연결이 아직 준비되지 않았습니다.';
    }

    if (validatedExampleId !== example.id || validationResult?.ok !== true) {
      return '참고 3D 구조를 불러오려면 먼저 이 분자 예시를 불러와 구조 확인을 완료해 주세요.';
    }

    if (pubChem3DState.status === 'loading') {
      return '참고 3D 구조 자료를 불러오는 중입니다.';
    }

    if (pubChem3DState.studentMessage) {
      return userMode === 'student'
        ? formatStudentExternal3DMessage(pubChem3DState.studentMessage)
        : pubChem3DState.studentMessage;
    }

    if (shouldAutoLoadPubChem3DForExample(example)) {
      return '구조 확인이 완료되면 준비된 외부 3D 자료를 자동으로 불러옵니다.';
    }

    return '이 분자 예시는 참고 3D 구조를 불러올 수 있습니다.';
  };

  const handleSelectExample = (exampleId: string) => {
    const nextActivityId = resolveActivityIdForExample({
      exampleId,
      templates: currentActivityTemplates,
      fallbackActivityId: selectedActivityId,
    });
    const nextExample = exampleMolecules.find((example) => example.id === exampleId);

    setSelectedExampleId(exampleId);

    if (nextActivityId !== selectedActivityId) {
      setSelectedActivityId(nextActivityId);
    }

    resetCurrentStructureState();
    appendLog(
      createLog(
        'info',
        nextActivityId !== selectedActivityId
          ? `${nextExample?.nameKo ?? '선택한'} 분자 예시와 연결된 수업 활동을 함께 선택했습니다.`
          : `${nextExample?.nameKo ?? '분자'} 예시를 선택했습니다. 이전 확인 결과를 초기화했습니다.`,
      ),
    );
  };

  const handleSelectActivity = (activityId: string) => {
    const nextTemplate = currentActivityTemplates.find(
      (template) => template.id === activityId,
    );
    const nextExampleId = resolveRecommendedExampleIdForActivity({
      activityId,
      templates: currentActivityTemplates,
      examples: exampleMolecules,
      fallbackExampleId: selectedExampleId,
    });

    setSelectedActivityId(activityId);
    setSelectedExampleId(nextExampleId);
    resetCurrentStructureState();

    void editorRef.current?.clear().catch((error: unknown) => {
      console.info('[Chemical editor]', [
        'Ignored editor clear failure after activity change.',
        error instanceof Error ? error.message : 'Unknown error',
      ]);
    });
    appendLog(
      createLog(
        'info',
        nextTemplate
          ? `${nextTemplate.title} 활동을 선택했습니다. 권장 분자 예시를 함께 선택하고 이전 확인 결과를 초기화했습니다.`
          : '활동을 선택했습니다. 이전 확인 결과를 초기화했습니다.',
      ),
    );
  };

  const handleClearStructure = async () => {
    resetCurrentStructureState();

    try {
      await editorRef.current?.clear();
      appendLog(
        createLog(
          'info',
          '분자 구조를 초기화했습니다. 원자와 결합을 다시 그린 뒤 분석해 보세요.',
        ),
      );
    } catch (error) {
      appendLog(
        createLog(
          'error',
          normalizeKetcherError(error, '구조를 초기화하지 못했습니다.'),
        ),
      );
    }
  };

  const loadPubChem3DByCid = async (input: {
  cid: number;
  label: string;
  pubchemName?: string;
  structureMatchStatus?: Molecule3DStructureMatchStatus;
  requestLogMessage: string;
  }) => {
    const requestId = pubChem3DRequestIdRef.current + 1;
    const requestValidationKey = validationKeyRef.current;
    const expectedCanonicalSmiles =
      resolvePubChem3DExpectedCanonicalSmiles(requestValidationKey);

    if (!expectedCanonicalSmiles) {
      const studentMessage =
        '현재 확인된 2D 구조 식별값이 없어 외부 3D 자료를 불러오지 않았습니다. 구조를 다시 분석해 주세요.';

      setPubChem3DState({
        status: 'error',
        studentMessage,
      });
      appendLog(createLog('warning', studentMessage));
      console.info('[PubChem 3D]', [
        'PubChem 3D SDF request blocked: missing current RDKit canonical SMILES.',
        `CID: ${input.cid}`,
      ]);
      return;
    }

    pubChem3DRequestIdRef.current = requestId;
    setPubChem3DState({
      status: 'loading',
      studentMessage: `${input.label}의 참고 3D 구조 자료를 불러오는 중입니다.`,
    });
    appendLog(createLog('info', input.requestLogMessage));

    const result = await fetchPubChem3DSdf({
      cid: input.cid,
      label: input.label,
      pubchemName: input.pubchemName,
      structureMatchStatus: input.structureMatchStatus,
      expectedCanonicalSmiles,
    });

    console.info('[PubChem 3D]', result.developerLogs);

    if (
      requestId !== pubChem3DRequestIdRef.current ||
      requestValidationKey !== validationKeyRef.current
    ) {
      console.info('[PubChem 3D]', [
        'Ignored stale PubChem 3D SDF response.',
        `CID: ${input.cid}`,
        `request validation key: ${requestValidationKey ?? 'none'}`,
        `current validation key: ${validationKeyRef.current ?? 'none'}`,
      ]);
      return;
    }

    if (result.ok) {
      setMolecule3DInput(result.molecule3D);
      setPubChem3DState({
        status: 'success',
        studentMessage: result.studentMessage,
      });
      appendLog(createLog('info', result.studentMessage));
      return;
    }

    setPubChem3DState({
      status: result.status,
      studentMessage: result.studentMessage,
    });
    appendLog(
      createLog(result.status === 'noData' ? 'warning' : 'error', result.studentMessage),
    );
  };

  const handleLoadPubChem3D = async () => {
    const example = findSelectedExample();

    if (!example?.pubchemCid) {
      setPubChem3DState({
        status: 'noData',
        studentMessage: '이 분자 예시는 참고 3D 구조 연결이 아직 준비되지 않았습니다.',
      });
      appendLog(
        createLog(
          'warning',
          '선택한 예제에는 PubChem CID가 없어 3D SDF를 요청하지 않았습니다.',
        ),
      );
      return;
    }

    if (validatedExampleId !== example.id || validationResult?.ok !== true) {
      const message =
        '참고 3D 구조를 불러오려면 먼저 이 분자 예시를 불러와 구조 확인을 완료해 주세요.';

      setPubChem3DState({ status: 'idle', studentMessage: message });
      appendLog(createLog('warning', message));
      return;
    }

    await loadPubChem3DByCid({
      cid: example.pubchemCid,
      label: example.nameKo,
      pubchemName: example.pubchemName,
      requestLogMessage: `${example.nameKo} 예제의 PubChem CID ${example.pubchemCid}로 3D SDF를 요청합니다.`,
    });
  };

  const handleSearchPubChemCandidates = async () => {
    if (validationResult?.ok !== true || !validationResult.canonicalSmiles.trim()) {
      const message =
        '외부 3D 자료 찾기는 구조 확인을 통과한 표준 구조 표현이 있을 때만 실행할 수 있습니다.';

      setPubChemCandidateState({
        status: 'not_requested',
        candidates: [],
        warnings: [],
        studentMessage: message,
      });
      appendLog(createLog('warning', message));
      return;
    }

    setPubChemCandidateState({
      status: 'searching',
      candidates: [],
      warnings: [],
      studentMessage: '외부 3D 자료 후보를 검색하는 중입니다.',
    });
    const requestId = pubChemCandidateRequestIdRef.current + 1;
    const requestValidationKey = validationResult.canonicalSmiles;

    pubChemCandidateRequestIdRef.current = requestId;
    appendLog(
      createLog(
        'info',
        `RDKit.js canonical SMILES(${validationResult.canonicalSmiles})로 PubChem 후보 검색을 요청합니다.`,
      ),
    );

    const result = await searchPubChemCandidatesByCanonicalSmiles(
      validationResult.canonicalSmiles,
    );

    console.info('[PubChem candidate search]', result.developerLogs);

    if (
      requestId !== pubChemCandidateRequestIdRef.current ||
      requestValidationKey !== validationKeyRef.current
    ) {
      console.info('[PubChem candidate search]', [
        'Ignored stale PubChem candidate search response.',
        `request canonicalSmiles: ${requestValidationKey}`,
        `current validation key: ${validationKeyRef.current ?? 'none'}`,
      ]);
      return;
    }

    setPubChemCandidateState({
      status: result.status,
      candidates: result.candidates,
      warnings: result.warnings,
      studentMessage: result.studentMessage,
    });
    appendLog(
      createLog(
        result.status === 'error' ? 'error' : result.status === 'no_match' ? 'warning' : 'info',
        result.studentMessage,
      ),
    );

    for (const warning of result.warnings) {
      appendLog(createLog('warning', warning));
    }
  };

  const handleSelectPubChemCandidate = async (candidate: PubChemCandidate) => {
    const compatibility = evaluatePubChemCandidateForCurrentStructure(
      candidate,
      validationResult,
    );

    console.info('[PubChem candidate compatibility]', compatibility.developerLogs);

    if (!compatibility.canLoad3D) {
      setPubChemCandidateState((currentState) => ({
        ...currentState,
        selectedCandidateCid: undefined,
        warnings: [
          ...currentState.warnings,
          ...compatibility.warnings,
        ],
        studentMessage: compatibility.studentMessage ?? currentState.studentMessage,
      }));
      setPubChem3DState({
        status: 'error',
        studentMessage:
          compatibility.studentMessage ??
          '선택한 외부 3D 자료 후보를 현재 구조의 참고 3D 자료로 사용할 수 없습니다.',
      });
      appendLog(
        createLog(
          'warning',
          compatibility.studentMessage ??
            '선택한 외부 3D 자료 후보를 현재 구조의 참고 3D 자료로 사용할 수 없습니다.',
        ),
      );
      return;
    }

    setPubChemCandidateState((currentState) => ({
      ...currentState,
      selectedCandidateCid: candidate.cid,
      warnings: [...currentState.warnings, ...compatibility.warnings],
    }));

    for (const warning of compatibility.warnings) {
      appendLog(createLog('warning', warning));
    }

    await loadPubChem3DByCid({
      cid: candidate.cid,
      label: candidate.title ?? `3D 자료 후보 ${candidate.cid}`,
      pubchemName: candidate.title,
      structureMatchStatus: compatibility.structureMatchStatus,
      requestLogMessage: `외부 데이터 후보 CID ${candidate.cid}로 3D SDF를 요청합니다. PubChem 후보값은 RDKit.js 검증값을 대체하지 않습니다.`,
    });
  };

  const handleLoadExample = async () => {
    if (isStructureAnalysisPending) {
      return;
    }

    const requestId = structureAnalysisRequestIdRef.current + 1;
    structureAnalysisRequestIdRef.current = requestId;
    setIsStructureAnalysisPending(true);
    setStructureAnalysisErrorMessage('');
    try {
      const example = findSelectedExample();

      if (!example) {
        throw new Error('불러올 예제 분자를 선택해 주세요.');
      }

      if (!editorRef.current) {
        throw new Error('분자 그리기 도구가 아직 준비되지 않았습니다.');
      }

      await editorRef.current.setMolecule({ smiles: example.smiles });

      if (requestId !== structureAnalysisRequestIdRef.current) {
        return;
      }

      appendLog(
        createLog(
          'info',
          `${example.nameKo} 예제를 Ketcher 편집기에 불러왔습니다.`,
        ),
      );
      await extractAndValidateCurrentStructure(example, requestId);
    } catch (error) {
      if (requestId !== structureAnalysisRequestIdRef.current) {
        return;
      }

      setMolecule3DInput(null);
      setValidatedExampleId(null);
      resetPubChem3DState();
      resetPubChemCandidateState();
      resetStructureComparison();
      setExtractedStructure(null);
      setValidationResult(null);
      setStructureAnalysisErrorMessage(getStudentStructureAnalysisErrorMessage(error));
      resetVseprAnalysis();
      appendLog(
        createLog(
          'error',
          normalizeKetcherError(error, '예제 분자를 불러오는 중 오류가 발생했습니다.'),
        ),
      );
    } finally {
      if (requestId === structureAnalysisRequestIdRef.current) {
        setIsStructureAnalysisPending(false);
      }
    }
  };

  const handleActivityResponseChange = (questionId: string, value: string) => {
    if (isActivitySubmissionPendingRef.current) {
      return;
    }

    activitySubmissionRequestIdRef.current += 1;
    setActivitySubmissionStatusMessage('');
    setCompletedStudentSubmission(null);
    setActivityResponseDraftState((currentDraft) => {
      const currentResponses =
        currentDraft.scopeKey === activityDraftScopeKey
          ? currentDraft.responsesById
          : EMPTY_ACTIVITY_RESPONSES_BY_ID;

      return {
        scopeKey: activityDraftScopeKey,
        responsesById: {
          ...currentResponses,
          [selectedActivityId]: {
            ...(currentResponses[selectedActivityId] ?? {}),
            [questionId]: value,
          },
        },
      };
    });
  };

  const handleSelectVseprCentralAtom = (atomId: string) => {
    if (isActivitySubmissionPendingRef.current) {
      return;
    }

    activitySubmissionRequestIdRef.current += 1;
    setActivitySubmissionStatusMessage('');
    setCompletedStudentSubmission(null);
    setSelectedVseprCentralAtomId(atomId);

    if (validationResult?.ok !== true || !extractedStructure?.molBlock) {
      setVseprAnalysis(INITIAL_VSEPR_ANALYSIS);
      return;
    }

    const nextAnalysis = analyzeVseprFromMolBlock({
      molBlock: extractedStructure.molBlock,
      selectedCentralAtomId: atomId,
    });
    const shouldAutoRenderVseprModel = selectedActivityUsesVsepr;
    setVseprAnalysis(nextAnalysis);
    setVseprModelStatus(
      getVseprModelStatusForAnalysis(nextAnalysis, {
        renderModel: shouldAutoRenderVseprModel,
      }),
    );

    if (nextAnalysis.status === 'supported') {
      appendLog(
        createLog(
          'info',
          `선택한 중심 원자 ${nextAnalysis.centralAtomLabel ?? `${nextAnalysis.centralAtomSymbol}${nextAnalysis.centralAtomId}`}의 VSEPR 예측: ${nextAnalysis.axeNotation}, ${nextAnalysis.molecularShapeKo}`,
        ),
      );
      appendLog(
        createLog(
          'info',
          shouldAutoRenderVseprModel
            ? `선택한 중심 원자의 VSEPR 교육용 3D 예측 모형을 자동 표시합니다: ${nextAnalysis.axeNotation}`
            : `선택한 중심 원자의 VSEPR 예측이 준비되었습니다: ${nextAnalysis.axeNotation}`,
        ),
      );
    } else if (nextAnalysis.studentMessage) {
      appendLog(createLog('warning', nextAnalysis.studentMessage));
    }
  };

  const handleShowVseprModel = () => {
    if (
      vseprAnalysis.status !== 'supported' ||
      !hasVseprGeometryTemplate(vseprAnalysis.axeNotation)
    ) {
      setVseprModelStatus('unsupported');
      appendLog(
        createLog(
          'warning',
          '현재 VSEPR 분석 결과에 해당하는 교육용 3D 모형 template이 없습니다.',
        ),
      );
      return;
    }

    setVseprModelStatus('rendered');
    appendLog(
      createLog(
        'info',
        `VSEPR 교육용 3D 예측 모형을 표시합니다: ${vseprAnalysis.axeNotation}`,
      ),
    );
  };

  const handleToggleVseprModule = () => {
    if (isVseprModuleOpen) {
      setIsVseprModuleOpen(false);
      setVseprModelStatus((currentStatus) =>
        currentStatus === 'rendered' ? 'ready' : currentStatus,
      );
      appendLog(createLog('info', 'VSEPR 선택 교육 모듈을 닫았습니다.'));
      return;
    }

    setIsVseprModuleOpen(true);
    appendLog(
      createLog(
        'info',
        'VSEPR 선택 교육 모듈을 열었습니다. RDKit.js 검증을 통과한 구조만 예측합니다.',
      ),
    );
  };

  const selectedExample = findSelectedExample();
  const currentValidatedExample = validatedExampleId
    ? exampleMolecules.find((example) => example.id === validatedExampleId)
    : undefined;
  const selectedActivityForResult = useMemo(
    () =>
      resolveActivityTemplateForResult({
        appMode,
        selectedActivity,
        validatedExample: currentValidatedExample,
      }),
    [appMode, currentValidatedExample, selectedActivity],
  );
  const currentActivityResponses = activityResponsesById[selectedActivityId] ?? {};
  const currentStudentThought = currentActivityResponses.vseprReflection ?? '';
  const canVisitCurrent3DStep =
    validationResult?.ok === true &&
    vseprAnalysis.status === 'supported' &&
    molecule3DInput?.coordinateDimension === '3d';
  const canSubmitStudentThought = Boolean(
    validationResult?.ok === true &&
      hasVisitedCurrent3DStep &&
      currentStudentThought.trim() &&
      session?.role === 'student' &&
      session.classroomJoinStatus === 'joined' &&
      session.idToken &&
      !isActivitySubmissionPending,
  );
  const thoughtSubmissionAvailabilityMessage = (() => {
    if (validationResult?.ok !== true) {
      return '구조 확인을 완료하면 제출할 수 있습니다.';
    }

    if (!hasVisitedCurrent3DStep) {
      return canVisitCurrent3DStep
        ? '3D 비교 단계에 방문해 두 모형을 확인하면 제출할 수 있습니다.'
        : '3D 비교 자료가 준비된 뒤 두 모형을 확인하면 제출할 수 있습니다.';
    }

    if (!currentStudentThought.trim()) {
      return '나의 생각을 작성하면 제출할 수 있습니다.';
    }

    if (
      session?.role !== 'student' ||
      session.classroomJoinStatus !== 'joined' ||
      !session.idToken
    ) {
      return (
        (session?.role === 'student' ? session.classroomJoinMessage : undefined) ??
        '수업방 입장 확인이 완료되어야 교사에게 제출할 수 있습니다.'
      );
    }

    return isActivitySubmissionPending
      ? '교사에게 제출하는 중입니다.'
      : '교사에게 제출할 수 있습니다.';
  })();
  const structureComparisonState = buildStructureComparisonState({
    validationResult,
    molecule3DInput,
    vseprAnalysis,
    selectedExample: currentValidatedExample,
    selectedActivity: selectedActivityForResult,
  });
  const structureComparisonObservation: StructureComparisonObservation = {
    moleculeName:
      currentValidatedExample?.nameKo ?? extractedStructure?.label ?? '현재 구조',
    rdkitFormula: validationResult?.ok === true ? validationResult.molecularFormula : undefined,
    real3DSourceLabel: structureComparisonState.real3DSourceLabel,
    vseprAxeNotation: vseprAnalysis.axeNotation,
    vseprShapeKo: vseprAnalysis.molecularShapeKo,
    idealBondAngle: vseprAnalysis.idealBondAngles?.join(', '),
    ...structureComparisonObservationText,
  };
  const currentActivityResultSnapshot = useMemo(
    () =>
      createActivityResultSnapshot({
        appMode,
        userMode,
        activityTemplate: selectedActivityForResult,
        responses: currentActivityResponses,
        validationResult,
        molecule3DInput,
        measurementResults,
        vseprAnalysis,
        comparisonObservation: structureComparisonObservation,
      }),
    [
      appMode,
      currentActivityResponses,
      molecule3DInput,
      measurementResults,
      selectedActivityForResult,
      structureComparisonObservation,
      userMode,
      validationResult,
      vseprAnalysis,
    ],
  );
  const isCurrentStudentThoughtSubmitted = Boolean(
    completedStudentSubmission?.deliveryPolicy === 'trusted-server' &&
      completedStudentSubmission.contentKey ===
        getActivitySubmissionContentKey(currentActivityResultSnapshot),
  );
  const returnedStudentFeedbacks = useMemo(() => {
    return getReturnedStudentFeedbacksForSession(
      activitySubmissions,
      session?.role === 'student' ? session : null,
    );
  }, [activitySubmissions, session]);
  const handleRefreshReturnedFeedback = useCallback(async () => {
    if (
      session?.role !== 'student' ||
      session.classroomJoinStatus !== 'joined' ||
      !session.idToken
    ) {
      setActivitySubmissionStatusMessage(
        '교사 피드백을 확인하려면 수업방 입장 확인이 필요합니다.',
      );
      return;
    }

    setActivitySubmissionStatusMessage('교사 피드백을 확인하는 중입니다.');

    const result = await loadStudentFeedbackWithTrustedEndpoint({
      classCode: session.classCode,
      idToken: session.idToken,
    });

    console.info('[Student feedback]', result.developerLogs);

    if (result.ok) {
      setStudentSubmissionCacheState((currentCache) => ({
        scopeKey: studentSubmissionScopeKey,
        submissions: mergeActivitySubmissions(
          currentCache.scopeKey === studentSubmissionScopeKey
            ? currentCache.submissions
            : [],
          result.data,
        ),
      }));
    }

    setActivitySubmissionStatusMessage(result.studentMessage);
  }, [
    session?.role,
    session?.role === 'student' ? session.classCode : undefined,
    session?.role === 'student' ? session.classroomJoinStatus : undefined,
    session?.role === 'student' ? session.idToken : undefined,
    studentSubmissionScopeKey,
  ]);
  const previewActivityResult =
    savedActivityResults.find((result) => result.id === previewActivityResultId) ??
    null;
  const canLoadPubChem3D =
    Boolean(selectedExample?.pubchemCid) &&
    validatedExampleId === selectedExample?.id &&
    validationResult?.ok === true &&
    pubChem3DState.status !== 'loading';
  const canSearchPubChemCandidates =
    validationResult?.ok === true &&
    Boolean(validationResult.canonicalSmiles.trim()) &&
    pubChemCandidateState.status !== 'searching';
  const isVseprModuleVisible = shouldShowVseprModule({
    appMode,
    isModuleOpen: isVseprModuleOpen,
    selectedTemplate: selectedActivity,
  });

  useEffect(() => {
    if (
      !shouldAutoLoadPubChem3DForExample(currentValidatedExample) ||
      validationResult?.ok !== true ||
      molecule3DInput ||
      pubChem3DState.status !== 'idle' ||
      autoLoadedPubChemExampleIdRef.current === currentValidatedExample.id
    ) {
      return;
    }

    autoLoadedPubChemExampleIdRef.current = currentValidatedExample.id;
    void loadPubChem3DByCid({
      cid: currentValidatedExample.pubchemCid,
      label: currentValidatedExample.nameKo,
      pubchemName: currentValidatedExample.pubchemName,
      requestLogMessage: `${currentValidatedExample.nameKo} 예제는 내장 3D 자료가 없어 구조 확인 완료 후 외부 3D 자료를 자동 요청합니다. CID ${currentValidatedExample.pubchemCid}`,
    });
  }, [
    currentValidatedExample,
    molecule3DInput,
    pubChem3DState.status,
    validationResult,
  ]);

  const handleStructureComparisonObservationChange = (
    field: keyof Pick<
      StructureComparisonObservation,
      'observedSimilarities' | 'observedDifferences' | 'studentReflection'
    >,
    value: string,
  ) => {
    setStructureComparisonObservationText((currentObservation) => ({
      ...currentObservation,
      [field]: value,
    }));
  };
  const handleSaveActivityResult = () => {
    const snapshot = createActivityResultSnapshot({
      appMode,
      userMode,
      activityTemplate: selectedActivityForResult,
      responses: currentActivityResponses,
      validationResult,
      molecule3DInput,
      measurementResults,
      vseprAnalysis,
      comparisonObservation: structureComparisonObservation,
    });
    const result = saveActivityResult(snapshot);

    setActivityResultStatusMessage(result.studentMessage);
    console.info('[Activity result storage]', result.developerLogs);

    if (result.ok) {
      setSavedActivityResults((currentResults) => [
        snapshot,
        ...currentResults.filter((item) => item.id !== snapshot.id),
      ].slice(0, 10));
      setPreviewActivityResultId(snapshot.id);
    }
  };
  const handleSubmitActivityResult = async () => {
    if (validationResult?.ok !== true) {
      setActivitySubmissionStatusMessage('구조 확인을 완료한 뒤 제출해 주세요.');
      return;
    }

    if (!hasVisitedCurrent3DStep) {
      setActivitySubmissionStatusMessage(
        '3D 비교 단계에 방문해 두 모형을 확인한 뒤 제출해 주세요.',
      );
      return;
    }

    if (!currentStudentThought.trim()) {
      setActivitySubmissionStatusMessage('나의 생각을 작성한 뒤 제출해 주세요.');
      return;
    }

    if (
      session?.role !== 'student' ||
      session.classroomJoinStatus !== 'joined' ||
      !session.idToken
    ) {
      setActivitySubmissionStatusMessage(
        '수업 입장이 완료된 학생만 교사에게 제출할 수 있습니다.',
      );
      return;
    }

    if (isActivitySubmissionPendingRef.current) {
      return;
    }

    const submissionRequestId = activitySubmissionRequestIdRef.current + 1;
    activitySubmissionRequestIdRef.current = submissionRequestId;
    isActivitySubmissionPendingRef.current = true;
    setIsActivitySubmissionPending(true);

    try {
      const snapshot = createActivityResultSnapshot({
        appMode,
        userMode,
        activityTemplate: selectedActivityForResult,
        responses: currentActivityResponses,
        validationResult,
        molecule3DInput,
        measurementResults,
        vseprAnalysis,
        comparisonObservation: structureComparisonObservation,
      });
      const submission = createActivitySubmission({
        snapshot,
        studentSession: session,
      });
      const result = cacheActivitySubmissionForSession(
        activitySubmissions,
        submission,
      );
      const developerLogs = [...result.developerLogs];
      const statusMessages = [result.studentMessage];

      if (result.ok) {
        setStudentSubmissionCacheState({
          scopeKey: studentSubmissionScopeKey,
          submissions: result.data,
        });
      }

      setActivitySubmissionStatusMessage(
        `${result.studentMessage} 서버 제출 상태를 확인하는 중입니다.`,
      );

      const remoteResult = await saveSubmissionWithTrustedEndpoint({
        submission,
        idToken: session.idToken,
      });

      developerLogs.push(...remoteResult.developerLogs);
      statusMessages.push(remoteResult.studentMessage);

      if (submissionRequestId !== activitySubmissionRequestIdRef.current) {
        console.info('[Activity submission storage]', developerLogs);
        return;
      }

      if (remoteResult.ok) {
        setCompletedStudentSubmission({
          submissionId: remoteResult.data.id,
          snapshotId: remoteResult.data.snapshot.id,
          contentKey: getActivitySubmissionContentKey(remoteResult.data.snapshot),
          deliveryPolicy: 'trusted-server',
        });
      }

      setActivitySubmissionStatusMessage(statusMessages.join(' '));
      console.info('[Activity submission storage]', developerLogs);
    } finally {
      if (submissionRequestId === activitySubmissionRequestIdRef.current) {
        isActivitySubmissionPendingRef.current = false;
        setIsActivitySubmissionPending(false);
      }
    }
  };
  const handleCreateFirestoreClassroom = async (draft: ClassroomDraft) => {
    const result = await createClassroomWithTrustedEndpoint({
      draft,
      idToken: session?.role === 'teacher' ? session.idToken : undefined,
    });

    setTeacherClassroomStatusMessage(result.studentMessage);
    setTeacherClassroomStatusTone(result.ok ? 'success' : 'warning');
    setTeacherClassroomDeveloperLogs(result.developerLogs);
    console.info('[Firestore classroom]', result.developerLogs);
  };
  const isTeacherSubmissionScopeActive = (
    scope: TeacherSubmissionRequestScope,
  ) => {
    const activeState = teacherServerSubmissionStateRef.current;

    return (
      isTeacherSubmissionRequestScopeCurrent(
        scope,
        currentTeacherSubmissionIdentityRef.current,
        teacherSubmissionRequestIdRef.current,
      ) &&
      activeState?.teacherUid === scope.teacherUid &&
      activeState.idToken === scope.idToken &&
      activeState.classCode === scope.classCode &&
      activeState.requestId === scope.requestId
    );
  };
  const isSubmissionResponseForScope = (
    submission: ActivitySubmission,
    scope: TeacherSubmissionRequestScope,
    submissionId: string,
    expectedStatus: ActivitySubmission['status'],
  ) =>
    submission.id === submissionId &&
    normalizeClassCode(submission.classCode ?? '') === scope.classCode &&
    submission.status === expectedStatus;
  const commitTeacherSubmissionForScope = (
    scope: TeacherSubmissionRequestScope,
    submission: ActivitySubmission,
  ) => {
    if (!isTeacherSubmissionScopeActive(scope)) {
      return false;
    }

    const activeState = teacherServerSubmissionStateRef.current;

    if (!activeState) {
      return false;
    }

    commitTeacherServerSubmissionState({
      ...activeState,
      submissions: mergeActivitySubmissions(activeState.submissions, [submission]),
    });
    return true;
  };
  const handleLoadFirestoreSubmissions = async (classCode: string) => {
    const identity = currentTeacherSubmissionIdentityRef.current;
    const normalizedClassCode = normalizeClassCode(classCode);

    if (!identity || !normalizedClassCode) {
      resetTeacherSubmissionSessionState();
      setTeacherClassroomStatusMessage(
        identity
          ? '제출 자료를 불러올 수업코드를 입력해 주세요.'
          : '교사 인증을 다시 확인한 뒤 제출 자료를 불러와 주세요.',
      );
      setTeacherClassroomStatusTone('warning');
      return;
    }

    const requestId = teacherSubmissionRequestIdRef.current + 1;
    const scope: TeacherSubmissionRequestScope = {
      ...identity,
      classCode: normalizedClassCode,
      requestId,
    };

    teacherSubmissionRequestIdRef.current = requestId;
    feedbackReturnRequestIdRef.current += 1;
    isFeedbackReturnPendingRef.current = false;
    setSelectedSubmissionId(null);
    setAiFeedbackDraftStatus('idle');
    setTeacherFeedbackStatusMessage('');
    setTeacherClassroomStatusMessage('서버 제출 자료를 불러오는 중입니다.');
    setTeacherClassroomStatusTone('info');
    setTeacherClassroomDeveloperLogs([]);
    commitTeacherServerSubmissionState({
      ...scope,
      submissions: [],
    });

    const result = await loadClassroomSubmissionsWithTrustedEndpoint({
      classCode: normalizedClassCode,
      idToken: identity.idToken,
    });

    if (!isTeacherSubmissionScopeActive(scope)) {
      console.info('[Firestore submissions]', [
        'Ignored a stale teacher submission response after the teacher session or request scope changed.',
      ]);
      return;
    }

    const scopedSubmissions = result.data.filter(
      (submission) =>
        normalizeClassCode(submission.classCode ?? '') === normalizedClassCode,
    );
    const didDiscardOutOfScopeSubmissions =
      scopedSubmissions.length !== result.data.length;
    const developerLogs = didDiscardOutOfScopeSubmissions
      ? [
          ...result.developerLogs,
          `Discarded ${result.data.length - scopedSubmissions.length} out-of-scope submission(s) from the trusted endpoint response.`,
        ]
      : result.developerLogs;

    setTeacherClassroomStatusMessage(result.studentMessage);
    setTeacherClassroomStatusTone(
      result.ok && !didDiscardOutOfScopeSubmissions ? 'success' : 'warning',
    );
    setTeacherClassroomDeveloperLogs(developerLogs);
    console.info('[Firestore submissions]', developerLogs);

    if (result.ok) {
      commitTeacherServerSubmissionState({
        ...scope,
        submissions: scopedSubmissions,
      });
      setSelectedSubmissionId(scopedSubmissions[0]?.id ?? null);
    }
  };
  const handleCreateFeedbackDraft = async (submissionId: string) => {
    const scope = teacherServerSubmissionStateRef.current;
    const submission = scope?.submissions.find((item) => item.id === submissionId);

    if (!scope || !isTeacherSubmissionScopeActive(scope) || !submission) {
      setTeacherFeedbackStatusMessage('선택한 제출 자료를 찾지 못했습니다.');
      return;
    }

    setAiFeedbackDraftStatus('loading');
    setTeacherFeedbackStatusMessage('피드백 초안을 만드는 중입니다.');

    const serverDraftResult = await createFeedbackDraftWithTrustedEndpoint({
      submission,
      idToken: scope.idToken,
    });

    if (!isTeacherSubmissionScopeActive(scope)) {
      return;
    }

    const result = serverDraftResult.ok
      ? serverDraftResult
      : await createTeacherFeedbackDraft(submission, { endpoint: '' });

    if (!isTeacherSubmissionScopeActive(scope)) {
      return;
    }

    setAiFeedbackDraftStatus(result.status);
    setTeacherFeedbackStatusMessage(result.studentMessage);
    console.info('[AI feedback draft]', [
      ...serverDraftResult.developerLogs,
      ...(result === serverDraftResult ? [] : result.developerLogs),
    ]);

    if (!result.ok) {
      return;
    }

    setTeacherFeedbackStatusMessage(
      `${result.studentMessage} 서버에 초안을 저장하는 중입니다.`,
    );
    const remoteResult = await updateFeedbackWithTrustedEndpoint({
      submission,
      feedback: result.feedback,
      status: 'feedback_draft',
      idToken: scope.idToken,
    });

    if (!isTeacherSubmissionScopeActive(scope)) {
      return;
    }

    const isTrustedResultUsable =
      remoteResult.ok &&
      isSubmissionResponseForScope(
        remoteResult.data,
        scope,
        submissionId,
        'feedback_draft',
      );
    const finalRemoteResult = isTrustedResultUsable
      ? remoteResult
      : await updateSubmissionFeedbackInFirestore(
          submission,
          result.feedback,
          'feedback_draft',
        );

    if (!isTeacherSubmissionScopeActive(scope)) {
      return;
    }

    console.info('[Firestore feedback]', [
      ...remoteResult.developerLogs,
      ...(finalRemoteResult === remoteResult
        ? []
        : finalRemoteResult.developerLogs),
    ]);

    if (
      !finalRemoteResult.ok ||
      !isSubmissionResponseForScope(
        finalRemoteResult.data,
        scope,
        submissionId,
        'feedback_draft',
      )
    ) {
      setAiFeedbackDraftStatus('error');
      setTeacherFeedbackStatusMessage(
        `${result.studentMessage} ${finalRemoteResult.studentMessage} 서버에 저장되지 않아 교사 제출 목록에는 반영하지 않았습니다.`,
      );
      return;
    }

    commitTeacherSubmissionForScope(scope, finalRemoteResult.data);
    setSelectedSubmissionId(submissionId);
    setTeacherFeedbackStatusMessage(
      `${result.studentMessage} ${finalRemoteResult.studentMessage}`,
    );
  };
  const handleReturnFeedback = async (
    submissionId: string,
    studentMessage: string,
  ) => {
    if (isFeedbackReturnPendingRef.current) {
      setTeacherFeedbackStatusMessage(
        '이미 피드백 전달 요청을 처리 중입니다.',
      );
      return;
    }

    const scope = teacherServerSubmissionStateRef.current;
    const submission = scope?.submissions.find((item) => item.id === submissionId);

    if (
      !scope ||
      !isTeacherSubmissionScopeActive(scope) ||
      !submission?.teacherFeedback
    ) {
      setTeacherFeedbackStatusMessage(
        '학생에게 전달할 피드백 초안이 아직 없습니다.',
      );
      return;
    }

    const feedback: TeacherFeedbackDraft = {
      ...submission.teacherFeedback,
      studentMessage,
    };
    const previousStatusLabel =
      submission.status === 'feedback_draft'
        ? '피드백 초안'
        : submission.status === 'submitted'
          ? '제출'
          : '피드백 전달 완료';
    const requestId = feedbackReturnRequestIdRef.current + 1;

    feedbackReturnRequestIdRef.current = requestId;
    isFeedbackReturnPendingRef.current = true;
    setTeacherFeedbackStatusMessage(
      '교사 피드백을 학생에게 전달하는 중입니다.',
    );

    try {
      const remoteResult = await updateFeedbackWithTrustedEndpoint({
        submission,
        feedback,
        status: 'feedback_returned',
        idToken: scope.idToken,
      });

      if (
        requestId !== feedbackReturnRequestIdRef.current ||
        !isTeacherSubmissionScopeActive(scope)
      ) {
        return;
      }

      const isTrustedResultUsable =
        remoteResult.ok &&
        isSubmissionResponseForScope(
          remoteResult.data,
          scope,
          submissionId,
          'feedback_returned',
        );
      const finalRemoteResult = isTrustedResultUsable
        ? remoteResult
        : await updateSubmissionFeedbackInFirestore(
            submission,
            feedback,
            'feedback_returned',
          );

      if (
        requestId !== feedbackReturnRequestIdRef.current ||
        !isTeacherSubmissionScopeActive(scope)
      ) {
        return;
      }

      console.info('[Firestore feedback]', [
        ...remoteResult.developerLogs,
        ...(finalRemoteResult === remoteResult
          ? []
          : finalRemoteResult.developerLogs),
      ]);

      if (
        !finalRemoteResult.ok ||
        !isSubmissionResponseForScope(
          finalRemoteResult.data,
          scope,
          submissionId,
          'feedback_returned',
        )
      ) {
        setTeacherFeedbackStatusMessage(
          `피드백을 전달하지 못했습니다. 기존 ${previousStatusLabel} 상태를 유지했습니다. ${finalRemoteResult.studentMessage} 네트워크 또는 서버 상태를 확인한 뒤 다시 시도해 주세요.`,
        );
        return;
      }

      commitTeacherSubmissionForScope(scope, finalRemoteResult.data);
      setSelectedSubmissionId(submissionId);
      setTeacherFeedbackStatusMessage(finalRemoteResult.studentMessage);
    } finally {
      if (requestId === feedbackReturnRequestIdRef.current) {
        isFeedbackReturnPendingRef.current = false;
      }
    }
  };
  const handleExportActivityResult = (format: 'json' | 'md' | 'txt') => {
    const snapshot = previewActivityResult ?? currentActivityResultSnapshot;
    const result = downloadActivityResultFile(snapshot, format);

    setActivityResultStatusMessage(result.studentMessage);
    console.info('[Activity result export]', result.developerLogs);
  };
  const handleCopyActivityResultMarkdown = async () => {
    const snapshot = previewActivityResult ?? currentActivityResultSnapshot;
    const result = await copyActivityResultMarkdown(snapshot);

    setActivityResultStatusMessage(result.studentMessage);
    console.info('[Activity result export]', result.developerLogs);
  };
  const handlePrintActivityResult = () => {
    if (typeof window === 'undefined') {
      setActivityResultStatusMessage('현재 환경에서는 인쇄 기능을 사용할 수 없습니다.');
      console.info('[Activity result export]', ['window is not available for print.']);
      return;
    }

    window.print();
    setActivityResultStatusMessage('인쇄용 화면을 열었습니다.');
  };
  const teacherSession = session?.role === 'teacher' ? session : null;
  const isTeacherAuthorizedSession = isTeacherAuthorized(session);
  const isEmergencyTeacherSession = teacherSession?.isEmergencyAccess === true;
  const hasTeacherServerAccess =
    isTeacherAuthorizedSession &&
    !isEmergencyTeacherSession &&
    Boolean(teacherSession?.idToken);
  const isStudentActivityView = userMode === 'student' && appMode === 'activity';
  const isStudentFreeDrawView = userMode === 'student' && appMode === 'free_draw';
  const isTeacherOrAdvancedView =
    userMode === 'teacher' && isTeacherAuthorizedSession;
  const shouldShowStudentCoordinateTools =
    userMode === 'student' &&
    validationResult?.ok === true &&
    molecule3DInput?.coordinateDimension === '3d';
  const shouldShow3DActionSlot =
    isTeacherOrAdvancedView ||
    (
      userMode === 'student' &&
      validationResult?.ok === true &&
      Boolean(selectedExample?.pubchemCid) &&
      validatedExampleId === selectedExample?.id
    );
  const pubChem3DActionSlot = (
    <div className={`pubchem-3d-control ${pubChem3DState.status}`}>
      <div>
        <p className="section-label">참고 3D 구조 보기</p>
        <p className="pubchem-3d-message">
          {getPubChem3DStatusMessage(selectedExample)}
        </p>
      </div>
      {selectedExample?.pubchemCid ? (
        <button
          className="secondary-action"
          data-testid="load-pubchem-3d-button"
          type="button"
          disabled={!canLoadPubChem3D}
          onClick={handleLoadPubChem3D}
        >
          {pubChem3DState.status === 'loading'
            ? '참고 3D 구조 불러오는 중'
            : '참고 3D 구조 불러오기'}
        </button>
      ) : null}
    </div>
  );
  const studentDrawingSlot = (
    <Suspense fallback={<EditorLoadingFallback />}>
      <LazyKetcherEditor
        ref={editorRef}
        isModeSwitchDisabled={isStructureAnalysisPending}
        onStructureChange={handleEditorStructureChange}
        onReadyChange={(ready) => {
          if (ready && !hasLoggedEditorReadyRef.current) {
            hasLoggedEditorReadyRef.current = true;
            appendLog(createLog('info', 'Ketcher editor가 준비되었습니다.'));
          }
        }}
        onError={(message) => {
          appendLog(createLog('error', `Ketcher 오류: ${message}`));
        }}
      />
    </Suspense>
  );
  const teacherDrawingSlot = (
    <section className="workbench-layout" aria-label="분자 모델링 작업 영역">
      <Suspense fallback={<EditorLoadingFallback />}>
        <LazyKetcherEditor
          ref={editorRef}
          isModeSwitchDisabled={isStructureAnalysisPending}
          onStructureChange={handleEditorStructureChange}
          onReadyChange={(ready) => {
            if (ready && !hasLoggedEditorReadyRef.current) {
              hasLoggedEditorReadyRef.current = true;
              appendLog(createLog('info', 'Ketcher editor가 준비되었습니다.'));
            }
          }}
          onError={(message) => {
            appendLog(createLog('error', `Ketcher 오류: ${message}`));
          }}
        />
      </Suspense>
      <StructureInfoPanel
        extractedStructure={extractedStructure}
        validationResult={validationResult}
      />
    </section>
  );
  const vseprEvidencePanel = isVseprModuleVisible ? (
    <VseprPanel
      analysis={vseprAnalysis}
      selectedCentralAtomId={selectedVseprCentralAtomId}
      onSelectCentralAtom={handleSelectVseprCentralAtom}
      canShowModel={
        vseprAnalysis.status === 'supported' &&
        hasVseprGeometryTemplate(vseprAnalysis.axeNotation)
      }
      modelStatus={vseprModelStatus}
      modelButtonLabel="VSEPR 예상 모형 준비하기"
      renderedModelButtonLabel="VSEPR 예상 모형 준비됨"
      onShowModel={handleShowVseprModel}
    />
  ) : null;
  const vseprModelViewerSection = isVseprModuleVisible ? (
    <Suspense
      fallback={
        <ViewerLoadingFallback
          label="VSEPR 예상 모형"
          title="전자쌍 반발 이론에 따른 교육용 예측 모형"
          message="VSEPR 예상 모형을 불러오는 중입니다."
        />
      }
    >
      <LazyVsepr3DModelViewer
        analysis={vseprAnalysis}
        modelStatus={vseprModelStatus}
        onDeveloperLog={handle3DDeveloperLog}
      />
    </Suspense>
  ) : null;
  const vseprPredictionSection = isVseprModuleVisible ? (
    <>
      {vseprEvidencePanel}
      {vseprModelViewerSection}
    </>
  ) : null;
  const actual3DViewerSection = (
    <Suspense fallback={<ViewerLoadingFallback />}>
      <LazyMolecule3DViewer
        coordinateData={molecule3DInput}
        hasValidatedStructure={validationResult?.ok === true}
        userMode={userMode}
        showAdvancedControls={userMode === 'student' || isTeacherOrAdvancedView}
        showMeasurementControls={isTeacherOrAdvancedView || shouldShowStudentCoordinateTools}
        validatedStructureKey={
          validationResult?.ok === true ? validationResult.canonicalSmiles : undefined
        }
        actionSlot={shouldShow3DActionSlot ? pubChem3DActionSlot : null}
        onDeveloperLog={handle3DDeveloperLog}
        onMeasurementResultsChange={setMeasurementResults}
      />
    </Suspense>
  );
  const comparisonSection = (
    <StructureComparisonPanel
      userMode={userMode}
      state={structureComparisonState}
      molecule3DInput={molecule3DInput}
      vseprAnalysis={vseprAnalysis}
      vseprModelStatus={vseprModelStatus}
      isOpen={isStructureComparisonOpen}
      observation={structureComparisonObservation}
      focusQuestion={
        appMode === 'activity'
          ? selectedActivity?.comparisonMode?.focusQuestion
          : undefined
      }
      onToggleOpen={() => {
        setIsStructureComparisonOpen((current) => !current);
      }}
      onObservationChange={handleStructureComparisonObservationChange}
      onDeveloperLog={handle3DDeveloperLog}
    />
  );
  const resultSection = (
    <ActivityResultPanel
      userMode={userMode}
      currentSnapshot={currentActivityResultSnapshot}
      previewSnapshot={previewActivityResult}
      savedResults={savedActivityResults}
      statusMessage={activityResultStatusMessage}
      submissionStatusMessage={activitySubmissionStatusMessage}
      returnedFeedbacks={returnedStudentFeedbacks}
      onSave={handleSaveActivityResult}
      onSubmitForTeacher={
        userMode === 'student' ? handleSubmitActivityResult : undefined
      }
      onRefreshReturnedFeedback={
        session?.role === 'student' &&
        session.classroomJoinStatus === 'joined' &&
        session.idToken
          ? handleRefreshReturnedFeedback
          : undefined
      }
      onPreviewSavedResult={setPreviewActivityResultId}
      onExportJson={() => {
        handleExportActivityResult('json');
      }}
      onExportMarkdown={() => {
        handleExportActivityResult('md');
      }}
      onExportTxt={() => {
        handleExportActivityResult('txt');
      }}
      onCopyMarkdown={() => void handleCopyActivityResultMarkdown()}
      onPrint={handlePrintActivityResult}
    />
  );
  const studentReturnedFeedbackSection =
    session?.role === 'student' ? (
      <StudentReturnedFeedback
        feedbacks={returnedStudentFeedbacks}
        canRefresh={
          session.classroomJoinStatus === 'joined' && Boolean(session.idToken)
        }
        statusMessage={activitySubmissionStatusMessage}
        onRefresh={() => {
          void handleRefreshReturnedFeedback();
        }}
      />
    ) : null;
  const studentExternal3DSearchSection =
    validationResult?.ok === true ? (
      <PubChemCandidatePanel
        displayMode="student"
        canSearch={canSearchPubChemCandidates}
        status={pubChemCandidateState.status}
        candidates={pubChemCandidateState.candidates}
        warnings={pubChemCandidateState.warnings}
        studentMessage={pubChemCandidateState.studentMessage}
        selectedCandidateCid={pubChemCandidateState.selectedCandidateCid}
        isLoading3D={pubChem3DState.status === 'loading'}
        onSearch={handleSearchPubChemCandidates}
        onSelectCandidate={handleSelectPubChemCandidate}
      />
    ) : null;
  const studentFreeDrawView = (
    <div className="student-activity-shell" data-testid="student-free-draw-shell">
      <MoleculeDrawingStep
        examples={exampleMolecules}
        selectedExampleId={selectedExampleId}
        drawingSlot={studentDrawingSlot}
        onSelectExample={handleSelectExample}
        onLoadExample={handleLoadExample}
        onClearStructure={handleClearStructure}
        isAnalyzing={isStructureAnalysisPending}
        analysisErrorMessage={structureAnalysisErrorMessage}
        onConfirmStructure={handleExtractAndValidate}
      />
      <ValidationResultCards
        validationResult={validationResult}
        vseprAnalysis={vseprAnalysis}
        molecule3DInput={molecule3DInput}
      />
      <ShapeViewerSection
        predictionSlot={vseprPredictionSection}
        actual3DSlot={actual3DViewerSection}
        external3DSearchSlot={studentExternal3DSearchSection}
        comparisonSlot={comparisonSection}
      />
    </div>
  );
  const isStudentSessionActive = session?.role === 'student';
  const isTeacherSessionActive = session?.role === 'teacher';
  const isStudentRoute =
    appRoute === 'student' || appRoute === 'student-workbench';
  const isTeacherRoute =
    appRoute === 'teacher' || appRoute === 'teacher-dashboard';
  const shouldShowTeacherDashboardPlaceholder =
    appRoute === 'teacher-dashboard' && isTeacherSessionActive;
  const appHeader = (
    <AppHeader
      appMode={appMode}
      userMode={userMode}
      teacherControlsEnabled={isTeacherAuthorizedSession}
      onModeChange={handleAppModeChange}
      onUserModeChange={handleUserModeChange}
      examples={exampleMolecules}
      selectedExampleId={selectedExampleId}
      onSelectExample={handleSelectExample}
      onLoadExample={handleLoadExample}
      onExtractAndValidate={handleExtractAndValidate}
    />
  );
  const legalPanel = activeLegalDocumentId ? (
    <LegalDocumentPanel
      documentId={activeLegalDocumentId}
      onClose={() => {
        setActiveLegalDocumentId(null);
      }}
    />
  ) : null;
  const legalFooter = (
    <LegalFooter
      onOpenDocument={(documentId) => {
        setActiveLegalDocumentId(documentId);
      }}
    />
  );

  if (!isEthicsGateAccepted) {
    return (
      <EthicsGuideGate
        legalPanelSlot={legalPanel}
        footerSlot={legalFooter}
        onStart={() => {
          setIsEthicsGateAccepted(true);
        }}
      />
    );
  }

  if (appRoute === 'home') {
    return (
      <main className="app-shell" data-testid="role-selection-shell">
        {appHeader}
        <RoleSelectionScreen
          onOpenStudent={() => {
            navigateToRoute('student');
          }}
          onOpenTeacher={() => {
            navigateToRoute('teacher');
          }}
        />
        {legalPanel}
        {legalFooter}
      </main>
    );
  }

  if (isStudentRoute && !isStudentSessionActive) {
    return (
      <main className="app-shell" data-testid="student-entry-shell">
        {appHeader}
        <StudentEntryScreen
          onEntered={handleStudentEntered}
          onOpenTeacher={() => {
            navigateToRoute('teacher');
          }}
        />
        {legalPanel}
        {legalFooter}
      </main>
    );
  }

  if (isTeacherRoute && !isTeacherSessionActive) {
    return (
      <main className="app-shell" data-testid="teacher-entry-shell">
        {appHeader}
        <RoleGate
          allow={['teacher']}
          fallback={
            <TeacherEntryScreen
              onOpenStudent={() => {
                navigateToRoute('student');
              }}
              onAuthenticated={() => {
                navigateToRoute('teacher-dashboard');
              }}
            />
          }
        >
          <TeacherPanel
            userMode="teacher"
            appMode={appMode}
            templates={activityTemplates}
            selectedActivityId={selectedActivityId}
            examples={exampleMolecules}
            selectedExample={selectedExample}
            validationResult={validationResult}
            vseprAnalysis={vseprAnalysis}
            molecule3DInput={molecule3DInput}
            structureComparisonState={structureComparisonState}
            pubChem3DStatus={pubChem3DState.status}
            pubChemCandidateStatus={pubChemCandidateState.status}
            onSelectActivity={handleSelectActivity}
          />
          </RoleGate>
        {legalPanel}
        {legalFooter}
      </main>
    );
  }

  if (
    isTeacherRoute &&
    isTeacherSessionActive &&
    !isTeacherAuthorizedSession
  ) {
    return (
      <main className="app-shell" data-testid="teacher-pending-authorization-shell">
        {appHeader}
        <TeacherDashboardPlaceholder
          authorizationStatus={
            session?.role === 'teacher'
              ? session.teacherAuthorizationStatus
              : undefined
          }
          isEmergencyAccess={isEmergencyTeacherSession}
          onSignOut={handleTeacherSignOut}
        />
        {legalPanel}
        {legalFooter}
      </main>
    );
  }

  return (
    <main className="app-shell" data-testid="app-shell">
      {appHeader}

      {shouldShowTeacherDashboardPlaceholder ? (
        <TeacherDashboardPlaceholder
          authorizationStatus={
            session?.role === 'teacher'
              ? session.teacherAuthorizationStatus
              : undefined
          }
          isEmergencyAccess={isEmergencyTeacherSession}
          templates={activityTemplates}
          statusMessage={teacherClassroomStatusMessage}
          statusTone={teacherClassroomStatusTone}
          developerLogs={teacherClassroomDeveloperLogs}
          submissions={teacherServerSubmissions}
          selectedSubmissionId={selectedSubmissionId}
          onSignOut={handleTeacherSignOut}
          onCreateClassroom={
            hasTeacherServerAccess
              ? (draft) => {
                  void handleCreateFirestoreClassroom(draft);
                }
              : undefined
          }
          onLoadSubmissions={
            hasTeacherServerAccess
              ? (classCode) => {
                  void handleLoadFirestoreSubmissions(classCode);
                }
              : undefined
          }
          onSelectSubmission={setSelectedSubmissionId}
        />
      ) : null}

      {isStudentActivityView ? (
        <StudentActivityShell
          templates={currentActivityTemplates}
          selectedActivityId={selectedActivityId}
          validationResult={validationResult}
          vseprAnalysis={vseprAnalysis}
          molecule3DInput={molecule3DInput}
          examples={exampleMolecules}
          selectedExampleId={selectedExampleId}
          drawingSlot={studentDrawingSlot}
          analysisSlot={vseprEvidencePanel}
          predictionViewerSlot={vseprModelViewerSection}
          actual3DViewerSlot={actual3DViewerSection}
          external3DSearchSlot={studentExternal3DSearchSection}
          feedbackSlot={studentReturnedFeedbackSection}
          thoughtValue={currentStudentThought}
          submissionStatusMessage={activitySubmissionStatusMessage}
          isThoughtSubmitted={isCurrentStudentThoughtSubmitted}
          hasVisitedCurrent3DStep={hasVisitedCurrent3DStep}
          canSubmitThought={canSubmitStudentThought}
          isSubmittingThought={isActivitySubmissionPending}
          isAnalyzingStructure={isStructureAnalysisPending}
          structureAnalysisErrorMessage={structureAnalysisErrorMessage}
          thoughtSubmissionAvailabilityMessage={
            thoughtSubmissionAvailabilityMessage
          }
          onSelectActivity={handleSelectActivity}
          onSelectExample={handleSelectExample}
          onLoadExample={handleLoadExample}
          onClearStructure={handleClearStructure}
          onConfirmStructure={handleExtractAndValidate}
          onVisitCurrent3DStep={() => {
            if (canVisitCurrent3DStep) {
              setHasVisitedCurrent3DStep(true);
            }
          }}
          onThoughtChange={(value) => {
            handleActivityResponseChange('vseprReflection', value);
          }}
          onSubmitThought={() => {
            void handleSubmitActivityResult();
          }}
        />
      ) : isStudentFreeDrawView ? (
        studentFreeDrawView
      ) : (
        <>
          {teacherDrawingSlot}

          <section
            className="workspace-panel vsepr-module-gate"
            data-testid="vsepr-module-gate"
          >
            <div className="panel-heading vsepr-heading">
              <div>
                <p className="section-label">선택 교육 모듈</p>
                <h2>입체 구조 예상</h2>
              </div>
              <button
                className="secondary-action"
                data-testid="toggle-vsepr-module-button"
                type="button"
                disabled={selectedActivityUsesVsepr}
                onClick={handleToggleVseprModule}
              >
                {selectedActivityUsesVsepr
                  ? '수업 활동에서 표시 중'
                  : isVseprModuleOpen
                    ? '입체 구조 예상 닫기'
                    : '입체 구조 예상 보기'}
              </button>
            </div>
            <p>
              직접 그리기에서는 구조 입력, 구조 확인, 참고 3D 구조를 기본
              흐름으로 사용합니다. 입체 구조 예상은 활동 템플릿이 요구하거나
              사용자가 명시적으로 연 선택 모듈에서만 교육용 예측으로 표시합니다.
            </p>
          </section>

          {vseprPredictionSection}
        </>
      )}

      {!isStudentActivityView ? (
        <ActivityPanel
          appMode={appMode}
          userMode={userMode}
          templates={currentActivityTemplates}
          selectedActivityId={selectedActivityId}
          responses={currentActivityResponses}
          validationResult={validationResult}
          onSelectActivity={handleSelectActivity}
          onResponseChange={handleActivityResponseChange}
        />
      ) : null}

      {isTeacherAuthorizedSession ? (
        <TeacherPanel
          userMode={userMode}
          appMode={appMode}
          templates={activityTemplates}
          selectedActivityId={selectedActivityId}
          examples={exampleMolecules}
          selectedExample={selectedExample}
          validationResult={validationResult}
          vseprAnalysis={vseprAnalysis}
          molecule3DInput={molecule3DInput}
          structureComparisonState={structureComparisonState}
          pubChem3DStatus={pubChem3DState.status}
          pubChemCandidateStatus={pubChemCandidateState.status}
          onSelectActivity={handleSelectActivity}
        />
      ) : null}

      {isTeacherOrAdvancedView ? (
        <TeacherFeedbackPanel
          submissions={teacherServerSubmissions}
          selectedSubmissionId={selectedSubmissionId}
          draftStatus={aiFeedbackDraftStatus}
          statusMessage={teacherFeedbackStatusMessage}
          onSelectSubmission={setSelectedSubmissionId}
          onCreateFeedbackDraft={(submissionId) => {
            void handleCreateFeedbackDraft(submissionId);
          }}
          onReturnFeedback={handleReturnFeedback}
        />
      ) : null}

      <TeacherAdvancedPanel visible={isTeacherOrAdvancedView}>
        <PubChemCandidatePanel
          canSearch={canSearchPubChemCandidates}
          status={pubChemCandidateState.status}
          candidates={pubChemCandidateState.candidates}
          warnings={pubChemCandidateState.warnings}
          studentMessage={pubChemCandidateState.studentMessage}
          selectedCandidateCid={pubChemCandidateState.selectedCandidateCid}
          isLoading3D={pubChem3DState.status === 'loading'}
          onSearch={handleSearchPubChemCandidates}
          onSelectCandidate={handleSelectPubChemCandidate}
        />
        {comparisonSection}
        {actual3DViewerSection}
      </TeacherAdvancedPanel>

      {isTeacherAuthorizedSession ? resultSection : null}

      <DeveloperDetailsPanel
        logs={logs}
        visible={userMode === 'teacher'}
      />
      {legalPanel}
      {legalFooter}
    </main>
  );
}
