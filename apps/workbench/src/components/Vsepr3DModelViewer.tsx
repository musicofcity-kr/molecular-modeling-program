import { useEffect, useRef, useState } from 'react';
import type {
  VseprAnalysis,
  VseprGeometryTemplate,
  VseprModelViewStatus,
  VseprVector,
} from '../types/vsepr';
import { getVseprGeometryTemplate } from '../services/vseprGeometryTemplates';

type Vsepr3DModelViewerProps = {
  analysis: VseprAnalysis;
  modelStatus: VseprModelViewStatus;
  onDeveloperLog?: (message: string) => void;
};

type Point3D = {
  x: number;
  y: number;
  z: number;
};

type VseprViewMode = 'electron-domains' | 'atoms-only';
type ViewerStatus = 'loading' | 'ready' | 'error';
type ViewerHostSize = Pick<HTMLElement, 'clientWidth' | 'clientHeight'>;

type Vsepr3DStudentMessageInput = {
  analysis: VseprAnalysis;
  modelStatus: VseprModelViewStatus;
  hasTemplate: boolean;
  viewerStatus: ViewerStatus;
  modelRendered: boolean;
};

const SCALE = 1.7;
const CENTER_COLOR = '#1d2730';
const BOND_ATOM_COLOR = '#2f6f7b';
const BOND_COLOR = '#6c8c94';
const LONE_PAIR_COLOR = '#7a5aa6';

export function hasRenderableVseprViewerSize(
  host: ViewerHostSize | null,
): boolean {
  return Boolean(host && host.clientWidth > 0 && host.clientHeight > 0);
}

function getStatusLabel(status: VseprModelViewStatus): string {
  switch (status) {
    case 'not_requested':
      return '대기';
    case 'ready':
      return '표시 준비됨';
    case 'rendered':
      return '모형 표시 중';
    case 'unsupported':
      return '지원하지 않음';
    case 'error':
      return '표시 오류';
  }
}

export function getVsepr3DStudentMessage({
  analysis,
  modelStatus,
  hasTemplate,
  viewerStatus,
  modelRendered,
}: Vsepr3DStudentMessageInput): string {
  const centralAtomLabel = getCentralAtomLabel(analysis);

  if (analysis.status === 'needs_central_atom') {
    return '예상 입체 모형을 보려면 먼저 중심 원자를 선택해 주세요.';
  }

  if (analysis.status === 'supported' && !hasTemplate) {
    return '이 전자쌍 모형 표기에 대한 입체 모형 자료가 아직 없습니다.';
  }

  if (analysis.status !== 'supported') {
    return '입체 구조 예상이 지원되는 구조에서만 교육용 3D 예측 모형을 표시합니다.';
  }

  if (viewerStatus === 'error') {
    return '3D 예측 모형을 표시하지 못했습니다. 2D 구조 분석 결과는 계속 확인할 수 있습니다. 잠시 후 다시 시도하거나 새로고침해 주세요.';
  }

  if (modelStatus === 'rendered' && hasTemplate && !modelRendered) {
    return '3D 구조 보기를 준비하는 중입니다.';
  }

  if (modelStatus === 'rendered' && hasTemplate && modelRendered) {
    return `${centralAtomLabel ? `${centralAtomLabel} 주변 ` : ''}${analysis.axeNotation} 전자쌍 반발 교육용 예측 모형을 표시합니다.`;
  }

  return `${centralAtomLabel ? `${centralAtomLabel} 주변 ` : ''}예상 입체 모형 보기 버튼을 누르면 교육용 3D 예측 모형을 표시합니다.`;
}

function getCentralAtomLabel(analysis: VseprAnalysis): string | undefined {
  if (analysis.centralAtomLabel) {
    return analysis.centralAtomLabel;
  }

  if (analysis.centralAtomSymbol && analysis.centralAtomId) {
    return `${analysis.centralAtomSymbol}${analysis.centralAtomId}`;
  }

  return analysis.centralAtomSymbol;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '알 수 없는 입체 모형 표시 오류';
}

export function Vsepr3DModelViewer({
  analysis,
  modelStatus,
  onDeveloperLog,
}: Vsepr3DModelViewerProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<any>(null);
  const initialViewRef = useRef<any[] | null>(null);
  const [viewerStatus, setViewerStatus] = useState<ViewerStatus>('loading');
  const [modelRendered, setModelRendered] = useState(false);
  const [hasRenderableSize, setHasRenderableSize] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [showLonePairs, setShowLonePairs] = useState(true);
  const [viewMode, setViewMode] =
    useState<VseprViewMode>('electron-domains');
  const template = getVseprGeometryTemplate(analysis.axeNotation);
  const centralAtomLabel = getCentralAtomLabel(analysis);
  const vseprIdealAngles =
    analysis.angleEvidence?.vseprIdealAngles ??
    analysis.idealBondAngles ??
    template?.idealBondAngles;
  const shouldRenderTemplate = modelStatus === 'rendered' && Boolean(template);
  const statusPillText =
    viewerStatus === 'error'
      ? '표시 오류'
      : modelStatus === 'rendered' && !modelRendered
        ? '3D 구조 보기 준비 중'
        : viewerStatus === 'loading' &&
            modelStatus !== 'unsupported' &&
            modelStatus !== 'error'
          ? '3D 구조 보기 준비 중'
          : getStatusLabel(modelStatus);

  function clearViewer() {
    const viewer = viewerRef.current;

    if (!viewer) {
      return;
    }

    viewer.clear();
    viewer.render();
  }

  function renderTemplate(viewer: any, nextTemplate: VseprGeometryTemplate) {
    viewer.clear();
    viewer.addSphere({
      center: { x: 0, y: 0, z: 0 },
      radius: 0.32,
      color: CENTER_COLOR,
    });

    if (showLabels) {
      viewer.addLabel(centralAtomLabel ?? 'A', {
        position: { x: 0, y: 0.42, z: 0 },
        fontSize: 13,
        fontColor: CENTER_COLOR,
        backgroundOpacity: 0,
      });
    }

    nextTemplate.vectors.forEach((vector, index) => {
      if (vector.kind === 'bond') {
        renderBondVector(viewer, vector, index);
        return;
      }

      if (viewMode === 'electron-domains' && showLonePairs) {
        renderLonePairVector(viewer, vector, index);
      }
    });

    viewer.zoomTo();
    initialViewRef.current = viewer.getView();
    viewer.render();
  }

  function renderBondVector(viewer: any, vector: VseprVector, index: number) {
    const end = scaleVector(vector, SCALE);

    viewer.addCylinder({
      start: { x: 0, y: 0, z: 0 },
      end,
      radius: 0.07,
      color: BOND_COLOR,
      fromCap: true,
      toCap: true,
    });
    viewer.addSphere({
      center: end,
      radius: 0.22,
      color: BOND_ATOM_COLOR,
    });

    if (showLabels) {
      viewer.addLabel(vector.label ?? `X${index + 1}`, {
        position: offsetPoint(end, 0.18),
        fontSize: 11,
        fontColor: BOND_ATOM_COLOR,
        backgroundOpacity: 0,
      });
    }
  }

  function renderLonePairVector(viewer: any, vector: VseprVector, index: number) {
    const lobeCenter = scaleVector(vector, SCALE * 0.7);

    viewer.addSphere({
      center: lobeCenter,
      radius: 0.18,
      color: LONE_PAIR_COLOR,
      alpha: 0.48,
    });
    viewer.addSphere({
      center: scaleVector(vector, SCALE * 0.9),
      radius: 0.11,
      color: LONE_PAIR_COLOR,
      alpha: 0.3,
    });

    if (showLabels) {
      viewer.addLabel(vector.label ?? `E${index + 1}`, {
        position: offsetPoint(lobeCenter, 0.16),
        fontSize: 11,
        fontColor: LONE_PAIR_COLOR,
        backgroundOpacity: 0,
      });
    }
  }

  function resetView() {
    const viewer = viewerRef.current;

    if (!viewer) {
      return;
    }

    if (initialViewRef.current) {
      viewer.setView(initialViewRef.current);
    } else {
      viewer.zoomTo();
    }
    viewer.render();
  }

  function zoomToFit() {
    viewerRef.current?.zoomTo();
    viewerRef.current?.render();
  }

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    const handleResize = () => {
      viewerRef.current?.resize();
      const nextHasRenderableSize = hasRenderableVseprViewerSize(hostRef.current);

      setHasRenderableSize(nextHasRenderableSize);

      if (!nextHasRenderableSize) {
        setModelRendered(false);
      }
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
        handleResize();

        if (typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(handleResize);
          resizeObserver.observe(hostRef.current);
        }

        window.addEventListener('resize', handleResize);
      } catch (error) {
        setModelRendered(false);
        setViewerStatus('error');
        onDeveloperLog?.(
          `VSEPR 3D model viewer initialization failed: ${getErrorMessage(error)}`,
        );
      }
    }

    void initializeViewer();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      window.removeEventListener('resize', handleResize);
      clearViewer();
      initialViewRef.current = null;
      viewerRef.current = null;
    };
  }, [onDeveloperLog]);

  useEffect(() => {
    if (viewerStatus !== 'ready') {
      return;
    }

    if (!hasRenderableSize) {
      setModelRendered(false);
      return;
    }

    if (!shouldRenderTemplate || !template) {
      setModelRendered(false);
      clearViewer();
      return;
    }

    try {
      setModelRendered(false);
      renderTemplate(viewerRef.current, template);
      setModelRendered(true);
    } catch (error) {
      setModelRendered(false);
      setViewerStatus('error');
      clearViewer();
      onDeveloperLog?.(
        `VSEPR 3D model render failed: ${getErrorMessage(error)}`,
      );
    }
  }, [
    centralAtomLabel,
    hasRenderableSize,
    onDeveloperLog,
    shouldRenderTemplate,
    showLabels,
    showLonePairs,
    template,
    viewerStatus,
    viewMode,
  ]);

  return (
    <section
      className="workspace-panel vsepr-model-panel"
      data-testid="vsepr-3d-model-viewer"
      data-viewer-status={viewerStatus}
      data-model-rendered={modelRendered ? 'true' : 'false'}
    >
      <div className="panel-heading viewer-heading">
        <div>
          <p className="section-label">입체 구조 예상 보기</p>
          <h2>
            {centralAtomLabel
              ? `${centralAtomLabel} 주변 VSEPR 예상 입체 모형`
              : '선택 중심 주변 VSEPR 예상 입체 모형'}
          </h2>
        </div>
        <span className={viewerStatus === 'ready' ? 'status-pill ready' : 'status-pill'}>
          {statusPillText}
        </span>
      </div>

      <div className="vsepr-model-toolbar">
        <p>
          이 화면은 선택한 중심 원자 주변 전자쌍 반발을 나타낸 교육용 예측
          모형입니다. 분자 전체의 정밀한 3D 구조와는 차이가 있을 수 있습니다.
        </p>
        <div className="vsepr-view-mode-buttons" aria-label="VSEPR 모형 보기 방식">
          <button
            className={viewMode === 'electron-domains' ? 'secondary-action active' : 'secondary-action'}
            data-testid="vsepr-electron-domain-view-button"
            type="button"
            aria-pressed={viewMode === 'electron-domains'}
            onClick={() => {
              setViewMode('electron-domains');
            }}
          >
            전자쌍 배열 보기
          </button>
          <button
            className={viewMode === 'atoms-only' ? 'secondary-action active' : 'secondary-action'}
            data-testid="vsepr-atoms-only-view-button"
            type="button"
            aria-pressed={viewMode === 'atoms-only'}
            onClick={() => {
              setViewMode('atoms-only');
            }}
          >
            원자만 보기
          </button>
        </div>
        <div className="vsepr-model-toggle-row">
          <label className="vsepr-label-toggle">
            <input
              checked={showLonePairs}
              data-testid="vsepr-lone-pair-toggle"
              disabled={viewMode === 'atoms-only'}
              type="checkbox"
              onChange={(event) => {
                setShowLonePairs(event.currentTarget.checked);
              }}
            />
            <span>비공유 전자쌍 표시</span>
          </label>
          <label className="vsepr-label-toggle">
            <input
              checked={showLabels}
              type="checkbox"
              onChange={(event) => {
                setShowLabels(event.currentTarget.checked);
              }}
            />
            <span>라벨 표시</span>
          </label>
        </div>
        <div className="viewer-button-row">
          <button
            className="secondary-action"
            data-testid="vsepr-reset-view-button"
            disabled={!modelRendered}
            type="button"
            onClick={resetView}
          >
            초기 방향
          </button>
          <button
            className="secondary-action"
            data-testid="vsepr-zoom-to-fit-button"
            disabled={!modelRendered}
            type="button"
            onClick={zoomToFit}
          >
            화면에 맞추기
          </button>
        </div>
      </div>

      <div className="viewer-content">
        <div
          ref={hostRef}
          className="viewer-3d-host vsepr-model-host"
          data-testid="vsepr-3d-host"
          aria-label="전자쌍 반발 교육용 3D 예측 모형 보기 영역"
        />
        <div className="viewer-empty-state" data-testid="vsepr-3d-model-message">
          <p>
            {getVsepr3DStudentMessage({
              analysis,
              modelStatus,
              hasTemplate: Boolean(template),
              viewerStatus,
              modelRendered,
            })}
          </p>
          <dl>
            <div>
              <dt>모형 종류</dt>
              <dd>전자쌍 반발 교육용 예측 모형</dd>
            </div>
            <div>
              <dt>참고 3D 구조 여부</dt>
              <dd>아님. 외부 3D 자료와 구분합니다.</dd>
            </div>
            <div>
              <dt>전자쌍 모형 표기</dt>
              <dd>{analysis.axeNotation ?? '아직 예측되지 않음'}</dd>
            </div>
            <div>
              <dt>비공유 전자쌍 표현</dt>
              <dd>실제 입자가 아니라 전자쌍 방향 이해를 위한 시각화입니다.</dd>
            </div>
            <div>
              <dt>VSEPR 이상각(이론)</dt>
              <dd>
                {vseprIdealAngles
                  ? `${vseprIdealAngles.join(', ')} · 선택 중심 주변의 이상화 각도`
                  : '정밀 실험값으로 표시하지 않습니다.'}
              </dd>
            </div>
            <div>
              <dt>결합길이 안내</dt>
              <dd>단위 벡터 시각화이며 실제 결합길이 측정값이 아닙니다.</dd>
            </div>
          </dl>
        </div>
      </div>
      <p className="viewer-gesture-hint">
        한 손가락으로 회전하고 두 손가락으로 확대·축소할 수 있습니다.
      </p>
    </section>
  );
}

function scaleVector(vector: VseprVector, scale: number): Point3D {
  return {
    x: vector.x * scale,
    y: vector.y * scale,
    z: vector.z * scale,
  };
}

function offsetPoint(point: Point3D, offset: number): Point3D {
  return {
    x: point.x + Math.sign(point.x || 1) * offset,
    y: point.y + Math.sign(point.y || 1) * offset,
    z: point.z + Math.sign(point.z || 1) * offset,
  };
}
