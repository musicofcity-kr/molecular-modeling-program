export type WorkbenchLogEntry = {
  id: string;
  level: 'info' | 'error';
  message: string;
};

type ValidationLogPanelProps = {
  logs: WorkbenchLogEntry[];
};

export function ValidationLogPanel({ logs }: ValidationLogPanelProps) {
  return (
    <section className="log-panel" data-testid="validation-log-panel">
      <div className="panel-heading">
        <p className="section-label">하단</p>
        <h2>로그 / 검증 결과</h2>
      </div>

      <ol className="log-list" aria-live="polite">
        {logs.map((log) => (
          <li className={`log-entry ${log.level}`} key={log.id}>
            {log.message}
          </li>
        ))}
      </ol>
    </section>
  );
}
