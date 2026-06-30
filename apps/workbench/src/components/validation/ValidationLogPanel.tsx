import { useState } from 'react';

export type WorkbenchLogEntry = {
  id: string;
  level: 'info' | 'warning' | 'error';
  message: string;
};

type ValidationLogPanelProps = {
  logs: WorkbenchLogEntry[];
  visible?: boolean;
  collapsible?: boolean;
  defaultExpanded?: boolean;
};

export function ValidationLogPanel({
  logs,
  visible = true,
  collapsible = false,
  defaultExpanded = true,
}: ValidationLogPanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!visible) {
    return null;
  }

  const shouldShowLogs = !collapsible || expanded;

  return (
    <section className="log-panel" data-testid="validation-log-panel">
      <div className="panel-heading log-heading">
        <div>
          <p className="section-label">교사용</p>
          <h2>개발자 로그 / 검증 결과</h2>
        </div>
        {collapsible ? (
          <button
            className="secondary-action"
            data-testid="developer-log-toggle"
            type="button"
            onClick={() => {
              setExpanded((current) => !current);
            }}
          >
            {expanded ? '개발자 로그 숨기기' : '개발자 로그 보기'}
          </button>
        ) : null}
      </div>

      {shouldShowLogs ? (
        <ol className="log-list" aria-live="polite">
          {logs.map((log) => (
            <li className={`log-entry ${log.level}`} key={log.id}>
              {log.message}
            </li>
          ))}
        </ol>
      ) : (
        <p>교사용 검증 로그가 접혀 있습니다.</p>
      )}
    </section>
  );
}
