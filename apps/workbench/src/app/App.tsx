import { useRef, useState } from 'react';
import { AppHeader } from '../components/header/AppHeader';
import {
  KetcherEditor,
  normalizeKetcherError,
} from '../components/editor/KetcherEditor';
import { StructureInfoPanel } from '../components/molecule-panel/StructureInfoPanel';
import {
  ValidationLogPanel,
  type WorkbenchLogEntry,
} from '../components/validation/ValidationLogPanel';
import type {
  ChemicalEditorHandle,
  ExtractedStructureData,
} from '../editor/chemical-editor-handle';

function createLog(level: WorkbenchLogEntry['level'], message: string): WorkbenchLogEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    level,
    message,
  };
}

export function App() {
  const editorRef = useRef<ChemicalEditorHandle | null>(null);
  const [extractedStructure, setExtractedStructure] =
    useState<ExtractedStructureData | null>(null);
  const [logs, setLogs] = useState<WorkbenchLogEntry[]>([
    createLog(
      'info',
      'Ketcher에서 구조를 그린 뒤 SMILES/MOL 데이터를 가져옵니다.',
    ),
  ]);

  const appendLog = (entry: WorkbenchLogEntry) => {
    setLogs((currentLogs) => [entry, ...currentLogs].slice(0, 6));
  };

  const handleExtractStructure = async () => {
    try {
      const structure = await editorRef.current?.extractStructure();

      if (!structure) {
        throw new Error('Ketcher editor is not ready.');
      }

      setExtractedStructure(structure);
      appendLog(
        createLog(
          'info',
          'Ketcher에서 SMILES/MOL 데이터를 가져왔습니다. RDKit.js 검증은 아직 실행하지 않습니다.',
        ),
      );
    } catch (error) {
      appendLog(
        createLog(
          'error',
          normalizeKetcherError(error, '구조 데이터 추출 중 오류가 발생했습니다.'),
        ),
      );
    }
  };

  return (
    <main className="app-shell" data-testid="app-shell">
      <AppHeader onExtractStructure={handleExtractStructure} />

      <section className="workbench-layout" aria-label="분자 모델링 작업 영역">
        <KetcherEditor
          ref={editorRef}
          onReadyChange={(ready) => {
            if (ready) {
              appendLog(createLog('info', 'Ketcher editor가 준비되었습니다.'));
            }
          }}
          onError={(message) => {
            appendLog(createLog('error', `Ketcher 오류: ${message}`));
          }}
        />
        <StructureInfoPanel
          extractedStructure={extractedStructure}
        />
      </section>

      <ValidationLogPanel logs={logs} />
    </main>
  );
}
