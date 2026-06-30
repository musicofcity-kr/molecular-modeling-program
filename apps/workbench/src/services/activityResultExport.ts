import type { ActivityResultSnapshot } from '../types/activityResult';

export type ActivityResultExportFormat = 'json' | 'md' | 'txt';

export type ActivityResultExportOutcome = {
  ok: boolean;
  studentMessage: string;
  developerLogs: string[];
};

type ClipboardLike = {
  writeText(text: string): Promise<void>;
};

export function formatActivityResultJson(snapshot: ActivityResultSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}

export function formatActivityResultMarkdown(
  snapshot: ActivityResultSnapshot,
): string {
  return [
    '# 분자구조 모델링 활동 결과',
    '',
    '## 1. 활동 정보',
    `- 활동명: ${valueOrFallback(snapshot.activityTitle)}`,
    `- 분자명: ${valueOrFallback(snapshot.moleculeName)}`,
    `- 작성 시각: ${snapshot.createdAt}`,
    '',
    '## 2. 나의 예측',
    `- 예상 분자식: ${valueOrFallback(snapshot.studentPrediction.predictedFormula)}`,
    `- 예상 분자량: ${valueOrFallback(snapshot.studentPrediction.predictedMolecularWeight)}`,
    `- 구조를 그렇게 그린 이유: ${valueOrFallback(snapshot.studentPrediction.drawingReason)}`,
    '',
    '## 3. RDKit 검증 결과',
    `- 검증 성공 여부: ${snapshot.rdkitValidation.isValid ? '성공' : '실패 또는 미검증'}`,
    `- canonical SMILES: ${valueOrFallback(snapshot.rdkitValidation.canonicalSmiles)}`,
    `- 분자식: ${valueOrFallback(snapshot.rdkitValidation.molecularFormula)}`,
    `- 평균 분자량: ${formatNumber(snapshot.rdkitValidation.molecularWeight)}`,
    snapshot.rdkitValidation.studentMessage
      ? `- 안내: ${snapshot.rdkitValidation.studentMessage}`
      : null,
    '',
    '## 4. 3D 구조 관찰',
    `- 3D 구조 출처: ${valueOrFallback(snapshot.threeDObservation.sourceLabel)}`,
    `- 관찰 내용: ${valueOrFallback(snapshot.threeDObservation.studentObservation)}`,
    `- 좌표 안내: ${valueOrFallback(snapshot.threeDObservation.sourceNote)}`,
    '',
    '## 5. 측정 결과',
    ...formatMeasurementMarkdown(snapshot),
    '- 측정값 안내:',
    '  이 값은 현재 로드된 3D 좌표 기준입니다. 정밀 실험값으로 사용하지 마세요.',
    '',
    '## 6. VSEPR 예측',
    `- AXE 표기: ${valueOrFallback(snapshot.vseprResult?.axeNotation)}`,
    `- 전자쌍 배열: ${valueOrFallback(snapshot.vseprResult?.electronGeometryKo)}`,
    `- 분자 구조: ${valueOrFallback(snapshot.vseprResult?.molecularGeometryKo)}`,
    `- 이상적 결합각: ${valueOrFallback(snapshot.vseprResult?.idealBondAngle)}`,
    `- 학생 메모: ${valueOrFallback(snapshot.vseprResult?.studentNote)}`,
    '- 안내:',
    '  VSEPR 결과는 전자쌍 반발 이론에 따른 교육용 예측 모형입니다.',
    '',
    '## 7. 실제/외부 3D 구조와 VSEPR 모형 비교',
    `- 비슷한 점: ${valueOrFallback(snapshot.comparisonObservation?.observedSimilarities)}`,
    `- 다른 점: ${valueOrFallback(snapshot.comparisonObservation?.observedDifferences)}`,
    `- 알게 된 점: ${valueOrFallback(snapshot.comparisonObservation?.studentReflection)}`,
    '',
    '## 8. 정리 답변',
    ...formatActivityAnswers(snapshot),
    '',
    '## 9. 최종 정리',
    `- 검증 후 수정한 생각: ${valueOrFallback(snapshot.finalReflection)}`,
    `- 최종 소감: ${valueOrFallback(snapshot.finalReflection)}`,
    '',
    '## 안내',
    snapshot.exportNotice,
    '',
  ]
    .filter((line): line is string => line !== null)
    .join('\n');
}

export function formatActivityResultTxt(snapshot: ActivityResultSnapshot): string {
  return formatActivityResultMarkdown(snapshot)
    .replace(/^#+\s*/gm, '')
    .replace(/^\s*-\s*/gm, '');
}

export function buildActivityResultFileName(
  snapshot: ActivityResultSnapshot,
  format: ActivityResultExportFormat,
): string {
  const compactTimestamp = snapshot.createdAt.replace(/[^0-9]/g, '').slice(0, 12);
  const timestamp = `${compactTimestamp.slice(0, 8)}-${compactTimestamp.slice(8, 12)}`;

  return `molecule-activity-result-${timestamp}.${format}`;
}

export function downloadActivityResultFile(
  snapshot: ActivityResultSnapshot,
  format: ActivityResultExportFormat,
): ActivityResultExportOutcome {
  if (typeof document === 'undefined') {
    return {
      ok: false,
      studentMessage: '현재 환경에서는 파일 내보내기를 실행할 수 없습니다.',
      developerLogs: ['document is not available for file download.'],
    };
  }

  try {
    const content = getExportContent(snapshot, format);
    const fileName = buildActivityResultFileName(snapshot, format);
    const blob = new Blob([content], { type: getMimeType(format) });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);

    return {
      ok: true,
      studentMessage: `${fileName} 파일을 생성했습니다.`,
      developerLogs: [`Downloaded activity result file: ${fileName}`],
    };
  } catch (error) {
    return {
      ok: false,
      studentMessage:
        '내보내기 파일을 생성하지 못했습니다. 클립보드 복사를 대신 사용하세요.',
      developerLogs: [`Activity result file download failed: ${getErrorMessage(error)}`],
    };
  }
}

export async function copyActivityResultMarkdown(
  snapshot: ActivityResultSnapshot,
  clipboard: ClipboardLike | null | undefined =
    typeof navigator === 'undefined' ? null : navigator.clipboard,
): Promise<ActivityResultExportOutcome> {
  if (!clipboard) {
    return {
      ok: false,
      studentMessage: '현재 브라우저에서 클립보드 복사를 사용할 수 없습니다.',
      developerLogs: ['navigator.clipboard is not available.'],
    };
  }

  try {
    await clipboard.writeText(formatActivityResultMarkdown(snapshot));

    return {
      ok: true,
      studentMessage: '활동 결과 Markdown을 클립보드에 복사했습니다.',
      developerLogs: ['Copied activity result Markdown to clipboard.'],
    };
  } catch (error) {
    return {
      ok: false,
      studentMessage:
        '클립보드 복사에 실패했습니다. Markdown 내보내기를 사용하세요.',
      developerLogs: [`Clipboard write failed: ${getErrorMessage(error)}`],
    };
  }
}

function getExportContent(
  snapshot: ActivityResultSnapshot,
  format: ActivityResultExportFormat,
): string {
  if (format === 'json') {
    return formatActivityResultJson(snapshot);
  }

  if (format === 'txt') {
    return formatActivityResultTxt(snapshot);
  }

  return formatActivityResultMarkdown(snapshot);
}

function getMimeType(format: ActivityResultExportFormat): string {
  if (format === 'json') {
    return 'application/json;charset=utf-8';
  }

  if (format === 'txt') {
    return 'text/plain;charset=utf-8';
  }

  return 'text/markdown;charset=utf-8';
}

function formatMeasurementMarkdown(snapshot: ActivityResultSnapshot): string[] {
  if (snapshot.measurements.length === 0) {
    return ['- 최근 측정 결과: 없음'];
  }

  return snapshot.measurements.map((measurement) => {
    const unit = measurement.unit === 'angstrom' ? 'Å' : '°';

    return `- ${measurement.label}: ${measurement.value.toFixed(
      measurement.unit === 'angstrom' ? 2 : 1,
    )}${unit} (${measurement.sourceNote})`;
  });
}

function formatActivityAnswers(snapshot: ActivityResultSnapshot): string[] {
  if (snapshot.activityAnswers.length === 0) {
    return ['- 정리 답변: 없음'];
  }

  return snapshot.activityAnswers.map(
    (answer) =>
      `- ${answer.questionText}: ${answer.answer.trim() || '미입력'}`,
  );
}

function valueOrFallback(value: string | undefined): string {
  return value?.trim() || '없음';
}

function formatNumber(value: number | undefined): string {
  return typeof value === 'number' ? value.toFixed(3) : '없음';
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
