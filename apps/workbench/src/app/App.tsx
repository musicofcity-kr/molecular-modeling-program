import { useCallback, useRef, useState } from 'react';
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
import type {
  ChemicalEditorHandle,
  ExtractedStructureData,
} from '../editor/chemical-editor-handle';
import {
  buildExpectedFormulaWarning,
  exampleMolecules,
} from '../data/exampleMolecules';
import type { ExampleMolecule } from '../data/exampleMolecules';
import { validateMoleculeInput } from '../services/rdkitService';
import {
  fetchPubChem3DSdf,
  type PubChem3DLoadStatus,
} from '../services/pubchem3d';
import type { Molecule3DInput, MoleculeValidationResult } from '../types/molecule';

type PubChem3DState = {
  status: PubChem3DLoadStatus;
  studentMessage?: string;
};

const INITIAL_PUBCHEM_3D_STATE: PubChem3DState = { status: 'idle' };

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
    coordinateSource: '예제 내장 3D 구조',
    sourceNote: example.structure3D.sourceNote,
    sourceUrl: example.structure3D.sourceUrl,
  };
}

export function App() {
  const editorRef = useRef<ChemicalEditorHandle | null>(null);
  const hasLoggedEditorReadyRef = useRef(false);
  const [selectedExampleId, setSelectedExampleId] = useState(
    exampleMolecules[0]?.id ?? '',
  );
  const [extractedStructure, setExtractedStructure] =
    useState<ExtractedStructureData | null>(null);
  const [validationResult, setValidationResult] =
    useState<MoleculeValidationResult | null>(null);
  const [validatedExampleId, setValidatedExampleId] = useState<string | null>(null);
  const [molecule3DInput, setMolecule3DInput] = useState<Molecule3DInput | null>(
    null,
  );
  const [pubChem3DState, setPubChem3DState] = useState<PubChem3DState>(
    INITIAL_PUBCHEM_3D_STATE,
  );
  const [logs, setLogs] = useState<WorkbenchLogEntry[]>([
    createLog(
      'info',
      'Ketcher에서 구조를 추출한 뒤 RDKit.js 검증을 실행합니다.',
    ),
  ]);

  const appendLog = (entry: WorkbenchLogEntry) => {
    setLogs((currentLogs) => [entry, ...currentLogs].slice(0, 6));
  };

  const resetPubChem3DState = () => {
    setPubChem3DState(INITIAL_PUBCHEM_3D_STATE);
  };

  const handle3DDeveloperLog = useCallback((message: string) => {
    console.info('[3Dmol viewer]', message);
  }, []);

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
    setExtractedStructure(labeledStructure);
    setValidationResult(null);
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

      setValidatedExampleId(example && !expectedFormulaWarning ? example.id : null);
      setMolecule3DInput(
        example && !expectedFormulaWarning ? buildExample3DInput(example) : null,
      );
    } else {
      console.info('[RDKit validation]', result.developerLogs);
      appendLog(createLog('error', result.studentMessage));
      setValidatedExampleId(null);
      setMolecule3DInput(null);
    }
  };

  const handleExtractAndValidate = async () => {
    try {
      await extractAndValidateCurrentStructure();
    } catch (error) {
      setMolecule3DInput(null);
      setValidatedExampleId(null);
      resetPubChem3DState();
      setExtractedStructure(null);
      setValidationResult(null);
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

    setPubChem3DState({
      status: 'loading',
      studentMessage: `${example.nameKo}의 PubChem 3D 구조 데이터를 불러오는 중입니다.`,
    });
    appendLog(
      createLog(
        'info',
        `${example.nameKo} 예제의 PubChem CID ${example.pubchemCid}로 3D SDF를 요청합니다.`,
      ),
    );

    const result = await fetchPubChem3DSdf({
      cid: example.pubchemCid,
      label: example.nameKo,
      pubchemName: example.pubchemName,
    });

    console.info('[PubChem 3D]', result.developerLogs);

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
      setExtractedStructure(null);
      setValidationResult(null);
      appendLog(
        createLog(
          'error',
          normalizeKetcherError(error, '예제 분자를 불러오는 중 오류가 발생했습니다.'),
        ),
      );
    }
  };

  const selectedExample = findSelectedExample();
  const canLoadPubChem3D =
    Boolean(selectedExample?.pubchemCid) &&
    validatedExampleId === selectedExample?.id &&
    validationResult?.ok === true &&
    pubChem3DState.status !== 'loading';

  return (
    <main className="app-shell" data-testid="app-shell">
      <AppHeader
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

      <Molecule3DViewer
        coordinateData={molecule3DInput}
        hasValidatedStructure={validationResult?.ok === true}
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
      />

      <ValidationLogPanel logs={logs} />
    </main>
  );
}
