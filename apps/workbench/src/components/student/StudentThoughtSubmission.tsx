type StudentThoughtSubmissionProps = {
  value: string;
  canSubmit: boolean;
  isSubmitting: boolean;
  availabilityMessage: string;
  statusMessage?: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function StudentThoughtSubmission({
  value,
  canSubmit,
  isSubmitting,
  availabilityMessage,
  statusMessage,
  onChange,
  onSubmit,
}: StudentThoughtSubmissionProps) {
  return (
    <section
      className="student-thought-submission"
      data-testid="student-thought-submission"
      aria-busy={isSubmitting}
    >
      <label htmlFor="student-thought-input">
        <strong>나의 판단과 근거</strong>
        <textarea
          id="student-thought-input"
          data-testid="student-thought-input"
          aria-describedby="student-thought-help"
          maxLength={1000}
          rows={4}
          value={value}
          disabled={isSubmitting}
          placeholder="두 모형의 공통점과 차이점, 중심 원자 주변 전자 영역을 근거로 판단을 적어보세요."
          onChange={(event) => {
            onChange(event.currentTarget.value);
          }}
        />
      </label>
      <p id="student-thought-help" className="student-thought-help">
        정답 문구를 그대로 옮기기보다 전자쌍 배열과 분자 구조가 어떻게 연결되는지
        자신의 말로 설명해 보세요. {value.length} / 1000자
      </p>
      <button
        className="primary-action"
        data-testid="submit-student-thought-button"
        type="button"
        disabled={!canSubmit || isSubmitting}
        onClick={onSubmit}
      >
        {isSubmitting ? '제출 중' : '교사에게 제출하기'}
      </button>
      <p className="student-thought-availability" data-testid="student-thought-availability">
        {availabilityMessage}
      </p>
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
