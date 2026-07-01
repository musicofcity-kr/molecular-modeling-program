import { legalDocuments, type LegalDocumentId } from '../../content/legalDocuments';

type LegalDocumentPanelProps = {
  documentId: LegalDocumentId;
  onClose: () => void;
};

export function LegalDocumentPanel({
  documentId,
  onClose,
}: LegalDocumentPanelProps) {
  const document = legalDocuments[documentId];

  return (
    <section
      className="workspace-panel legal-document-panel"
      data-testid="legal-document-panel"
      aria-label={document.title}
    >
      <div className="panel-heading legal-document-heading">
        <div>
          <p className="section-label">{document.eyebrow}</p>
          <h2>{document.title}</h2>
          <p className="legal-document-summary">{document.summary}</p>
          <p className="legal-document-date">시행일: {document.effectiveDate}</p>
        </div>
        <button className="secondary-action compact-action" type="button" onClick={onClose}>
          닫기
        </button>
      </div>

      <div className="legal-document-content">
        {document.sections.map((section) => (
          <article className="legal-document-section" key={section.title}>
            <h3>{section.title}</h3>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.items ? (
              <ul>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
