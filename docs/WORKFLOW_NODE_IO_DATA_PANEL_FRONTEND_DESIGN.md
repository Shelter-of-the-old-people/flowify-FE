# Workflow Node IO Data Panel Frontend Design

> 작성일: 2026-04-30  
> 목적: 워크플로우 에디터의 "들어오는 데이터" / "출력 데이터" 패널을 백엔드의 최신 실행 데이터 및 노드 스키마 프리뷰 API와 연결한다.  
> 기준 문서: `docs/backend/WORKFLOW_NODE_IO_DATA_BACKEND_REQUEST.md` 및 백엔드 최신 구현

---

## 0. 백엔드 확인 결과

확인 기준:

- 백엔드 프로젝트: `D:\flowify-be\flowify-BE-spring`
- 브랜치 상태: `main...origin/main`
- 최신 커밋: `01edf10 feat: 최신 실행 조회 API (GET /executions/latest)`

실제 구현 확인 결과:

- `GET /api/workflows/{id}/executions`
- `GET /api/workflows/{id}/executions/latest`
- `GET /api/workflows/{id}/executions/{execId}`
- `GET /api/workflows/{id}/executions/latest/nodes/{nodeId}/data`
- `GET /api/workflows/{id}/executions/{execId}/nodes/{nodeId}/data`
- `GET /api/workflows/{id}/nodes/{nodeId}/schema-preview`

모두 구현되어 있다.

구현상 중요한 세부사항:

- 실행 목록은 `findByWorkflowId(workflowId)` 기반이라 정렬 보장이 없다.
- 최신 실행 판단은 `findFirstByWorkflowIdOrderByStartedAtDesc(workflowId)` 기반이다.
- 최신 실행이 없으면 `/executions/latest`는 `ApiResponse.ok(null)`을 반환한다.
- `ApiResponse`는 `@JsonInclude(NON_NULL)`라서 `data` 필드가 생략될 수 있다.
- 최신 노드 데이터는 실행이 없어도 `NodeDataResponse`를 반환하며 `reason: "NO_EXECUTION"`을 내려준다.
- 실행 중인 workflow의 노드 데이터는 `reason: "EXECUTION_RUNNING"`을 내려주고 `status`는 비어 있을 수 있다.
- 노드 schema preview는 현재 구현상 `input`/`output`을 null로 두기보다 `UNKNOWN` schema object로 채운다.
- 실행 로그 조회 API는 workflow 소유자만 접근 가능하다.
- schema preview API는 workflow 조회 권한이 있으면 접근 가능하므로 공유 사용자도 조회 가능하다.

따라서 프론트 설계는 유효하되, 구현 단계에서는 `reason` 우선 해석과 `data` 생략 방어가 반드시 필요하다.

---

## 1. 목표

선택한 노드 기준으로 사용자가 데이터 흐름을 이해할 수 있게 만든다.

- 들어오는 데이터: 현재 노드가 이전 노드 또는 워크플로우 시작점에서 받은 데이터
- 출력 데이터: 현재 노드가 처리 후 다음 노드로 넘긴 데이터
- 실행 전/실행 결과 없음: 실제 데이터 대신 노드 input/output schema preview
- 실행 중/실패/스킵: 데이터가 없거나 불완전한 이유를 상태로 설명

이번 작업의 핵심은 패널 문구를 바꾸는 것이 아니라, 실행 데이터와 스키마 데이터를 같은 UI에서 자연스럽게 fallback 하도록 프론트 데이터 모델을 정리하는 것이다.

---

## 2. 현재 구현 상태

### 2.1 InputPanel

현재 `src/widgets/input-panel/ui/InputPanel.tsx`는 그래프 메타데이터만 사용한다.

- `activePanelNodeId`, `nodes`, `edges`, `nodeStatuses`를 Zustand store에서 읽는다.
- incoming edge의 첫 번째 source node를 찾는다.
- source node의 `outputTypes[0]`를 "출력 타입"으로 표시한다.
- middle node가 설정 완료 상태이면 choice action, 선택 옵션, custom input, 노드 상태를 표시한다.
- 실제 실행 데이터, 최신 실행, node log, schema preview는 조회하지 않는다.

따라서 지금의 "들어오는 데이터" 패널은 실행 결과가 아니라 정적 그래프 메타데이터 기반 placeholder이다.

### 2.2 OutputPanel

현재 `src/widgets/output-panel/ui/OutputPanel.tsx`는 세 가지 모드가 섞여 있다.

- choice wizard 모드
- 설정 완료 middle node의 출력 상세 모드
- 일반 node config 설정 모드

출력 상세 모드에서는 `activeNode.data.outputTypes[0]`만 표시하고, 실제 `outputData`는 표시하지 않는다.

### 2.3 Execution API 계층

현재 `entities/execution`은 기존 실행 목록/상세 API만 알고 있다.

- `getExecutionListAPI(workflowId)`
- `getExecutionAPI(workflowId, executionId)`
- `useWorkflowExecutionsQuery`
- `useWorkflowExecutionQuery`

하지만 백엔드가 새로 제공한 아래 API는 아직 프론트에 없다.

- 최신 실행 조회
- 최신 실행 기준 노드 데이터 조회
- 특정 실행 기준 노드 데이터 조회
- 노드 단위 schema preview 조회

또한 현재 `ExecutionLog` 타입에는 `id`가 필수인데, 백엔드 `NodeLog`에는 별도 `id`가 없다. 프론트 타입을 백엔드 계약에 맞춰야 한다.

---

## 3. 백엔드 계약 요약

### 3.1 Execution summary

```http
GET /api/workflows/{workflowId}/executions
GET /api/workflows/{workflowId}/executions/latest
```

응답 데이터:

```ts
interface ExecutionSummary {
  id: string;
  workflowId: string;
  state: ExecutionRunStatus;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  errorMessage: string | null;
  nodeCount: number;
  completedNodeCount: number;
}
```

주의:

- 최신 실행이 없으면 `/executions/latest`는 `data: null` 또는 `data` 생략 형태가 될 수 있다.
- 프론트 API 함수는 `undefined`를 `null`로 정규화해서 hook 사용자에게는 `ExecutionSummary | null`만 노출한다.
- `completedNodeCount`는 `success` 상태 노드만 센다. 실패/스킵까지 포함한 진행률로 해석하지 않는다.
- 실행 목록은 서버 정렬을 전제하지 않는다. 최신 실행 판단은 `/executions/latest`를 우선 사용하고, 목록을 사용할 때는 클라이언트에서 `startedAt` 기준 정렬을 유지한다.

### 3.2 Execution detail

```http
GET /api/workflows/{workflowId}/executions/{executionId}
```

응답 데이터:

```ts
interface ExecutionDetail extends ExecutionSummary {
  nodeLogs: ExecutionLog[];
}

interface ExecutionLog {
  nodeId: string;
  status: string | null;
  inputData?: Record<string, unknown> | null;
  outputData?: Record<string, unknown> | null;
  snapshot?: ExecutionSnapshot | null;
  error?: ExecutionErrorDetail | null;
  startedAt: string | null;
  finishedAt: string | null;
}
```

주의:

- `ExecutionLog.id`는 제거한다.
- `userId`는 새 detail DTO에 없으므로 제거하거나 optional로 유지하되 UI 로직에서 의존하지 않는다.

### 3.3 Node data

```http
GET /api/workflows/{workflowId}/executions/latest/nodes/{nodeId}/data
GET /api/workflows/{workflowId}/executions/{executionId}/nodes/{nodeId}/data
```

응답 데이터:

```ts
type NodeDataUnavailableReason =
  | "NO_EXECUTION"
  | "EXECUTION_RUNNING"
  | "NODE_NOT_EXECUTED"
  | "NODE_SKIPPED"
  | "NODE_FAILED"
  | "DATA_EMPTY";

interface ExecutionNodeData {
  executionId: string | null;
  workflowId: string;
  nodeId: string;
  status: string | null;
  inputData?: Record<string, unknown> | null;
  outputData?: Record<string, unknown> | null;
  snapshot?: ExecutionSnapshot | null;
  error?: ExecutionErrorDetail | null;
  startedAt: string | null;
  finishedAt: string | null;
  available: boolean;
  reason: NodeDataUnavailableReason | string | null;
}
```

주의:

- 현재 백엔드의 `available`은 `inputData != null || outputData != null` 기준이다.
- 일부 실패/스킵 케이스에서 빈 객체가 저장되면 `available: true`가 될 수 있다.
- 프론트는 `available`보다 `reason`, `status`, `error`를 우선 해석한다.
- `NO_EXECUTION`, `EXECUTION_RUNNING`, `NODE_NOT_EXECUTED` 응답에서는 `status`, `startedAt`, `finishedAt` 등이 비어 있을 수 있다.
- 최신 실행이 없는 경우에도 node data API는 `null`이 아니라 `reason: "NO_EXECUTION"`을 가진 객체를 반환한다.

### 3.4 Node schema preview

```http
GET /api/workflows/{workflowId}/nodes/{nodeId}/schema-preview
```

응답 데이터:

```ts
interface NodeSchemaPreviewResponse {
  nodeId: string;
  input: SchemaPreviewResponse | null;
  output: SchemaPreviewResponse | null;
}
```

`SchemaPreviewResponse`는 기존 workflow schema preview와 같은 snake_case 계약을 사용한다.

```ts
interface SchemaPreviewResponse {
  schema_type: string;
  is_list: boolean;
  fields: SchemaPreviewFieldResponse[];
  display_hints: Record<string, string>;
}
```

현재 백엔드는 `dataType` 또는 `outputDataType`이 없으면 `input`/`output`을 null로 반환하지 않고 `schema_type: "UNKNOWN"`인 schema object를 반환한다. 프론트 타입은 방어적으로 null을 허용하되, UI는 `UNKNOWN` schema를 "스키마 미정" 상태로 해석한다.

---

## 4. 권한 정책

백엔드 실행 로그는 workflow 소유자만 조회할 수 있다.

프론트에서는 `WorkflowEditorPage`가 이미 owner 여부를 기준으로 아래 capability를 세팅한다.

- `canEditNodes`
- `canSaveWorkflow`
- `canRunWorkflow`

노드 실행 데이터 조회는 `canRunWorkflow`를 기준으로 활성화한다.

- 소유자: 최신 실행 / 노드 실행 데이터 조회
- 공유 사용자: 실행 데이터 query를 호출하지 않음
- 공유 사용자도 볼 수 있는 schema preview는 조회 가능

공유 사용자가 패널을 열면 실행 데이터 영역에는 "실행 결과는 소유자만 확인할 수 있습니다." 계열의 안내를 보여주고, 가능하면 schema preview를 표시한다.

---

## 5. 저장 상태와 데이터 기준

실행 데이터와 노드 schema preview는 모두 백엔드에 저장된 workflow 기준이다.

반면 에디터의 `nodes`, `edges`, `nodeStatuses`는 현재 화면의 로컬 상태이며 저장 전 변경분을 포함할 수 있다.

따라서 `isDirty === true`인 상태에서는 아래 원칙을 따른다.

- 최신 실행 데이터는 "최근 실행 기준" 데이터로 표시한다.
- 현재 편집 중인 내용과 실행 결과가 다를 수 있음을 안내한다.
- schema preview는 저장된 workflow 기준이므로, dirty 상태에서는 보조 정보로만 사용한다.
- dirty 상태에서 schema preview가 현재 로컬 그래프와 충돌할 수 있으면 기존 정적 그래프 메타데이터를 우선 fallback으로 사용한다.

패널 모델은 `isWorkflowDirty`를 입력으로 받아 stale 안내 노출 여부를 결정한다.

```ts
type UseNodeDataPanelModelParameters = {
  panelKind: "input" | "output";
  workflowId: string | undefined;
  nodeId: string | null;
  canViewExecutionData: boolean;
  isWorkflowDirty: boolean;
};
```

이번 단계에서는 dirty 상태에서 실행 데이터 조회를 막지는 않는다. 사용자가 가장 최근 실행 결과를 확인하는 것은 여전히 유용하기 때문이다. 대신 UI에서 기준을 명확히 한다.

---

## 6. 프론트 레이어 설계

### 6.1 `entities/execution/api`

추가 파일:

- `get-latest-execution.api.ts`
- `get-latest-execution-node-data.api.ts`
- `get-execution-node-data.api.ts`

수정 파일:

- `types.ts`
- `index.ts`
- `get-execution-list.api.ts`
- `get-execution.api.ts`

설계:

- 실행 목록은 `ExecutionSummary[]`를 반환한다.
- 실행 상세는 `ExecutionDetail`을 반환한다.
- 최신 실행은 `ExecutionSummary | null`을 반환한다.
- 노드 데이터는 `ExecutionNodeData`를 반환한다.

최신 실행 API는 `data` 생략을 방어한다.

```ts
export const getLatestExecutionAPI = async (
  workflowId: string,
): Promise<ExecutionSummary | null> => {
  const data = await request<ExecutionSummary | null | undefined>({
    url: `/workflows/${workflowId}/executions/latest`,
    method: "GET",
  });

  return data ?? null;
};
```

### 6.2 `entities/execution/model`

추가 hook:

- `useLatestWorkflowExecutionQuery`
- `useLatestExecutionNodeDataQuery`
- `useExecutionNodeDataQuery`

수정:

- `query-keys.ts`
- `execution-utils.ts`
- `index.ts`

query key:

```ts
latest: (workflowId: string) =>
  [...executionKeys.workflow(workflowId), "latest"] as const,

nodeData: (workflowId: string, executionId: string, nodeId: string) =>
  [...executionKeys.detail(workflowId, executionId), "node", nodeId, "data"] as const,

latestNodeData: (workflowId: string, nodeId: string) =>
  [...executionKeys.latest(workflowId), "node", nodeId, "data"] as const,
```

polling:

- 최신 실행이 `pending` 또는 `running`이면 `executionPollInterval`로 refetch
- 최신 노드 데이터가 `EXECUTION_RUNNING`이거나 `status`가 `pending/running`이면 refetch
- 소유자 권한이 없으면 query 자체를 비활성화

구현 주의:

- 패널에서 최신 실행 summary와 최신 노드 데이터를 둘 다 반드시 호출할 필요는 없다.
- 노드 데이터 표시만 필요하면 `latestNodeData` 하나로 `NO_EXECUTION`까지 판단할 수 있다.
- 상단 실행 상태나 실행 시각이 필요할 때만 `latest` query를 함께 사용한다.

### 6.3 `entities/workflow/api`

추가 파일:

- `get-workflow-node-schema-preview.api.ts`

수정 파일:

- `types.ts`
- `index.ts`

추가 타입:

```ts
export interface NodeSchemaPreviewResponse {
  nodeId: string;
  input: SchemaPreviewResponse | null;
  output: SchemaPreviewResponse | null;
}
```

### 6.4 `entities/workflow/model`

추가 hook:

- `useWorkflowNodeSchemaPreviewQuery`

query key:

```ts
nodeSchemaPreview: (workflowId: string, nodeId: string) =>
  [...workflowKeys.detail(workflowId), "nodes", nodeId, "schema-preview"] as const,
```

---

## 7. 패널 공통 모델

InputPanel과 OutputPanel이 같은 데이터를 다르게 보여주므로 공통 모델을 만든다.

위치 후보:

```text
src/widgets/node-data-panel/
  model/
    types.ts
    node-data-panel-utils.ts
    useNodeDataPanelModel.ts
  ui/
    DataPreviewBlock.tsx
    DataStateNotice.tsx
    SchemaPreviewBlock.tsx
    NodeExecutionStatusBlock.tsx
  index.ts
```

선택 이유:

- input/output panel 모두에서 재사용한다.
- 특정 page 전용이 아니라 editor panel widget의 공통 UI다.
- `entities`는 API와 순수 도메인 타입만 두고, 패널 표시용 view model은 widget에 둔다.

### 7.1 `useNodeDataPanelModel`

입력:

```ts
type UseNodeDataPanelModelParameters = {
  panelKind: "input" | "output";
  workflowId: string | undefined;
  nodeId: string | null;
  canViewExecutionData: boolean;
  isWorkflowDirty: boolean;
};
```

반환:

```ts
type NodeDataPanelModel = {
  activeNode: Node<FlowNodeData> | null;
  sourceNode: Node<FlowNodeData> | null;
  isStartNode: boolean;
  isEndNode: boolean;
  staticInputLabel: string | null;
  staticOutputLabel: string | null;
  executionData: ExecutionNodeData | null;
  schemaPreview: NodeSchemaPreviewResponse | null;
  state: NodeDataPanelState;
  dataToDisplay: unknown;
  schemaToDisplay: SchemaPreviewResponse | null;
  isStaleAgainstCurrentEditor: boolean;
};
```

`dataToDisplay` 규칙:

- input panel: `executionData.inputData`
- input panel + start node: `executionData.inputData ?? executionData.outputData`
- output panel: `executionData.outputData`

`schemaToDisplay` 규칙:

- input panel: `schemaPreview.input`
- output panel: `schemaPreview.output`

### 7.2 상태 해석

`available`만 보지 않고 아래 순서로 해석한다.

1. 권한 없음
2. query loading
3. query error
4. `reason === "NO_EXECUTION"`
5. `reason === "EXECUTION_RUNNING"` 또는 `status` in `pending/running`
6. `reason === "NODE_SKIPPED"` 또는 `status === "skipped"`
7. `reason === "NODE_FAILED"` 또는 `status === "failed"`
8. `reason === "NODE_NOT_EXECUTED"`
9. 데이터가 null/undefined
10. 데이터가 빈 object/array
11. 데이터 표시 가능

예상 상태:

```ts
type NodeDataPanelState =
  | "permission-denied"
  | "loading"
  | "error"
  | "no-execution"
  | "execution-running"
  | "node-skipped"
  | "node-failed"
  | "node-not-executed"
  | "data-empty"
  | "data-ready";
```

---

## 8. UI 설계

### 8.1 공통 UI 컴포넌트

`DataPreviewBlock`

- `unknown` 데이터를 받아 JSON 형태로 표시한다.
- object/array가 아니어도 문자열로 안전하게 표시한다.
- 긴 데이터는 초기 구현에서 전문 표시하되, 패널 높이에 맞춰 내부 scroll 영역으로 제한한다.
- 민감 데이터 masking은 이번 범위에서 제외한다.

`SchemaPreviewBlock`

- schema type, list 여부, field 목록을 표시한다.
- field가 없으면 타입 중심으로 표시한다.
- 기존 `SchemaPreviewResponse`의 `schema_type`, `is_list`, `fields`, `display_hints`를 그대로 사용한다.

`DataStateNotice`

- 권한 없음, 실행 없음, 실행 중, 스킵, 실패, 데이터 없음 상태를 표시한다.
- 실패 상태에서는 `error.message` 또는 `errorMessage`를 함께 표시한다.
- dirty 상태에서 실행 데이터 또는 schema preview가 표시되면 "최근 저장/실행 기준" 안내를 표시한다.

### 8.2 InputPanel 표시 규칙

우선순위:

1. 실행 데이터 조회 가능 + `inputData` 표시 가능
2. 실패 상태 + `inputData` 존재 시 inputData와 error 함께 표시
3. 실행 없음/데이터 없음/권한 없음이면 schema preview 표시
4. schema preview도 없으면 기존 정적 그래프 정보 표시

시작 노드:

- 이전 노드가 없으므로 "워크플로우 입력 데이터"를 기본 설명으로 유지한다.
- 최신 실행에 start node `inputData` 또는 `outputData`가 들어오면 표시한다.
- 실행 데이터가 없으면 input schema preview를 표시한다.

처리 노드:

- 이전 노드 output type은 보조 정보로 유지한다.
- 실제 `inputData`가 있으면 데이터 미리보기를 우선 표시한다.
- choice action, 선택 옵션, custom input, 노드 상태 영역은 유지한다.

### 8.3 OutputPanel 표시 규칙

wizard 모드와 설정 모드는 건드리지 않는다.

설정 완료 middle node의 detail mode에서만 출력 데이터 영역을 교체한다.

우선순위:

1. 실행 데이터 조회 가능 + `outputData` 표시 가능
2. 실패/스킵/미실행 상태 안내
3. 실행 없음이면 output schema preview 표시
4. schema preview도 없으면 기존 output type placeholder 표시

주의:

- 현재 `OutputPanel`은 설정 UI와 출력 상세 UI가 같은 자리를 쓴다.
- 이번 작업은 기존 detail mode 조건을 유지한다.
- start/end/sink 노드까지 항상 출력 데이터 패널을 보여주려면 설정 UI와 출력 데이터 UI를 동시에 노출하는 별도 UX, 예를 들어 tab/segmented control 설계가 먼저 필요하다.

---

## 9. 기존 기능 영향

### 9.1 EditorRemoteBar

실행 목록 API가 summary DTO로 바뀌어도 `EditorRemoteBar`의 기본 흐름은 유지 가능하다.

- `getLatestExecution(executions)`는 `startedAt`만 필요하다.
- `activeExecution.state`는 summary/detail 모두에 존재한다.
- rollback/stop은 execution id만 필요하다.

다만 타입은 `ExecutionDetail[]`에서 `ExecutionSummary[]`로 바꿔야 한다.

### 9.2 기존 실행 상세 query

`useWorkflowExecutionQuery`는 계속 detail DTO를 반환한다.

- `trackedExecutionId`가 있는 실행 추적은 detail query를 사용한다.
- detail의 `nodeLogs`는 실행 추적/디버깅에 남겨둔다.
- 패널은 최신 노드 데이터 API를 우선 사용하므로 detail 전체를 매번 가져오지 않는다.

### 9.3 공유 workflow

공유 workflow에서는 `canRunWorkflow === false`이므로 실행 데이터 query를 꺼둔다.

- 403 toast가 반복으로 뜨지 않게 한다.
- schema preview는 계속 조회한다.
- 패널 UI는 읽기 전용 설명만 보여준다.

---

## 10. 구현 단계

### Step 1. 실행 API 타입과 query 계층 정리

작업:

- `ExecutionSummary`, `ExecutionDetail`, `ExecutionLog`, `ExecutionNodeData` 타입 정리
- `ExecutionLog.id` 제거
- 최신 실행 API 추가
- 노드 데이터 API 추가
- query key와 hook 추가
- 기존 execution list 사용처 타입 보정

검토:

- `EditorRemoteBar`가 summary list로도 정상 동작하는지
- 최신 실행 없음 응답이 `null`로 정규화되는지
- 실행 중 polling 조건이 깨지지 않는지

### Step 2. 노드 schema preview API 추가

작업:

- `NodeSchemaPreviewResponse` 타입 추가
- `getWorkflowNodeSchemaPreviewAPI` 추가
- `useWorkflowNodeSchemaPreviewQuery` 추가
- query key 추가

검토:

- 기존 workflow schema preview API와 타입 충돌이 없는지
- snake_case schema 필드를 그대로 유지하는지

### Step 3. 공통 node data panel 모델 추가

작업:

- `widgets/node-data-panel/model` 추가
- active node, source node, schema, execution data를 합치는 hook 작성
- reason/status 해석 helper 작성
- 데이터 표시 대상 input/output 분기 작성
- dirty 상태 기준 안내 플래그 작성

검토:

- `available`만 믿지 않는지
- 권한 없음, 실행 없음, 실행 중, 실패, 스킵, 빈 데이터 상태가 분리되는지
- query enabled 조건이 과도하게 호출하지 않는지
- dirty 상태에서 현재 그래프와 최신 실행 결과 기준을 혼동하지 않는지

### Step 4. 공통 UI 컴포넌트 추가

작업:

- `DataPreviewBlock`
- `SchemaPreviewBlock`
- `DataStateNotice`
- 필요 시 `NodeExecutionStatusBlock`

검토:

- Chakra props만 사용하는지
- 패널 내부 scroll이 깨지지 않는지
- object가 아닌 값도 표시 가능한지

### Step 5. InputPanel 연결

작업:

- 기존 placeholder를 공통 모델 기반 데이터 영역으로 교체
- source node output type, choice summary, node status는 유지
- start node fallback 문구 유지

검토:

- 시작 노드, 연결 없는 노드, 처리 노드 모두 정상 표시되는지
- 실행 데이터가 없어도 기존 정보가 사라지지 않는지

### Step 6. OutputPanel 연결

작업:

- detail mode의 placeholder를 공통 모델 기반 출력 데이터 영역으로 교체
- wizard mode와 settings mode는 변경하지 않음

검토:

- wizard 진행 중 API 호출/렌더링이 섞이지 않는지
- 설정 완료 노드에서만 출력 데이터가 보이는지

### Step 7. 검증

자동 검증:

- `pnpm lint`
- `pnpm tsc`
- 가능하면 node data state helper 단위 테스트

수동 검증:

- 실행 전 노드 클릭: schema preview 표시
- 실행 성공 후 노드 클릭: input/output data 표시
- 실행 실패 노드 클릭: inputData + error 표시
- skipped node 클릭: skipped 안내 표시
- 실행 중 노드 클릭: 실행 중 안내 및 polling
- 공유 사용자로 접근: 실행 데이터 query 미호출, 권한 안내 + schema preview

---

## 11. 이번 범위에서 제외

- 민감 데이터 masking
- 대용량 데이터 pagination/virtualization
- 이전 실행 선택 UI
- 특정 execution id를 사용자가 고르는 히스토리 패널
- 노드별 실행 timeline
- output preview를 이미지/파일 뷰어로 렌더링하는 고급 preview

이번 작업은 최신 실행 기준의 input/output 데이터 표시와 schema fallback에 집중한다.
