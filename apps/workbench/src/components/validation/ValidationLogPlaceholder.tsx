import { ValidationLogPanel } from './ValidationLogPanel';

export function ValidationLogPlaceholder() {
  return (
    <ValidationLogPanel
      logs={[
        {
          id: 'placeholder-compatibility-log',
          level: 'info',
          message: 'Ketcher 추출 후 RDKit.js 검증 결과를 이 영역에 표시합니다.',
        },
      ]}
    />
  );
}
