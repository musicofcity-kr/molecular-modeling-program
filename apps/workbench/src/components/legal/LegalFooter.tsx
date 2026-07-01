import type { LegalDocumentId } from '../../content/legalDocuments';

type LegalFooterProps = {
  onOpenDocument: (documentId: LegalDocumentId) => void;
};

export function LegalFooter({ onOpenDocument }: LegalFooterProps) {
  return (
    <footer className="legal-footer" aria-label="서비스 정책 링크">
      <div className="legal-footer-links">
        <button
          className="legal-footer-link"
          data-testid="privacy-policy-link"
          type="button"
          onClick={() => {
            onOpenDocument('privacy');
          }}
        >
          개인정보처리방침
        </button>
        <span aria-hidden="true">|</span>
        <button
          className="legal-footer-link"
          data-testid="terms-of-service-link"
          type="button"
          onClick={() => {
            onOpenDocument('terms');
          }}
        >
          이용약관
        </button>
        <span aria-hidden="true">|</span>
        <button
          className="legal-footer-link"
          data-testid="information-manager-link"
          type="button"
          onClick={() => {
            onOpenDocument('manager');
          }}
        >
          정보관리책임자
        </button>
      </div>
      <p className="legal-footer-copy">
        © 2026 다양한 분자의 분자구조 모델링. All rights reserved.
      </p>
      <p className="legal-footer-manager">
        정보관리책임자: 이원재 교사(서울 강동고등학교) · 02-427-0231
      </p>
    </footer>
  );
}
