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
import type { Molecule3DInput, MoleculeValidationResult } from '../types/molecule';

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
  const [molecule3DInput, setMolecule3DInput] = useState<Molecule3DInput | null>(
    null,
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

      setMolecule3DInput(
        example && !expectedFormulaWarning ? buildExample3DInput(example) : null,
      );
    } else {
      console.info('[RDKit validation]', result.developerLogs);
      appendLog(createLog('error', result.studentMessage));
      setMolecule3DInput(null);
    }
  };

  const handleExtractAndValidate = async () => {
    try {
      await extractAndValidateCurrentStructure();
    } catch (error) {
      setMolecule3DInput(null);
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

  return (
    <main className="app-shell" data-testid="app-shell">
      <AppHeader
        examples={exampleMolecules}
        selectedExampleId={selectedExampleId}
        onSelectExample={setSelectedExampleId}
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
        onDeveloperLog={handle3DDeveloperLog}
      />

      <ValidationLogPanel logs={logs} />
    </main>
  );
}
