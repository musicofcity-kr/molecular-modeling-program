import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Editor, type ButtonsConfig } from 'ketcher-react';
import type { Ketcher } from 'ketcher-core';
import { StandaloneStructServiceProvider } from 'ketcher-standalone';
import type { ChemicalEditorHandle } from '../../editor/chemical-editor-handle';
import {
  extractStructureFromKetcher,
  normalizeKetcherError,
} from '../../editor/ketcher-structure-extraction';
import { installKetcherTouchMouseBridge } from '../../editor/ketcher-touch-mouse-bridge';
import {
  buildEditorModeRecoveryFailureMessage,
  buildEditorModeRecoverySuccessMessage,
  createEditorModeRecoveryPlan,
  formatEditorModeName,
  restorePreservedEditorStructure,
  type EditorMode,
  type EditorModeRecoveryPlan,
} from './editorModeRecovery';
import 'ketcher-react/dist/index.css';

export { normalizeKetcherError };

type KetcherEditorProps = {
  onReadyChange?: (ready: boolean) => void;
  onStructureChange?: () => void;
  onError?: (message: string) => void;
  isModeSwitchDisabled?: boolean;
};

type EditorStatus = 'loading' | 'switching' | 'ready' | 'error';

const EDITOR_STATUS_LABELS: Record<EditorStatus, string> = {
  loading: '그리기 도구 준비 중',
  switching: '편집 모드 전환 중',
  ready: '그리기 도구 준비됨',
  error: '그리기 도구 오류',
};

const ADVANCED_MODE_BUTTONS: ButtonsConfig = {
  miew: { hidden: true },
};

const SIMPLE_MODE_BUTTONS: ButtonsConfig = {
  ...ADVANCED_MODE_BUTTONS,
  layout: { hidden: true },
  clean: { hidden: true },
  arom: { hidden: true },
  dearom: { hidden: true },
  cip: { hidden: true },
  check: { hidden: true },
  analyse: { hidden: true },
  recognize: { hidden: true },
  settings: { hidden: true },
  help: { hidden: true },
  about: { hidden: true },
  fullscreen: { hidden: true },
  sgroup: { hidden: true },
  'reaction-plus': { hidden: true },
  arrows: { hidden: true },
  'reaction-mapping-tools': { hidden: true },
  'reaction-automap': { hidden: true },
  'reaction-map': { hidden: true },
  'reaction-unmap': { hidden: true },
  rgroup: { hidden: true },
  'rgroup-label': { hidden: true },
  'rgroup-fragment': { hidden: true },
  'rgroup-attpoints': { hidden: true },
  shape: { hidden: true },
  text: { hidden: true },
  'enhanced-stereo': { hidden: true },
  'create-monomer': { hidden: true },
};

export const KetcherEditor = forwardRef<ChemicalEditorHandle, KetcherEditorProps>(
  function KetcherEditor(
    {
      onReadyChange,
      onStructureChange,
      onError,
      isModeSwitchDisabled = false,
    },
    ref,
  ) {
    const ketcherRef = useRef<Ketcher | null>(null);
    const ketcherHostRef = useRef<HTMLDivElement | null>(null);
    const subscribedKetcherRef = useRef<Ketcher | null>(null);
    const modeRecoveryPlanRef = useRef<EditorModeRecoveryPlan | null>(null);
    const modeSwitchOriginModeRef = useRef<EditorMode | null>(null);
    const modeSwitchRequestIdRef = useRef(0);
    const modeSwitchInProgressRef = useRef(false);
    const recoveryRequestedRef = useRef(false);
    const editorMountGenerationRef = useRef(0);
    const suppressedChangeCountRef = useRef(0);
    const programmaticStructureRef = useRef<{
      ketcher: Ketcher;
      ket: string;
    } | null>(null);
    const onStructureChangeRef = useRef(onStructureChange);
    onStructureChangeRef.current = onStructureChange;
    const handleKetcherChangeRef = useRef<() => void>(() => {
      if (
        suppressedChangeCountRef.current > 0 ||
        modeSwitchInProgressRef.current
      ) {
        return;
      }

      const ketcher = subscribedKetcherRef.current;
      const programmaticStructure = programmaticStructureRef.current;

      if (
        !ketcher ||
        !programmaticStructure ||
        programmaticStructure.ketcher !== ketcher
      ) {
        onStructureChangeRef.current?.();
        return;
      }

      void ketcher
        .getKet()
        .then((currentKet) => {
          const latestProgrammaticStructure = programmaticStructureRef.current;

          if (
            !latestProgrammaticStructure ||
            latestProgrammaticStructure.ketcher !== ketcher
          ) {
            return;
          }

          if (currentKet === latestProgrammaticStructure.ket) {
            return;
          }

          programmaticStructureRef.current = null;
          onStructureChangeRef.current?.();
        })
        .catch(() => {
          if (programmaticStructureRef.current?.ketcher === ketcher) {
            programmaticStructureRef.current = null;
            onStructureChangeRef.current?.();
          }
        });
    });
    const [editorStatus, setEditorStatus] = useState<EditorStatus>('loading');
    const [editorMode, setEditorMode] = useState<EditorMode>('simple');
    const [editorMountGeneration, setEditorMountGeneration] = useState(0);
    const [modeSwitchNotice, setModeSwitchNotice] = useState('');
    const structServiceProvider = useMemo(() => new StandaloneStructServiceProvider(), []);
    const isReady = editorStatus === 'ready';
    const recoveryMode =
      modeRecoveryPlanRef.current?.previousMode ??
      modeSwitchOriginModeRef.current;
    const canRecoverMode = recoveryMode !== null && editorStatus !== 'ready';

    const removeStructureChangeListener = (ketcher?: Ketcher | null) => {
      const subscribedKetcher = subscribedKetcherRef.current;

      if (!subscribedKetcher || (ketcher && subscribedKetcher !== ketcher)) {
        return;
      }

      subscribedKetcher.changeEvent.remove(handleKetcherChangeRef.current);
      subscribedKetcherRef.current = null;
    };

    const addStructureChangeListener = (ketcher: Ketcher) => {
      removeStructureChangeListener();
      ketcher.changeEvent.add(handleKetcherChangeRef.current);
      subscribedKetcherRef.current = ketcher;
    };

    const applyProgrammaticStructure = async (
      ketcher: Ketcher,
      operation: () => Promise<void | undefined>,
    ) => {
      suppressedChangeCountRef.current += 1;

      try {
        await operation();
        programmaticStructureRef.current = {
          ketcher,
          ket: await ketcher.getKet(),
        };
      } finally {
        suppressedChangeCountRef.current -= 1;
      }
    };

    const remountEditor = (nextMode: EditorMode) => {
      const nextGeneration = editorMountGenerationRef.current + 1;

      editorMountGenerationRef.current = nextGeneration;
      setEditorMountGeneration(nextGeneration);
      setEditorMode(nextMode);
    };

    useEffect(
      () => () => {
        modeSwitchRequestIdRef.current += 1;
        removeStructureChangeListener();
        ketcherRef.current = null;
        modeRecoveryPlanRef.current = null;
        modeSwitchOriginModeRef.current = null;
        programmaticStructureRef.current = null;
      },
      [],
    );

    useEffect(() => {
      const host = ketcherHostRef.current;

      if (!host) {
        return;
      }

      return installKetcherTouchMouseBridge(host);
    }, []);

    const switchEditorMode = async (nextMode: EditorMode) => {
      if (
        nextMode === editorMode ||
        editorStatus !== 'ready' ||
        modeSwitchInProgressRef.current
      ) {
        return;
      }

      const activeKetcher = ketcherRef.current;

      if (!activeKetcher) {
        setEditorStatus('error');
        onReadyChange?.(false);
        onError?.('분자 그리기 도구가 준비되지 않아 편집 모드를 바꾸지 못했습니다.');
        return;
      }

      const requestId = modeSwitchRequestIdRef.current + 1;

      modeSwitchRequestIdRef.current = requestId;
      modeSwitchOriginModeRef.current = editorMode;
      modeRecoveryPlanRef.current = null;
      recoveryRequestedRef.current = false;
      modeSwitchInProgressRef.current = true;
      setEditorStatus('switching');
      setModeSwitchNotice(
        `편집 모드를 전환하는 중입니다. 오래 걸리면 "${formatEditorModeName(
          editorMode,
        )}로 돌아가기"를 눌러 현재 구조를 그대로 유지할 수 있습니다.`,
      );
      onReadyChange?.(false);

      try {
        const preservedStructure = await activeKetcher.getKet();

        if (requestId !== modeSwitchRequestIdRef.current) {
          return;
        }

        modeRecoveryPlanRef.current = createEditorModeRecoveryPlan(
          editorMode,
          preservedStructure,
        );
        removeStructureChangeListener(activeKetcher);
        ketcherRef.current = null;
        remountEditor(nextMode);
      } catch (error) {
        if (requestId !== modeSwitchRequestIdRef.current) {
          return;
        }

        modeSwitchOriginModeRef.current = null;
        modeRecoveryPlanRef.current = null;
        modeSwitchInProgressRef.current = false;
        ketcherRef.current = activeKetcher;
        setEditorStatus('ready');
        setModeSwitchNotice(
          '현재 구조를 보존하지 못해 편집 모드를 전환하지 않았습니다. 그린 구조는 현재 모드에 그대로 남아 있습니다.',
        );
        onReadyChange?.(true);
        onError?.(
          `현재 구조를 보존하지 못해 편집 모드를 전환하지 않았습니다. ${normalizeKetcherError(
            error,
            '잠시 후 다시 시도해 주세요.',
          )}`,
        );
      }
    };

    const recoverPreviousEditorMode = () => {
      const previousMode =
        modeRecoveryPlanRef.current?.previousMode ??
        modeSwitchOriginModeRef.current;

      if (!previousMode) {
        return;
      }

      modeSwitchRequestIdRef.current += 1;

      if (
        modeRecoveryPlanRef.current === null &&
        editorMode === previousMode &&
        ketcherRef.current
      ) {
        modeSwitchOriginModeRef.current = null;
        modeSwitchInProgressRef.current = false;
        recoveryRequestedRef.current = false;
        setEditorStatus('ready');
        setModeSwitchNotice(
          `${formatEditorModeName(
            previousMode,
          )} 전환을 취소했습니다. 그린 구조는 현재 편집기에 그대로 있습니다.`,
        );
        onReadyChange?.(true);
        return;
      }

      const recoveryPlan = modeRecoveryPlanRef.current;

      if (!recoveryPlan) {
        const message =
          '전환 전 구조 보존 상태를 확인하지 못했습니다. 새로고침하지 말고 교사에게 도움을 요청해 주세요.';

        modeSwitchInProgressRef.current = false;
        setEditorStatus('error');
        setModeSwitchNotice(message);
        onReadyChange?.(false);
        onError?.(message);
        return;
      }

      recoveryRequestedRef.current = true;
      modeSwitchInProgressRef.current = true;
      removeStructureChangeListener();
      ketcherRef.current = null;
      setEditorStatus('switching');
      setModeSwitchNotice(
        `${formatEditorModeName(
          previousMode,
        )}로 돌아가는 중입니다. 전환 전에 그린 구조를 복원합니다.`,
      );
      onReadyChange?.(false);
      remountEditor(previousMode);
    };

    const handleEditorInit = async (
      ketcher: Ketcher,
      mountGeneration: number,
    ) => {
      if (mountGeneration !== editorMountGenerationRef.current) {
        return;
      }

      try {
        removeStructureChangeListener();
        const recoveryPlan = modeRecoveryPlanRef.current;

        if (recoveryPlan) {
          await applyProgrammaticStructure(ketcher, () =>
            restorePreservedEditorStructure(ketcher, recoveryPlan),
          );
        } else {
          programmaticStructureRef.current = {
            ketcher,
            ket: await ketcher.getKet(),
          };
        }

        if (mountGeneration !== editorMountGenerationRef.current) {
          return;
        }

        const recoveredMode = recoveryRequestedRef.current
          ? recoveryPlan?.previousMode
          : undefined;

        modeRecoveryPlanRef.current = null;
        modeSwitchOriginModeRef.current = null;
        recoveryRequestedRef.current = false;
        modeSwitchInProgressRef.current = false;
        ketcherRef.current = ketcher;
        addStructureChangeListener(ketcher);
        setEditorStatus('ready');
        setModeSwitchNotice(
          recoveredMode
            ? buildEditorModeRecoverySuccessMessage(recoveredMode)
            : '',
        );
        onReadyChange?.(true);
      } catch (error) {
        if (mountGeneration !== editorMountGenerationRef.current) {
          return;
        }

        removeStructureChangeListener(ketcher);
        modeSwitchInProgressRef.current = false;
        ketcherRef.current = null;
        programmaticStructureRef.current = null;
        setEditorStatus('error');
        onReadyChange?.(false);
        const previousMode =
          modeRecoveryPlanRef.current?.previousMode ??
          modeSwitchOriginModeRef.current;
        const recoveryMessage = previousMode
          ? buildEditorModeRecoveryFailureMessage(previousMode)
          : '분자 그리기 도구를 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.';

        setModeSwitchNotice(recoveryMessage);
        onError?.(
          `${recoveryMessage} ${normalizeKetcherError(
            error,
            '잠시 후 원래 모드로 돌아가기를 다시 시도해 주세요.',
          )}`,
        );
      }
    };

    useImperativeHandle(
      ref,
      () => ({
        async getSmiles() {
          if (!ketcherRef.current) {
            throw new Error('분자 그리기 도구가 아직 준비되지 않았습니다.');
          }

          return ketcherRef.current.getSmiles();
        },
        async getMolfile() {
          if (!ketcherRef.current) {
            throw new Error('분자 그리기 도구가 아직 준비되지 않았습니다.');
          }

          return ketcherRef.current.getMolfile('v2000');
        },
        async extractStructure() {
          if (!ketcherRef.current) {
            throw new Error('분자 그리기 도구가 아직 준비되지 않았습니다.');
          }

          return extractStructureFromKetcher(ketcherRef.current);
        },
        async setMolecule(input) {
          if (!ketcherRef.current) {
            throw new Error('분자 그리기 도구가 아직 준비되지 않았습니다.');
          }

          const structure = input.molBlock ?? input.smiles;

          if (!structure?.trim()) {
            throw new Error('불러올 구조 데이터가 없습니다.');
          }

          const ketcher = ketcherRef.current;
          await applyProgrammaticStructure(ketcher, () =>
            ketcher.setMolecule(structure),
          );
        },
        async clear() {
          if (!ketcherRef.current) {
            throw new Error('분자 그리기 도구가 아직 준비되지 않았습니다.');
          }

          const ketcher = ketcherRef.current;
          await applyProgrammaticStructure(ketcher, () =>
            ketcher.setMolecule(''),
          );
        },
      }),
      [],
    );

    return (
      <section
        className="workspace-panel editor-panel"
        data-testid="chemical-editor"
        data-editor-mode={editorMode}
      >
        <div className="panel-heading editor-heading">
          <div>
            <p className="section-label">좌측</p>
            <h2>분자 편집 영역</h2>
          </div>
          <span
            className={isReady ? 'status-pill ready' : 'status-pill'}
            data-testid="chemical-editor-status"
            data-ready={isReady ? 'true' : 'false'}
          >
            {EDITOR_STATUS_LABELS[editorStatus]}
          </span>
        </div>
        <div className="editor-mode-control" aria-label="분자 편집 도구 모드">
          <div>
            <strong>
              {editorMode === 'simple' ? '학생용 간편 모드' : '고급 편집 모드'}
            </strong>
            <p>
              {editorMode === 'simple'
                ? '원자, 결합, 선택·이동, 삭제, 실행 취소 중심으로 사용합니다.'
                : '반응식과 고급 구조 도구를 포함한 전문 편집 기능을 사용합니다.'}
            </p>
          </div>
          <div className="editor-mode-buttons">
            <button
              className={
                editorMode === 'simple'
                  ? 'secondary-action active'
                  : 'secondary-action'
              }
              data-testid="simple-editor-mode-button"
              type="button"
              aria-pressed={editorMode === 'simple'}
              disabled={!isReady || isModeSwitchDisabled}
              onClick={() => {
                void switchEditorMode('simple');
              }}
            >
              간편 모드
            </button>
            <button
              className={
                editorMode === 'advanced'
                  ? 'secondary-action active'
                  : 'secondary-action'
              }
              data-testid="advanced-editor-mode-button"
              type="button"
              aria-pressed={editorMode === 'advanced'}
              disabled={!isReady || isModeSwitchDisabled}
              onClick={() => {
                void switchEditorMode('advanced');
              }}
            >
              고급 편집 모드
            </button>
          </div>
        </div>
        {modeSwitchNotice ? (
          <div
            className={
              canRecoverMode
                ? 'editor-mode-recovery is-actionable'
                : 'editor-mode-recovery'
            }
            data-testid="editor-mode-recovery"
            role={canRecoverMode ? 'alert' : 'status'}
          >
            <p>{modeSwitchNotice}</p>
            {canRecoverMode && recoveryMode ? (
              <button
                className="secondary-action"
                data-testid="restore-previous-editor-mode-button"
                type="button"
                onClick={recoverPreviousEditorMode}
              >
                {formatEditorModeName(recoveryMode)}로 돌아가기
              </button>
            ) : null}
          </div>
        ) : null}

        <div
          ref={ketcherHostRef}
          className="ketcher-host"
          aria-label="2D 분자 구조 그리기 도구"
        >
          <Editor
            key={`${editorMode}-${editorMountGeneration}`}
            buttons={
              editorMode === 'simple'
                ? SIMPLE_MODE_BUTTONS
                : ADVANCED_MODE_BUTTONS
            }
            staticResourcesUrl="/"
            structServiceProvider={structServiceProvider}
            errorHandler={(message) => {
              if (
                editorMountGeneration !== editorMountGenerationRef.current
              ) {
                return;
              }

              if (!ketcherRef.current) {
                setEditorStatus('error');
                onReadyChange?.(false);
                const previousMode =
                  modeRecoveryPlanRef.current?.previousMode ??
                  modeSwitchOriginModeRef.current;

                if (previousMode) {
                  const recoveryMessage =
                    buildEditorModeRecoveryFailureMessage(previousMode);

                  setModeSwitchNotice(recoveryMessage);
                  onError?.(`${recoveryMessage} ${message}`);
                  return;
                }
              }
              onError?.(message);
            }}
            onInit={(ketcher) => {
              void handleEditorInit(ketcher, editorMountGeneration);
            }}
            disableMacromoleculesEditor
          />
        </div>
      </section>
    );
  },
);
