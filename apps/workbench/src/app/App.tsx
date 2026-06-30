import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppHeader } from '../components/header/AppHeader';
import {
  KetcherEditor,
  normalizeKetcherError,
} from '../components/editor/KetcherEditor';
import { Molecule3DViewer } from '../components/Molecule3DViewer';
import { StructureInfoPanel } from '../components/molecule-panel/StructureInfoPanel';
import {
  ValidationLogPanel,
  type WorkbenchLogEntry,
} from '../components/validation/ValidationLogPanel';
import { PubChemCandidatePanel } from '../components/pubchem/PubChemCandidatePanel';
import { StructureComparisonPanel } from '../components/comparison/StructureComparisonPanel';
import { ActivityResultPanel } from '../components/export/ActivityResultPanel';
import { ActivityPanel } from '../components/activity/ActivityPanel';
import { VseprPanel } from '../components/vsepr/VseprPanel';
import { Vsepr3DModelViewer } from '../components/Vsepr3DModelViewer';
import { TeacherPanel } from '../components/TeacherPanel';
import type {
  ChemicalEditorHandle,
  ExtractedStructureData,
} from '../editor/chemical-editor-handle';
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
  type ActivityResponseState,
  type AppMode,
  type UserMode,
} from '../types/activity';
import type { StructureComparisonObservation } from '../types/structureComparison';
import type { ActivityResultSnapshot } from '../types/activityResult';
import type { VseprAnalysis, VseprModelViewStatus } from '../types/vsepr';

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
  studentMessage:
    'RDKit.js 검증을 통과한 MOL block이 있을 때 VSEPR 예측을 실행할 수 있습니다.',
};
const INITIAL_STRUCTURE_COMPARISON_OBSERVATION = {
  observedSimilarities: '',
  observedDifferences: '',
  studentReflection: '',
};

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

export function App() {
  const editorRef = useRef<ChemicalEditorHandle | null>(null);
  const hasLoggedEditorReadyRef = useRef(false);
  const validationKeyRef = useRef<string | null>(null);
  const pubChem3DRequestIdRef = useRef(0);
  const pubChemCandidateRequestIdRef = useRef(0);
  const [appMode, setAppMode] = useState<AppMode>('free_draw');
  const [userMode, setUserMode] = useState<UserMode>('student');
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
  const [previewActivityResultId, setPreviewActivityResultId] =
    useState<string | null>(null);
  const [activityResultStatusMessage, setActivityResultStatusMessage] =
    useState<string>('');
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

  const resetPubChem3DState = () => {
    pubChem3DRequestIdRef.current += 1;
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

  const resetStructureComparison = () => {
    setIsStructureComparisonOpen(false);
    setStructureComparisonObservationText(INITIAL_STRUCTURE_COMPARISON_OBSERVATION);
  };

  const handle3DDeveloperLog = useCallback((message: string) => {
    console.info('[3Dmol viewer]', message);
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
      throw new Error('Ketcher 편집기가 아직 준비되지 않았습니다.');
    }

    const labeledStructure = example
      ? { ...structure, label: example.nameKo }
      : structure;

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
      const expectedFormulaWarning = example
        ? buildExpectedFormulaWarning(example, result.molecularFormula)
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

      setValidatedExampleId(example && !expectedFormulaWarning ? example.id : null);
      setMolecule3DInput(
        example && !expectedFormulaWarning ? buildExample3DInput(example) : null,
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
      return 'PubChem 3D를 불러올 예제 분자를 선택해 주세요.';
    }

    if (!example.pubchemCid) {
      return '이 예제는 PubChem 3D 연결이 아직 준비되지 않았습니다.';
    }

    if (validatedExampleId !== example.id || validationResult?.ok !== true) {
      return 'PubChem 3D를 불러오려면 먼저 이 예제를 불러와 RDKit.js 검증을 완료해 주세요.';
    }

    if (pubChem3DState.status === 'loading') {
      return 'PubChem 3D 구조 데이터를 불러오는 중입니다.';
    }

    if (pubChem3DState.studentMessage) {
      return pubChem3DState.studentMessage;
    }

    return `PubChem CID ${example.pubchemCid}로 3D SDF를 불러올 수 있습니다.`;
  };

  const handleSelectExample = (exampleId: string) => {
    setSelectedExampleId(exampleId);
    resetPubChem3DState();
    resetPubChemCandidateState();
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
      studentMessage: `${input.label}의 PubChem 3D 구조 데이터를 불러오는 중입니다.`,
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
        studentMessage: '이 예제는 PubChem 3D 연결이 아직 준비되지 않았습니다.',
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
        'PubChem 3D를 불러오려면 먼저 이 예제를 불러와 RDKit.js 검증을 완료해 주세요.';

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
        'PubChem 후보 검색은 RDKit.js 검증을 통과한 canonical SMILES가 있을 때만 실행할 수 있습니다.';

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
      studentMessage: 'PubChem 외부 데이터 후보를 검색하는 중입니다.',
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
          '선택한 PubChem 후보를 현재 구조의 3D 시각화 자료로 사용할 수 없습니다.',
      });
      appendLog(
        createLog(
          'warning',
          compatibility.studentMessage ??
            '선택한 PubChem 후보를 현재 구조의 3D 시각화 자료로 사용할 수 없습니다.',
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
      label: candidate.title ?? `PubChem CID ${candidate.cid}`,
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
        throw new Error('Ketcher 편집기가 아직 준비되지 않았습니다.');
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

  return (
    <main className="app-shell" data-testid="app-shell">
      <AppHeader
        appMode={appMode}
        userMode={userMode}
        onModeChange={setAppMode}
        onUserModeChange={setUserMode}
        examples={exampleMolecules}
        selectedExampleId={selectedExampleId}
        onSelectExample={handleSelectExample}
        onLoadExample={handleLoadExample}
        onExtractAndValidate={handleExtractAndValidate}
      />

      <section className="workbench-layout" aria-label="분자 모델링 작업 영역">
        <KetcherEditor
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
        <StructureInfoPanel
          extractedStructure={extractedStructure}
          validationResult={validationResult}
        />
      </section>

      <section
        className="workspace-panel vsepr-module-gate"
        data-testid="vsepr-module-gate"
      >
        <div className="panel-heading vsepr-heading">
          <div>
            <p className="section-label">선택 교육 모듈</p>
            <h2>VSEPR 예측 모듈</h2>
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
                ? 'VSEPR 예측 모듈 닫기'
                : 'VSEPR 예측 모듈 열기'}
          </button>
        </div>
        <p>
          자유 그리기에서는 Ketcher 입력, RDKit.js 검증, 실제/외부 3D 구조를
          기본 흐름으로 사용합니다. VSEPR은 활동 템플릿이 요구하거나 사용자가
          명시적으로 연 선택 모듈에서만 교육용 예측으로 표시합니다.
        </p>
      </section>

      {isVseprModuleVisible ? (
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
            onShowModel={handleShowVseprModel}
          />

          <Vsepr3DModelViewer
            analysis={vseprAnalysis}
            modelStatus={vseprModelStatus}
            onDeveloperLog={handle3DDeveloperLog}
          />
        </>
      ) : null}

      <ActivityPanel
        appMode={appMode}
        userMode={userMode}
        templates={activityTemplates}
        selectedActivityId={selectedActivityId}
        responses={currentActivityResponses}
        validationResult={validationResult}
        onSelectActivity={setSelectedActivityId}
        onResponseChange={handleActivityResponseChange}
      />

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
        onSelectActivity={setSelectedActivityId}
      />

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

      <Molecule3DViewer
        coordinateData={molecule3DInput}
        hasValidatedStructure={validationResult?.ok === true}
        userMode={userMode}
        validatedStructureKey={
          validationResult?.ok === true ? validationResult.canonicalSmiles : undefined
        }
        actionSlot={
          <div className={`pubchem-3d-control ${pubChem3DState.status}`}>
            <div>
              <p className="section-label">PubChem 3D</p>
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
                  ? 'PubChem 3D 로딩 중'
                  : 'PubChem 3D 불러오기'}
              </button>
            ) : null}
          </div>
        }
        onDeveloperLog={handle3DDeveloperLog}
        onMeasurementResultsChange={setMeasurementResults}
      />

      <ActivityResultPanel
        userMode={userMode}
        currentSnapshot={currentActivityResultSnapshot}
        previewSnapshot={previewActivityResult}
        savedResults={savedActivityResults}
        statusMessage={activityResultStatusMessage}
        onSave={handleSaveActivityResult}
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

      <ValidationLogPanel
        logs={logs}
        visible={userMode === 'teacher'}
        collapsible
        defaultExpanded={false}
      />
    </main>
  );
}
