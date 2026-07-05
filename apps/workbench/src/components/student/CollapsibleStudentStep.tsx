import { useId, useState, type ReactNode } from 'react';

type CollapsibleStudentStepProps = {
  id?: string;
  className: string;
  testId?: string;
  stepNumber: number;
  sectionLabel: string;
  title: string;
  defaultOpen?: boolean;
  collapsible?: boolean;
  children: ReactNode;
};

export function CollapsibleStudentStep({
  id,
  className,
  testId,
  stepNumber,
  sectionLabel,
  title,
  defaultOpen = true,
  collapsible = true,
  children,
}: CollapsibleStudentStepProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = useId();
  const isContentVisible = !collapsible || isOpen;

  if (!collapsible) {
    return (
      <section
        id={id}
        className={`${className} is-open`}
        data-testid={testId}
        tabIndex={-1}
      >
        <div className="student-step-heading">
          <span className="student-step-number" aria-hidden="true">
            {stepNumber}
          </span>
          <span className="student-step-title-group">
            <span className="section-label">{sectionLabel}</span>
            <span className="student-step-title">{title}</span>
          </span>
        </div>

        <div className="student-step-content" id={contentId}>
          {children}
        </div>
      </section>
    );
  }

  return (
    <section
      id={id}
      className={`${className} ${isContentVisible ? 'is-open' : 'is-collapsed'}`}
      data-testid={testId}
      tabIndex={-1}
    >
      <div className="student-step-heading collapsible-step-heading">
        <button
          className="student-step-tab"
          type="button"
          aria-expanded={isOpen}
          aria-controls={contentId}
          onClick={() => {
            setIsOpen((current) => !current);
          }}
        >
          <span className="student-step-number" aria-hidden="true">
            {stepNumber}
          </span>
          <span className="student-step-title-group">
            <span className="section-label">{sectionLabel}</span>
            <span className="student-step-title">{title}</span>
          </span>
          <span className="student-step-toggle">{isOpen ? '접기' : '열기'}</span>
        </button>
      </div>

      <div className="student-step-content" id={contentId} hidden={!isContentVisible}>
        {children}
      </div>
    </section>
  );
}
