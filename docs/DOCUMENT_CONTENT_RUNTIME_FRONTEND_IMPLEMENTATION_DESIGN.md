# 문서 본문 런타임 FE 반영 설계

> 작성일: 2026-05-14  
> 브랜치: `feat#172-document_content_runtime`  
> 기준 문서:
> - `docs/DOCUMENT_CONTENT_RUNTIME_REQUIREMENTS.md`
> - `docs/backend/DOCUMENT_CONTENT_RUNTIME_REQUIREMENTS_ANALYSIS.md`
> - `docs/backend/DOCUMENT_CONTENT_RUNTIME_ANALYSIS_AND_IMPLEMENTATION_PLAN_FASTAPI.md`
> - `docs/backend/DOCUMENT_CONTENT_RUNTIME_ANALYSIS_AND_IMPLEMENTATION_PLAN_SPRING_BOOT.md`

---

## 1. 목적

문서 본문 런타임 계약이 도입되면 FE는 파일 본문을 직접 읽지 않고, Spring/FastAPI가 내려주는 canonical payload의 content 상태를 정확히 표시해야 한다.

이번 FE 설계의 목적은 다음과 같다.

- `SINGLE_FILE`, `FILE_LIST.items[]`, Gmail attachment의 `content_status`, `content_error`, `content_metadata`를 타입/표시 계층에서 수용한다.
- source preview, AI/content preview, 실제 실행 결과를 사용자가 구분할 수 있게 만든다.
- 본문이 필요한 자동화에서 “파일은 받았지만 본문을 못 읽은 상태”가 빈 요약 성공처럼 보이지 않게 한다.
- Spring/FastAPI가 full content를 sanitize/truncate해서 내려주는 정책을 FE가 표시할 수 있게 한다.

---

## 2. 현재 FE 코드 기준 분석

### 2.1 Preview API 타입

대상:

- `src/entities/workflow/api/types.ts`
- `src/entities/workflow/api/preview-workflow-node.api.ts`
- `src/entities/workflow/model/useWorkflowNodePreviewMutation.ts`

현재 `NodePreviewRequest`는 이미 `includeContent?: boolean`을 가진다. `NodePreviewResponse.metadata`는 `Record<string, unknown>`이라 `previewScope`, `contentPolicy`, `contentIncluded`, `contentStatusScope` 같은 신규 metadata를 타입 확장 없이도 받을 수 있다.

다만 FE에서 metadata 의미를 읽는 helper가 없고, preview 요청은 항상 `includeContent: false`로 고정되어 있다.

### 2.2 Node data panel

대상:

- `src/widgets/node-data-panel/model/useNodeDataPanelModel.ts`
- `src/widgets/node-data-panel/model/node-data-panel-utils.ts`
- `src/widgets/input-panel/ui/InputPanel.tsx`
- `src/widgets/output-panel/ui/OutputPanel.tsx`

현재 preview는 `isStartNode`일 때만 지원한다.

```ts
const isPreviewSupported = isStartNode;
```

따라서 source preview는 가능하지만 AI 노드 preview는 현재 UX 범위 밖이다. 요구사항에는 “LLM 노드 preview 요청 시 includeContent true”가 있지만, Spring 문서도 AI 노드 preview는 별도 구현 전까지 source-only로 둘 수 있다고 정리했다.

1차 FE는 source preview 버튼을 유지하되, content metadata를 표시하고, Spring이 AI preview를 열면 같은 구조로 확장할 수 있게 설계한다.

### 2.3 DataPreviewBlock

대상:

- `src/widgets/node-data-panel/ui/DataPreviewBlock.tsx`

현재 `SINGLE_FILE`은 `content`가 있으면 본문 미리보기를 보여준다. `FILE_LIST`와 Gmail attachment는 filename/mime/size/url 중심이다.

빠진 것:

- `content_status` 표시
- `content_error` 표시
- `content_metadata.truncated`, `char_count`, `original_char_count`, `extraction_method`, `content_kind` 표시
- `extracted_text` legacy fallback 표시
- Gmail attachment content 상태 표시
- preview metadata의 `contentPolicy` 표시

### 2.4 실행 에러 문구

대상:

- `src/entities/execution/model/nodeRuntimeIssue.ts`
- `src/widgets/node-data-panel/model/node-data-panel-display.ts`
- `src/widgets/node-data-panel/ui/DataStateNotice.tsx`
- `src/widgets/node-data-panel/ui/NodeExecutionStatusBlock.tsx`

현재 실행 실패 문구는 OAuth, column, not found, empty, rate limit, external service 정도로 분류한다. 신규 `DOCUMENT_CONTENT_*` error code에 대한 사용자 문구는 없다.

---

## 3. FE 반영 범위

### 3.1 1차 범위

1차 FE 구현은 backend contract가 내려오는 것을 전제로 표시/요청/문구를 정리한다.

- content 상태 타입과 helper 추가
- `DataPreviewBlock`에서 파일/첨부 content 상태 표시
- preview metadata 표시
- source preview의 `includeContent` 정책 정리
- `DOCUMENT_CONTENT_*` 실행 오류 문구 매핑
- 관련 unit test 추가

### 3.2 1차 제외

- FE에서 파일 본문 직접 다운로드 또는 파싱
- FE에서 OCR/문서 변환
- AI 노드 preview API가 backend에 없는데 FE 단독으로 노출
- full content를 FE가 임의로 복원하거나 별도 저장

---

## 4. 타입 및 helper 설계

### 4.1 신규 모델 파일

신규 파일 후보:

- `src/widgets/node-data-panel/model/document-content.ts`

역할:

- content status 정규화
- camelCase/snake_case metadata 동시 지원
- 사용자 표시 문구 생성
- file item, email attachment 공용 처리

권장 타입:

```ts
export type DocumentContentStatus =
  | "available"
  | "empty"
  | "unsupported"
  | "too_large"
  | "failed"
  | "not_requested";

export type DocumentContentKind =
  | "plain_text"
  | "table_text"
  | "slide_text"
  | "ocr_text"
  | "image_description"
  | "mixed"
  | "none";

export type DocumentContentMetadata = {
  extractionMethod: string | null;
  contentKind: DocumentContentKind | string | null;
  truncated: boolean;
  charCount: number | null;
  originalCharCount: number | null;
  storedContentTruncated: boolean;
  storedCharCount: number | null;
  limits: {
    maxDownloadBytes: number | null;
    maxExtractedChars: number | null;
    maxLlmInputChars: number | null;
  };
};
```

helper:

- `getDocumentContentStatus(record)`
- `getDocumentContentError(record)`
- `getDocumentContentMetadata(record)`
- `getDocumentContentText(record)`
- `getDocumentContentStatusLabel(status)`
- `getDocumentContentStatusDescription(status, metadata)`
- `isDocumentContentProblem(status)`
- `isDocumentContentUnavailableForSummary(status)`

helper는 Spring public API와 FastAPI raw response를 모두 수용하기 위해 snake_case와 camelCase를 함께 읽는다.

- `content_status`, `contentStatus`
- `content_error`, `contentError`
- `content_metadata`, `contentMetadata`
- `extraction_method`, `extractionMethod`
- `content_kind`, `contentKind`
- `original_char_count`, `originalCharCount`
- `stored_content_truncated`, `storedContentTruncated`
- `stored_char_count`, `storedCharCount`
- `limits.max_download_bytes`, `limits.maxDownloadBytes`
- `limits.max_extracted_chars`, `limits.maxExtractedChars`
- `limits.max_llm_input_chars`, `limits.maxLlmInputChars`

`getDocumentContentText`는 하위 호환을 위해 아래 순서로 읽는다.

1. `content`
2. `extracted_text`
3. `extractedText`

본문이 표시되더라도 `content_metadata.truncated=true` 또는 `stored_content_truncated=true`이면 전체 본문이 아니라 잘린 preview일 수 있음을 함께 표시한다.

### 4.2 Preview metadata helper

같은 파일 또는 별도 파일:

- `src/widgets/node-data-panel/model/preview-content-policy.ts`

읽을 필드:

- `metadata.contentPolicy`
- `metadata.content_policy`
- `metadata.previewScope`
- `metadata.preview_scope`
- `metadata.contentIncluded`
- `metadata.content_included`
- `metadata.contentStatusScope`
- `metadata.content_status_scope`

표시 문구:

| contentPolicy | 표시 |
|---------------|------|
| `metadata_only` | 본문 미포함 미리보기 |
| `content_included` | 본문 포함 미리보기 |
| `content_status_only` | 본문 상태만 포함 |
| `required_by_downstream` | 다음 단계에서 본문 필요 |
| `content_required_but_unavailable` | 본문 필요하지만 미포함 |

백엔드 문서상 Spring은 `required_by_downstream`, FastAPI는 `content_required_but_unavailable`을 언급한다. FE는 1차에서 두 값을 모두 수용하되, 표시 문구는 아래처럼 구분한다.

- `required_by_downstream`: 다음 단계에서 본문 필요
- `content_required_but_unavailable`: 본문이 필요한 단계지만 현재 미리보기에는 본문이 포함되지 않음

---

## 5. UI 표시 설계

### 5.1 파일 카드 상태 표시

대상:

- `FileItemCard`
- `SingleFilePreview`
- Gmail attachment 렌더링 경로

현재 파일 카드는 filename, mime, size, modified date, link만 보여준다. 여기에 content 상태 행을 추가한다.

표시 규칙:

| status | tone | 문구 |
|--------|------|------|
| `available` | normal | 본문 읽기 완료 |
| `empty` | warning | 읽을 수 있는 본문 없음 |
| `unsupported` | warning | 지원하지 않는 파일 형식 |
| `too_large` | warning | 파일 크기 제한 초과 |
| `failed` | error | 본문 읽기 실패 |
| `not_requested` | muted | 본문 미포함 |

`content_error`가 있으면 상태 문구 아래에 짧게 표시한다. `content_metadata.truncated=true`이면 “본문 일부만 표시됨”을 함께 표시한다.

`content_metadata.limits`가 있으면 상세 줄에는 제한값을 그대로 나열하지 않고, `too_large`나 truncate 상태일 때만 보조 문구에 사용한다.

예:

- `현재 처리 가능한 크기를 초과했습니다.`
- `본문 일부만 표시됩니다.`
- `실행 로그에는 일부 본문만 저장되었습니다.`

### 5.2 본문 미리보기 표시

`SingleFilePreview`는 `content`뿐 아니라 legacy `extracted_text`도 fallback으로 사용한다.

본문 카드 조건:

- status가 `available`이고 text가 있으면 `본문 미리보기` 표시
- text가 있고 status가 없으면 기존 호환을 위해 표시
- status가 `not_requested`이면 본문 카드를 만들지 않고 상태만 표시
- status가 `unsupported|too_large|failed|empty`이면 본문 카드 대신 상태/오류 표시

### 5.3 FILE_LIST 표시

`FileListPreview`는 목록 요약 카드에 content 상태 집계를 추가한다.

예:

- `본문 읽기 완료 3개`
- `본문 미포함 5개`
- `읽기 실패 1개`

개별 `FileItemCard`에서도 상태를 보여준다. 목록이 많을 경우 기존 `MAX_LIST_PREVIEW_COUNT` 제한은 유지한다.

### 5.4 Gmail attachment 표시

`SingleEmailPreview`는 attachments를 `FileItemCard`로 렌더링하고 있으므로, `FileItemCard`가 content status를 처리하면 Gmail attachment도 자동으로 상태 표시가 가능하다.

추가로 attachment에 `content`가 있고 status가 `available`이면 카드 안에서 짧은 본문 preview를 240자 수준으로 표시한다. 메일 본문과 첨부 본문을 혼동하지 않도록 label은 `첨부 본문`으로 둔다.

### 5.5 Preview metadata 표시

`DataPreviewBlock`은 현재 payload 데이터만 받는다. preview metadata를 표시하려면 props 확장이 필요하다.

권장 변경:

```ts
type Props = {
  title?: string;
  data: unknown;
  previewMetadata?: Record<string, unknown> | null;
};
```

`InputPanel`과 `OutputPanel`에서 `nodeDataPanel.nodePreviewData?.metadata`를 넘긴다.

표시 위치:

- payload type label 아래
- 작은 보조 텍스트 또는 notice

예:

- `본문 미포함 미리보기`
- `본문 포함 미리보기`
- `본문 상태만 포함된 미리보기`

---

## 6. Preview 요청 정책

### 6.1 현재 1차 정책

현재 backend preview는 source preview 중심이다. 따라서 FE 1차는 기존 버튼을 유지하고 `includeContent=false`를 기본으로 둔다.

이유:

- source preview가 자동으로 full content를 요청하면 문서 다운로드/추출 비용이 커진다.
- backend 문서에서 metadata-only preview와 content-included preview를 분리했다.
- AI 노드 preview는 backend 범위가 확정된 뒤 노출하는 편이 안전하다.

### 6.2 사용자 액션 확장안

source preview 버튼을 두 단계로 확장할 수 있다.

1. `실행 전 미리보기`: `includeContent=false`
2. `본문 포함 미리보기`: `includeContent=true`

1차 구현에서는 버튼을 바로 추가하지 않고, 설계만 열어둔다. backend가 `includeContent=true`의 비용/권한/error 정책을 안정화하면 추가한다.

### 6.3 AI 노드 preview 확장 조건

아래 조건이 모두 만족되면 중간/AI 노드 preview를 열 수 있다.

- Spring preview endpoint가 start node 외 target node dry-run을 지원한다.
- `NodePreviewResponse.metadata.contentPolicy`가 내려온다.
- 실패 시 `DOCUMENT_CONTENT_*` error가 사용자 문구로 매핑된다.
- FE가 `canRequestPreview`를 start node 한정에서 backend capability 기반으로 바꾼다.

---

## 7. Error UX 설계

### 7.1 실행 오류 문구 매핑

대상:

- `src/entities/execution/model/nodeRuntimeIssue.ts`

추가 매핑:

| code | 사용자 문구 |
|------|-------------|
| `DOCUMENT_CONTENT_UNSUPPORTED` | 이 파일 형식은 아직 본문 읽기를 지원하지 않습니다. |
| `DOCUMENT_CONTENT_TOO_LARGE` | 파일이 너무 커서 본문을 읽을 수 없습니다. |
| `DOCUMENT_CONTENT_EMPTY` | 파일에서 읽을 수 있는 본문이 없습니다. |
| `DOCUMENT_CONTENT_EXTRACTION_FAILED` | 파일 본문을 읽는 중 오류가 발생했습니다. |
| `DOCUMENT_CONTENT_NOT_REQUESTED` | 본문이 필요한 작업이지만 본문 미리보기/추출이 요청되지 않았습니다. |

`OAUTH_SCOPE_INSUFFICIENT`, `OAUTH_TOKEN_MISSING`, `OAUTH_TOKEN_INVALID`는 기존 OAuth 문구 흐름을 재사용하되 Gmail/Drive 권한 부족 메시지를 유지한다.

### 7.2 Node data panel notice

`DataStateNotice`는 execution error message를 그대로 보여준다. Spring이 user-friendly message를 내려주면 그대로 표시하고, raw code만 내려오는 경우에는 FE helper로 보정한다.

현재 `DataStateNotice`는 `executionData.error.message`를 직접 표시한다. 구현 시 `getUserFriendlyExecutionErrorMessage` 또는 신규 error helper를 `getExecutionStatusNotice`와 `DataStateNotice` 양쪽에서 재사용하도록 정리한다.

권장 순서:

1. Spring이 내려준 사용자 문구가 있으면 우선 표시한다.
2. `error.code`가 `DOCUMENT_CONTENT_*`이면 FE 매핑 문구를 사용한다.
3. 기존 OAuth/column/not found/rate limit 매핑을 적용한다.
4. 그래도 없으면 기본 실행 실패 문구를 표시한다.

---

## 8. 테스트 계획

### 8.1 Unit tests

추가 후보:

- `src/widgets/node-data-panel/model/document-content.test.ts`
- `src/widgets/node-data-panel/ui/DataPreviewBlock.test.tsx`
- `src/entities/execution/model/nodeRuntimeIssue.test.ts`

필수 케이스:

- snake_case `content_status`, `content_metadata` 읽기
- camelCase `contentStatus`, `contentMetadata` 읽기
- `available + truncated` 표시
- `not_requested`는 본문 카드 없이 상태 표시
- `unsupported|too_large|failed|empty` 상태 문구 표시
- legacy `extracted_text` fallback 표시
- `FILE_LIST.items[]` 상태 집계
- Gmail attachment content status 표시
- `DOCUMENT_CONTENT_*` error code 문구 매핑

### 8.2 Manual QA

1. Google Drive source preview metadata-only
2. Google Drive source preview content included (2차 또는 `본문 포함 미리보기` 버튼 도입 후)
3. `SINGLE_FILE` 실행 결과 content available
4. `SINGLE_FILE` 실행 결과 unsupported
5. `FILE_LIST`에 mixed content status 포함
6. Gmail attachment metadata-only unsupported/not_requested
7. 실행 실패 코드 `DOCUMENT_CONTENT_TOO_LARGE`

---

## 9. 구현 순서

1. `document-content.ts` helper와 test 추가
2. `nodeRuntimeIssue`에 `DOCUMENT_CONTENT_*` 문구 매핑 추가
3. `DataPreviewBlock` props에 `previewMetadata` 추가
4. `FileItemCard`, `SingleFilePreview`, `FileListPreview`, `SingleEmailPreview`에 content 상태 표시
5. `InputPanel`, `OutputPanel`에서 preview metadata 전달
6. preview 버튼/정책은 backend capability 확정 후 2차로 확장
7. 문서/테스트 업데이트 후 `pnpm test`, `pnpm tsc` 확인

---

## 10. 미해결 결정

- source preview에 `본문 포함 미리보기` 버튼을 1차에 추가할지 여부
- AI 노드 preview를 backend source-only 제약이 풀리기 전에 UI에 노출할지 여부
- full content가 sanitize되어 내려올 때 FE가 “전체 본문 보기” 같은 UX를 제공할지 여부
- `content_error`를 그대로 노출할지, FE 문구 매핑을 항상 우선할지 여부

1차 권장은 보수적이다. FE는 상태와 제한을 정확히 보여주고, 본문 포함 preview/AI preview는 backend capability가 확정된 뒤 열어야 한다.

따라서 `Google Drive source preview content included` QA는 1차 필수 검증이 아니라, `includeContent=true`를 호출하는 UI가 추가되거나 backend 안정화 후 진행하는 확장 검증으로 둔다.
