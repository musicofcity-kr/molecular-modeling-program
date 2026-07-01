import { useState, type ReactNode } from 'react';

type EthicsGuideGateProps = {
  onStart: () => void;
  legalPanelSlot?: ReactNode;
  footerSlot?: ReactNode;
};

type EthicsGuideItem = {
  id: string;
  values: string[];
  guideLabel: string;
  guidePurpose: string;
  title: string;
  body: string;
};

const ETHICS_GUIDES: EthicsGuideItem[] = [
  {
    id: 'guide-1',
    values: ['주도성', '합목적성'],
    guideLabel: '가이드 1',
    guidePurpose: '활용 목적',
    title: '생성형 AI 활용의 목적과 범위를 스스로 설정하고 책임져요.',
    body:
      '생성형 AI를 어떤 목적으로, 어느 범위까지 활용할지 스스로 기준을 세워요. 그 기준이 상황마다 흔들린다면 생성형 AI를 활용하는 게 아니라 끌려다니는 거예요. 활용한 결과에 대한 책임은 언제나 나에게 있어요.',
  },
  {
    id: 'guide-2',
    values: ['주도성'],
    guideLabel: '가이드 2',
    guidePurpose: '주도적 학습',
    title:
      '내가 먼저 시도하고, 생성형 AI의 결과물에 나만의 통찰을 담아 완성해요.',
    body:
      '생성형 AI는 훌륭한 도구일 뿐, 나를 대신할 수는 없어요. 생성형 AI에게 묻기 전, 주제에 대해 나의 가설이나 논리 구조를 먼저 세워요. 생성형 AI의 결과물이 나오면, 그대로 복사하지 않고 나의 경험, 비판적 시각, 독창적인 해석을 덧입혀 나만의 생각을 담아 최종 결과물을 만들어요.',
  },
  {
    id: 'guide-3',
    values: ['주도성'],
    guideLabel: '가이드 3',
    guidePurpose: '비판적 검증',
    title:
      '생성형 AI의 한계를 분석하고, 자료를 찾아 결과물을 비판적으로 검증해요.',
    body:
      '생성형 AI는 확률적으로 그럴싸한 답변을 내놓을 뿐, 항상 진실만을 말하지는 않아요. 생성형 AI가 제시한 수치, 인물, 사건이 사실인지 반드시 교과서, 원문, 공신력 있는 기관의 자료를 통해 교차 검증해요. 생성형 AI의 답변 속 숨겨진 편향성을 찾아내고, 종합적인 시각에서 정보를 재구성해요.',
  },
  {
    id: 'guide-4',
    values: ['주도성', '합목적성'],
    guideLabel: '가이드 4',
    guidePurpose: '사고의 확장',
    title: '생성형 AI를 보조 도구로 삼아 사고의 범위와 깊이를 확장해요.',
    body:
      '생성형 AI를 ‘내 사고를 확장하는 지적 대화 파트너’로 활용해요. ‘나의 생각에 대한 반론을 제시해줘’, ‘다른 관점에서 나의 생각을 분석해줘’와 같은 심화 질문을 통해 생각의 범위를 넓혀요. 혼자 해결하기 어려운 복잡한 데이터나 추상적인 개념을 이해할 때는 생성형 AI를 보조도구로 활용하여 깊이를 더해요.',
  },
  {
    id: 'guide-5',
    values: ['안전성'],
    guideLabel: '가이드 5',
    guidePurpose: '안전과 관계',
    title: '데이터 보안과 정서적 자립을 통해 디지털 시민성을 완성해요.',
    body:
      '나 또는 타인의 민감한 정보를 생성형 AI에 입력하지 않으며, 공용기기 로그아웃 등 기본 보안 수칙을 잘 지켜요. 생성형 AI가 주는 편리함이나 인위적 공감에 매몰되지 않도록 정서적 주체성을 잃지 않도록 주의해요. 선생님 또는 친구와의 실제적인 교류와 토론을 통해 건강한 자아를 확립하고 정서적 독립을 유지해요.',
  },
  {
    id: 'guide-6',
    values: ['투명성'],
    guideLabel: '가이드 6',
    guidePurpose: '투명성·윤리',
    title: '생성형 AI 활용 사실을 투명하게 공개하며 학술적 정직성을 실천해요.',
    body:
      '어떤 단계에서 어떤 생성형 AI를 사용했는지, 프롬프트는 무엇이었는지 명확히 기록해요. 생성형 AI의 도움을 받은 부분을 투명하게 밝힘으로써 자신의 노력이 들어간 부분과 생성형 AI의 기여를 구분하고, 표절 시비로부터 나의 학문적 정당성을 보호해요.',
  },
];

function getValueTone(value: string): string {
  if (value === '주도성') {
    return 'agency';
  }

  if (value === '합목적성') {
    return 'purpose';
  }

  if (value === '안전성') {
    return 'safety';
  }

  return 'transparency';
}

export function EthicsGuideGate({
  onStart,
  legalPanelSlot,
  footerSlot,
}: EthicsGuideGateProps) {
  const [hasConfirmed, setHasConfirmed] = useState(false);

  return (
    <main className="app-shell ethics-gate-shell" data-testid="ethics-gate-shell">
      <section className="workspace-panel ethics-gate-panel">
        <div className="ethics-gate-hero">
          <p className="ethics-gate-kicker">생성형 AI 윤리 핵심가이드</p>
          <h1>
            <span>AI 윤리</span>
            <span>분자 탐험 준비</span>
          </h1>
          <p className="ethics-gate-subtitle">
            다양한 분자의 분자구조 모델링을 시작하기 전에, 생성형 AI를
            주도적이고 안전하게 사용하는 약속을 확인합니다.
          </p>
        </div>

        <div className="ethics-readiness-grid" aria-label="윤리 가이드 확인 단계">
          <article className="ethics-readiness-card">
            <span className="ethics-readiness-icon">01</span>
            <strong>읽기</strong>
            <p>핵심가이드를 차분히 확인</p>
          </article>
          <article className="ethics-readiness-card active">
            <span className="ethics-readiness-icon">02</span>
            <strong>확인</strong>
            <p>빠짐없이 읽었다고 체크</p>
          </article>
          <article className="ethics-readiness-card">
            <span className="ethics-readiness-icon">03</span>
            <strong>시작</strong>
            <p>수업 활동 웹앱으로 이동</p>
          </article>
        </div>

        <div className="ethics-guide-table" aria-label="생성형 AI 윤리 핵심가이드">
          <div className="ethics-guide-header ethics-guide-values">핵심 가치</div>
          <div className="ethics-guide-header ethics-guide-content">핵심 가이드</div>
          {ETHICS_GUIDES.map((guide) => (
            <article className="ethics-guide-row" key={guide.id}>
              <div className="ethics-value-column">
                {guide.values.map((value) => (
                  <span
                    className={`ethics-value-pill ${getValueTone(value)}`}
                    key={`${guide.id}-${value}`}
                  >
                    {value}
                  </span>
                ))}
              </div>
              <div className="ethics-guide-label">
                <strong>{guide.guideLabel}</strong>
                <span>{guide.guidePurpose}</span>
              </div>
              <div className="ethics-guide-copy">
                <h2>{guide.title}</h2>
                <p>{guide.body}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="ethics-gate-confirmation">
          <label className="ethics-confirm-checkbox">
            <input
              data-testid="ethics-guide-confirm-checkbox"
              type="checkbox"
              checked={hasConfirmed}
              onChange={(event) => {
                setHasConfirmed(event.currentTarget.checked);
              }}
            />
            <span>이 사진에 있는 윤리 핵심가이드를 빠짐없이 읽겠습니다.</span>
          </label>
          <button
            className="primary-action"
            data-testid="ethics-guide-start-button"
            type="button"
            disabled={!hasConfirmed}
            onClick={onStart}
          >
            시작하기
          </button>
        </div>
      </section>
      {legalPanelSlot}
      {footerSlot}
    </main>
  );
}
