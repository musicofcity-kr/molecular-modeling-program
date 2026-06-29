import { ValidationLogPanel } from './ValidationLogPanel';

export function ValidationLogPlaceholder() {
  return (
    <ValidationLogPanel
      logs={[
        {
          id: 'placeholder-compatibility-log',
          level: 'info',
          message: 'Ketcher 통합 단계입니다. RDKit.js 검증은 아직 실행하지 않습니다.',
        },
      ]}
    />
  );
}
