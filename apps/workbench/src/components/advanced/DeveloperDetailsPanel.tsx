import {
  ValidationLogPanel,
  type WorkbenchLogEntry,
} from '../validation/ValidationLogPanel';

type DeveloperDetailsPanelProps = {
  logs: WorkbenchLogEntry[];
  visible: boolean;
};

export function DeveloperDetailsPanel({
  logs,
  visible,
}: DeveloperDetailsPanelProps) {
  return (
    <ValidationLogPanel
      logs={logs}
      visible={visible}
      collapsible
      defaultExpanded={false}
    />
  );
}
