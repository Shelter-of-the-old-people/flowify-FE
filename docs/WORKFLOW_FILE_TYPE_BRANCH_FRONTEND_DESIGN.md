# 워크플로우 파일 종류 분기 프론트엔드 설계

## 1. 목표

파일 목록을 가져온 뒤 사용자가 `파일 종류별로 나누기`를 선택하면, 선택한 파일 종류마다 독립적인 다음 처리 경로를 만들 수 있게 한다.

예시:

```text
Google Drive 폴더
-> 파일 종류별로 나누기: PDF / 이미지 / 기타
   -> PDF 경로: 하나씩 처리 -> AI 요약 -> Google Drive 저장
   -> 이미지 경로: 하나씩 처리 -> AI 설명 생성 -> Google Drive 저장
   -> 기타 경로: 그대로 전달 또는 별도 저장
```

이번 프론트 구현의 핵심은 단순히 선택 값을 저장하는 것이 아니라, Spring/FastAPI가 실행 시 분기 payload를 라우팅할 수 있도록 edge 계약까지 정확히 저장하는 것이다.

## 2. 백엔드 계약

### 2.1 Spring

Spring의 파일 종류 분기 액션 id는 `branch_by_file_type`이다.

조건 분기 노드 config는 최소한 다음 값을 가져야 한다.

```json
{
  "choiceActionId": "branch_by_file_type",
  "choiceNodeType": "CONDITION_BRANCH",
  "choiceSelections": {
    "branch_config": ["pdf", "image", "other"],
    "branch_by_file_type": ["pdf", "image", "other"],
    "branches": ["pdf", "image", "other"]
  },
  "branchTypes": ["pdf", "image", "other"],
  "isConfigured": true
}
```

주의할 점:

- 현재 Spring `BranchRuntimeConfigResolver`는 `choiceSelections.branch_config`만으로는 선택 branch를 읽지 않는다.
- 따라서 프론트는 UI 복원용 `branch_config`와 백엔드 해석용 `branch_by_file_type`, `branches`, `branchTypes`를 함께 저장한다.

파일 종류 분기 노드에서 나가는 edge는 label이 필수이며 중복되면 안 된다.

```json
{
  "source": "branch-node-id",
  "target": "pdf-target-node-id",
  "label": "pdf",
  "sourceHandle": "pdf",
  "targetHandle": "input"
}
```

Spring의 `POST /api/workflows/{workflowId}/nodes`는 다음 필드를 지원한다.

```json
{
  "prevNodeId": "branch-node-id",
  "prevEdgeLabel": "pdf",
  "prevEdgeSourceHandle": "pdf",
  "prevEdgeTargetHandle": "input"
}
```

### 2.2 FastAPI

FastAPI는 분기 노드 실행 결과로 `branch_outputs`를 만든다.

```json
{
  "branch_outputs": {
    "pdf": { "type": "FILE_LIST", "items": [...] },
    "image": { "type": "FILE_LIST", "items": [...] },
    "other": { "type": "FILE_LIST", "items": [...] }
  }
}
```

실행 엔진은 edge의 `label` 또는 `sourceHandle`을 branch key로 사용한다. 프론트가 edge label을 누락하면 해당 분기 payload가 다음 노드로 전달되지 않는다.

## 3. 현재 프론트 상태

### 3.1 구현 완료된 것

- `MappingRuleOptionResponse.branch_config`와 `ProcessingMethodOption.branch_config` 타입을 통해 processing method option의 branch 설정을 보존한다.
- fallback mapping의 `FILE_LIST.processing_method.options`에 `branch_by_file_type` 옵션이 추가되어 서버 선택지 조회 실패 시에도 분기 설정 흐름을 열 수 있다.
- `WizardStepContent`는 `branch_config` 질문 블록을 렌더링할 수 있다.
- `choiceSelectionPipeline`은 processing method option에 `branch_config`가 있으면 `follow-up` 단계로 이동하도록 처리한다.
- `useChoiceWizardController.completeFollowUp()`은 `selectedAction` 없이 `selectedProcessingOption` 기반 branch follow-up도 완료할 수 있다.
- 파일 종류 분기 선택값은 `branch_config`, `branch_by_file_type`, `branches`, `branchTypes` alias로 함께 저장되어 Spring 실행 계약과 UI 복원을 모두 충족한다.
- `NodeAddRequest`와 add node adapter는 `prevEdgeLabel`, `prevEdgeSourceHandle`, `prevEdgeTargetHandle`을 전달할 수 있다.
- `EdgeDefinitionResponse`, `toEdgeDefinition()`, `toFlowEdge()`는 edge `label/sourceHandle/targetHandle`을 저장/복원한다.
- `FlowArrowEdge`는 화면 표시용 `edge.data.label`을 표시한다.
- Canvas active chain/visible node 계산은 branch node의 모든 outgoing edge를 포함하도록 보정되어 branch target을 함께 보여줄 수 있다.
- 조건 분기 노드 view 상태에서는 `BranchSetupSummaryBlock`으로 선택된 branch 요약을 보여준다.

### 3.2 남은 보완 대상

- follow-up 뒤로가기 책임이 아직 action 기반으로 남아 있어 `processing_method -> follow-up` 흐름에서는 처리 방식 선택 단계로 돌아가도록 보정해야 한다.
- branch target node/edge 생성 실패 시 branch node가 먼저 설정 완료 상태로 남지 않도록 저장 순서를 보정해야 한다.
- branch 제거 시 기존 target node 자동 삭제는 이번 구현 범위에서 제외한다. 이미 생성된 branch 경로 삭제/정리는 후속 UX 설계에서 별도 처리한다.

## 4. UX 설계

### 4.1 분기 설정

사용자가 파일 목록 노드 뒤에서 `파일 종류별로 나누기`를 선택하면 바로 branch 선택 단계가 열린다.

선택지는 백엔드 mapping rule을 따른다.

- `pdf`: PDF
- `image`: 이미지
- `spreadsheet`: 스프레드시트
- `document`: 문서
- `presentation`: 프레젠테이션
- `other`: 기타

선택 완료 후 조건 분기 노드는 설정 완료 상태가 되고, 선택한 branch마다 다음 처리 노드가 생성된다.

### 4.2 branch 3개 선택 시 화면

PDF, 이미지, 기타를 선택하면 다음처럼 보여야 한다.

```text
              -> [PDF 처리 대기] -> 다음
Google Drive -> [분류] 
              -> [이미지 처리 대기] -> 다음
              -> [기타 처리 대기] -> 다음
```

각 branch edge에는 사용자에게 알아볼 수 있는 라벨을 표시한다.

- 화면 표시: `PDF`, `이미지`, `기타`
- 저장 계약: `label/sourceHandle = pdf/image/other`

### 4.3 branch target 노드

branch 선택 완료 시 각 branch마다 실제 middle node를 하나 생성한다.

- 기본 node type: `data-process`
- role: `middle`
- input type: 분기 노드 output type과 동일하게 `file-list`
- output type: 우선 `file-list`
- config: `isConfigured: false`
- label: `${branchLabel} 처리`

이렇게 해야 기존 `다음` placeholder 로직을 그대로 재사용할 수 있다. branch target 노드는 leaf가 되므로 사용자는 각 branch target 뒤에 `중간 처리` 또는 `보낼 곳`을 선택할 수 있다.

## 5. 구현 설계

### 5.1 타입 보강

`src/entities/workflow/api/types.ts`

- `MappingRuleOptionResponse`에 `branch_config?: MappingRuleFollowUpResponse`를 추가한다.
- `ChoiceOption`에도 `branchConfig?: ChoiceBranchConfig | null` 또는 transport 응답 변환용 `branch_config?: ChoiceBranchConfig | null`을 반영한다.
  - Spring `ChoiceResponse.options[]`의 `Option` DTO는 processing method option에도 `branch_config`를 내려준다.
  - 이 타입이 없으면 `GET /choices` 응답의 branch 설정 정보가 프론트에서 소실된다.
- `NodeAddRequest`에 다음 필드를 추가한다.
  - `label?: string`
  - `prevEdgeLabel?: string`
  - `prevEdgeSourceHandle?: string`
  - `prevEdgeTargetHandle?: string`
- `EdgeDefinitionResponse`에 `label?: string | null`을 추가한다.

`src/entities/connection/model/types.ts`

- `FlowEdgeData`에 저장용 branch key를 추가한다.

```ts
export interface FlowEdgeData extends Record<string, unknown> {
  /** 화면 표시용 라벨 */
  label?: string;
  /** backend 라우팅용 branch key. 예: pdf, image, other */
  branchKey?: string;
  variant?: "flow-arrow";
}
```

### 5.2 mapping adapter 보강

`src/features/choice-panel/model/types.ts`

- `ProcessingMethodOption`에 `branch_config?: BranchConfig`를 추가한다.

`src/features/choice-panel/model/mappingRulesAdapter.ts`

- processing method option에서도 `branch_config`를 읽어 `ProcessingMethodOption.branch_config`로 변환한다.

`src/features/choice-panel/model/mappingRules.ts`

- fallback mapping의 `FILE_LIST.processing_method.options`에 `branch_by_file_type`를 추가한다.
- 기존 `SINGLE_FILE.actions[].id = classify_by_type` 기반 파일 종류 분기는 제거하거나 우선순위를 낮춰 혼동을 막는다.

### 5.3 wizard 상태 전환 보강

`src/pages/workflow-editor/model/choiceSelectionPipeline.ts`

- `ProcessingMethodSelectionIntent`에 다음 필드를 추가한다.
  - `branchConfig`
  - `hasFollowUp`
  - `nextStep: "action" | "follow-up" | "complete"`
- `deriveProcessingMethodSelectionIntent()`는 option에 `branch_config`가 있으면 `nextStep = "follow-up"`을 반환한다.

`src/pages/workflow-editor/model/useChoiceWizardController.ts`

- processing method로 `branch_by_file_type`을 선택하면 조건 분기 노드를 먼저 저장한다.
- 이때 `choiceActionId: "branch_by_file_type"`, `choiceNodeType: "CONDITION_BRANCH"`, `isConfigured: false`를 저장한다.
- `selectedProcessingOption`과 `selectedBranchConfig`를 세팅하고 follow-up 단계로 이동한다.
- `completeFollowUp()`은 `selectedAction`이 없어도 `selectedProcessingOption`이 branch config를 가진 경우 완료할 수 있어야 한다.
- branch config는 `GET /choices`의 option에서 올 수도 있고, `POST /select`의 `NodeSelectionResult.branchConfig`에서 올 수도 있으므로 둘 다 처리한다.

### 5.4 branch selection 정규화

파일 종류 분기 관련 정규화 helper는 choice panel 모델에 둔다.

현재 파일 위치:

```text
src/features/choice-panel/model/fileTypeBranch.ts
```

역할:

- `branch_config` 선택 값을 branch key 배열로 정규화
- 알 수 없는 key 제거
- 중복 제거
- 선택이 비어 있으면 완료 불가
- key별 display label 제공
- backend config alias 생성

예시:

```ts
const toFileTypeBranchConfigPatch = (branchKeys: string[]) => ({
  branchTypes: branchKeys,
  choiceSelections: {
    branch_config: branchKeys,
    branch_by_file_type: branchKeys,
    branches: branchKeys,
  },
});
```

### 5.5 branch target 생성

branch target graph helper는 workflow editor 모델에 둔다.

현재 파일 위치:

```text
src/pages/workflow-editor/model/fileTypeBranchGraph.ts
```

역할:

- 선택된 branch key마다 필요한 target node를 생성한다.
- 이미 동일 branch edge가 있으면 재사용한다.
- 새 target node 위치를 분기 노드 기준으로 세로 배치한다.
- edge metadata를 `NodeAddRequest`에 포함한다.

추가 요청 형태:

```ts
toNodeAddRequest({
  type: "data-process",
  role: "middle",
  label: `${branchLabel} 처리`,
  prevNodeId: branchNode.id,
  prevEdgeLabel: branchKey,
  prevEdgeSourceHandle: branchKey,
  prevEdgeTargetHandle: "input",
  config: {
    isConfigured: false,
  },
});
```

삭제/수정 정책:

- branch를 추가하면 target node를 새로 만든다.
- branch를 제거할 때 기존 target node에 후속 연결이나 설정이 있으면 자동 삭제하지 않는다.
- 현재 구현 범위에서는 branch 제거 시 기존 target node를 자동 삭제하지 않는다.
- 이미 생성된 branch target 정리 UX는 후속 작업으로 분리한다.
- 재시도 시 이미 동일 branch edge가 있으면 `createFileTypeBranchTargetDrafts()`에서 중복 생성하지 않는다.

### 5.6 edge adapter 보강

`src/entities/workflow/lib/workflow-node-adapter.ts`

`toEdgeDefinition(edge)`는 다음을 보존해야 한다.

- `label`
- `sourceHandle`
- `targetHandle`

React Flow edge에서 저장할 때 우선순위:

1. `edge.data.branchKey`
2. `edge.sourceHandle`
3. `edge.data.label`이 `pdf`, `image`, `spreadsheet`, `document`, `presentation`, `other` 같은 raw branch key일 때만 사용

`toFlowEdge(edge)`는 backend edge를 다음처럼 복원한다.

- `sourceHandle = edge.sourceHandle`
- `targetHandle = edge.targetHandle`
- `data.branchKey = edge.label ?? edge.sourceHandle`
- `data.label = display label`

주의:

- backend `edge.label`은 실행 라우팅 key이므로 `PDF` 같은 표시 문자열을 저장하면 안 된다.
- 화면 표시 문자열은 `data.label`에만 둔다.
- 일반 직렬 edge에는 `branchKey`를 만들지 않는다.
- 저장 시 `data.label`을 무조건 fallback으로 쓰면 `PDF`가 backend edge label로 저장될 수 있다. 이 경우 FastAPI `branch_outputs.pdf`와 매칭되지 않으므로 반드시 raw key 여부를 확인한다.

### 5.7 Canvas 보강

`src/widgets/canvas/ui/Canvas.tsx`

- branch 노드를 클릭했을 때 outgoing edge 하나만 보여주지 말고 모든 branch target을 visible set에 포함한다.
- branch target이 leaf이면 기존 `다음` placeholder가 branch target 뒤에 표시되어야 한다.
- branch node centering은 branch target 전체 bounds를 포함해서 계산한다.
- 기존 직렬 워크플로우는 현재 동작을 유지한다.

### 5.8 요약 UI

조건 분기 노드 view 상태에서는 선택된 branch 요약을 보여준다.

예시:

```text
파일 종류별로 나누기
분기: PDF, 이미지, 기타
각 분기마다 다음 처리 경로를 설정할 수 있습니다.
```

기존 `FallbackNodeSummaryBlock`을 확장하거나 별도 `BranchSetupSummaryBlock`을 둔다.

## 6. 영향 범위

### 6.1 영향을 받는 기능

- 선택 기반 설정 wizard
- 조건 분기 노드 설정/수정
- workflow graph 저장/복원
- React Flow edge 렌더링
- branch node 클릭 시 canvas focus/visibility
- template 기반 workflow 편집

### 6.2 주의할 회귀

- 일반 직렬 edge가 저장될 때 불필요한 label이 붙으면 안 된다.
- 기존 loop/action leaf 생성 흐름이 깨지면 안 된다.
- `all_at_once`, `one_by_one` processing method는 기존처럼 동작해야 한다.
- branch edit 중 기존 설정된 branch path를 자동 삭제하면 사용자 작업이 사라질 수 있다.
- backend edge label에는 표시 문자열이 아니라 branch key가 저장되어야 한다.

## 7. 구현 단계와 상태

### Step 1. 타입과 mapping adapter 보강

- `MappingRuleOptionResponse.branch_config`
- `ProcessingMethodOption.branch_config`
- fallback `branch_by_file_type`
- `NodeAddRequest` edge metadata
- `EdgeDefinitionResponse.label`
- 상태: 구현 완료

커밋:

```text
feat: 파일 종류 분기 타입 계약 추가
```

### Step 2. edge 저장/복원 보강

- `FlowEdgeData.branchKey`
- `toEdgeDefinition()` label/handle 보존
- `toFlowEdge()` branch key/display label 분리
- 상태: 구현 완료

커밋:

```text
feat: 분기 edge 계약 보존
```

### Step 3. wizard branch follow-up 흐름 추가

- processing method option의 `branch_config`를 follow-up으로 연결
- `branch_by_file_type` 선택 시 조건 분기 노드 저장
- branch 선택 완료 시 backend alias config 저장
- 상태: 구현 완료

커밋:

```text
feat: 파일 종류 분기 설정 흐름 추가
```

### Step 4. branch target graph 생성

- 선택 branch별 target node 생성
- edge metadata 포함 add node 요청
- branch target 중복 생성 방지
- 상태: 구현 완료
- 남은 보완: target 생성 실패 시 완료 상태 방지

커밋:

```text
feat: 파일 종류별 분기 경로 생성
```

### Step 5. Canvas와 요약 UI 보강

- branch node visible chain 보정
- branch edge label 표시
- branch 설정 요약 표시
- 상태: 구현 완료

커밋:

```text
feat: 분기 경로 표시 개선
```

### Step 6. 안정성 보완

- `processing_method -> follow-up` 흐름의 뒤로가기 보정
- branch target 생성 완료 전 `isConfigured: true` 저장 방지
- 상태: 구현 예정

예상 커밋:

```text
fix: 분기 설정 안정성 보강
```

## 8. 검증 시나리오

### 8.1 PDF / 이미지 / 기타 분기

1. Google Drive 폴더 source를 설정한다.
2. 다음 노드에서 `파일 종류별로 나누기`를 선택한다.
3. `PDF`, `이미지`, `기타`를 선택한다.
4. Canvas에 branch target 3개가 생기는지 확인한다.
5. 각 edge label이 화면에는 `PDF`, `이미지`, `기타`로 보이는지 확인한다.
6. 저장 후 새로고침해도 edge label과 branch target이 유지되는지 확인한다.

### 8.2 branch별 후속 처리

1. PDF branch target 뒤에 `하나씩 처리 -> AI 요약 -> Google Drive 저장`을 연결한다.
2. 이미지 branch target 뒤에 `하나씩 처리 -> AI 설명 생성 -> Google Drive 저장`을 연결한다.
3. 실행 시 PDF 파일은 PDF 경로로, 이미지 파일은 이미지 경로로만 전달되는지 확인한다.

### 8.3 기존 기능 회귀

1. `하나씩 처리`만 선택한 기존 workflow가 정상 저장/실행되는지 확인한다.
2. `전체를 하나로 합쳐서` 선택이 기존처럼 설정 완료되는지 확인한다.
3. 시작/도착 노드 설정 수정 UX가 깨지지 않는지 확인한다.

## 9. 최종 판단

프론트는 `branch_by_file_type`을 단순 follow-up 선택값으로 저장하는 수준을 넘어, 실제 graph path와 edge 라우팅 계약까지 생성하도록 구현되었다.

현재 충족된 핵심 조건은 세 가지다.

1. processing method option의 `branch_config`를 wizard follow-up으로 연결한다.
2. 선택 branch별 실제 graph path를 생성한다.
3. Spring/FastAPI 실행 계약인 edge `label/sourceHandle/targetHandle`을 저장/복원한다.

따라서 기본 요구사항인 “분기에서 PDF를 선택하면 다음 노드에는 PDF만 들어간다”는 실행 계약을 프론트가 만들 수 있는 상태다.

다만 사용자 조작 안정성 측면에서 follow-up 뒤로가기와 branch target 생성 실패 시 완료 상태 방지는 추가 보완이 필요하다.

## 10. 보완 설계

구현 검토 결과, 기본 분기 흐름은 맞지만 실제 사용자 조작과 네트워크 실패 상황에서 보강해야 할 지점이 있다.

### 10.1 follow-up 뒤로가기 책임 보정

파일 종류 분기는 `processing_method -> follow-up` 흐름이다. 일반 action 선택 흐름처럼 `action -> follow-up`으로 들어온 것이 아니므로, follow-up 화면에서 뒤로가기를 눌렀을 때 action 단계로 보내면 상태가 어긋난다.

현재 위험:

- `OutputPanel`의 `FollowUpStep.onBack`이 `wizardController.backToAction()`만 호출하면, 파일 종류 분기처럼 `selectedAction`이 없는 흐름에서 잘못된 단계로 돌아갈 수 있다.
- 사용자는 파일 종류 선택 화면에서 뒤로가기를 눌렀는데, 존재하지 않는 action 선택 단계로 이동하거나 빈 상태를 볼 수 있다.

수정 방향:

- `useChoiceWizardController`에 `backFromFollowUp()`을 추가한다.
- `selectedAction`이 있으면 기존처럼 action 단계로 돌아간다.
- `selectedAction`이 없고 `selectedProcessingOption`이 있으면 processing method 단계로 돌아간다.
- 기존 노드 수정 모드에서는 현재처럼 뒤로가기 버튼을 숨기거나 no-op 처리한다.

적용 파일:

- `src/pages/workflow-editor/model/useChoiceWizardController.ts`
- `src/widgets/output-panel/ui/OutputPanel.tsx`

완료 기준:

- `하나씩 처리`, `전체를 하나로 합쳐서` 같은 일반 처리 방식은 기존 흐름을 유지한다.
- `파일 종류별로 나누기` follow-up에서 뒤로가기를 누르면 처리 방식 선택 단계로 돌아간다.
- 기존 노드 수정 모드에서는 불필요한 뒤로가기 버튼이 노출되지 않는다.

### 10.2 branch target 생성 실패 시 완료 상태 방지

파일 종류 분기는 follow-up 선택 완료 후 branch node config와 branch별 target node/edge를 함께 만들어야 한다. 이때 branch node를 먼저 `isConfigured: true`로 저장한 뒤 target node 생성 중 실패하면, 사용자는 설정 완료로 보이는 분기 노드를 보지만 실제 outgoing edge가 부족한 상태가 될 수 있다.

현재 위험:

- branch node config가 먼저 완료 상태로 저장된다.
- target node 또는 edge 생성이 중간에 실패하면 일부 branch 경로만 만들어질 수 있다.
- Spring/FastAPI 실행 계약상 branch edge `label/sourceHandle`이 필요한데, UI는 완료 상태처럼 보일 수 있다.

수정 방향:

1. 파일 종류 분기 follow-up 완료 시 먼저 branch config를 `isConfigured: false`로 저장한다.
2. 선택된 branch별 target node와 edge를 생성한다.
3. 모든 target 생성이 성공한 뒤 같은 branch config를 `isConfigured: true`로 다시 저장한다.
4. 중간에 실패하면 branch node는 미완료 상태로 남겨 사용자가 다시 설정을 완료할 수 있게 한다.
5. 재시도 시 이미 생성된 branch edge는 `createFileTypeBranchTargetDrafts()`에서 중복 생성하지 않는다.

적용 파일:

- `src/pages/workflow-editor/model/useChoiceWizardController.ts`
- `src/pages/workflow-editor/model/fileTypeBranchGraph.ts`

완료 기준:

- branch target 생성 전에는 분기 노드가 완료 상태가 되지 않는다.
- target 생성 일부 실패 후에도 사용자는 분기 노드를 다시 설정 완료할 수 있다.
- 재시도 시 이미 생성된 branch target이 중복 생성되지 않는다.
- 모든 branch target이 생성된 뒤에만 분기 노드가 설정 완료 상태가 된다.

### 10.3 검증 시나리오 추가

기존 검증 시나리오에 아래 항목을 추가한다.

1. `파일 종류별로 나누기` 선택 후 branch 선택 화면에서 뒤로가기를 눌러 처리 방식 선택 단계로 돌아가는지 확인한다.
2. branch target 생성 중 실패 상황을 가정했을 때 branch node가 `isConfigured: false`로 남는지 확인한다.
3. 실패 후 다시 branch 선택을 완료하면 기존 target이 중복되지 않고 빠진 target만 생성되는지 확인한다.
4. 최종 저장 후 새로고침했을 때 edge `label/sourceHandle/targetHandle`이 보존되는지 확인한다.
