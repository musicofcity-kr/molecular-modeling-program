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

const SCALE = 1.7;
const CENTER_COLOR = '#1d2730';
const BOND_ATOM_COLOR = '#2f6f7b';
const BOND_COLOR = '#6c8c94';
const LONE_PAIR_COLOR = '#7a5aa6';

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

function getStudentMessage(
  analysis: VseprAnalysis,
  status: VseprModelViewStatus,
  template: VseprGeometryTemplate | null,
): string {
  if (status === 'rendered' && template) {
    return `${template.axeNotation} VSEPR 교육용 예측 모형을 표시합니다.`;
  }

  if (analysis.status === 'needs_central_atom') {
    return 'VSEPR 모형을 보려면 먼저 중심 원자를 선택해 주세요.';
  }

  if (analysis.status === 'supported' && !template) {
    return '이 AXE 표기에 대한 VSEPR 3D template이 아직 없습니다.';
  }

  if (analysis.status !== 'supported') {
    return 'VSEPR 분석이 지원되는 구조에서만 교육용 3D 예측 모형을 표시합니다.';
  }

  return 'VSEPR 모형 보기 버튼을 누르면 교육용 3D 예측 모형을 표시합니다.';
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '알 수 없는 VSEPR 3D 표시 오류';
}

export function Vsepr3DModelViewer({
  analysis,
  modelStatus,
  onDeveloperLog,
}: Vsepr3DModelViewerProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<any>(null);
  const [viewerStatus, setViewerStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [showLabels, setShowLabels] = useState(true);
  const template = getVseprGeometryTemplate(analysis.axeNotation);
  const shouldRenderTemplate = modelStatus === 'rendered' && Boolean(template);
  const statusPillText =
    viewerStatus === 'error'
      ? '표시 오류'
      : viewerStatus === 'loading' && modelStatus === 'not_requested'
        ? '3Dmol.js 로딩 중'
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
      viewer.addLabel(analysis.centralAtomSymbol ?? 'A', {
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

      renderLonePairVector(viewer, vector, index);
    });

    viewer.zoomTo();
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
      viewerRef.current = null;
    };
  }, [onDeveloperLog]);

  useEffect(() => {
    if (viewerStatus !== 'ready') {
      return;
    }

    if (!shouldRenderTemplate || !template) {
      clearViewer();
      return;
    }

    try {
      renderTemplate(viewerRef.current, template);
    } catch (error) {
      setViewerStatus('error');
      clearViewer();
      onDeveloperLog?.(
        `VSEPR 3D model render failed: ${getErrorMessage(error)}`,
      );
    }
  }, [analysis.centralAtomSymbol, onDeveloperLog, shouldRenderTemplate, showLabels, template, viewerStatus]);

  return (
    <section className="workspace-panel vsepr-model-panel" data-testid="vsepr-3d-model-viewer">
      <div className="panel-heading viewer-heading">
        <div>
          <p className="section-label">교육용 3D 예측</p>
          <h2>VSEPR 예측 모형</h2>
        </div>
        <span className={viewerStatus === 'ready' ? 'status-pill ready' : 'status-pill'}>
          {statusPillText}
        </span>
      </div>

      <div className="vsepr-model-toolbar">
        <p>
          이 화면은 VSEPR 이론에 따른 교육용 예측 모형입니다. 실제 분자의
          정밀한 3D 구조와는 차이가 있을 수 있습니다.
        </p>
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

      <div className="viewer-content">
        <div
          ref={hostRef}
          className="viewer-3d-host vsepr-model-host"
          data-testid="vsepr-3d-host"
          aria-label="VSEPR 교육용 3D 예측 모형 뷰어"
        />
        <div className="viewer-empty-state" data-testid="vsepr-3d-model-message">
          <p>{getStudentMessage(analysis, modelStatus, template)}</p>
          <dl>
            <div>
              <dt>모형 종류</dt>
              <dd>VSEPR 교육용 예측 모형</dd>
            </div>
            <div>
              <dt>실제/외부 3D 구조 여부</dt>
              <dd>아님. PubChem 3D 구조와 구분합니다.</dd>
            </div>
            <div>
              <dt>AXE 표기</dt>
              <dd>{analysis.axeNotation ?? '아직 예측되지 않음'}</dd>
            </div>
            <div>
              <dt>비공유 전자쌍 표현</dt>
              <dd>실제 입자가 아니라 전자쌍 방향 이해를 위한 시각화입니다.</dd>
            </div>
            <div>
              <dt>결합각 안내</dt>
              <dd>
                {template
                  ? `${template.idealBondAngles.join(', ')} 이상화 각도`
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
