// ─── 노드 간 데이터 흐름 타입 ─────────────────────────────────
/**
 * 노드 사이를 흐르는 데이터의 종류.
 * 이전 노드의 outputType → 다음 노드의 inputType 으로 연결된다.
 */
export type DataType =
  | "file-list" // 여러 파일 (Google Drive 폴더 등)
  | "single-file" // 단일 파일
  | "text" // AI 요약 결과, 알림 메시지 등 텍스트
  | "spreadsheet" // 시트/셀 단위 구조화 데이터
  | "email-list" // 여러 이메일
  | "api-response"; // JSON 형식 외부 API 응답

// ─── 노드의 입출력 타입 정의 ──────────────────────────────────
/**
 * 단일 노드가 받아들이는 입력과 내보내는 출력의 데이터 타입.
 * inputTypes 가 빈 배열이면 시작 노드(소스)로 사용 가능하다.
 */
export interface NodeDataIO {
  inputTypes: DataType[];
  outputTypes: DataType[];
}

// ─── 호환성 검증 ─────────────────────────────────────────────
/**
 * 이전 노드의 출력이 다음 노드의 입력과 호환되는지 확인한다.
 * 하나라도 겹치는 DataType 이 있으면 호환으로 판정한다.
 *
 * TODO: 매핑 규칙 확정 후 세부 로직 구현
 */
export const isDataTypeCompatible = (
  sourceOutput: DataType[],
  targetInput: DataType[],
): boolean => {
  // 입력 또는 출력이 비어있으면 제약 없음 (시작/종단 노드)
  if (sourceOutput.length === 0 || targetInput.length === 0) {
    return true;
  }

  return sourceOutput.some((type) => targetInput.includes(type));
};

// ─── 타입 변환 매핑 ──────────────────────────────────────────
/**
 * 특정 노드 타입이 입력 데이터를 어떤 출력 데이터로 변환하는지 정의한다.
 * 예: file-list → LLM 요약 → text
 *
 * TODO: 매핑 규칙 확정 후 실제 변환 테이블 구현
 */
export type DataTypeTransformRule = {
  inputType: DataType;
  outputType: DataType;
};
