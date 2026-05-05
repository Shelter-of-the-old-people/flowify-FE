# Workflow Node Preview Dry-run Design

## 1. 배경

현재 들어오는 데이터/나가는 데이터 패널은 최신 실행 기록의 `inputData`, `outputData`를 조회해 표시한다.
따라서 워크플로우를 실행하기 전에는 노드를 연결하고 설정을 완료해도 실제 데이터 흐름을 확인하기 어렵다.

이 문서는 실행 전에도 사용자가 선택한 노드 기준의 데이터 흐름을 이해할 수 있도록, 실제 실행 기록과 분리된 노드 미리보기/dry-run 기능을 정의한다.

## 2. 요구사항 정리

### 2.1 사용자 관점 요구사항

- 시작 노드는 설정 완료 후 실제 source 데이터를 미리보기로 보여준다.
- 중간 노드는 이전 preview 데이터를 입력으로 받아 처리 결과를 보여준다.
- 하나씩 처리 노드는 전체 목록 중 첫 번째 항목만 다음 노드 preview 입력으로 전달한다.
- AI 노드는 미리보기 시 실제 LLM 호출을 허용한다.
- 도착 노드는 write 없이 전송/업로드 예정 데이터만 보여준다.
- preview 결과는 저장하지 않고 사용자에게 보여주기 위한 응답으로만 사용한다.
- 파일은 파일 목록/파일 카드로, 텍스트는 텍스트로, 표는 표로 표시할 수 있는 canonical payload를 반환한다.

### 2.2 비목표

- preview 결과를 실행 기록, `nodeLogs`, snapshot, MongoDB에 저장하지 않는다.
- preview에서 Google Drive 업로드, Gmail 발송, Slack 전송 같은 외부 write 작업을 수행하지 않는다.
- 실제 워크플로우 실행 semantics를 변경하지 않는다.
- 전체 워크플로우를 항상 끝까지 실행하는 기능으로 만들지 않는다.
- preview를 자동 반복 호출하는 실시간 실행 엔진으로 만들지 않는다.

### 2.3 권한 정책

preview는 실제 외부 서비스 데이터를 조회하고 OAuth token을 사용하므로 워크플로우 소유자만 사용할 수 있다.

- 소유자: preview 가능
- 공유 사용자: preview 불가, 기존 schema preview만 표시

## 3. 현재 구현 기준 분석

### 3.1 실행 후 데이터 흐름

현재 실행 흐름은 다음과 같다.

1. Spring `ExecutionService.executeWorkflow()`가 workflow를 FastAPI runtime model로 변환한다.
2. Spring `FastApiClient.execute()`가 `POST /api/v1/workflows/{workflowId}/execute`를 호출한다.
3. FastAPI `WorkflowExecutor.execute()`가 노드를 topological order로 실행한다.
4. FastAPI는 각 노드 실행 결과를 `NodeExecutionLog.inputData`, `NodeExecutionLog.outputData`에 저장한다.
5. Spring은 MongoDB의 `WorkflowExecution.nodeLogs`를 읽어 `NodeDataResponse`로 내려준다.
6. Frontend는 `GET /api/workflows/{id}/executions/latest/nodes/{nodeId}/data`로 최신 실행 데이터를 표시한다.

### 3.2 재사용 가능한 코드

Spring:

- `WorkflowService`: workflow 조회와 소유권 확인에 재사용
- `NodeLifecycleService`: 노드 설정 상태 확인에 재사용
- `OAuthTokenService`: service token 수집에 재사용
- `WorkflowTranslator`: FastAPI runtime model 변환에 재사용
- `FastApiClient`: FastAPI preview 호출 메서드 추가 위치로 재사용

FastAPI:

- `WorkflowDefinition`, `NodeDefinition`, `EdgeDefinition`: preview request의 workflow model로 재사용
- `NodeFactory`: 중간 노드 strategy 생성에 재사용
- `InputNodeStrategy`: source별 canonical payload 규칙 참고
- `LLMNodeStrategy`, `DataFilterNodeStrategy`, `PassthroughNodeStrategy`, `IfElseNodeStrategy`: dry-run 실행에 재사용 가능
- `WorkflowExecutor`의 graph helper 개념: upstream 경로 계산, loop item 변환 로직 참고

### 3.3 그대로 재사용하면 안 되는 코드

FastAPI `OutputNodeStrategy.execute()`는 실제 외부 write를 수행하므로 preview에서 호출하면 안 된다.

예:

- Google Drive: 실제 파일 업로드
- Gmail: 실제 발송 또는 draft 생성
- Slack: 실제 메시지 전송
- Notion: 실제 페이지 생성

Source node도 일부 주의가 필요하다.

- Google Drive `single_file`은 현재 `download_file()`을 호출해 본문까지 다운로드한다.
- preview 요구사항은 metadata 중심이어도 되므로 source preview에서는 metadata-only 경로를 우선 사용한다.

## 4. 목표 구조

### 4.1 신규 preview 흐름

1. 사용자가 노드를 설정하거나 선택한다.
2. Frontend가 명시적 preview 요청을 보낸다.
3. Spring이 권한, workflow, 노드 설정, OAuth token을 확인한다.
4. Spring이 workflow를 runtime model로 변환한다.
5. Spring이 FastAPI preview endpoint를 호출한다.
6. FastAPI가 target node까지 필요한 upstream만 dry-run한다.
7. FastAPI가 preview 결과를 저장 없이 응답한다.
8. Frontend가 preview 응답을 타입별 UI로 표시한다.

### 4.2 기존 실행 흐름과 분리

preview는 기존 execution API를 호출하지 않는다.

- `WorkflowExecutor.execute()`를 직접 호출하지 않는다.
- execution id를 만들지 않는다.
- cancellation event를 등록하지 않는다.
- `workflow_executions` 컬렉션에 저장하지 않는다.
- Spring callback을 호출하지 않는다.

## 5. API 설계

### 5.1 Spring API

```http
POST /api/workflows/{workflowId}/nodes/{nodeId}/preview
```

Request:

```json
{
  "limit": 50,
  "includeContent": false
}
```

필드 의미:

- `limit`: source 목록 preview 최대 개수
- `includeContent`: 파일 본문 포함 여부. 1차 구현 기본값은 `false`

Response:

```json
{
  "workflowId": "workflow_1",
  "nodeId": "node_ai",
  "status": "success",
  "inputData": {
    "type": "SINGLE_FILE",
    "filename": "lecture.pdf",
    "mime_type": "application/pdf",
    "url": "https://drive.google.com/file/d/..."
  },
  "outputData": {
    "type": "TEXT",
    "content": "요약 결과..."
  },
  "previewMeta": {
    "saved": false,
    "sideEffect": false,
    "sampled": true,
    "sampleIndex": 0,
    "sampleReason": "하나씩 처리 미리보기는 첫 번째 항목만 사용합니다.",
    "truncated": false,
    "limit": 50,
    "executedNodeIds": ["node_source", "node_loop", "node_ai"]
  },
  "error": null
}
```

실패 또는 미설정 응답:

```json
{
  "workflowId": "workflow_1",
  "nodeId": "node_ai",
  "status": "unavailable",
  "inputData": null,
  "outputData": null,
  "previewMeta": {
    "saved": false,
    "sideEffect": false,
    "sampled": false,
    "truncated": false,
    "limit": 50,
    "executedNodeIds": []
  },
  "error": {
    "code": "NODE_NOT_CONFIGURED",
    "message": "노드 설정이 완료되지 않았습니다.",
    "context": {
      "missingFields": ["prompt"]
    }
  }
}
```

### 5.2 FastAPI API

```http
POST /api/v1/workflows/{workflowId}/nodes/{nodeId}/preview
```

Request:

```json
{
  "workflow": {
    "id": "workflow_1",
    "nodes": [],
    "edges": []
  },
  "service_tokens": {
    "google_drive": "ya29..."
  },
  "options": {
    "limit": 50,
    "include_content": false
  }
}
```

Response는 Spring response와 동일한 shape를 사용한다.

## 6. Spring 설계

### 6.1 추가 컴포넌트

권장 추가 파일:

- `workflow/controller/WorkflowPreviewController.java`
- `workflow/service/WorkflowPreviewService.java`
- `workflow/dto/NodePreviewRequest.java`
- `workflow/dto/NodePreviewResponse.java`
- `workflow/dto/NodePreviewMeta.java`
- `workflow/dto/NodePreviewError.java`

기존 `WorkflowController`에 endpoint를 추가할 수도 있지만, preview는 workflow CRUD보다 실행 준비에 가까우므로 별도 controller가 더 읽기 쉽다.

### 6.2 WorkflowPreviewService 책임

`previewNode(userId, workflowId, nodeId, request)` 흐름:

1. `WorkflowService`로 workflow 조회
2. workflow owner 확인
3. nodeId 존재 확인
4. `NodeLifecycleService.evaluate()`로 설정 상태 확인
5. 설정이 불완전하면 FastAPI 호출 없이 `status=unavailable` 응답
6. OAuth token 수집
7. `WorkflowTranslator.toRuntimeModel()` 호출
8. `FastApiClient.previewNode()` 호출
9. FastAPI 응답 반환

### 6.3 OAuth token 수집

현재 token 수집은 `ExecutionService.collectServiceTokens()` 내부에 묶여 있다.

preview에서도 같은 정책이 필요하므로 다음 중 하나로 정리한다.

권장안:

- token 수집 로직을 별도 service로 분리한다.
- 예: `ExecutionTokenService.collectServiceTokens(userId, nodes)`
- `ExecutionService`와 `WorkflowPreviewService`가 같이 사용한다.

임시안:

- `ExecutionService`의 token 수집 로직을 package-private 메서드로 열어 재사용한다.

권장안이 더 낫다. preview와 execution이 같은 OAuth 정책을 공유해야 하기 때문이다.

### 6.4 Spring 오류 정책

preview는 사용자 보조 기능이므로 가능한 한 UI가 처리하기 쉬운 응답을 반환한다.

- workflow 접근 권한 없음: 기존처럼 HTTP error
- nodeId 없음: 기존처럼 HTTP error
- 노드 설정 미완료: `status=unavailable`
- OAuth 연결 없음 또는 scope 부족: `status=unavailable`
- FastAPI preview 실패: `status=failed`

## 7. FastAPI 설계

### 7.1 추가 컴포넌트

권장 추가 파일:

- `app/models/preview.py`
- `app/core/engine/preview_executor.py`
- `app/core/engine/preview_output.py`

기존 `app/api/v1/endpoints/workflow.py`에는 preview route를 추가한다.

### 7.2 WorkflowPreviewExecutor 책임

`preview(workflow_id, node_id, workflow, service_tokens, options)` 흐름:

1. node map, edge map 구성
2. target node까지 필요한 upstream ancestor 계산
3. topological order 중 ancestor와 target만 실행
4. source node는 preview-safe source 조회
5. middle node는 가능한 기존 strategy dry-run
6. loop node는 첫 번째 item sample만 downstream에 전달
7. output node는 no-write preview builder 사용
8. 결과를 저장하지 않고 `NodePreviewResponse`로 반환

### 7.3 upstream 경로 계산

기본 알고리즘:

1. `edges`에서 reverse adjacency를 만든다.
2. target node에서 predecessor를 역추적해 ancestor node id 집합을 만든다.
3. 전체 topological order를 계산한다.
4. topological order 중 ancestor 또는 target에 포함된 노드만 실행한다.

주의:

- v1은 linear path 중심으로 처리한다.
- branch가 있는 경우 실제 branch 결과에 따라 path를 제한하는 것은 후속 고도화로 둔다.
- loop body는 기존 실행 구조처럼 loop 다음 한 개 body node를 대상으로 한다.

### 7.4 source preview

source preview는 가능한 metadata-only로 동작한다.

Google Drive:

- `folder_all_files`: `list_files()` 재사용
- `single_file`: 신규 `get_file_metadata()` 추가 권장
- `file_changed`, `new_file`, `folder_new_file`: `list_files(max_results=1)` 재사용

Canvas LMS:

- `course_files`: `get_course_files()` 재사용
- `course_new_file`: `get_course_latest_file()` 재사용
- `term_all_files`: `get_courses()`와 `get_course_files()` 재사용

Gmail:

- `label_emails`: `list_messages()` 재사용 가능
- body는 길이를 제한해 preview용으로 반환
- attachment는 metadata만 반환

Source preview 응답에는 `truncated`, `limit` 정보를 포함한다.

### 7.5 중간 노드 preview

중간 노드는 기존 strategy를 최대한 재사용한다.

재사용 가능:

- `LLMNodeStrategy`
- `DataFilterNodeStrategy`
- `PassthroughNodeStrategy`
- `IfElseNodeStrategy`

주의:

- AI 노드는 실제 LLM 호출이 발생한다.
- preview 호출은 자동 호출보다 사용자 명시 액션으로 제한하는 것이 좋다.
- 실패는 execution failure가 아니라 preview failure로 응답한다.

### 7.6 하나씩 처리 preview

목록형 payload에서 첫 번째 항목만 sample로 선택한다.

대상 type:

- `FILE_LIST`
- `EMAIL_LIST`
- `SCHEDULE_DATA`
- `SPREADSHEET_DATA`

변환 규칙:

- `FILE_LIST` 첫 item -> `SINGLE_FILE`
- `EMAIL_LIST` 첫 item -> `SINGLE_EMAIL`
- `SCHEDULE_DATA` 첫 item -> `SCHEDULE_DATA` with single item
- `SPREADSHEET_DATA` 첫 row -> `SPREADSHEET_DATA` with single row

preview meta:

```json
{
  "sampled": true,
  "sampleIndex": 0,
  "sampleReason": "하나씩 처리 미리보기는 첫 번째 항목만 사용합니다."
}
```

### 7.7 output node no-write preview

output node는 기존 `OutputNodeStrategy.execute()`를 호출하지 않는다.

대신 input payload와 sink config를 기반으로 전송 예정 데이터를 만든다.

Google Drive:

```json
{
  "type": "OUTPUT_PREVIEW",
  "service": "google_drive",
  "action": "upload",
  "target": {
    "folder_id": "folder_123"
  },
  "items": [
    {
      "filename": "summary.txt",
      "mime_type": "text/plain",
      "size": 1200
    }
  ]
}
```

Gmail:

```json
{
  "type": "OUTPUT_PREVIEW",
  "service": "gmail",
  "action": "send",
  "to": "user@example.com",
  "subject": "요약 결과",
  "body_preview": "본문 일부...",
  "attachments": []
}
```

Slack, Notion, Google Sheets, Google Calendar도 같은 원칙으로 실제 write 없이 예정 payload만 반환한다.

## 8. Frontend 설계

### 8.1 데이터 우선순위

노드 패널 표시 우선순위:

1. 사용자가 명시적으로 요청한 preview data
2. 최신 실행 데이터
3. schema preview
4. 정적 node type fallback

preview data와 execution data는 라벨을 분리한다.

- preview: "실행 전 미리보기"
- execution: "최근 실행 결과"

### 8.2 호출 방식

1차 구현에서는 자동 호출보다 명시적 액션을 권장한다.

- 버튼 예: `미리보기`
- AI 노드 preview는 비용이 발생할 수 있으므로 자동 호출하지 않는다.
- source preview도 외부 API 호출이 있으므로 설정 저장 후 명시 액션으로 호출한다.

### 8.3 dirty 상태

1차 구현은 저장된 workflow 기준으로 preview한다.

- dirty 상태에서는 preview 버튼을 비활성화하거나 저장 안내를 표시한다.
- 후속으로 draft workflow body를 Spring에 보내는 preview를 검토할 수 있다.

### 8.4 타입별 renderer

canonical `type` 기준 renderer를 사용한다.

- `FILE_LIST`: 파일 목록
- `SINGLE_FILE`: 파일 카드
- `TEXT`: 텍스트 preview
- `EMAIL_LIST`: 메일 목록
- `SINGLE_EMAIL`: 메일 카드
- `SPREADSHEET_DATA`: 표
- `SCHEDULE_DATA`: 일정 목록
- `API_RESPONSE`: 요약 카드 + 상세 JSON
- `OUTPUT_PREVIEW`: 전송/저장 예정 데이터

Raw JSON은 기본 화면에 노출하지 않고 상세 영역에만 둔다.

## 9. 구현 범위 분할

전체 목표는 실행 전 노드 데이터 preview지만, 한 번에 모두 구현하면 source 조회, LLM 호출, loop sample, output no-write가 동시에 엮인다.
따라서 실제 구현은 아래처럼 작은 milestone으로 나눈다.

### Milestone 1. 실행 후 canonical payload 표시 개선

목표:

- 이미 존재하는 최신 실행 데이터 API를 그대로 사용한다.
- `inputData`, `outputData`의 canonical `type`을 기준으로 사용자 친화적인 UI를 제공한다.
- 백엔드 기능 추가 없이 프론트에서 즉시 체감 가능한 개선을 만든다.

범위:

- `FILE_LIST`: 파일 목록, 파일명, MIME 타입, 크기, 링크 표시
- `SINGLE_FILE`: 파일 카드, 파일명, MIME 타입, 링크, 본문 일부 표시
- `TEXT`: 텍스트 본문 preview
- `EMAIL_LIST`: 메일 목록, 제목, 발신자, 날짜, 본문 일부 표시
- `SINGLE_EMAIL`: 메일 카드, 제목, 발신자, 본문, 첨부 표시
- `SPREADSHEET_DATA`: 헤더와 행을 표로 표시
- `SCHEDULE_DATA`: 일정 목록 표시
- `API_RESPONSE`: 요약 카드와 상세 JSON 표시

제외:

- 실행 전 실제 source 조회
- LLM dry-run
- 도착 노드 no-write preview

완료 기준:

- 실행 후 노드 클릭 시 JSON 원문보다 타입별 UI가 먼저 보인다.
- Raw JSON은 상세 보기로만 제공된다.

### Milestone 2. 시작 노드 source metadata preview

목표:

- 실행 전 시작 노드 설정 완료 후 실제 source metadata를 보여준다.
- 사용자가 워크플로우 입력 데이터가 무엇인지 실행 전에 확인할 수 있게 한다.

범위:

- Spring preview endpoint shell 추가
- FastAPI source preview endpoint 추가
- Google Drive, Canvas LMS, Gmail source metadata preview
- source 목록은 `limit`을 적용하고 `truncated`를 응답한다.
- 기본값은 metadata-only이며 파일 본문은 가져오지 않는다.

제외:

- 중간 노드 처리 결과 preview
- LLM 호출
- output no-write preview

완료 기준:

- 시작 노드에서 Google Drive 폴더/Canvas 과목/Gmail label의 예상 입력 목록이 보인다.
- preview 결과가 execution history에 저장되지 않는다.

### Milestone 3. 하나씩 처리 sample preview

목표:

- 목록형 source preview에서 첫 번째 item을 sample로 선택해 다음 노드의 입력 preview로 전달한다.

범위:

- `FILE_LIST -> SINGLE_FILE`
- `EMAIL_LIST -> SINGLE_EMAIL`
- `SCHEDULE_DATA -> SCHEDULE_DATA` with one item
- `SPREADSHEET_DATA -> SPREADSHEET_DATA` with one row
- preview meta에 `sampled`, `sampleIndex`, `sampleReason` 포함

제외:

- 전체 item 반복 처리
- LLM 처리 결과 생성

완료 기준:

- 하나씩 처리 다음 노드의 들어오는 데이터가 첫 번째 sample 기준으로 표시된다.
- 사용자에게 sample preview라는 사실이 명확히 보인다.

### Milestone 4. preview-safe 중간 노드 dry-run

목표:

- side effect가 없는 중간 노드만 preview-safe whitelist로 dry-run한다.

preview-safe whitelist:

- `passthrough`
- `data_filter`
- `llm`
- `if_else`

주의:

- `llm`은 실제 LLM 호출을 허용하되 사용자 명시 액션으로만 호출한다.
- 향후 외부 write가 있는 중간 노드가 추가되면 whitelist에 넣지 않는다.

제외:

- output node
- branch 전체 path 탐색
- 여러 branch 결과 동시 preview

완료 기준:

- 저장된 workflow 기준으로 선택 중간 노드까지 preview 결과가 반환된다.
- preview 실패는 execution failure와 별도 상태로 표시된다.

### Milestone 5. 도착 노드 no-write preview

목표:

- 도착 노드가 실제 write를 하지 않고 전송/저장 예정 데이터만 보여준다.

범위:

- 기존 `OutputNodeStrategy.execute()` 호출 금지
- `preview_output.py` 같은 별도 builder 사용
- Google Drive: 업로드 예정 파일 목록과 대상 폴더 표시
- Gmail: 수신자, 제목, 본문 preview, 첨부 표시
- Slack/Notion/Sheets/Calendar: 전송 예정 payload 표시

완료 기준:

- preview 호출 중 upload/send/create API가 호출되지 않는다.
- output preview payload가 `OUTPUT_PREVIEW` 타입으로 반환된다.

### Milestone 6. draft workflow preview

목표:

- 저장 전 변경사항까지 preview에 반영한다.

범위:

- Frontend가 현재 editor nodes/edges를 request body로 전달
- Spring이 저장된 workflow 대신 draft body를 FastAPI runtime model로 변환

제외:

- 1차 구현에서는 제외한다.

완료 기준:

- dirty 상태에서도 저장 없이 preview 가능하다.

## 10. 1차 구현 권장 범위

실제 첫 이슈는 너무 크게 잡지 않는다.

권장 1차 범위:

1. Milestone 1: 실행 후 canonical payload 표시 개선
2. Milestone 2 중 일부: 시작 노드 source metadata preview API skeleton

더 보수적인 1차 범위:

1. Milestone 1만 먼저 구현
2. 백엔드 preview API는 별도 이슈로 분리

이유:

- 현재 백엔드는 실행 후 canonical payload를 이미 제공한다.
- 사용자가 즉시 체감하는 문제인 JSON 원문 노출을 프론트만으로 줄일 수 있다.
- preview/dry-run은 source, LLM, output no-write가 얽히므로 별도 백엔드 이슈로 분리하는 편이 안전하다.

## 11. 구현 단계

### Step 1. Spring preview shell

- `WorkflowPreviewController` 추가
- `NodePreviewRequest/Response` DTO 추가
- 권한, node existence, 설정 상태 검증
- FastAPI 호출 없이 unavailable/skeleton 응답까지 테스트

### Step 2. Spring FastAPI bridge

- `FastApiClient.previewNode()` 추가
- token 수집 로직 공용화
- runtime model과 service token을 FastAPI에 전달

### Step 3. FastAPI preview endpoint

- `app/models/preview.py` 추가
- `POST /api/v1/workflows/{workflowId}/nodes/{nodeId}/preview` 추가
- `WorkflowPreviewExecutor` skeleton 추가

### Step 4. source preview

- Google Drive, Canvas LMS, Gmail source preview 구현
- metadata 중심 응답
- limit/truncated meta 반환

### Step 5. middle node dry-run

- LLM, data filter, passthrough dry-run 연결
- preview failure 응답 정리
- AI 호출 허용

### Step 6. loop sample preview

- 목록형 payload 첫 번째 item 변환
- sampled meta 반환
- 다음 노드 input preview 연결

### Step 7. output no-write preview

- output node 전용 preview builder 추가
- 실제 write strategy 호출 금지 테스트 추가

### Step 8. Frontend 연결

- preview API 타입과 hook 추가
- 노드 패널에 preview 버튼 추가
- preview/execution/schema 표시 우선순위 적용
- canonical type별 renderer 적용

## 12. 테스트 계획

### 12.1 Spring 테스트

- 소유자가 preview 요청하면 FastAPI 호출
- 공유 사용자는 preview 거부
- nodeId가 없으면 오류
- 설정 미완료 노드는 `status=unavailable`
- OAuth token이 없으면 `status=unavailable`
- FastAPI 오류는 `status=failed` 또는 기존 오류 정책에 맞게 변환

### 12.2 FastAPI 테스트

- source preview가 DB에 execution 기록을 만들지 않음
- Google Drive folder preview가 `FILE_LIST` 반환
- Canvas course preview가 `FILE_LIST` 반환
- LLM preview가 `TEXT` 반환
- `FILE_LIST -> loop -> LLM` preview에서 첫 번째 파일만 sample 처리
- output preview에서 upload/send/create 메서드가 호출되지 않음

### 12.3 Frontend 테스트

- 실행 전 preview 버튼으로 preview data 표시
- preview 실패가 실제 실행 실패처럼 보이지 않음
- 최신 실행 데이터와 preview data 라벨이 분리됨
- dirty 상태에서 저장 안내 표시
- canonical type별 renderer가 JSON 원문보다 우선 표시됨

## 13. 결정 사항

- preview는 소유자만 가능하다.
- preview 결과는 저장하지 않는다.
- preview는 기존 execution flow와 분리한다.
- 도착 노드는 write 금지다.
- AI preview는 실제 LLM 호출을 허용한다.
- 하나씩 처리 preview는 첫 번째 항목만 사용한다.
- 1차 구현은 저장된 workflow 기준으로 한다.
- 실제 구현은 milestone 단위로 나눈다.
- 중간 노드는 preview-safe whitelist에 포함된 strategy만 dry-run한다.

## 14. 남은 논의

- source preview의 기본 `limit` 값
- `includeContent=true` 지원 여부와 최대 본문 크기
- branch preview를 v1에서 어디까지 지원할지
- preview 응답 cache가 필요한지
- AI preview 호출 비용 안내 문구
