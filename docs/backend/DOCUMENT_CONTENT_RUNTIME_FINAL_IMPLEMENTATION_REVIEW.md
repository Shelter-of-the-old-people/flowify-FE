# 문서 본문 런타임 최종 구현 검토

> 작성일: 2026-05-14  
> FE 브랜치: `feat#172-document_content_runtime`  
> Spring Boot 브랜치: `feat/30-runtime-document`  
> FastAPI 브랜치: `feat/26-runtime-document`  
> 검토 기준:
> - `DOCUMENT_CONTENT_RUNTIME_REQUIREMENTS.md`
> - `DOCUMENT_CONTENT_RUNTIME_ANALYSIS_AND_IMPLEMENTATION_PLAN_SPRING_BOOT.md`
> - `DOCUMENT_CONTENT_RUNTIME_FRONTEND_INTEGRATION_REVIEW.md`
> - `DOCUMENT_CONTENT_RUNTIME_SPRING_BOOT_IMPLEMENTATION_REPORT.md`
> - `DOCUMENT_CONTENT_RUNTIME_BACKEND_IMPLEMENTATION_HANDOFF.md`
> - `DOCUMENT_CONTENT_RUNTIME_IMPLEMENTATION_REPORT.md`
> - `DOCUMENT_CONTENT_RUNTIME_SAMPLE_PAYLOADS.json`

---

## 1. 최종 결론

Spring Boot, FastAPI, FE 구현은 현재 보고서 기준으로 **문서 본문 런타임 계약/경로 안정화 MVP + 원문 1차 필수 파일군 extractor 1차 구현** 범위까지 완료된 것으로 판단한다.

완료로 판단하는 핵심 근거:

- Spring Boot가 content-dependent 노드에 `runtime_config.requires_content`를 안정적으로 전달한다.
- Spring Boot가 FastAPI `DOCUMENT_CONTENT_*` error code를 public ErrorCode로 보존한다.
- Spring Boot public 조회 경로에서 `nodeLogs[].error.code/context`와 `content_status/content_error/content_metadata`가 보존된다.
- FastAPI가 `SINGLE_FILE`, `FILE_LIST.items[]`, Gmail attachment에 `content_status`, `content_error`, `content_metadata`, `content` 기본 필드를 제공한다.
- FastAPI가 preview `content_policy`를 실제 본문 포함 여부 기준으로 보정한다.
- FastAPI가 본문이 필요한 LLM action에서 본문 추출 실패를 빈 요약 성공으로 처리하지 않는다.
- FastAPI가 DOCX, PPTX, HWPX extractor와 LLM 입력 integration-like 테스트를 추가했다.
- FastAPI가 텍스트 레이어 없는 PDF를 OCR 미지원 `unsupported`로 명확히 반환한다.
- 실행 로그와 callback output의 긴 `content`는 truncate되고 기존 `content_metadata`는 보존된다.
- FE는 snake_case/camelCase payload, content status, preview policy, document content error code를 표시할 수 있다.

단, 아래 항목은 완료 범위가 아니다.

- Gmail attachment 본문 download/extraction
- scan PDF OCR 실제 지원
- image OCR/vision 실제 지원
- “모든 파일 완전 호환” 수준의 제품 보장

따라서 현재 릴리즈/PR 표현은 아래처럼 잡는다.

| 표현 | 사용 가능 여부 |
|------|----------------|
| 문서 본문 런타임 계약/경로 안정화 MVP 완료 | 가능 |
| 원문 1차 필수 파일군 extractor 1차 구현 완료 | 가능 |
| Google Drive 기반 PDF text/TXT/CSV/TSV/DOCX/PPTX/HWPX/Google Workspace 본문 추출 경로 반영 | 가능 |
| Gmail 첨부 본문 추출 완료 | 불가 |
| scan PDF OCR/image OCR/vision 완료 | 불가 |
| 다양한 파일 완전 호환 | 불가 |

---

## 2. 이전 피드백 수용 여부

| 피드백 | 반영 여부 | 판단 |
|--------|-----------|------|
| `includeContent=true`여도 실제 본문이 없으면 `content_included`로 표시하지 않기 | 반영됨 | Spring/FastAPI 모두 실제 `content` 또는 `content_status=available` 기준으로 보정 |
| FastAPI metadata 병합 시 `null`이 Spring 기본값을 덮지 않게 하기 | 반영됨 | Spring 보고서에 null merge 방어 명시 |
| `content_metadata.limits` 기본 포함 | 반영됨 | sample payload와 handoff에 `max_download_bytes`, `max_extracted_chars`, `max_llm_input_chars` 포함 |
| `too_large` status 실제 생성 | 반영됨 | Google Drive extraction에서 알려진 파일 크기 또는 다운로드 byte 기준 제한 초과 처리 |
| 로그 truncate 시 기존 `content_metadata` 보존 | 반영됨 | `stored_content_truncated`, `stored_char_count`, `truncated_for_log`가 metadata 내부 병합됨 |
| `content_error` raw exception 노출 방지 | 반영됨 | 사용자 표시 가능한 짧은 메시지만 내려가는 것으로 보고됨 |
| `DOCUMENT_CONTENT_NOT_REQUESTED`를 별도 Spring public code로 보존 | 반영됨 | Spring ErrorCode와 FE fallback 문구 반영 |
| Spring public 조회에서 node error `code/context` 보존 | 반영됨 | Spring `ErrorDetail.context` 추가 및 조회 테스트 반영 |
| DOCX/PPTX/HWPX extractor | 반영됨 | FastAPI report 기준 extractor와 LLM 입력 integration-like 테스트 추가 |
| 상태별 sample payload fixture | 반영됨 | `DOCUMENT_CONTENT_RUNTIME_SAMPLE_PAYLOADS.json` 추가 |

---

## 3. Spring Boot 최종 검토

### 3.1 완료로 볼 수 있는 항목

- `choiceActionId=summarize` + `action=process` 경로가 `requires_content=true`가 되도록 고정됐다.
- legacy `choiceSelections`와 명시적 `requires_content=false` 우선순위가 테스트됐다.
- preview metadata 기본값과 `includeContent=true` content 포함 여부 보정이 반영됐다.
- FastAPI metadata의 null 값이 Spring 기본 metadata를 덮지 않는다.
- `DOCUMENT_CONTENT_UNSUPPORTED`, `DOCUMENT_CONTENT_TOO_LARGE`, `DOCUMENT_CONTENT_EMPTY`, `DOCUMENT_CONTENT_EXTRACTION_FAILED`, `DOCUMENT_CONTENT_NOT_REQUESTED`가 Spring public ErrorCode로 보존된다.
- `nodeLogs[].error.code/context`가 public execution detail/node data 조회 경로에서 보존된다.
- execution complete update에서 output의 nested document content fields가 보존된다.

### 3.2 남은 Spring Boot 후속

| 우선순위 | 항목 | 판단 |
|----------|------|------|
| P1 | Spring 저장 전 2차 sanitize 방어 | FastAPI sanitize가 1차 방어선이지만 운영 안정화를 위해 후속 필요 |
| P1 | 실제 Mongo 통합 fixture 기반 E2E | service 단위 contract test는 반영됨. 더 넓은 E2E는 후속 권장 |
| P1 | `contentRequiredReason=downstream` graph 분석 | 현재 기본 false/null 정책. UX 고도화 시 후속 |
| P2 | AI/중간 노드 preview capability | 현재 source preview 중심. backend capability 확정 후 후속 |
| P2 | Spring `CONTENT_ACTIONS`에 `extract` alias 추가 여부 | FastAPI는 alias 지원. Spring 템플릿은 명시 `requires_content=true`라 차단 아님 |

Spring Boot 쪽에 현재 PR을 막을 차단급 문제는 없다.

---

## 4. FastAPI 최종 검토

### 4.1 완료로 볼 수 있는 항목

- canonical content fields가 `SINGLE_FILE`, `FILE_LIST.items[]`, Gmail attachment에 추가됐다.
- legacy `extracted_text`, `extraction_status`가 병행 유지된다.
- `content_metadata.limits`가 기본 포함된다.
- TXT/CSV/TSV, PDF text layer, Google Workspace export 경로가 정리됐다.
- DOCX paragraph/table text extractor가 추가됐다.
- PPTX slide order/title/body/note text extractor가 추가됐다.
- HWPX zip XML body text extractor와 손상 HWPX 실패 처리 테스트가 추가됐다.
- DOCX/PPTX/HWPX가 `SINGLE_FILE -> LLM summarize` 경로에서 실제 LLM input으로 들어가는 integration-like 테스트가 추가됐다.
- 텍스트 레이어 없는 PDF는 OCR 미지원 `unsupported`로 반환된다.
- `too_large`, `empty`, `unsupported`, `failed`, `not_requested` 상태가 content-dependent action에서 빈 성공으로 처리되지 않는다.
- LOOP body 실패 시 기존 content error context와 iteration/body node context가 병합된다.
- safe error message 정책과 log/callback sanitize 정책이 반영됐다.
- full test suite가 네트워크 허용 환경에서 통과한 것으로 보고됐다.

### 4.2 남은 FastAPI 후속

| 우선순위 | 항목 | 판단 |
|----------|------|------|
| P1 | Gmail attachment download + extractor 연결 | 아직 후속. 현재는 metadata/status 표시 중심 |
| P1 | scan PDF OCR 실제 지원 | 아직 후속. OCR 미지원이면 `unsupported` 유지 |
| P1 | image OCR/vision 실제 지원 | 아직 후속. vision 미구현이면 `unsupported` 유지 |
| P1 | cross-service fixture 기반 E2E | sample payload는 제공됨. 실제 Spring-FastAPI-FE E2E는 후속 |
| P2 | extractor registry 일반화 | Gmail/upload/url 확장 시 후속 검토 |

FastAPI 쪽에 현재 PR을 막을 차단급 문제는 없다.

---

## 5. FE 최종 검토

FE는 현재 Spring/FastAPI 계약을 소비할 수 있다.

반영 완료:

- `content_status`, `content_error`, `content_metadata`, `content` helper.
- snake_case와 camelCase fallback.
- `content -> extracted_text -> extractedText` fallback.
- `SINGLE_FILE`, `FILE_LIST.items[]`, Gmail attachment 상태 표시.
- `contentPolicy/content_policy`, `contentRequired/content_required`, `contentRequiredReason/content_required_reason` 파싱.
- `DOCUMENT_CONTENT_*` execution error fallback 문구.
- `DOCUMENT_CONTENT_NOT_REQUESTED` 실행 오류 문구 보정.

후속 권장:

| 우선순위 | 항목 | 판단 |
|----------|------|------|
| P1 | sample payload 기반 UI regression test 확장 | fixture가 생겼으므로 후속으로 추가 권장 |
| P2 | `contentPolicy`와 `contentRequired*` 중복 표시 방지 | legacy/raw 값 동시 수신 방어 polish |
| P2 | content included preview UI | backend capability가 제품 정책으로 열릴 때 후속 |
| P2 | 템플릿/도움말 문구 | Gmail attachment/OCR/vision 후속 범위 명확화 |

FE 쪽에 현재 PR을 막을 차단급 문제는 없다.

---

## 6. 요구사항 충족 현황

| 요구사항 | Spring Boot | FastAPI | FE | 최종 판단 |
|----------|-------------|---------|----|-----------|
| canonical file content contract | 보존/전달 | 생성 | 표시 | 충족 |
| `requires_content` 생성/수용 | 생성 | 수용/방어 판별 | N/A | 충족 |
| `FILE_LIST -> LOOP -> SINGLE_FILE` content 보존 | runtime config 전달 | 보존/LLM 사용 | 표시 | 충족 |
| LLM이 file content 사용 | N/A | 반영 | N/A | 충족 |
| content failure를 빈 요약 성공으로 처리하지 않기 | error mapping | 실패 변환 | 오류 표시 | 충족 |
| preview content policy | 기본값/보정 | raw policy 생성 | 표시 | 충족 |
| `includeContent=true` 실제 content 기준 보정 | 보정 | 보정 | 표시 | 충족 |
| error code/context contract | public ErrorCode/context | FastAPI code/context | 문구 매핑 | 충족 |
| log/callback sanitize | 조회/저장 보존 | truncate | truncated 안내 | 충족 |
| TXT/CSV/TSV/PDF text/Google Workspace | N/A | 구현 보고됨 | 표시 | 충족 |
| DOCX/PPTX/HWPX | N/A | 구현 보고됨 | 표시 | 충족 |
| scan PDF OCR/image OCR/vision | N/A | 후속 | 표시 가능 | 후속 |
| Gmail attachment 본문 추출 | N/A | 후속 | 상태 표시 | 후속 |
| AI/중간 노드 preview | source 중심 | 제한 | 노출 보류 | 후속 |

---

## 7. 최종 남은 항목

### P1. 기능 후속

1. Gmail attachment download + common extractor 연결.
2. scan PDF OCR 실제 지원.
3. image OCR/vision 실제 지원.
4. 실제 Mongo 통합 fixture 기반 E2E 검증.
5. Spring 저장 전 full content/token/signed URL 2차 sanitize 방어.

### P2. UX/문서/테스트 후속

1. FE sample payload 기반 rendering test 확장.
2. FE `contentPolicy` legacy 값과 `contentRequired*` 신규 필드 중복 표시 방지.
3. Spring/FastAPI action alias 목록 문서화.
4. 템플릿/도움말에서 현재 지원 파일군과 후속 범위를 명확히 표현.

---

## 8. 릴리즈/PR 문구 권장

사용 가능한 표현:

- “문서 본문 런타임 계약/경로 안정화 MVP를 반영했습니다.”
- “Google Drive 기반 PDF text, TXT/CSV/TSV, DOCX/PPTX/HWPX, Google Workspace 문서 본문 추출 경로를 반영했습니다.”
- “본문 추출 실패, 미지원, 크기 초과, 미요청 상태를 canonical payload와 execution error로 구분합니다.”
- “Spring public 조회 경로에서 문서 본문 error code/context를 보존합니다.”

피해야 할 표현:

- “모든 문서 완전 호환”
- “Gmail 첨부파일 본문 추출 완료”
- “스캔 PDF OCR 완료”
- “이미지 OCR/vision 완료”

---

## 9. 최종 판단

현재 구현은 Spring Boot, FastAPI, FE 통합 관점에서 다음 리뷰/PR 단계로 넘길 수 있다.

Gmail attachment 본문 추출, scan PDF OCR, image OCR/vision을 이번 완료 범위에서 제외한다는 전제라면, 세 팀 간 계약 정합성에서 추가 차단 요소는 없다.
