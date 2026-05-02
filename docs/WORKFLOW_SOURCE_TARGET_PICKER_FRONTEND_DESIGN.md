# Workflow Source Target Picker Frontend Design

> 작성일: 2026-05-02  
> 목적: 백엔드가 구현한 source target option API와 enhanced node IO preview 계약을 프론트 에디터에 연결한다.  
> 기준 문서: `docs/backend/WORKFLOW_SOURCE_TARGET_PICKER_BACKEND_COMPLETION_REPORT.md`

---

## 1. 목표

이번 작업의 목표는 두 가지다.

1. 시작 노드 설정 시 사용자가 Canvas LMS 과목/학기, Google Drive 파일/폴더를 직접 타이핑하지 않고 선택할 수 있게 한다.
2. 실행 전에도 선택한 노드의 들어오는 데이터, 출력 데이터, 시작 노드 source summary를 백엔드 schema preview 계약 기반으로 표시한다.

사용자 관점의 변경점:

- Canvas LMS 시작 노드에서 과목명이나 학기를 목록에서 고른다.
- Google Drive 시작 노드에서 파일이나 폴더를 목록에서 고른다.
- 선택한 대상은 노드 설정에 id뿐 아니라 표시 이름도 함께 저장된다.
- 노드 패널은 실행 결과가 없더라도 예상 input/output schema와 source summary를 보여준다.
- 실행 결과 데이터가 있을 때는 기존 최신 실행 데이터 표시를 유지한다.

---

## 2. 백엔드 계약 요약

### 2.1 Target options

```http
GET /api/editor-catalog/sources/{serviceKey}/target-options
```

query parameters:

```ts
interface SourceTargetOptionsParameters {
  mode: string;
  parentId?: string;
  query?: string;
  cursor?: string;
}
```

response:

```ts
interface SourceTargetOptionsResponse {
  items: SourceTargetOptionItemResponse[];
  nextCursor: string | null;
}

interface SourceTargetOptionItemResponse {
  id: string;
  label: string;
  description: string | null;
  type: "course" | "term" | "file" | "folder" | string;
  metadata: Record<string, unknown>;
}
```

지원 picker:

| serviceKey | mode | picker type | option type |
|------------|------|-------------|-------------|
| `canvas_lms` | `course_files` | `course_picker` | `course` |
| `canvas_lms` | `course_new_file` | `course_picker` | `course` |
| `canvas_lms` | `term_all_files` | `term_picker` | `term` |
| `google_drive` | `single_file` | `file_picker` | `file` |
| `google_drive` | `file_changed` | `file_picker` | `file` |
| `google_drive` | `new_file` | `folder_picker` | `folder` |
| `google_drive` | `folder_new_file` | `folder_picker` | `folder` |
| `google_drive` | `folder_all_files` | `folder_picker` | `folder` |

프론트 저장 계약:

```json
{
  "target": "resource-id",
  "target_label": "사용자에게 보여줄 이름",
  "target_meta": {
    "term": "2026-1학기"
  }
}
```

`target`은 실행 계약이고, `target_label`과 `target_meta`는 UI 표시용이다.

### 2.2 Enhanced node schema preview

기존 endpoint는 유지하되 응답 구조가 확장됐다.

```http
GET /api/workflows/{workflowId}/nodes/{nodeId}/schema-preview
```

response:

```ts
interface NodeSchemaPreviewResponse {
  nodeId: string;
  input?: NodeInputPreviewResponse | null;
  output?: NodeOutputPreviewResponse | null;
  source?: SourceConfigSummaryResponse | null;
  nodeStatus?: NodeStatusSummaryResponse | null;
}

interface NodeInputPreviewResponse {
  dataType: string;
  label: string;
  sourceNodeId: string | null;
  sourceNodeLabel: string | null;
  schema: SchemaPreviewResponse;
}

interface NodeOutputPreviewResponse {
  dataType: string;
  label: string;
  schema: SchemaPreviewResponse;
}

interface SourceConfigSummaryResponse {
  service: string;
  serviceLabel: string;
  mode: string | null;
  modeLabel: string | null;
  target: string | null;
  targetLabel: string | null;
  canonicalInputType: string | null;
  triggerKind: string | null;
}

interface NodeStatusSummaryResponse {
  configured: boolean;
  executable: boolean;
  missingFields: string[] | null;
}
```

중요 변경:

- 기존 프론트 타입은 `input: SchemaPreviewResponse | null`을 기대한다.
- 신규 백엔드는 `input.schema`, `output.schema`에 실제 schema를 넣는다.
- 시작 노드는 `source` summary를 내려준다.

---

## 3. 현재 프론트 상태

### 3.1 이미 구현된 부분

- 최신 실행 노드 데이터 조회 API와 패널 연결이 있다.
- `widgets/node-data-panel` 공통 모델과 UI가 있다.
- `InputPanel`, `OutputPanel`은 실행 결과 데이터와 schema fallback을 일부 사용한다.
- source catalog 기반 시작 노드 생성 wizard가 있다.
- OAuth 연결 상태 확인과 연결 flow가 있다.

### 3.2 부족한 부분

- `NodeSchemaPreviewResponse` 타입이 구 계약이다.
- 패널 모델이 `schemaPreview.input` 자체를 schema로 사용하고 있어 신규 응답을 제대로 읽지 못한다.
- 시작 노드 source summary를 UI에 표시하지 않는다.
- `course_picker`, `term_picker` 라벨과 UI 처리가 없다.
- `file_picker`, `folder_picker`도 실제 option API를 사용하지 않고 수동 입력으로 처리된다.
- 시작 노드 생성 시 `target_label`, `target_meta`를 저장하지 않는다.
- Drive pagination의 `nextCursor`를 처리하지 않는다.

---

## 4. 설계 원칙

### 4.1 FSD 경계

- 백엔드 API 타입과 호출 함수는 `entities/workflow`에 둔다.
- target picker의 화면 흐름과 상태 조합은 `features/add-node`에 둔다.
- node data panel의 view model은 기존처럼 `widgets/node-data-panel`에 둔다.
- 공통 유틸이 다른 기능에서도 재사용될 근거가 생기기 전까지 `shared`로 올리지 않는다.

이번 작업에서는 새 slice를 만들지 않는다.

- `entities/catalog` 신설 금지: 기존 catalog API가 `entities/workflow`에 있으므로 같은 위치에 둔다.
- `features/source-target-picker` 신설 금지: 시작 노드 추가 wizard의 하위 입력 단계이므로 `features/add-node` 내부에 둔다.
- `widgets` 승격 금지: picker는 현재 add-node wizard 전용이다.

### 4.2 기존 wizard 유지

`ServiceSelectionPanel`의 기존 단계는 유지한다.

```text
service 선택
→ 인증 필요 시 auth
→ source mode 선택
→ target 선택
→ confirm
→ 노드 생성
```

변경은 `target 선택` 단계에 집중한다.

구현 시 기존 wizard card와 back/submit 흐름을 복제하지 않는다.

```text
ServiceSelectionPanel
→ SourceTargetForm
  → SourceTargetPicker
```

즉, `SourceTargetPicker`는 독립 wizard가 아니라 `SourceTargetForm` 내부의 입력 영역만 담당한다. `WizardCard`, title, back button, submit button은 기존 `SourceTargetForm` 구조를 재사용한다.

### 4.3 저장 계약

remote picker 선택 시:

```ts
config.target = selectedOption.id;
config.target_label = selectedOption.label;
config.target_meta = selectedOption.metadata;
```

수동 입력형 target에서는 기존 동작을 유지한다.

```ts
config.target = value.trim();
```

백엔드가 `targetLabel` fallback을 지원하므로 수동 입력형에서 `target_label`은 필수로 넣지 않는다.

### 4.4 기존 입력 방식 유지

`SourceTargetPicker`는 모든 target schema를 새 방식으로 갈아엎지 않는다.

- `course_picker`, `term_picker`, `file_picker`, `folder_picker`: remote option API 사용
- `day_picker`: 기존 요일 버튼 재사용
- `time_picker`: 기존 time input 재사용
- `text_input` 및 기타 schema: 기존 text input fallback 유지

이렇게 해야 기존 Gmail sender, YouTube 검색어, 뉴스 키워드 같은 수동 입력형 source가 깨지지 않는다.

---

## 5. API 계층 설계

### 5.1 `entities/workflow/api/types.ts`

추가 타입:

```ts
export type SourceTargetOptionType =
  | "course"
  | "term"
  | "file"
  | "folder"
  | string;

export interface SourceTargetOptionItemResponse {
  id: string;
  label: string;
  description: string | null;
  type: SourceTargetOptionType;
  metadata: Record<string, unknown>;
}

export interface SourceTargetOptionsResponse {
  items: SourceTargetOptionItemResponse[];
  nextCursor: string | null;
}

export interface SourceTargetOptionsParameters {
  mode: string;
  parentId?: string;
  query?: string;
  cursor?: string;
}
```

수정 타입:

```ts
export interface NodeInputPreviewResponse {
  dataType: string;
  label: string;
  sourceNodeId: string | null;
  sourceNodeLabel: string | null;
  schema: SchemaPreviewResponse;
}

export interface NodeOutputPreviewResponse {
  dataType: string;
  label: string;
  schema: SchemaPreviewResponse;
}

export interface SourceConfigSummaryResponse {
  service: string;
  serviceLabel: string;
  mode: string | null;
  modeLabel: string | null;
  target: string | null;
  targetLabel: string | null;
  canonicalInputType: string | null;
  triggerKind: string | null;
}

export interface NodeStatusSummaryResponse {
  configured: boolean;
  executable: boolean;
  missingFields: string[] | null;
}

export interface NodeSchemaPreviewResponse {
  nodeId: string;
  input?: NodeInputPreviewResponse | null;
  output?: NodeOutputPreviewResponse | null;
  source?: SourceConfigSummaryResponse | null;
  nodeStatus?: NodeStatusSummaryResponse | null;
}
```

### 5.2 API 함수

신규 파일:

```text
src/entities/workflow/api/get-source-target-options.api.ts
```

```ts
export const getSourceTargetOptionsAPI = (
  serviceKey: string,
  params: SourceTargetOptionsParameters,
): Promise<SourceTargetOptionsResponse> =>
  request<SourceTargetOptionsResponse>({
    url: `/editor-catalog/sources/${serviceKey}/target-options`,
    method: "GET",
    params,
  });
```

### 5.3 query key

`workflowKeys`에 추가한다.

```ts
sourceTargetOptionsRoot: (serviceKey: string) =>
  [...workflowKeys.sourceCatalog(), serviceKey, "target-options"] as const,

sourceTargetOptions: (
  serviceKey: string,
  params: SourceTargetOptionsParameters,
) =>
  [
    ...workflowKeys.sourceTargetOptionsRoot(serviceKey),
    {
      mode: params.mode,
      parentId: params.parentId ?? null,
      query: params.query?.trim() || null,
      cursor: params.cursor ?? null,
    },
  ] as const,
```

### 5.4 query hook

신규 파일:

```text
src/entities/workflow/model/useSourceTargetOptionsQuery.ts
```

기본 hook:

```ts
export const useSourceTargetOptionsQuery = (
  serviceKey: string | undefined,
  params: SourceTargetOptionsParameters | undefined,
  enabledOrOptions?:
    | boolean
    | QueryPolicyOptions<SourceTargetOptionsResponse>,
) => ...
```

구현 패턴은 기존 `useSourceCatalogQuery`, `useWorkflowNodeSchemaPreviewQuery`와 맞춘다.

- `resolveQueryPolicyOptions(enabledOrOptions)` 사용
- `toQueryMeta(options)` 사용
- `throwOnError: false` 유지
- `enabled`는 `Boolean(serviceKey && params?.mode) && (options?.enabled ?? true)` 기준
- serviceKey 또는 mode가 없을 때 queryFn이 실행되지 않도록 방어

초기 구현은 일반 query로 충분하다. Drive pagination은 같은 hook에 `cursor`를 바꿔 호출하는 방식으로 시작한다.

추후 폴더 탐색과 무한 스크롤을 강화할 때 `useInfiniteSourceTargetOptionsQuery`로 승격한다.

---

## 6. Target picker UI 설계

### 6.1 picker 타입 판별

`ServiceSelectionPanel` 내부의 helper를 확장한다.

```ts
const REMOTE_TARGET_SCHEMA_TYPES = new Set([
  "course_picker",
  "term_picker",
  "file_picker",
  "folder_picker",
]);

const isRemoteTargetPicker = (targetSchema: Record<string, unknown>) =>
  REMOTE_TARGET_SCHEMA_TYPES.has(getTargetSchemaType(targetSchema));
```

라벨 추가:

```ts
const TARGET_SCHEMA_LABELS = {
  course_picker: "과목",
  term_picker: "학기",
  file_picker: "파일",
  folder_picker: "폴더",
  ...
};
```

### 6.2 상태

기존 `selectedTargetValue`는 유지하되, remote picker 전용으로 선택 item을 추가한다.

```ts
const [selectedTargetValue, setSelectedTargetValue] = useState("");
const [selectedTargetOption, setSelectedTargetOption] =
  useState<SourceTargetOptionItemResponse | null>(null);
```

remote picker 선택 시:

```ts
setSelectedTargetOption(option);
setSelectedTargetValue(option.id);
```

source mode가 바뀌면 둘 다 초기화한다.

### 6.3 컴포넌트 분리

현재 `ServiceSelectionPanel.tsx`가 이미 큰 파일이므로 target 단계 UI는 최소한 아래 단위로 분리한다.

```text
src/features/add-node/ui/
  ServiceSelectionPanel.tsx
  SourceTargetPicker.tsx
```

`SourceTargetPicker` 책임:

- target schema type 판별
- remote picker면 `target-options` query 호출
- text/day/time picker면 기존 입력 UI 유지
- 선택 완료 가능 여부 반환

`SourceTargetPicker`가 하지 않는 일:

- wizard card 렌더링
- 뒤로가기 버튼 렌더링
- 다음 버튼 렌더링
- start step 전환
- 노드 생성 mutation 호출

이 책임은 기존 `SourceTargetForm`과 `ServiceSelectionPanel`에 남긴다.

props:

```ts
type SourceTargetPickerValue = {
  option: SourceTargetOptionItemResponse | null;
  value: string;
};

type Props = {
  mode: SourceModeResponse;
  serviceKey: string;
  value: SourceTargetPickerValue;
  onChange: (value: SourceTargetPickerValue) => void;
};
```

`SourceTargetForm`은 submit 가능 여부를 value 기준으로 판단한다.

```ts
const canSubmit = value.value.trim().length > 0;
```

remote picker에서 `option`이 없고 `value`만 있는 상태는 수동 입력 fallback으로 해석한다.

### 6.4 Remote picker UX

공통 구조:

- 상단 검색 input
- 목록
- 빈 결과
- 로딩
- 에러
- 더보기 버튼

Drive pagination:

- response `nextCursor`가 있으면 "더 보기" 버튼 표시
- 다음 페이지 호출 시 기존 items 뒤에 append
- `query`, `parentId`, `mode`가 바뀌면 items 초기화

초기 구현 방식:

- pagination 상태는 `SourceTargetPicker` 내부 로컬 상태로 둔다.
- `cursor` 변경 시 query 결과를 append한다.
- 무한 스크롤은 이번 범위에서 제외한다.
- 검색어가 변경되면 `items`, `cursor`, `nextCursor`를 초기화한다.
- remote picker query는 토스트를 띄우지 않고, picker 내부에 오류 상태를 표시한다.

Folder picker 탐색:

- 이번 1차 구현은 현재 parent 기준 목록과 검색만 제공한다.
- `parentId`를 이용한 폴더 내부 진입 UI는 후속 개선으로 둔다.
- 단, 설계상 `parentId` 상태를 둬 확장 가능하게 만든다.

```ts
const [parentId, setParentId] = useState<string | undefined>(undefined);
const [cursor, setCursor] = useState<string | undefined>(undefined);
const [items, setItems] = useState<SourceTargetOptionItemResponse[]>([]);
```

### 6.5 선택 표시

option row는 다음 정보를 보여준다.

- `label`
- `description`
- `type`
- Drive metadata가 있으면 `mimeType`, `modifiedTime`, `size`를 보조로 표시
- Canvas metadata가 있으면 `term`, `courseCount`를 보조로 표시

선택된 row는 border/background로 강조한다.

---

## 7. 시작 노드 생성 연결

`handleCreateStartNode`에서 config 생성 로직을 보강한다.

remote picker:

```ts
const targetConfig = selectedTargetOption
  ? {
      target: selectedTargetOption.id,
      target_label: selectedTargetOption.label,
      target_meta: selectedTargetOption.metadata,
    }
  : {
      target: selectedTargetValue.trim(),
    };
```

target config 생성은 helper로 분리한다.

```ts
const buildSourceTargetConfig = ({
  hasTarget,
  selectedOption,
  value,
}: {
  hasTarget: boolean;
  selectedOption: SourceTargetOptionItemResponse | null;
  value: string;
}) => {
  if (!hasTarget) {
    return { target: EMPTY_TARGET_SENTINEL };
  }

  if (selectedOption) {
    return {
      target: selectedOption.id,
      target_label: selectedOption.label,
      target_meta: selectedOption.metadata,
    };
  }

  return { target: value.trim() };
};
```

최종 config:

```ts
config: {
  canonical_input_type: selectedSourceMode.canonical_input_type,
  service: selectedSourceService.key,
  source_mode: selectedSourceMode.key,
  trigger_kind: selectedSourceMode.trigger_kind,
  ...targetConfig,
}
```

타입 보강:

- `WebScrapingNodeConfig`, `StorageNodeConfig`, `SpreadsheetNodeConfig`, `CalendarNodeConfig`, `CommunicationNodeConfig` 중 service source 설정을 받을 수 있는 config에 `target_label?`, `target_meta?`를 추가한다.
- 더 넓게는 `BaseNodeConfig`에 optional로 두는 편이 이후 source/sink picker 확장에 안전하다.

```ts
interface BaseNodeConfig {
  isConfigured: boolean;
  choiceActionId?: string | null;
  choiceSelections?: Record<string, string | string[]> | null;
  target_label?: string | null;
  target_meta?: Record<string, unknown> | null;
}
```

주의:

- 기존 backend config는 snake_case를 사용한다.
- 프론트 타입도 백엔드 config 필드는 snake_case 그대로 둔다.
- 별도 camelCase adapter를 만들지 않는다.
- `toNodeAddRequest`와 `toNodeDefinition`은 이미 config를 그대로 전달하므로 별도 adapter 수정은 최소화한다.

---

## 8. Node IO panel 보정 설계

### 8.1 타입 보정

`NodeSchemaPreviewResponse` 구조 변경 후 패널 모델은 아래처럼 schema를 읽는다.

```ts
const schemaToDisplay =
  panelKind === "input"
    ? (schemaPreview?.input?.schema ?? null)
    : (schemaPreview?.output?.schema ?? null);
```

입력/출력 preview label:

```ts
const schemaPreviewLabel =
  panelKind === "input"
    ? (schemaPreview?.input?.label ?? null)
    : (schemaPreview?.output?.label ?? null);
```

### 8.2 Source summary 표시

시작 노드 input panel은 `schemaPreview.source`가 있으면 source summary block을 보여준다.

표시 정보:

- serviceLabel
- modeLabel
- targetLabel
- canonicalInputType
- triggerKind
- configured/executable 상태

컴포넌트 후보:

```text
src/widgets/node-data-panel/ui/SourceSummaryBlock.tsx
```

props:

```ts
type Props = {
  source: SourceConfigSummaryResponse | null;
  status: NodeStatusSummaryResponse | null;
};
```

표시 우선순위:

1. `schemaPreview.source.targetLabel`
2. `activeNode.data.config.target_label`
3. `schemaPreview.source.target`
4. `activeNode.data.config.target`

백엔드 summary에는 현재 `targetMeta`가 없으므로, metadata 표시가 필요하면 프론트 config의 `target_meta`를 보조로 사용한다. 단, 이번 1차 구현에서는 source/mode/target label 중심으로 표시한다.

### 8.3 Node status summary

현재 `NodeExecutionStatusBlock`은 execution data 중심이다. 신규 `nodeStatus`는 실행 상태가 아니라 설정 상태다.

기존 InputPanel에는 `nodeStatuses` 기반 설정 상태 UI가 이미 있다. 따라서 설정 상태 UI를 중복으로 새로 만들지 않는다.

```text
InputPanel existing config status block
→ 필요 시 ConfigStatusBlock으로 추출
→ 데이터 소스만 schemaPreview.nodeStatus ?? storeNodeStatus 순서로 보강
```

표시:

- 설정 완료 여부
- 실행 가능 여부
- missingFields가 있으면 필요한 설정 목록

우선순위:

1. `schemaPreview.nodeStatus`
2. `nodeStatuses[activeNodeId]`

별도 `NodeConfigStatusBlock` 파일은 중복 UI가 실제로 생길 때만 만든다. 1차 구현에서는 기존 설정 상태 블록을 작게 추출하거나, 기존 위치에서 데이터 소스만 바꾼다.

---

## 9. 구현 단계

### Step 1. API 타입과 schema preview 계약 보정

작업:

- `NodeSchemaPreviewResponse` 타입을 enhanced 구조로 변경
- `NodeInputPreviewResponse`, `NodeOutputPreviewResponse`, `SourceConfigSummaryResponse`, `NodeStatusSummaryResponse` 추가
- `useNodeDataPanelModel`의 `schemaToDisplay` 경로 수정
- `SchemaPreviewBlock` 호출부 타입 오류 수정

검토:

- 실행 전 패널에서 schema field가 다시 정상 표시되는지
- 기존 최신 실행 데이터 표시가 깨지지 않는지
- 공유 사용자의 schema preview 조회가 유지되는지

### Step 2. Source target options API 추가

작업:

- `SourceTargetOptionItemResponse`, `SourceTargetOptionsResponse`, `SourceTargetOptionsParameters` 타입 추가
- `get-source-target-options.api.ts` 추가
- `workflowApi.getSourceTargetOptions` 추가
- `workflowKeys.sourceTargetOptions` 추가
- `useSourceTargetOptionsQuery` 추가
- barrel export 보강

검토:

- `request` wrapper가 `ApiResponse<T>`를 정상 unwrap 하는지
- query key에 검색어, parentId, cursor가 모두 반영되는지
- `enabled` 조건이 service/mode 없을 때 호출하지 않는지

### Step 3. Source target picker UI 추가

작업:

- `SourceTargetPicker.tsx` 추가
- `course_picker`, `term_picker`, `file_picker`, `folder_picker` label 추가
- remote picker에서 target-options query 호출
- search, loading, empty, error, selected, load more 상태 구현
- day/time/text 기존 입력 UX 유지
- `SourceTargetForm`의 카드/뒤로가기/다음 버튼 구조는 유지
- `SourceTargetPicker`는 입력 영역만 담당

검토:

- Canvas course/term picker에서 선택이 가능해야 한다.
- Drive file/folder picker에서 선택이 가능해야 한다.
- Drive `nextCursor`가 있으면 더보기가 작동해야 한다.
- picker API 오류가 wizard 전체를 깨지 않게 안내되어야 한다.

### Step 4. 시작 노드 config 저장 보강

작업:

- `selectedTargetOption` 상태 추가
- source mode 변경 시 option/value 초기화
- remote picker 선택 시 `target`, `target_label`, `target_meta` 저장
- BaseNodeConfig에 `target_label`, `target_meta` optional 타입 추가
- confirm 화면에서 가능하면 `target_label`을 보여준다.

검토:

- 수동 입력형 source는 기존처럼 동작해야 한다.
- remote picker source는 id 대신 label이 사용자에게 보여야 한다.
- 저장 후 workflow 응답을 다시 불러와도 config가 유지되어야 한다.

### Step 5. Node IO panel source summary 보강

작업:

- `SourceSummaryBlock` 추가
- 시작 노드 input panel에서 `schemaPreview.source` 표시
- 기존 설정 상태 UI를 `schemaPreview.nodeStatus ?? store nodeStatus` 기준으로 보강
- schema preview label을 `input.label`, `output.label`에서 가져오도록 보강

검토:

- 시작 노드에서 "시작점"만 보이지 않고 source/mode/target 정보가 보여야 한다.
- 실행 결과가 없을 때도 output schema와 source summary가 보여야 한다.
- 실행 결과가 있으면 실제 data preview가 우선되어야 한다.
- 설정 상태 UI가 두 번 렌더링되지 않아야 한다.

### Step 6. 검증

자동 검증:

```bash
pnpm lint
pnpm tsc
pnpm test
```

수동 검증:

- Canvas LMS course picker 선택 후 시작 노드 생성
- Canvas LMS term picker 선택 후 시작 노드 생성
- Google Drive file picker 선택 후 시작 노드 생성
- Google Drive folder picker 선택 후 시작 노드 생성
- 선택 후 `target`, `target_label`, `target_meta` 저장 확인
- 실행 전 시작 노드 input/output 패널 확인
- 실행 전 중간 노드 input/output schema 확인
- 실행 후 최신 실행 데이터 표시 유지 확인

---

## 10. 후속 개선

이번 구현에서 제외하거나 후순위로 둔다.

- Drive folder 내부 탐색 breadcrumb
- 무한 스크롤 기반 Drive pagination
- 검색 debounce 공용 hook화
- Gmail label/email picker
- Google Sheets sheet picker
- Slack channel picker
- Notion page picker
- `target_meta`를 schema preview source summary에 포함하도록 백엔드 DTO 확장
- Canvas courses pagination 보강 확인
- Drive OAuth scope가 전체 탐색 요구에 충분한지 확인

---

## 11. 백엔드 확인 필요 사항

프론트 구현을 막는 수준은 아니지만, 품질을 위해 백엔드와 확인하면 좋다.

1. Canvas course list가 Canvas pagination을 모두 따라가는지 확인한다.
2. picker provider에서 timeout/network exception도 `EXTERNAL_API_ERROR`로 정규화되는지 확인한다.
3. Google Drive scope가 파일/폴더 탐색 요구사항에 충분한지 확인한다.
4. `SourceConfigSummaryResponse`에 `targetMeta`가 필요한지 협의한다.

현재 프론트는 `target_meta`를 config에 저장하고, summary에는 `targetLabel`까지만 표시하는 방향으로 진행 가능하다.
