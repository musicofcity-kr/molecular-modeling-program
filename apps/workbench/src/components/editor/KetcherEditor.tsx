import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Editor } from 'ketcher-react';
import type { Ketcher } from 'ketcher-core';
import { StandaloneStructServiceProvider } from 'ketcher-standalone';
import type {
  ChemicalEditorHandle,
  ExtractedStructureData,
} from '../../editor/chemical-editor-handle';
import 'ketcher-react/dist/index.css';

type KetcherEditorProps = {
  onReadyChange?: (ready: boolean) => void;
  onError?: (message: string) => void;
};

export function normalizeKetcherError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }

  return fallback;
}

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
            throw new Error('Ketcher editor is not ready.');
          }

          return ketcherRef.current.getSmiles();
        },
        async getMolfile() {
          if (!ketcherRef.current) {
            throw new Error('Ketcher editor is not ready.');
          }

          return ketcherRef.current.getMolfile();
        },
        async extractStructure(): Promise<ExtractedStructureData> {
          if (!ketcherRef.current) {
            throw new Error('Ketcher editor is not ready.');
          }

          const [smiles, molfile] = await Promise.all([
            ketcherRef.current.getSmiles(),
            ketcherRef.current.getMolfile(),
          ]);

          if (!smiles.trim() && !molfile.trim()) {
            throw new Error('구조를 먼저 그려주세요.');
          }

          return {
            source: 'ketcher',
            smiles,
            molfile,
            extractedAt: new Date().toISOString(),
            validationStatus: 'rdkit-not-run',
          };
        },
        async setMolecule(input) {
          if (!ketcherRef.current) {
            throw new Error('Ketcher editor is not ready.');
          }

          const structure = input.molfile ?? input.smiles;

          if (!structure?.trim()) {
            throw new Error('불러올 구조 데이터가 없습니다.');
          }

          await ketcherRef.current.setMolecule(structure);
        },
        async clear() {
          if (!ketcherRef.current) {
            throw new Error('Ketcher editor is not ready.');
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
