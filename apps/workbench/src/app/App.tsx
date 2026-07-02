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
import {
  LearningProgressRail,
  type LearningStepId,
} from '../components/student/LearningProgressRail';
import { MoleculeDrawingStep } from '../components/student/MoleculeDrawingStep';
import { ShapeViewerSection } from '../components/student/ShapeViewerSection';
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
  createActivitySubmission,
  loadActivitySubmissions,
  saveActivitySubmission,
  updateActivitySubmissionFeedback,
} from '../services/activitySubmissionStorage';
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
  type AppRoute,
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

function EditorLoadingFallback() {
  return (
    <section className="workspace-panel editor-panel" data-testid="chemical-editor">
      <div className="panel-heading editor-heading">
        <div>
          <p className="section-label">좌측</p>
          <h2>분자 편집 영역</h2>
        </div>
        <span className="status-pill">그리기 도구 준비 중</span>
      </div>
      <div className="ketcher-host editor-loading-state">
        분자 그리기 도구를 불러오는 중입니다.
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

export function shouldAutoLoadPubChem3DForExample(
  example: ExampleMolecule | null | undefined,
): example is ExampleMolecule & { pubchemCid: number } {
  return (
    example?.external3DSource === 'pubchem' &&
    typeof example.pubchemCid === 'number' &&
    !example.structure3D
  );
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
  const { session } = useUserSession();
  const editorRef = useRef<ChemicalEditorHandle | null>(null);
  const hasLoggedEditorReadyRef = useRef(false);
  const validationKeyRef = useRef<string | null>(null);
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
  const [activityResponsesById, setActivityResponsesById] = useState<
    Record<string, ActivityResponseState>
  >({});
  const [selectedExampleId, setSelectedExampleId] = useState(
    exampleMolecules[0]?.id ?? '',
  );
  const [extractedStructure, setExtractedStructure] =
    useState<ExtractedStructureData | null>(null);
  const [validationResult, setValidationResult] =
    useState<MoleculeValidationResult | null>(null);
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
  const [savedActivityResults, setSavedActivityResults] = useState<
    ActivityResultSnapshot[]
  >([]);
  const [activitySubmissions, setActivitySubmissions] = useState<
    ActivitySubmission[]
  >([]);
  const [previewActivityResultId, setPreviewActivityResultId] =
    useState<string | null>(null);
  const [activityResultStatusMessage, setActivityResultStatusMessage] =
    useState<string>('');
  const [activitySubmissionStatusMessage, setActivitySubmissionStatusMessage] =
    useState<string>('');
  const [teacherFeedbackStatusMessage, setTeacherFeedbackStatusMessage] =
    useState<string>('');
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
  const selectedActivity =
    activityTemplates.find((template) => template.id === selectedActivityId) ??
    activityTemplates[0];
  const selectedActivityUsesVsepr =
    appMode === 'activity' && selectedActivity?.requiresVsepr === true;

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

  const handleUserModeChange = useCallback(
    (nextMode: UserMode) => {
      navigateToRoute(nextMode === 'teacher' ? 'teacher' : 'student');
    },
    [navigateToRoute],
  );

  const handleStudentEntered = useCallback(() => {
    setAppMode('activity');
    navigateToRoute('student-workbench');
  }, [navigateToRoute]);

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
    validationKeyRef.current = null;
    setMolecule3DInput(null);
    setValidatedExampleId(null);
    resetPubChem3DState();
    resetPubChemCandidateState();
    resetStructureComparison();
    setExtractedStructure(null);
    setValidationResult(null);
    resetVseprAnalysis();
    setMeasurementResults([]);
  };

  const resetStructureComparison = () => {
    setIsStructureComparisonOpen(false);
    setStructureComparisonObservationText(INITIAL_STRUCTURE_COMPARISON_OBSERVATION);
  };

  const handle3DDeveloperLog = useCallback((message: string) => {
    console.info('[3Dmol viewer]', message);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handlePopState = () => {
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
    const result = loadActivitySubmissions();

    setActivitySubmissions(result.data);
    setSelectedSubmissionId(result.data[0]?.id ?? null);

    if (!result.ok) {
      setTeacherFeedbackStatusMessage(result.studentMessage);
      console.info('[Activity submission storage]', result.developerLogs);
    }
  }, []);

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

  const extractAndValidateCurrentStructure = async (example?: ExampleMolecule) => {
    const structure = await editorRef.current?.extractStructure();

    if (!structure) {
      throw new Error('분자 그리기 도구가 아직 준비되지 않았습니다.');
    }

    const labeledStructure = example
      ? { ...structure, label: example.nameKo }
      : structure;
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
    setValidationResult(result);

    if (result.ok) {
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
    } else {
      console.info('[RDKit validation]', result.developerLogs);
      appendLog(createLog('error', result.studentMessage));
      setValidatedExampleId(null);
      setMolecule3DInput(null);
      resetVseprAnalysis();
    }
  };

  const handleExtractAndValidate = async () => {
    try {
      await extractAndValidateCurrentStructure();
    } catch (error) {
      setMolecule3DInput(null);
      setValidatedExampleId(null);
      resetPubChem3DState();
      resetPubChemCandidateState();
      resetStructureComparison();
      setExtractedStructure(null);
      setValidationResult(null);
      resetVseprAnalysis();
      appendLog(
        createLog(
          'error',
          normalizeKetcherError(error, '구조 데이터 추출 중 오류가 발생했습니다.'),
        ),
      );
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
    setSelectedExampleId(exampleId);
    resetCurrentStructureState();
  };

  const handleSelectActivity = (activityId: string) => {
    const nextTemplate = activityTemplates.find((template) => template.id === activityId);
    const nextExampleId = resolveRecommendedExampleIdForActivity({
      activityId,
      templates: activityTemplates,
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

  const loadPubChem3DByCid = async (input: {
  cid: number;
  label: string;
  pubchemName?: string;
  structureMatchStatus?: Molecule3DStructureMatchStatus;
  requestLogMessage: string;
}) => {
    const requestId = pubChem3DRequestIdRef.current + 1;
    const requestValidationKey = validationKeyRef.current;

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
    try {
      const example = findSelectedExample();

      if (!example) {
        throw new Error('불러올 예제 분자를 선택해 주세요.');
      }

      if (!editorRef.current) {
        throw new Error('분자 그리기 도구가 아직 준비되지 않았습니다.');
      }

      await editorRef.current.setMolecule({ smiles: example.smiles });
      appendLog(
        createLog(
          'info',
          `${example.nameKo} 예제를 Ketcher 편집기에 불러왔습니다.`,
        ),
      );
      await extractAndValidateCurrentStructure(example);
    } catch (error) {
      setMolecule3DInput(null);
      setValidatedExampleId(null);
      resetPubChem3DState();
      resetPubChemCandidateState();
      resetStructureComparison();
      setExtractedStructure(null);
      setValidationResult(null);
      resetVseprAnalysis();
      appendLog(
        createLog(
          'error',
          normalizeKetcherError(error, '예제 분자를 불러오는 중 오류가 발생했습니다.'),
        ),
      );
    }
  };

  const handleActivityResponseChange = (questionId: string, value: string) => {
    setActivityResponsesById((currentResponses) => ({
      ...currentResponses,
      [selectedActivityId]: {
        ...(currentResponses[selectedActivityId] ?? {}),
        [questionId]: value,
      },
    }));
  };

  const handleSelectVseprCentralAtom = (atomId: string) => {
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
          `선택한 중심 원자 ${nextAnalysis.centralAtomSymbol}${nextAnalysis.centralAtomId}의 VSEPR 예측: ${nextAnalysis.axeNotation}, ${nextAnalysis.molecularShapeKo}`,
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
  const currentActivityResponses = activityResponsesById[selectedActivityId] ?? {};
  const structureComparisonState = buildStructureComparisonState({
    validationResult,
    molecule3DInput,
    vseprAnalysis,
    selectedExample: currentValidatedExample,
    selectedActivity: appMode === 'activity' ? selectedActivity : null,
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
        activityTemplate: appMode === 'activity' ? selectedActivity : null,
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
      selectedActivity,
      structureComparisonObservation,
      userMode,
      validationResult,
      vseprAnalysis,
    ],
  );
  const returnedStudentFeedbacks = useMemo(() => {
    if (session?.role !== 'student') {
      return [];
    }

    return activitySubmissions.filter(
      (submission) =>
        submission.status === 'feedback_returned' &&
        submission.anonymousStudentId === session.anonymousStudentId,
    );
  }, [activitySubmissions, session]);
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
      activityTemplate: appMode === 'activity' ? selectedActivity : null,
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
  const handleSubmitActivityResult = () => {
    const snapshot = createActivityResultSnapshot({
      appMode,
      userMode,
      activityTemplate: appMode === 'activity' ? selectedActivity : null,
      responses: currentActivityResponses,
      validationResult,
      molecule3DInput,
      measurementResults,
      vseprAnalysis,
      comparisonObservation: structureComparisonObservation,
    });
    const submission = createActivitySubmission({
      snapshot,
      studentSession: session?.role === 'student' ? session : undefined,
    });
    const result = saveActivitySubmission(submission);

    setActivitySubmissionStatusMessage(result.studentMessage);
    console.info('[Activity submission storage]', result.developerLogs);

    if (result.ok) {
      setActivitySubmissions(result.data);
      setSelectedSubmissionId(submission.id);
    }
  };
  const handleCreateFeedbackDraft = async (submissionId: string) => {
    const submission = activitySubmissions.find((item) => item.id === submissionId);

    if (!submission) {
      setTeacherFeedbackStatusMessage('선택한 제출 자료를 찾지 못했습니다.');
      return;
    }

    setAiFeedbackDraftStatus('loading');
    setTeacherFeedbackStatusMessage('피드백 초안을 만드는 중입니다.');

    const result = await createTeacherFeedbackDraft(submission);
    setAiFeedbackDraftStatus(result.status);
    setTeacherFeedbackStatusMessage(result.studentMessage);
    console.info('[AI feedback draft]', result.developerLogs);

    if (!result.ok) {
      return;
    }

    const saveResult = updateActivitySubmissionFeedback(
      activitySubmissions,
      submissionId,
      result.feedback,
      'feedback_draft',
    );

    setTeacherFeedbackStatusMessage(saveResult.studentMessage);
    console.info('[Activity submission feedback]', saveResult.developerLogs);

    if (saveResult.ok) {
      setActivitySubmissions(saveResult.data);
      setSelectedSubmissionId(submissionId);
    }
  };
  const handleReturnFeedback = (
    submissionId: string,
    studentMessage: string,
  ) => {
    const submission = activitySubmissions.find((item) => item.id === submissionId);

    if (!submission?.teacherFeedback) {
      setTeacherFeedbackStatusMessage(
        '학생에게 전달할 피드백 초안이 아직 없습니다.',
      );
      return;
    }

    const feedback: TeacherFeedbackDraft = {
      ...submission.teacherFeedback,
      studentMessage,
    };
    const result = updateActivitySubmissionFeedback(
      activitySubmissions,
      submissionId,
      feedback,
      'feedback_returned',
    );

    setTeacherFeedbackStatusMessage(result.studentMessage);
    console.info('[Activity submission feedback]', result.developerLogs);

    if (result.ok) {
      setActivitySubmissions(result.data);
      setSelectedSubmissionId(submissionId);
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
  const isTeacherAuthorizedSession = isTeacherAuthorized(session);
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
  const vseprPredictionSection = isVseprModuleVisible ? (
    <>
      <VseprPanel
        analysis={vseprAnalysis}
        selectedCentralAtomId={selectedVseprCentralAtomId}
        onSelectCentralAtom={handleSelectVseprCentralAtom}
        canShowModel={
          vseprAnalysis.status === 'supported' &&
          hasVseprGeometryTemplate(vseprAnalysis.axeNotation)
        }
        modelStatus={vseprModelStatus}
        modelButtonLabel="예상 입체 모형 보기"
        renderedModelButtonLabel="예상 입체 모형 표시 중"
        onShowModel={handleShowVseprModel}
      />

      <Suspense
        fallback={
          <ViewerLoadingFallback
            label="입체 구조 예상"
            title="예상 입체 모형 보기"
            message="예상 입체 모형을 불러오는 중입니다."
          />
        }
      >
        <LazyVsepr3DModelViewer
          analysis={vseprAnalysis}
          modelStatus={vseprModelStatus}
          onDeveloperLog={handle3DDeveloperLog}
        />
      </Suspense>
    </>
  ) : null;
  const actual3DViewerSection = (
    <Suspense fallback={<ViewerLoadingFallback />}>
      <LazyMolecule3DViewer
        coordinateData={molecule3DInput}
        hasValidatedStructure={validationResult?.ok === true}
        userMode={userMode}
        showAdvancedControls={isTeacherOrAdvancedView}
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
  const hasPredictionResponse =
    selectedActivity?.predictionQuestions.some((question) =>
      Boolean(currentActivityResponses[question.id]?.trim()),
    ) ?? false;
  const hasReflectionResponse =
    selectedActivity?.reflectionQuestions.some((question) =>
      Boolean(currentActivityResponses[question.id]?.trim()),
    ) ?? false;
  const hasComparisonObservation = Object.values(
    structureComparisonObservationText,
  ).some((value) => Boolean(value.trim()));
  const currentLearningStep: LearningStepId = hasReflectionResponse
    ? 7
    : hasComparisonObservation
      ? 6
      : molecule3DInput || vseprModelStatus === 'rendered'
        ? 5
        : validationResult
          ? 4
          : appMode === 'free_draw' || hasPredictionResponse
            ? 3
            : 1;
  const studentFreeDrawView = (
    <div className="student-activity-shell" data-testid="student-free-draw-shell">
      <MoleculeDrawingStep
        examples={exampleMolecules}
        selectedExampleId={selectedExampleId}
        drawingSlot={studentDrawingSlot}
        onSelectExample={handleSelectExample}
        onLoadExample={handleLoadExample}
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
      {resultSection}
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
      onModeChange={setAppMode}
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
        />
      ) : null}

      {userMode === 'student' ? (
        <LearningProgressRail currentStep={currentLearningStep} />
      ) : null}

      {isStudentActivityView ? (
        <StudentActivityShell
          templates={activityTemplates}
          selectedActivityId={selectedActivityId}
          responses={currentActivityResponses}
          validationResult={validationResult}
          vseprAnalysis={vseprAnalysis}
          molecule3DInput={molecule3DInput}
          examples={exampleMolecules}
          selectedExampleId={selectedExampleId}
          drawingSlot={studentDrawingSlot}
          predictionViewerSlot={vseprPredictionSection}
          actual3DViewerSlot={actual3DViewerSection}
          external3DSearchSlot={studentExternal3DSearchSection}
          comparisonSlot={comparisonSection}
          resultSlot={resultSection}
          onSelectActivity={handleSelectActivity}
          onResponseChange={handleActivityResponseChange}
          onSelectExample={handleSelectExample}
          onLoadExample={handleLoadExample}
          onConfirmStructure={handleExtractAndValidate}
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
          templates={activityTemplates}
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
          submissions={activitySubmissions}
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

      {isStudentActivityView ? null : resultSection}

      <DeveloperDetailsPanel
        logs={logs}
        visible={userMode === 'teacher'}
      />
      {legalPanel}
      {legalFooter}
    </main>
  );
}
