import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Editor } from 'ketcher-react';
import type { Ketcher } from 'ketcher-core';
import { StandaloneStructServiceProvider } from 'ketcher-standalone';
import type { ChemicalEditorHandle } from '../../editor/chemical-editor-handle';
import {
  extractStructureFromKetcher,
  normalizeKetcherError,
} from '../../editor/ketcher-structure-extraction';
import 'ketcher-react/dist/index.css';

export { normalizeKetcherError };

type KetcherEditorProps = {
  onReadyChange?: (ready: boolean) => void;
  onError?: (message: string) => void;
};

export const KetcherEditor = forwardRef<ChemicalEditorHandle, KetcherEditorProps>(
  function KetcherEditor({ onReadyChange, onError }, ref) {
    const ketcherRef = useRef<Ketcher | null>(null);
    const [isReady, setIsReady] = useState(false);
    const structServiceProvider = useMemo(() => new StandaloneStructServiceProvider(), []);

    useImperativeHandle(
      ref,
      () => ({
        async getSmiles() {
          if (!ketcherRef.current) {
            throw new Error('Ketcher 편집기가 아직 준비되지 않았습니다.');
          }

          return ketcherRef.current.getSmiles();
        },
        async getMolfile() {
          if (!ketcherRef.current) {
            throw new Error('Ketcher 편집기가 아직 준비되지 않았습니다.');
          }

          return ketcherRef.current.getMolfile('v2000');
        },
        async extractStructure() {
          if (!ketcherRef.current) {
            throw new Error('Ketcher 편집기가 아직 준비되지 않았습니다.');
          }

          return extractStructureFromKetcher(ketcherRef.current);
        },
        async setMolecule(input) {
          if (!ketcherRef.current) {
            throw new Error('Ketcher 편집기가 아직 준비되지 않았습니다.');
          }

          const structure = input.molBlock ?? input.smiles;

          if (!structure?.trim()) {
            throw new Error('불러올 구조 데이터가 없습니다.');
          }

          await ketcherRef.current.setMolecule(structure);
        },
        async clear() {
          if (!ketcherRef.current) {
            throw new Error('Ketcher 편집기가 아직 준비되지 않았습니다.');
          }

          await ketcherRef.current.setMolecule('');
        },
      }),
      [],
    );

    return (
      <section className="workspace-panel editor-panel" data-testid="chemical-editor">
        <div className="panel-heading editor-heading">
          <div>
            <p className="section-label">좌측</p>
            <h2>분자 편집 영역</h2>
          </div>
          <span className={isReady ? 'status-pill ready' : 'status-pill'}>
            {isReady ? 'Ketcher 준비됨' : 'Ketcher 로딩 중'}
          </span>
        </div>

        <div className="ketcher-host" aria-label="Ketcher 2D 구조 편집기">
          <Editor
            staticResourcesUrl="/"
            structServiceProvider={structServiceProvider}
            errorHandler={(message) => {
              onError?.(message);
            }}
            onInit={(ketcher) => {
              ketcherRef.current = ketcher;
              setIsReady(true);
              onReadyChange?.(true);
            }}
            disableMacromoleculesEditor
          />
        </div>
      </section>
    );
  },
);
