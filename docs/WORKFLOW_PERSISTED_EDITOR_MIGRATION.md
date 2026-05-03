# Persisted Workflow Editor 전환 설계

> **작성일:** 2026-04-17
> **최종 보강일:** 2026-04-18
> **대상 범위:**
> - `src/features/create-workflow/model/useCreateWorkflowShortcut.ts`
> - `src/pages/workflow-editor/WorkflowEditorPage.tsx`
> - `src/widgets/output-panel/ui/OutputPanel.tsx`
> - `src/features/add-node/model/useAddNode.ts`
> - `src/widgets/editor-remote-bar/ui/EditorRemoteBar.tsx`
> - `src/features/workflow-editor/model/workflowStore.ts`
> - `src/features/workflow-editor/model/workflow-editor-adapter.ts`
> **목적:** 워크플로우 생성 버튼이 이미 서버에 빈 workflow를 생성하고 editor로 진입시키는 현재 구조에 맞춰, editor 내부의 local draft 경로를 제거하고 persisted workflow 전용 편집 surface로 정렬한다. 추가로, 실행 상태를 `executionId` 기반으로 추적하고, 그래프 동기화를 mutation 응답의 `WorkflowResponse` 기준으로 통일한다.

---

## 1. 문제 정의

현재 생성 진입점은 이미 persisted workflow 기준으로 동작한다.

- 사이드바 `+` 버튼
- 워크플로우 리스트의 생성 버튼
- 두 경로 모두 `createWorkflow` 호출 후 `/workflow/:id` editor로 이동

반면 editor 내부 일부는 아직 local draft 전제를 유지하고 있다.

- `OutputPanel`의 `createLocalNode`
- `OutputPanel`의 `createTemporaryWizardNode`
- `placeWorkflowNode()`의 `!workflowId` fallback
- `useAddNode`
- dirty 상태 `Run` 차단 UX

즉 현재 구조는 아래처럼 갈라져 있다.

1. 생성 진입점
- persisted workflow 기준
- 서버 ID 확보 후 editor 진입

2. editor 내부 일부
- local draft 기준 fallback 유지
- 서버 없는 임시 노드 생성 허용

이번 설계의 목적은 이 불일치를 제거하고, editor 전체를 persisted workflow 기준으로 재정렬하는 것이다.

---

## 2. 현재 구현 상태와의 매칭

### 2.1 생성 진입점

현재 생성 버튼은 이미 빈 workflow를 서버에 생성한 뒤 editor로 이동한다.

- `useCreateWorkflowShortcut`
- 성공 시 `buildPath.workflowEditor(workflow.id)` 이동
- 실패 시 목록 복귀

즉 생성 자체는 이미 persisted workflow 모델이다.

### 2.2 생성 직후 editor 화면

생성 직후 editor는 빈 캔버스가 아니라 현재와 같은 placeholder 초기화면을 유지한다.

- `시작` placeholder
- `도착` placeholder

즉 persisted workflow로 먼저 생성하더라도, editor 첫 화면 UX는 지금과 동일하다.

### 2.3 Canvas middle placeholder

Canvas의 중간 placeholder 클릭은 이미 API 경유로 전환되었다.

- middle placeholder 클릭
- `addWorkflowNode`
- 서버 ID 확보
- `batchServerSync`
- panel 오픈

즉 middle node 생성 자체는 더 이상 local temp node 기반이 아니다.

### 2.4 OutputPanel wizard

현재 문제의 본체는 `OutputPanel`이다.

현재 wizard는 persisted node와 local temp node를 섞어 쓴다.

- `placeWorkflowNode`의 `!workflowId` fallback
- `createTemporaryWizardNode` 기반 되돌리기
- wizard 진행 중 `removeNode(activeNode.id)`로 persisted node를 로컬에서만 제거

즉 지금 `OutputPanel`은 editor 전체 구조와 가장 크게 어긋나는 지점이다.

### 2.5 실행 버튼 계약

현재 `Run`은 dirty 상태면 경고 toast 후 차단한다.

이번 작업에서는 이 계약을 아래로 바꾼다.

- dirty면 자동 저장
- 저장 성공 후 execute
- 저장 실패 시 execute 중단

다만 추가로, 실행 상태는 `executionId` 기반의 local bridge와 remote query를 함께 써야 한다.

---

## 3. 백엔드 확인 결과

아래 사항은 Spring 코드 및 FastAPI 연동 계약 기준으로 확인되었다.

### 3.1 node update 가능 범위

`PUT /api/workflows/{workflowId}/nodes/{nodeId}`는 아래 필드를 변경할 수 있다.

- `category`
- `type`
- `config`
- `dataType`
- `outputDataType`
- `role`
- `authWarning`

즉 기존 node를 제자리에서 다른 종류의 node로 바꾸는 것이 가능하다.

### 3.2 nodeId와 edge 유지

node update 시

- `nodeId`는 유지된다.
- 기존 incoming / outgoing edge도 유지된다.

즉 FE는 persisted staging node를 새 ID로 교체하지 않고 그대로 이어서 쓸 수 있다.

### 3.3 config는 full replace

`config`는 partial merge가 아니라 full replace다.

- `config != null`이면 기존 config 전체를 새 값으로 교체
- 일부 필드만 보내면 나머지 키는 사라짐

즉 FE는 update 시 항상 완전한 config 객체를 만들어 보내야 한다.

### 3.4 delete는 cascade

node delete는 해당 node만 지우는 것이 아니라 outgoing downstream 전체를 함께 삭제한다.

즉 wizard 되돌리기에서 `delete`를 잘못 쓰면 의도치 않은 하위 체인까지 사라질 수 있다.

### 3.5 delete 응답은 authoritative workflow

`DELETE /nodes/{id}` 응답은 cascade 결과가 반영된 최신 전체 `WorkflowResponse`다.

즉 FE는 delete 후 local simulation으로 그래프를 다시 계산하지 않고, 응답 workflow를 source of truth로 써야 한다.

### 3.6 select choice는 비영속

`select choice`는 추천만 하고, workflow 상태는 바꾸지 않는다.

즉 add / update / delete orchestration은 FE가 직접 책임진다.

### 3.7 save -> execute 직렬 호출 가능

코드상 `updateWorkflow` 성공 직후 `executeWorkflow`를 바로 호출해도 된다.

즉 FE는 `await save -> await execute`로 구현해도 된다.

### 3.8 execute 응답에는 executionId가 포함된다

`POST /execute` 응답에는 `executionId`가 포함된다.

즉 FE는 실행 시작 직후 이 ID를 기준으로 run lifecycle을 추적할 수 있다.

### 3.9 executions list는 eventual consistency

`POST /execute` 직후 `GET /executions`에 새 row가 항상 즉시 보장되지는 않는다.

또한 최초 state가 `pending`인지 `running`인지도 FE가 전제하면 안 된다.

즉 FE는 executions list를 eventual consistency 전제로 다뤄야 한다.

### 3.10 transition validation 없음

백엔드는 invalid type transition을 별도로 막지 않는다.

즉 FE가 허용 가능한 node 전환을 스스로 제한해야 한다.

### 3.11 node 단위 mutation은 owner-only

`add node`, `update node`, `delete node`는 workflow 소유자만 호출할 수 있다.

즉 이번 설계는 owner editing path를 전제로 하며, shared user는 같은 경로를 그대로 사용할 수 없다.

### 3.12 mutation마다 workflow validation 재실행

`add node`, `update node`, `delete node` 뒤에는 workflow 전체 validation이 다시 실행된다.

중요한 점:

- 최종 상태가 유효하더라도
- 중간 단계가 invalid면 mutation이 실패할 수 있다

즉 FE는 wizard에서 mutation 순서를 신중하게 설계해야 한다.

### 3.13 role 자동 정리 없음

backend는 start / end / middle role을 자동 정리하거나 normalize하지 않는다.

즉 role 일관성은 계속 FE가 책임진다.

### 3.14 동시 수정 충돌 감지 없음

workflow entity에는 version/revision 기반 충돌 감지가 없다.

즉 현재 계약은 사실상 last-write-wins다.

---

### 3.15 backend는 position을 보정하지 않는다

backend는 workflow save나 node mutation 과정에서 node `position`을 보정하거나 재계산하지 않는다.

- clamp 없음
- 음수 보정 없음
- role/type 기반 재배치 없음
- server-driven auto-layout 없음

즉 `position`은 현재 코드 기준으로 FE가 보낸 값을 그대로 저장하는 캔버스 좌표다.

### 3.16 mutation 응답의 position은 신뢰 가능한 저장값이다

`add/update/delete node`와 `updateWorkflow` 응답의 `WorkflowResponse.nodes[].position`은
저장된 최신 workflow의 현재 값 그대로다.

즉 FE는 graph 구조를 mutation 응답 기준으로 동기화해도 된다.

### 3.17 position 제약은 거의 없다

현재 backend 기준으로:

- `Position.x/y`는 소수 좌표 허용
- 음수 좌표 허용
- 큰 좌표 허용
- server validation으로 제한하지 않음
- `position` 자체는 nullable

즉 FE는 auto-arrange나 drag 결과를 별도 server clamp 전제 없이 local layout 값으로 다룰 수 있다.

## 4. 근본 원인 분석

현재 문제는 단순히 `workflowId` fallback 하나가 남아 있는 수준이 아니다.

### 4.1 persisted node를 temp node처럼 다룸

Canvas는 이미 middle node를 서버에 만들고 panel을 연다.

그런데 `OutputPanel` wizard는 그 node를

- 로컬에서 삭제하고
- 로컬 temp node를 다시 만들고
- 다시 panel을 여는

방식으로 처리한다.

즉 persisted node를 temp node처럼 취급하는 설계가 문제의 본질이다.

### 4.2 editor 내부에 두 가지 노드 생명주기 모델이 공존

현재 editor에는 두 가지 모델이 동시에 있다.

1. persisted node 모델
- Canvas middle placeholder
- ServiceSelectionPanel
- API 응답 기준

2. local temp node 모델
- OutputPanel fallback
- createTemporaryWizardNode
- useAddNode

이 둘이 공존하면서 동작 의미가 깨진다.

### 4.3 실행 상태의 source가 둘로 갈라짐

현재 실행 UI는 아래 두 source를 동시에 갖고 있지만, 일관되게 사용하지 않는다.

- local optimistic state
- remote executions query

실제 렌더는 query에 의존하고, `execute` 직후 query는 즉시 반영을 보장하지 않으므로 상태 공백이 생긴다.

즉 문제의 본질은 local bridge와 remote authoritative status를 잇는 run lifecycle state machine이 없다는 점이다.

### 4.4 delete 뒤 그래프 동기화를 FE가 시뮬레이션함

현재 delete는 backend에서 cascade가 일어나는데, FE는 여전히 local graph를 직접 정리하는 경향이 남아 있다.

이건 backend 의미를 FE가 복제하는 구조이며, role drift와 cascade mismatch를 만들기 쉽다.

---

### 4.5 unsaved local position이 graph sync에 의해 유실될 수 있음

현재 `syncWorkflowGraph(...)`는 mutation 응답의 `WorkflowResponse`를 기준으로 graph를 통째로 동기화한다.

이 자체는 맞지만, 사용자가 저장 전에 local에서 바꾼 `position`까지 그대로 덮어쓰면
다음 문제가 생긴다.

- 드래그 직후 다른 node mutation 응답이 오면 방금 옮긴 위치가 되돌아감
- 향후 auto-arrange를 local action으로 구현해도 결과가 mutation 응답 한 번에 사라질 수 있음

즉 남은 핵심 문제는 "drag position을 즉시 서버 반영할지"보다,
"server-authoritative graph sync 중에 unsaved local position을 어떻게 보존할지"다.

## 5. 핵심 설계 원칙

### 5.1 editor는 persisted workflow 전용 surface

editor 안에서는 `workflowId`가 항상 있다고 본다.

- store의 `workflowId: ""`는 기술적 초기값일 뿐
- 런타임 정상 경로에서는 editor 진입 전에 항상 `workflowId`가 세팅되어 있어야 한다

### 5.2 그래프의 authoritative source는 mutation 응답 `WorkflowResponse`

node add/update/delete 이후의 최종 그래프는 FE가 부분 시뮬레이션하지 않는다.

- mutation 응답의 `WorkflowResponse`
- `hydrateStore(workflow)` 기반 graph 재구성

을 source of truth로 사용한다.

### 5.3 graph sync와 UI session sync를 분리한다

`hydrateWorkflow()`는 editor 초기화용이므로 mutation 후 그대로 재사용하면 안 된다.

필요한 것은 다음이다.

- graph만 서버 응답으로 동기화하는 `syncWorkflowGraph(workflow, options)`
- panel / wizard / dirty / placeholder 같은 UI session은 선택적으로 보존

즉 workflow graph authoritative sync와 editor UI session lifecycle을 분리한다.

### 5.3.1 graph sync는 unsaved local position override를 보존한다

graph는 server-authoritative로 동기화하되, `position`만은 예외 규칙을 둔다.

규칙:

- 구조는 mutation 응답 `WorkflowResponse`가 이긴다
- 저장 전 local unsaved `position`은 FE가 일시적으로 보존한다
- 서버에서 삭제된 node는 서버 상태를 따른다
- 새로 생긴 node는 서버 `position`을 따른다
- local override는 `position`에만 한정한다
- `type`, `config`, `role`, `edge`는 local merge 대상이 아니다

즉 FE는 `nodeId` 기준으로 "살아 있는 기존 node의 local unsaved position"만
의도적으로 다시 덮어씌운다.

### 5.3.2 auto-arrange도 local layout action으로 취급한다

향후 auto-arrange는 별도 server-driven layout이 아니라 FE local layout action으로 본다.

즉 auto-arrange는:

1. 여러 node의 `position`을 한 번에 재계산
2. local store에 반영
3. `dirty = true`
4. save 시 전체 workflow로 서버 반영

로 처리한다.

따라서 drag와 auto-arrange는 둘 다 "unsaved local position override" 규칙 위에서 보호된다.

### 5.3.3 position override는 명시적 store 상태로 관리한다

`nodes` 자체만으로 local unsaved position을 추론하지 않는다.

store는 별도 상태를 가진다.

- `unsavedNodePositions: Record<nodeId, position>`

이 상태의 의미:

- 서버에 아직 저장되지 않았지만 FE가 일시적으로 보존해야 하는 `position`
- graph 구조와 분리된 layout 임시 상태

이 방식을 쓰는 이유:

- drag와 auto-arrange를 같은 방식으로 추적할 수 있음
- `syncWorkflowGraph(...)` merge가 단순해짐
- save 성공 후 clear 시점이 명확해짐
- 마지막 hydrate 상태와 diff를 계산하는 방식보다 디버깅이 쉬움

### 5.3.4 local position override의 수명 주기를 명시한다

`unsavedNodePositions`는 영구 상태가 아니라 editor 세션 안의 임시 상태다.

생성 시점:

- node drag 이동
- auto-arrange가 바꾼 batch position

유지 시점:

- 다른 node mutation 응답으로 graph sync가 와도 유지
- save 실패 시 유지

clear 시점:

- save 성공 직후
- workflow hydrate 시
- editor reset 시

즉 "저장되기 전까지는 보존하고, 저장되거나 editor 세션이 새로 시작되면 비운다"가 기본 규칙이다.

### 5.4 wizard의 기준 노드는 persisted staging node

`OutputPanel` wizard의 기준 노드는 더 이상 local temp node가 아니다.

Canvas middle placeholder에서 생성된 persisted middle node를 staging node로 삼고, 이후 wizard는 이 노드를 기준으로 진행한다.

### 5.5 wizard session은 session-owned leaf를 추적한다

wizard는 단순히 `actionNodeId`만 기억하지 않는다.

최소한 아래 상태를 가진다.

- `stagingNodeId`
- `baseStagingSnapshot`
- `activeTargetNodeId`
- `sessionOwnedLeafNodeIds`
- `phase`

즉 “지금 이 세션이 만든 node인지”, “안전하게 delete 가능한지”를 step state가 아니라 session-owned graph state로 추적한다.

### 5.6 되돌리기는 local 재생성이 아니라 persisted rollback

뒤로 가기에서

- staging node는 `update node`로 이전 상태로 되돌리고
- session-owned safe leaf만 제한적으로 `delete node`

한다.

즉 `createTemporaryWizardNode` 같은 local 재생성 경로는 제거한다.

### 5.7 safe delete를 코드로 강제한다

delete는 아래 조건을 모두 만족할 때만 허용한다.

- `nodeId`가 `sessionOwnedLeafNodeIds`에 포함됨
- staging node가 아님
- current graph 기준 outgoing edge가 없음
- role이 `start` / `end`가 아님

즉 “안전한 leaf만 delete”는 주석이 아니라 코드 조건이어야 한다.

### 5.8 config는 항상 full object로 보낸다

backend가 partial merge를 지원하지 않으므로, FE는 update 시 항상 완전한 config를 조합해서 보낸다.

### 5.9 FE가 허용 전환을 제한한다

backend는 invalid transition을 막지 않으므로, FE는 wizard에서 허용된 타입 전환만 수행해야 한다.

즉 “아무 node나 아무 node로 바꾼다”는 접근은 금지한다.

### 5.10 실행 상태는 `executionId` 기반 local bridge + remote query

실행 상태는 다음 두 층으로 관리한다.

1. local bridge phase
- `idle`
- `auto-saving`
- `starting`

2. remote execution status
- executions list에서 `executionId`로 식별한 실제 원격 상태

즉 `execute` 직후 row가 아직 안 보여도 `starting`을 통해 UI 공백 없이 이어간다.

### 5.11 shared user는 read-only editor

shared user는 workflow에 접근할 수는 있지만, editor에서는 read-only로 동작한다.

- canvas 조회 가능
- panel 조회 가능
- execution 상태 조회 가능
- node mutation 관련 UI는 전부 비활성화
- save도 비활성화

즉 shared user는 owner editing path와 다른 capability 모델을 가져야 한다.

---

## 6. FE node transition whitelist

`OutputPanel` wizard는 `src/features/choice-panel/model/mappingRules.ts`의 `node_type` 결과와 `MAPPING_NODE_TYPE_MAP`에 정의된 FE node type 매핑만 허용한다.

현재 FE가 허용하는 wizard 전환 대상은 아래 다섯 종류뿐이다.

| backend mapping node_type | FE node type | 용도 |
| --- | --- | --- |
| `LOOP` | `loop` | 목록형 입력을 개별 단위로 분해하는 processing node |
| `CONDITION_BRANCH` | `condition` | 조건 분기 |
| `AI` | `llm` | 요약, 분류, 생성, 번역 등 AI 처리 |
| `DATA_FILTER` / `AI_FILTER` | `filter` | 조건 필터링 |
| `PASSTHROUGH` | `data-process` | 구조를 유지한 채 통과시키는 staging 유지형 처리 |

아래 타입은 wizard 전환 대상으로 허용하지 않는다.

- `communication`
- `storage`
- `spreadsheet`
- `web-scraping`
- `calendar`
- `trigger`
- `multi-output`
- `output-format`
- `early-exit`
- `notification`

즉 wizard는 domain/service node를 직접 만들지 않고, processing/AI 범위 안에서만 전환한다.

### 6.1 단계별 허용 전환 규칙

| 단계 | 기준 node | 허용 결과 | 처리 방식 |
| --- | --- | --- | --- |
| 초기 staging | `data-process` middle node | 유지 | Canvas middle placeholder가 생성한 persisted staging node를 사용 |
| processing-method | `data-process` staging node | `loop` 또는 `data-process` 유지 | `updateWorkflowNode` in-place |
| action (processing 없음) | `data-process` staging node | `llm`, `condition`, `filter`, `data-process` | `updateWorkflowNode` in-place |
| action (processing 있음) | `loop` staging node | `loop` 유지 | staging node는 그대로 두고 action node만 `addWorkflowNode` |
| follow-up | 현재 target node | 동일 type 유지 | type 변경 없이 config full replace |
| back to action | action node | 동일 type 유지 | local temp 재생성 없이 기존 persisted node 재사용 |
| back to processing | staging + optional action leaf | staging는 이전 snapshot으로 복원 | safe leaf만 delete, staging는 update |

추가 규칙:

1. `FILE_LIST`, `EMAIL_LIST`, `SPREADSHEET_DATA`처럼 processing method가 있는 입력은 `LOOP`를 staging 전환 대상으로 허용한다.
2. processing method가 `all_at_once` 또는 `null`인 경우 staging node는 `data-process`로 유지한 채 action 단계에서 최종 type으로 전환한다.
3. `AI_FILTER`는 별도 FE node를 만들지 않고 `filter`로 매핑한다.
4. `PASSTHROUGH`는 새 node를 만들지 않고 현재 staging node를 `data-process`로 유지한다.
5. follow-up과 branch는 구조 변경이 아니라 config 보완이므로, 기존 target node의 `type`은 바꾸지 않는다.

---

## 7. 목표 상태

이번 작업이 끝나면 editor는 아래처럼 동작해야 한다.

1. 생성 버튼 클릭
2. 서버에 빈 workflow 생성
3. 성공 시 `/workflow/:id` editor 이동
4. editor는 persisted workflow를 hydrate
5. 이후 노드 추가 / 삭제 / 되돌리기 / 저장 / 실행은 모두 서버 workflow 기준

추가로 다음도 만족해야 한다.

- 실행 상태는 `executionId` 기반으로 추적
- 그래프는 mutation 응답 `WorkflowResponse` 기준으로 동기화
- shared user는 read-only editor로 동작

---

## 8. OutputPanel wizard 재설계

### 8.1 새 개념: persisted staging node

staging node는 아래를 만족하는 persisted node다.

- 이미 서버에 존재
- `role = middle`
- wizard가 아직 최종 node 의미를 확정하지 않은 상태

현재 기준으로는 Canvas middle placeholder에서 생성된 middle node가 이 역할을 맡는다.

### 8.2 wizard session state

wizard는 아래 상태를 가진다.

- `stagingNodeId`
- `rootParentNodeId`
- `baseStagingSnapshot`
- `activeTargetNodeId`
- `sessionOwnedLeafNodeIds`
- `selectedProcessingOption`
- `selectedAction`
- `currentDataTypeKey`
- `phase`

### 8.3 baseStagingSnapshot

`baseStagingSnapshot`은 wizard 시작 시점의 staging node 원본 상태다.

최소 아래를 포함한다.

- `category`
- `type`
- `config`
- `dataType`
- `outputDataType`
- `role`
- `position`
- `authWarning`

이 snapshot은 뒤로 가기에서 staging node를 복원할 때 쓴다.

### 8.4 authoritative graph sync helper

store에는 mutation 후 아래 동작을 담당하는 액션이 필요하다.

- `syncWorkflowGraph(workflow, options)`

역할:

- `hydrateStore(workflow)`로 nodes / edges / start / end / creationMethod 재계산
- panel node 유지 여부 선택
- dirty 유지 여부 선택
- wizard session은 store가 아니라 `OutputPanel` local state가 계속 소유

즉 editor 초기 hydrate와 mutation 후 graph sync를 분리한다.

### 8.4.1 local unsaved position merge 규칙

`syncWorkflowGraph(...)`의 merge는 아래 순서를 따른다.

1. mutation 응답 `WorkflowResponse`를 `hydrateStore(workflow)`로 변환
2. 현재 local store에서 unsaved position 후보를 `nodeId -> position` 맵으로 수집
3. hydrate된 새 nodes를 순회하며 같은 `nodeId`가 있고 local override가 있으면 그 node의 `position`만 교체
4. 서버 응답에 없는 node는 복원하지 않음
5. 새로 생긴 node는 서버 `position`을 그대로 사용

추가 규칙:

- merge 대상은 position만
- panel / wizard session / dirty는 기존 `options` 규칙을 따른다
- FE가 local override를 오래 들고 있다가 save하면, save payload가 최종 source of truth가 된다

### 8.4.2 local position override의 출처

local unsaved position override는 아래 두 경우에만 생긴다.

- 사용자의 node drag 이동
- 향후 auto-arrange가 바꾼 batch position

즉 일반 config 수정이나 wizard 전환은 position override 출처가 아니다.

### 8.4.3 drag 기록 규칙

`onNodesChange(...)`는 `NodeChange`를 모두 같은 의미로 취급하지 않는다.

position override 기록 대상:

- `change.type === "position"`

position override 기록 대상 아님:

- 일반 `replace`
- config 수정
- wizard 단계 전환으로 인한 구조 변경

즉 FE는 drag로 확정된 좌표만 `unsavedNodePositions[nodeId]`에 기록한다.

### 8.4.4 auto-arrange batch 기록 규칙

향후 auto-arrange는 별도 액션으로 여러 node의 좌표를 한 번에 반영한다.

예:

- `applyLayoutPositions([{ nodeId, position }, ...])`

이 액션은 아래를 동시에 수행한다.

1. 현재 `nodes`의 position을 batch update
2. 같은 값으로 `unsavedNodePositions`를 batch update
3. `isDirty = true`

즉 auto-arrange는 drag의 특수한 다른 종류가 아니라, 여러 node에 대한 local batch position update다.

### 8.4.5 save / hydrate / reset lifecycle

`unsavedNodePositions`는 아래 lifecycle을 따른다.

save 성공:

- `markClean()`
- `clearUnsavedNodePositions()`

save 실패:

- `unsavedNodePositions` 유지
- `dirty` 유지

workflow hydrate:

- 새 workflow 기준으로 `nodes/edges` hydrate
- `unsavedNodePositions` clear

editor reset:

- `unsavedNodePositions` clear

즉 save가 끝나면 local override는 서버에 반영된 정식 상태가 되고,
hydrate/reset이 일어나면 이전 세션의 stale layout override는 버린다.

### 8.5 단일 노드 전환 경로

처리 단계가 별도 node를 만들 필요가 없는 경우:

1. `select choice`로 추천 결과 조회
2. staging node를 `updateWorkflowNode`로 제자리 변경
3. config full replace
4. 응답 `WorkflowResponse`로 graph sync
5. panel은 같은 `nodeId`를 유지한 채 계속 사용

예:

- `data-process -> llm`
- `data-process -> condition`

### 8.6 processing + action 2단계 경로

별도의 processing node와 action node가 모두 필요한 경우:

1. staging node를 processing node로 `updateWorkflowNode`
2. 응답 `WorkflowResponse`로 graph sync
3. action node를 `addWorkflowNode`로 추가
4. 응답 `WorkflowResponse`로 graph sync
5. 새로 만든 action node를 `sessionOwnedLeafNodeIds`에 등록
6. panel은 action node를 대상으로 연다

핵심은 staging node 자체는 삭제하지 않는 것이다.

### 8.7 mutation 순서 원칙

backend는 각 mutation 뒤에 workflow validation을 다시 실행하므로, wizard는 아래 순서를 기본으로 한다.

1. 먼저 살아남을 node를 update
2. 그 다음에 필요한 leaf node를 add
3. 되돌릴 때도 가능하면 staging node를 먼저 restore/update
4. delete는 가장 마지막에, 그리고 safe leaf node에만 사용

즉 다음 패턴을 기본으로 한다.

- 진행: `update staging -> add leaf -> graph sync`
- 되돌리기: `delete leaf (if safe) -> graph sync -> restore staging -> graph sync`

반대로 아래 패턴은 지양한다.

- `delete active node -> add replacement`
- `delete staging node -> recreate temp node`

### 8.8 follow-up / branch 구성

follow-up은 구조 변경보다 config 보완 성격이 강하다.

따라서 기본 원칙은:

- target node는 그대로 유지
- follow-up 결과를 포함한 최종 config를 full replace로 `updateWorkflowNode`
- 응답 `WorkflowResponse`로 graph sync

### 8.9 safe delete 규칙

`delete node`는 cascade이므로 아래 조건을 모두 만족할 때만 사용한다.

- wizard 세션이 만든 leaf node
- `sessionOwnedLeafNodeIds`에 포함
- downstream가 현재 그래프 기준으로 없음
- staging node가 아님
- start / end role이 아님

이 조건을 만족하지 않으면 back은 구조 delete 대신 안내/차단으로 처리한다.

### 8.10 local helper 제거

위 전략이 들어가면 아래는 제거 대상이 된다.

- `createLocalNode`
- `createTemporaryWizardNode`
- `useAddNode`
- `!workflowId` fallback

즉 `useAddNode` 삭제는 fallback 제거 뒤가 아니라, wizard local temp 경로 제거 완료 후 가능하다.

---

## 9. 실행 계약 재설계

### 9.1 현재 계약

현재는 dirty 상태에서 `Run` 클릭 시 warning toast를 띄우고 실행을 막는다.

### 9.2 변경 계약

앞으로는 아래처럼 바꾼다.

1. `Run` 클릭
2. dirty 검사
3. dirty면 자동 저장 시작
4. 저장 성공 시 `executeWorkflow`
5. `executionId` 확보
6. `starting` phase 진입
7. executions query에서 해당 `executionId`를 찾을 때까지 local bridge 유지
8. row가 보이면 remote status로 전환
9. 저장 실패 시 execute 미호출 + error toast

### 9.3 run phase 상태 모델

`EditorRemoteBar`는 local bridge phase를 가진다.

- `idle`
- `auto-saving`
- `starting`

추가 상태:

- `activeExecutionId: string | null`

이 phase는 remote executions query를 대체하는 것이 아니라, eventual consistency 구간을 메우는 목적이다.

### 9.4 실행 상태 결정 규칙

UI는 아래 우선순위로 상태를 계산한다.

1. `runPhase === "auto-saving"` -> `저장 중...`
2. `runPhase === "starting"` -> `실행 시작 중...`
3. `activeExecutionId`와 매칭되는 원격 execution state가 있으면 그 state 사용
4. 없으면 기본 `idle`

즉 더 이상 “최신 실행 1개”만으로 상태를 결정하지 않는다.

### 9.5 실행 query 사용 원칙

executions list는 아래 전제로 사용한다.

- 즉시 반영 보장 없음
- 최신순 보장 없음
- `executionId`가 1차 식별 키

즉 FE는 `getLatestExecution()`만으로 실행 추적을 하면 안 된다.

### 9.6 저장 중 UI

자동 저장이 발생하는 경우 별도의 저장 중 문구를 노출한다.

예:

- `저장 중...`

중요:

- 이 상태는 실행 중과 구분되어야 한다
- 저장 단계에서 `running`을 표시하면 안 된다

### 9.7 실행 시작 중 UI

`execute`는 성공했지만 executions list에 row가 아직 없는 경우 아래 문구를 쓴다.

- `실행 시작 중...`

즉 `"저장 중..."`이 끝난 직후 바로 `"실행 중..."`으로 넘어가지 않아도, 공백 없이 bridge 문구를 유지한다.

### 9.8 저장 실패 처리

- 토스트 노출
- execute 미호출
- dirty 상태 유지
- `runPhase = idle`

---

## 10. shared user read-only editor 설계

### 10.1 정의

shared user는 workflow에 접근 권한은 있지만 소유자는 아닌 사용자다.

현재 backend 계약상 node mutation은 owner-only이므로, 이번 설계에서 shared user는 read-only editor로 동작한다.

### 10.2 capability 모델

editor는 최소 아래 capability를 구분해야 한다.

- `canViewEditor`
- `canEditNodes`
- `canSaveWorkflow`
- `canRunWorkflow`

이번 설계의 기본값:

- owner
  - `canViewEditor = true`
  - `canEditNodes = true`
  - `canSaveWorkflow = true`
  - `canRunWorkflow = true`

- shared user
  - `canViewEditor = true`
  - `canEditNodes = false`
  - `canSaveWorkflow = false`
  - `canRunWorkflow`는 후속 정책 결정 전까지 `false`를 기본으로 둔다

### 10.3 read-only UX

shared user editor에서는 아래를 적용한다.

- canvas 조회 가능
- panel 조회 가능
- node mutation 진입점 비활성화
- save 비활성화
- 실행 버튼은 정책 확정 전까지 비활성화
- 상단 안내 배너 또는 tooltip 제공

예시 문구:

- `공유된 워크플로우입니다. 편집은 소유자만 가능합니다.`

### 10.4 이번 범위

이번 문서에서는 shared user를 read-only로 정의하지만, 실제 UX 구현은 후속 과제로 분리 가능하다.

---

## 11. 생성 실패와 비정상 진입 처리

### 11.1 생성 실패

`useCreateWorkflowShortcut`는 실패 시 아래처럼 동작한다.

- 토스트 노출
- 문구: `워크플로우 생성에 실패했습니다. 잠시 후 다시 시도해주세요.`
- 목록으로 복귀

### 11.2 `workflowId` 없는 editor 진입

editor는 정상 경로 기준으로 `workflowId`가 항상 있어야 한다.

따라서 `workflowId` 없이 editor에 진입하면:

- 목록으로 리다이렉트

이 경로는 정상 플로우가 아니라 방어 케이스다.

---

## 12. 이번 작업에 포함하지 않는 것

이번 설계는 아래를 포함하지 않는다.

- 새 워크플로우 생성 페이지 신설
- creation method UI 제거
- start / end placeholder 구조 변경
- node drag position 즉시 API 반영
- 빈 workflow 자동 정리
- 동시 수정 충돌 해결

즉 이번 작업의 범위는 editor를 persisted workflow 전용으로 정렬하고, wizard의 node lifecycle을 local temp 기반에서 persisted staging 기반으로 바꾸며, 실행 상태를 `executionId` 기준으로 정리하는 것까지다.

---

추가 정리:

- drag/auto-arrange 결과의 `position`을 save 전까지 local에서 보존하는 규칙은 이번 설계 범위에 포함한다.
- 하지만 auto-arrange 버튼의 실제 기능 연결과 position 즉시 서버 저장은 이번 작업에 포함하지 않는다.

## 13. 권장 구현 단계

### Step 1. 생성 실패 UX 보강

대상:

- `useCreateWorkflowShortcut.ts`

내용:

- create 실패 시 토스트 추가
- 그 후 목록 복귀

커밋 예시:

- `fix: 워크플로우 생성 실패 처리 정리`

### Step 2. graph authoritative sync 기반 추가

대상:

- `workflowStore.ts`
- `workflow-editor-adapter.ts`

내용:

- `syncWorkflowGraph(workflow, options)` 추가
- `hydrateWorkflow()`와 mutation 후 graph sync 분리

커밋 예시:

- `refactor: workflow graph 동기화 경계 정리`

### Step 3. graph sync에 local unsaved position preserve 추가

대상:

- `workflowStore.ts`
- 필요 시 `Canvas.tsx`
- 필요 시 graph sync 호출부

내용:

- `syncWorkflowGraph(...)`가 mutation 응답을 그대로 치환하지 않도록 보강
- `unsavedNodePositions` 같은 명시적 store 상태 추가
- drag `position` 변경만 override 대상으로 기록
- 향후 auto-arrange가 같은 상태 모델을 재사용할 수 있게 batch layout action 골격 정리
- 살아 있는 node의 local unsaved `position`만 `nodeId` 기준으로 merge
- 삭제된 node는 복원하지 않음
- 새 node는 서버 `position` 사용
- save 성공 / hydrate / reset 시 override clear lifecycle 정리
- drag와 향후 auto-arrange가 같은 position preserve 규칙을 따르도록 명시

커밋 예시:

- `fix: graph sync 중 local position preserve 정리`

### Step 4. OutputPanel wizard를 persisted staging 기반으로 전환

대상:

- `OutputPanel.tsx`

내용:

- `createLocalNode` 제거
- `createTemporaryWizardNode` 제거
- `!workflowId` fallback 제거
- `removeNode(activeNode.id)` 제거
- session-owned leaf 추적 추가
- safe delete 조건 도입
- update / add / delete 후 `WorkflowResponse` 기반 graph sync

커밋 예시:

- `refactor: OutputPanel wizard 노드 생명주기 정리`

### Step 5. useAddNode 삭제

대상:

- `useAddNode.ts`
- `features/add-node/model/index.ts`

내용:

- 훅 파일 삭제
- export 제거
- `rg "useAddNode" src/` 결과 0건 확인

커밋 예시:

- `chore: useAddNode 훅 제거`

### Step 6. 실행 전 자동 저장 + executionId 추적

대상:

- `EditorRemoteBar.tsx`
- 필요 시 execution query helper

내용:

- dirty면 auto-save
- save success 후 execute
- `executionId` 저장
- `auto-saving` / `starting` bridge phase 도입
- query는 `executionId`로 매칭

커밋 예시:

- `fix: executionId 기반 실행 상태 추적 정리`

### Step 7. shared user read-only UX

대상:

- editor 진입 가드
- `Canvas`
- `ServiceSelectionPanel`
- `OutputPanel`
- `EditorRemoteBar`

내용:

- capability 주입
- mutation UI 비활성화
- read-only 안내 문구 추가

커밋 예시:

- `feat: 공유 사용자 읽기 전용 editor 적용`

---

## 14. 완료 조건 (DoD)

- 생성 버튼 클릭 시 서버 workflow 생성 후 editor 진입
- 생성 실패 시 토스트 + 목록 복귀
- 생성 직후 placeholder 화면 유지
- `OutputPanel`에서 local temp node 경로 0건
- `useAddNode` 사용처 0건
- node add/update/delete 후 graph는 `WorkflowResponse` 기준으로 동기화
- 저장 전 local drag/auto-arrange position은 다른 mutation 응답이 와도 유실되지 않음
- `unsavedNodePositions`가 save 성공 / hydrate / reset 시 올바르게 clear 됨
- dirty 상태에서 `Run` 클릭 시 자동 저장 후 실행
- 실행 상태는 `executionId` 기준으로 추적
- executions list 반영 전에도 `"실행 시작 중..."` bridge가 유지됨
- 저장 실패 시 execute 미호출 + 토스트
- shared user는 read-only editor로 진입
- `workflowId` 없이 editor 진입 시 목록 리다이렉트
- `pnpm run lint`
- `pnpm run tsc`
- PR 전 `pnpm run build`

---

## 15. 검증 시나리오

### 15.1 생성 경로

1. 사이드바 `+` 클릭
2. 서버에 빈 workflow 생성
3. `/workflow/:id` 이동
4. 생성 직후 화면은 `시작 / 도착` placeholder 유지

### 15.2 생성 실패

1. create API 실패 유도
2. 토스트 노출
3. 목록 복귀

### 15.3 OutputPanel wizard

1. middle node panel 진입
2. wizard 선택 진행
3. local temp node 재생성 없이 persisted node update / add / delete만 사용
4. delete 후 graph는 mutation 응답 `WorkflowResponse`로 동기화
5. 뒤로 가기에서 staging node는 update로 복원

### 15.4 safe delete

1. session-owned leaf node 생성
2. downstream가 없을 때만 delete 허용
3. downstream가 생긴 경우 back/delete 차단 또는 안내

### 15.5 unsaved local position preserve

1. node를 drag해서 local position 변경
2. 저장하지 않은 상태에서 다른 node mutation 발생
3. mutation 응답 `WorkflowResponse`로 graph sync
4. 방금 옮긴 node의 `position`은 유지
5. 새로 생긴 node는 서버 `position` 사용

### 15.6 auto-arrange 호환성

1. auto-arrange가 여러 node의 position을 local에서 일괄 변경한다고 가정
2. 저장 전 다른 node mutation 응답 도착
3. auto-arrange로 바뀐 살아 있는 node의 `position`은 유지
4. 삭제된 node는 복원되지 않음

### 15.7 override lifecycle

1. node drag로 `unsavedNodePositions` 생성
2. save 성공
3. override clear
4. 이후 새 mutation 응답 sync 시 저장된 서버 position 기준으로 동작

1. node drag로 `unsavedNodePositions` 생성
2. save 실패
3. override 유지
4. 사용자가 다시 save 할 때까지 local position 유지

### 15.8 executionId 기반 실행 추적

1. dirty 상태에서 `Run`
2. `저장 중...`
3. save success 후 `실행 시작 중...`
4. executions list에 해당 `executionId` row가 잡히면 remote 상태로 전환

### 15.9 executions eventual consistency

1. `POST /execute` 성공 직후 executions list가 비어 있거나 갱신이 늦는 상황 유도
2. bridge phase가 유지되어 UI 공백이 없는지 확인

### 15.10 useAddNode 제거 확인

```bash
rg "useAddNode" src/
```

기대 결과:

- 0건

### 15.11 shared user read-only

1. 공유 사용자 계정으로 editor 진입
2. canvas / panel 조회 가능
3. node mutation 관련 UI disabled
4. save disabled

### 15.12 `workflowId` 없는 editor 방어

1. 비정상 상태로 editor 진입 유도
2. 목록으로 리다이렉트

---

## 16. 리스크와 주의점

1. backend는 type transition을 검증하지 않으므로 FE가 허용 전환을 제한해야 한다.
2. backend delete는 cascade이므로 safe delete 조건이 코드에 강제되어야 한다.
3. config는 full replace이므로 update 시 완전한 config 조합이 필요하다.
4. 각 mutation 뒤에는 workflow validation이 다시 돌기 때문에, 중간 invalid 상태를 만드는 순서는 실패할 수 있다.
5. start / end / middle role은 서버가 자동 정리하지 않으므로 FE가 role 책임을 계속 가져야 한다.
6. executions list는 eventual consistency이므로 `latestExecution` 단일 기준으로는 실행 상태를 정확히 추적할 수 없다.
7. 동시 수정 충돌 보호가 없어 현재 계약은 last-write-wins다.
8. shared user 편집은 backend가 owner-only로 막고 있으므로, FE도 read-only UX로 정렬해야 한다.
9. 이 설계는 persisted workflow 전용으로 editor를 정렬하지만, 빈 workflow가 목록에 남는 정책은 유지한다.
10. local position preserve는 `position`에만 한정해야 하며, `type/config/role/edge`까지 local override하면 안 된다.
11. `unsavedNodePositions`는 editor 세션 임시 상태이므로, save 성공과 hydrate/reset 시 clear되지 않으면 stale layout bug가 생긴다.

---

## 17. 한 줄 요약

이번 작업의 본질은 생성 버튼이 이미 서버 workflow를 만들어주고 있으므로, editor 내부의 local draft 경로를 제거하고, OutputPanel wizard를 persisted staging node 기반으로 다시 설계하며, 그래프는 `WorkflowResponse` 기준으로, 실행 상태는 `executionId` 기준으로, shared user는 read-only editor 기준으로 통일하는 것이다.
