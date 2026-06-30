import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { GLViewer } from '3dmol';
import type { Molecule3DInput } from '../types/molecule';

export type Molecule3DViewerHandle = {
  loadStructure(input: Molecule3DInput): void;
  clear(): void;
  resize(): void;
};

type Molecule3DViewerProps = {
  coordinateData?: Molecule3DInput | null;
  hasValidatedStructure: boolean;
  validatedStructureKey?: string;
  actionSlot?: ReactNode;
  onDeveloperLog?: (message: string) => void;
};

const NO_COORDINATES_MESSAGE = '3D 좌표 데이터가 아직 없습니다';
const SMILES_ONLY_DEVELOPER_LOG = 'SMILES만으로는 아직 3D 구조를 생성하지 않음';

function get3DmolModelFormat(format: Molecule3DInput['format']): string {
  if (format === 'mol') {
    return 'sdf';
  }

  return format;
}

function getInitialMessage(coordinateData?: Molecule3DInput | null): string {
  if (!coordinateData) {
    return NO_COORDINATES_MESSAGE;
  }

  return `${coordinateData.label}의 교육용 3D 좌표 데이터를 표시합니다.`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '알 수 없는 3Dmol.js 오류';
}

function formatSourceType(sourceType?: Molecule3DInput['sourceType']): string {
  switch (sourceType) {
    case 'static-example':
      return '정적 예제';
    case 'pubchem':
      return 'PubChem';
    case 'user-import':
      return '사용자 가져오기';
    case 'review-needed':
      return '검토 필요';
    default:
      return '없음';
  }
}

export const Molecule3DViewer = forwardRef<
  Molecule3DViewerHandle,
  Molecule3DViewerProps
>(function Molecule3DViewer(
  {
    coordinateData = null,
    hasValidatedStructure,
    validatedStructureKey,
    actionSlot,
    onDeveloperLog,
  },
  ref,
) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<GLViewer | null>(null);
  const lastNoCoordinateLogKeyRef = useRef<string | null>(null);
  const [viewerStatus, setViewerStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [studentMessage, setStudentMessage] = useState(
    getInitialMessage(coordinateData),
  );

  function clearViewer() {
    const viewer = viewerRef.current;

    if (!viewer) {
      return;
    }

    viewer.clear();
    viewer.render();
  }

  function resizeViewer() {
    viewerRef.current?.resize();
  }

  function loadStructure(input: Molecule3DInput) {
    const viewer = viewerRef.current;

    if (!viewer) {
      return;
    }

    if (!input.data.trim()) {
      throw new Error('3D 좌표 데이터가 비어 있습니다.');
    }

    viewer.clear();
    viewer.addModel(input.data, get3DmolModelFormat(input.format));
    viewer.setStyle(
      {},
      {
        stick: { radius: 0.16 },
        sphere: { scale: 0.28 },
      },
    );
    viewer.zoomTo();
    viewer.render();
    setStudentMessage(`${input.label}의 교육용 3D 좌표 데이터를 표시합니다.`);
  }

  useImperativeHandle(
    ref,
    () => ({
      loadStructure,
      clear: clearViewer,
      resize: resizeViewer,
    }),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    const handleResize = () => {
      viewerRef.current?.resize();
    };

    async function initializeViewer() {
      if (!hostRef.current) {
        return;
      }

      try {
        const threeDmol = await import('3dmol');

        if (cancelled || !hostRef.current) {
          return;
        }

        viewerRef.current = threeDmol.createViewer(hostRef.current, {
          backgroundColor: 'white',
        });
        viewerRef.current.render();
        setViewerStatus('ready');

        if (typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(handleResize);
          resizeObserver.observe(hostRef.current);
        }

        window.addEventListener('resize', handleResize);
      } catch (error) {
        setViewerStatus('error');
        setStudentMessage('3D Viewer를 초기화하지 못했습니다.');
        onDeveloperLog?.(`3Dmol.js viewer initialization failed: ${getErrorMessage(error)}`);
      }
    }

    void initializeViewer();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      window.removeEventListener('resize', handleResize);
      clearViewer();
      viewerRef.current = null;
    };
  }, [onDeveloperLog]);

  useEffect(() => {
    if (viewerStatus !== 'ready') {
      return;
    }

    if (!coordinateData) {
      clearViewer();
      setStudentMessage(NO_COORDINATES_MESSAGE);
      return;
    }

    try {
      loadStructure(coordinateData);
    } catch (error) {
      clearViewer();
      setStudentMessage('3D 좌표 데이터를 표시하지 못했습니다.');
      onDeveloperLog?.(`3Dmol.js structure load failed: ${getErrorMessage(error)}`);
    }
  }, [coordinateData, onDeveloperLog, viewerStatus]);

  useEffect(() => {
    if (!hasValidatedStructure || coordinateData || !validatedStructureKey) {
      return;
    }

    if (lastNoCoordinateLogKeyRef.current === validatedStructureKey) {
      return;
    }

    lastNoCoordinateLogKeyRef.current = validatedStructureKey;
    onDeveloperLog?.(SMILES_ONLY_DEVELOPER_LOG);
  }, [coordinateData, hasValidatedStructure, onDeveloperLog, validatedStructureKey]);

  const displayedStudentMessage =
    coordinateData || viewerStatus === 'error' ? studentMessage : NO_COORDINATES_MESSAGE;

  return (
    <section className="workspace-panel viewer-panel" data-testid="molecule-3d-viewer">
      <div className="panel-heading viewer-heading">
        <div>
          <p className="section-label">3D</p>
          <h2>3D Viewer</h2>
        </div>
        <span className={viewerStatus === 'ready' ? 'status-pill ready' : 'status-pill'}>
          {viewerStatus === 'ready'
            ? '3Dmol.js 준비됨'
            : viewerStatus === 'error'
              ? '3Dmol.js 오류'
              : '3Dmol.js 로딩 중'}
        </span>
      </div>

      {actionSlot ? <div className="viewer-action-slot">{actionSlot}</div> : null}

      <div className="viewer-content">
        <div
          ref={hostRef}
          className="viewer-3d-host"
          data-testid="viewer-3d"
          aria-label="3Dmol.js 3D 분자 뷰어"
        />
        <div className="viewer-empty-state" data-testid="viewer-3d-message">
          <p>{displayedStudentMessage}</p>
          <dl>
            <div>
              <dt>좌표 출처</dt>
              <dd>{coordinateData?.coordinateSource ?? '없음'}</dd>
            </div>
            <div>
              <dt>출처 유형</dt>
              <dd>{formatSourceType(coordinateData?.sourceType)}</dd>
            </div>
            <div>
              <dt>입력 형식</dt>
              <dd>{coordinateData?.format.toUpperCase() ?? '대기 중'}</dd>
            </div>
            {coordinateData?.sourceUrl ? (
              <div>
                <dt>출처 URL</dt>
                <dd className="code-output">{coordinateData.sourceUrl}</dd>
              </div>
            ) : null}
            <div>
              <dt>계산 기준</dt>
              <dd>분자식과 분자량은 RDKit.js 검증 결과입니다.</dd>
            </div>
            <div>
              <dt>3D 역할</dt>
              <dd>3Dmol.js는 전달받은 좌표 데이터만 시각화합니다.</dd>
            </div>
            <div>
              <dt>좌표 안내</dt>
              <dd>{coordinateData?.sourceNote ?? '표시할 3D 좌표 데이터가 없습니다.'}</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
});
