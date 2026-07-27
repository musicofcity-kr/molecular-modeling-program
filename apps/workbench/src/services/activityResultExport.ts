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
    '## 3. 구조 확인 결과',
    `- 확인 상태: ${snapshot.rdkitValidation.isValid ? '구조 확인 완료' : '구조를 다시 확인해 주세요'}`,
    `- 표준 구조 표현: ${valueOrFallback(snapshot.rdkitValidation.canonicalSmiles)}`,
    `- 분자식: ${valueOrFallback(snapshot.rdkitValidation.molecularFormula)}`,
    `- 평균 분자량: ${formatNumber(snapshot.rdkitValidation.molecularWeight)}`,
    `- 구조 의도: ${formatStructureIntent(snapshot)}`,
    `- 연결 근거: ${formatConnectivityEvidence(snapshot)}`,
    ...formatRDKitWarnings(snapshot),
    snapshot.rdkitValidation.studentMessage
      ? `- 안내: ${snapshot.rdkitValidation.studentMessage}`
      : null,
    '',
    '## 4. 3D 구조 관찰',
    `- 참고 3D 구조 출처: ${valueOrFallback(snapshot.threeDObservation.sourceLabel)}`,
    `- 관찰 내용: ${valueOrFallback(snapshot.threeDObservation.studentObservation)}`,
    `- 좌표 안내: ${valueOrFallback(snapshot.threeDObservation.sourceNote)}`,
    '',
    '## 5. 측정 결과',
    ...formatMeasurementMarkdown(snapshot),
    '- 측정값 안내:',
    '  이 값은 현재 로드된 3D 좌표 기준입니다. 정밀 실험값으로 사용하지 마세요.',
    '',
    '## 6. 입체 구조 예상',
    `- 선택 중심 원자: ${valueOrFallback(snapshot.vseprResult?.selectedCenter?.atomLabel)}`,
    `- 분석 범위: ${formatVseprScope(snapshot)}`,
    `- 전자쌍 모형 표기: ${valueOrFallback(snapshot.vseprResult?.axeNotation)}`,
    `- 전자쌍 배열: ${valueOrFallback(snapshot.vseprResult?.electronGeometryKo)}`,
    `- 선택 중심 주변 분자 모양: ${valueOrFallback(snapshot.vseprResult?.molecularGeometryKo)}`,
    `- VSEPR 이상각(이론): ${formatVseprIdealAngles(snapshot)}`,
    `- VSEPR 생성 좌표 근거각(명시적): ${formatGeneratedCoordinateAngles(snapshot)}`,
    `- 문헌 참고각: ${formatCuratedReferenceAngles(snapshot)}`,
    `- 학생 메모: ${valueOrFallback(snapshot.vseprResult?.studentNote)}`,
    '- 안내:',
    '  입체 구조 예상은 전자쌍 반발 이론에 따른 교육용 예측 모형입니다. 선택한 중심 원자 주변의 국소 예측이므로 분자 전체 형상이나 실험값으로 해석하지 마세요.',
    '',
    '## 7. 참고 3D 구조와 예상 입체 모형 비교',
    `- 비슷한 점: ${valueOrFallback(snapshot.comparisonObservation?.observedSimilarities)}`,
    `- 다른 점: ${valueOrFallback(snapshot.comparisonObservation?.observedDifferences)}`,
    `- 알게 된 점: ${valueOrFallback(snapshot.comparisonObservation?.studentReflection)}`,
    '',
    '## 8. 정리 답변',
    ...formatActivityAnswers(snapshot),
    '',
    '## 9. 최종 정리',
    `- 확인 후 수정한 생각: ${valueOrFallback(snapshot.afterValidationReflection)}`,
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
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 0);

    return {
      ok: true,
      studentMessage: `${fileName} 파일을 생성했습니다.`,
      developerLogs: [`Downloaded activity result file: ${fileName}`],
    };
  } catch (error) {
    return {
      ok: false,
      studentMessage:
        '내보내기 파일을 생성하지 못했습니다. 결과 복사하기를 대신 사용하세요.',
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
      studentMessage: '활동 결과 보고서 내용을 클립보드에 복사했습니다.',
      developerLogs: ['Copied activity result Markdown to clipboard.'],
    };
  } catch (error) {
    return {
      ok: false,
      studentMessage:
        '클립보드 복사에 실패했습니다. 교사용 보기에서 파일 내보내기를 사용하세요.',
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

function formatVseprScope(snapshot: ActivityResultSnapshot): string {
  return snapshot.vseprResult?.scope === 'local-center'
    ? '선택 중심 원자 주변의 국소 VSEPR 예측'
    : '없음';
}

function formatStructureIntent(snapshot: ActivityResultSnapshot): string {
  switch (snapshot.rdkitValidation.structureIntent) {
    case 'single-molecule':
      return '단일 분자';
    case 'ionic-compound':
      return '이온 화합물';
    case 'mixture':
      return '혼합물';
    default:
      return '없음';
  }
}

function formatConnectivityEvidence(snapshot: ActivityResultSnapshot): string {
  const graph = snapshot.rdkitValidation.graphSummary;

  if (!graph) {
    return '없음';
  }

  const statusLabel = (() => {
    switch (snapshot.rdkitValidation.connectivityStatus) {
      case 'single-component':
        return '하나의 연결된 구조';
      case 'multiple-components-allowed':
        return '명시한 구조 의도에 따라 여러 연결 성분을 구분함';
      case 'multiple-components-blocked':
        return '여러 조각으로 나뉘어 계산을 차단함';
      case 'empty':
        return '연결된 원자 구조가 없음';
      default:
        return graph.isSingleComponent
          ? '하나의 연결된 구조'
          : '여러 연결 성분';
    }
  })();

  return `원자 ${graph.atomCount}개 · 결합 ${graph.bondCount}개 · 연결 성분 ${graph.componentCount}개 · ${statusLabel}`;
}

function formatRDKitWarnings(snapshot: ActivityResultSnapshot): string[] {
  const warnings = snapshot.rdkitValidation.warnings ?? [];

  return warnings.map((warning) => `- 구조 확인 참고: ${warning}`);
}

function formatVseprIdealAngles(snapshot: ActivityResultSnapshot): string {
  const angles = snapshot.vseprResult?.angleEvidence?.vseprIdealAngles;

  if (angles && angles.length > 0) {
    return angles.join(', ');
  }

  return valueOrFallback(snapshot.vseprResult?.idealBondAngle);
}

function formatGeneratedCoordinateAngles(
  snapshot: ActivityResultSnapshot,
): string {
  const angles =
    snapshot.vseprResult?.angleEvidence?.generatedCoordinateMeasurements;

  return angles && angles.length > 0
    ? angles.map((value) => `${value}°`).join(', ')
    : '없음';
}

function formatCuratedReferenceAngles(snapshot: ActivityResultSnapshot): string {
  const angles = snapshot.vseprResult?.angleEvidence?.curatedReferenceAngles;

  return angles && angles.length > 0
    ? angles
        .map((item) => `${item.value}° (${item.sourceLabel})`)
        .join(', ')
    : '없음';
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
