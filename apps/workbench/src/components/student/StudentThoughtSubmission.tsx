type StudentThoughtSubmissionProps = {
  value: string;
  canSubmit: boolean;
  isSubmitting: boolean;
  statusMessage?: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function StudentThoughtSubmission({
  value,
  canSubmit,
  isSubmitting,
  statusMessage,
  onChange,
  onSubmit,
}: StudentThoughtSubmissionProps) {
  return (
    <section
      className="student-thought-submission"
      data-testid="student-thought-submission"
    >
      <label htmlFor="student-thought-input">
        <strong>나의 생각 정리</strong>
        <textarea
          id="student-thought-input"
          data-testid="student-thought-input"
          rows={4}
          value={value}
          placeholder="예상 입체 모형을 보고 알게 된 점을 한두 문장으로 적어보세요."
          onChange={(event) => {
            onChange(event.currentTarget.value);
          }}
        />
      </label>
      <button
        className="primary-action"
        data-testid="submit-student-thought-button"
        type="button"
        disabled={!canSubmit || isSubmitting}
        onClick={onSubmit}
      >
        {isSubmitting ? '제출 중' : '교사에게 제출하기'}
      </button>
      {statusMessage ? (
        <p
          className="activity-result-status"
          data-testid="student-thought-submission-status"
          aria-live="polite"
        >
          {statusMessage}
        </p>
      ) : null}
    </section>
  );
}
