# useAddNode API 전환 설계 문서

> **작성일:** 2026-04-16
> **대상:** `src/features/add-node/model/useAddNode.ts` 및 호출부 3곳
> **목적:** 서버 API를 거치지 않고 zustand만 조작하는 노드 추가 경로를 식별하고, 서버 정합성을 확보하기 위한 전환 방안을 정리한다.

---

## 1. 현재 상태

### 1.1 두 가지 노드 추가 경로

| 경로 | 진입점 | API 호출 | ID 생성 | 서버 정합성 |
|---|---|---|---|---|
| **A. API 경유** | `ServiceSelectionPanel.placeNode` | `POST /workflows/{id}/nodes` | 서버가 생성 | ✅ |
| **B. 로컬 전용** | `useAddNode.addNodeByType` | 없음 | `crypto.randomUUID()` | ❌ |

경로 B(`useAddNode`)는 백엔드 미구현 시점에 임시로 만든 로컬 전용 함수다.

### 1.2 useAddNode 호출부 3곳

#### (1) Canvas.tsx:244 — 임시 노드 생성 🔴 **활성 경로**

```
사용자가 중간 placeholder 클릭 (start/end가 아닌 placeholder)
  → addNode("data-process", {
      position: panelNodePosition,  // placeholder 노드의 position에서 계산
      inputTypes: sourceNode.outputTypes,
      outputTypes: [sourceOutputType],
      label: "설정 중" | "가공"
    })
  → onConnect(sourceNodeId → tempNodeId)
  → openPanel(tempNodeId)
```

- **용도:** 사용자가 placeholder를 클릭하면 "설정 중"이라는 임시 data-process 노드를 로컬에 생성하고, 설정 패널을 연다.
- **위치 출처:** `panelNodePosition`은 클릭된 placeholder 노드의 `position`에서 파생 (`node.position.x`, `getTopYFromCenter(centerY, DEFAULT_FLOW_NODE_HEIGHT)`)
- **후속 흐름:** 사용자가 패널에서 설정을 완료하면 이 노드가 그대로 남아 저장 시 서버로 전송된다.
- **문제:** 임시 노드의 ID가 `crypto.randomUUID()`로 생성됨. 저장 전까지 서버가 이 노드를 모름. **실행 버튼을 누르면 서버에는 이전 상태의 워크플로우가 실행된다.**

#### (2) OutputPanel.tsx:376 — 위저드 임시 노드 🟢

```
createLocalNode({ meta, sourceNodeId, position, outputDataType, label })
  → addLocalNode(meta.type, { position, outputTypes, label })
  → onConnect(source → target)
```

- **용도:** OutputPanel 위저드에서 임시 노드를 생성. `createTemporaryWizardNode`에서 사용.
- **후속 흐름:** `placeWorkflowNode`가 호출되면 API 경유로 실제 노드를 생성하고, 이 임시 노드는 교체된다.
- **참고:** `placeWorkflowNode`(line 414)는 **이미 `workflowId` 존재 시 API를 호출하는 정상 경로**가 구현돼 있다. `workflowId` 없을 때만 fallback으로 로컬 생성.

#### (3) NodeCategoryDrawer.tsx:44 — ⚫ **데드 코드**

```
handleNodeClick(type)
  → addNode(type)
  → onClose()
```

- **용도:** 카테고리 드로어에서 노드 타입 클릭 시 캔버스에 바로 추가.
- **진입점:** `AddNodeButton` 컴포넌트가 이 드로어를 여는 유일한 경로.
- **문제:** **`AddNodeButton`은 정의만 있고 어디서도 import/사용되지 않는다.** `grep` 결과 `AddNodeButton`이 존재하는 파일은 `src/features/add-node/ui/AddNodeButton.tsx` 하나뿐. 즉, `NodeCategoryDrawer`는 런타임에 도달 불가능한 데드 코드다.

---

## 2. 문제 분석

### 2.1 공통 문제

- **ID 불일치:** `crypto.randomUUID()`로 생긴 ID는 서버가 모른다. 저장 전에 실행하면 서버가 이 노드를 인식 못 한다.
- **실행 위험:** 노드를 추가하고 저장 없이 실행 버튼을 누르면, 서버에는 이전 상태의 워크플로우가 실행된다.

### 2.2 호출부별 위험도

| 호출부 | 위험도 | 런타임 도달 | 이유 |
|---|---|---|---|
| Canvas.tsx:244 | 🔴 높 | ✅ 활성 | 사용자가 placeholder 클릭 → 임시 노드 생성. 저장 전 실행 가능. **유일한 활성 위험 경로** |
| OutputPanel.tsx | 🟢 낮 | ✅ 활성 | `placeWorkflowNode`가 이미 API 경유 구현 완료. 위저드 임시 노드는 교체됨 |
| NodeCategoryDrawer.tsx | ⚫ 해당 없음 | ❌ 데드 코드 | `AddNodeButton` 미사용. 런타임에 도달 불가 |

### 2.3 핵심 위험: Canvas.tsx의 임시 노드

Canvas.tsx:244의 흐름을 구체적으로 정리한다:

```
1. 사용자가 중간 placeholder 클릭
2. useAddNode.addNodeByType("data-process", { position, inputTypes, outputTypes, label })
3. crypto.randomUUID() → tempNodeId (서버 모름)
4. zustand addNode(node) → 로컬 상태에만 추가
5. onConnect(sourceNodeId → tempNodeId) → 로컬 엣지 추가
6. openPanel(tempNodeId) → 설정 패널 열림

이 시점에서 사용자가:
  (a) 패널에서 설정 완료 → 저장 → 정상 (useSaveWorkflowMutation이 전체 상태 전송)
  (b) 실행 버튼 클릭 → ⚠️ 서버는 이전 상태로 실행 (tempNode 미포함)
```

**(b)가 실제 위험이다.** 저장되지 않은 로컬 변경이 있는 상태에서 실행하면 예상과 다른 결과가 나온다.

---

## 3. 전환 방안

### 3.1 원칙

- **임시 노드와 확정 노드를 구분한다.** 위저드/패널에서 설정 중인 노드는 로컬 임시 생성이 합리적. 최종 확정 시 API를 태운다.
- **최소 변경으로 정합성을 확보한다.** 동작하는 코드를 불필요하게 뒤집지 않는다.
- **데드 코드는 전환 대상이 아니다.** 사용되지 않는 코드를 API 전환하는 것은 의미 없다. 정리(삭제) 대상이다.

### 3.2 호출부별 대응

#### (1) Canvas.tsx — 🔴 현행 유지 + 실행 전 저장 가드

**현재:** 임시 노드 생성 → 패널 오픈
**변경 옵션 분석:**

| 옵션 | 설명 | 장점 | 단점 |
|---|---|---|---|
| **(A) API 선행** | placeholder 클릭 시 바로 서버에 노드 생성 → 응답으로 패널 오픈 | 정합성 완벽 | 네트워크 지연 동안 UX 끊김. placeholder 클릭 → 로딩 → 노드 생성이라 반응 느림 |
| **(B) 현행 유지 + 저장 가드** | 로컬 임시 노드 유지. 실행 시 dirty 체크로 저장 강제 | UX 변경 없음. 변경 범위 최소 | 임시 ID 정합성은 저장 시까지 미해결 (하지만 저장 가드가 있으므로 실행 위험은 제거됨) |
| **(C) 하이브리드** | 로컬 임시 생성 → 패널 설정 완료(blur/저장) 시 API 호출로 교체 | UX 좋고 정합성도 확보 | 교체 로직 복잡. 임시 ID → 서버 ID 매핑, 엣지 재연결 등 필요 |

**추천: (B)**

Canvas의 임시 노드는 "설정 중" 상태이므로 사용자가 패널을 닫거나 저장하기 전까지는 불완전한 노드다. 핵심 위험인 "저장 전 실행"만 막으면 실제 문제는 없다. 이를 위해 **dirty flag 기반 실행 가드**를 추가한다.

#### (2) OutputPanel.tsx — 🟢 변경 불필요

`placeWorkflowNode`가 이미 `workflowId` 존재 시 API를 호출한다. `createLocalNode` / `createTemporaryWizardNode`는 위저드 진행 중 임시 노드용이고, 최종 확정 시 API 경유 노드로 교체되는 구조가 이미 갖춰져 있다.

유일한 fallback(`workflowId` 없을 때)은 신규 워크플로우가 아직 서버에 생성되지 않은 초기 상태에서만 발생하므로, 워크플로우 생성 플로우가 정리되면 자연히 해소된다.

#### (3) NodeCategoryDrawer — ⚫ 데드 코드 정리

**현재:** `AddNodeButton` → `NodeCategoryDrawer` → `useAddNode`. 하지만 `AddNodeButton`이 어디서도 사용되지 않아 런타임에 도달 불가.

**대응:** API 전환이 아닌 **삭제** 대상. 이번 스코프가 아니라 후속 정리 작업으로 분류한다.

삭제 대상 파일:
- `src/features/add-node/ui/AddNodeButton.tsx`
- `src/features/add-node/ui/NodeCategoryDrawer.tsx`
- 관련 export 정리 (`src/features/add-node/ui/index.ts`, `src/features/add-node/index.ts`)

---

## 4. Dirty Flag 설계

### 4.1 개요

`workflowStore`에 dirty flag를 추가하여 "서버 상태와 로컬 상태가 다른지"를 추적한다. 이를 기반으로 실행 전 저장 가드를 구현한다.

### 4.2 핵심 구분: 로컬 전용 변경 vs API 성공 후 동기화

같은 store action(`addNode`, `onConnect`, `setStartNodeId` 등)이 **두 가지 맥락**에서 호출된다:

| 맥락 | 예시 | 서버 정합성 | dirty 여부 |
|---|---|---|---|
| **로컬 전용 변경** | Canvas.tsx:244 `useAddNode` → `addNode()` → `onConnect()` | ❌ 서버 모름 | ✅ dirty |
| **API 성공 후 동기화** | ServiceSelectionPanel:452 `addWorkflowNode()` 성공 → `addNode()` → `onConnect()` → `setStartNodeId()` | ✅ 서버 반영 완료 | ❌ clean |

**이 구분 없이 action 단위로 일괄 dirty를 걸면, API 경유로 이미 서버에 반영된 변경도 "저장 안 됨"으로 오판한다.**

구체적인 API 성공 후 동기화 경로:

| 파일 | API 호출 | 이후 store 호출 |
|---|---|---|
| `ServiceSelectionPanel.tsx:420` `placeNode` | `addWorkflowNode()` | `addNode()`, `onConnect()`, `setStartNodeId()`, `setEndNodeId()` |
| `OutputPanel.tsx:414` `placeWorkflowNode` | `addWorkflowNode()` | `addNode()`, `onConnect()`, `updateNodeConfig()` |
| `ServiceSelectionPanel.tsx:560` `handleBackFromRequirement` | `deleteWorkflowNode()` | `removeNode()` |
| `OutputPanel.tsx:489` `removeWorkflowNode` | `deleteWorkflowNode()` | `removeNode()` |

### 4.3 해결: `_isSyncing` 플래그로 맥락 구분

store에 내부 플래그 `_isSyncing`을 추가하고, API 성공 후 동기화 경로에서는 이 플래그를 켜서 dirty trigger를 억제한다.

```typescript
// workflowStore.ts

interface WorkflowEditorState {
  // ... 기존 필드
  isDirty: boolean;
  _isSyncing: boolean;  // 내부 전용. 외부 노출 불필요
}

interface WorkflowEditorActions {
  // ... 기존 action
  batchServerSync: (fn: () => void) => void;  // 추가
}
```

**`batchServerSync` 동작:**

```typescript
batchServerSync: (fn) => {
  set((state) => { state._isSyncing = true; });
  try {
    fn();  // 이 안에서 호출되는 addNode, onConnect 등은 dirty를 켜지 않음
  } finally {
    set((state) => { state._isSyncing = false; });
  }
},
```

**주의:** `batchServerSync` 안에는 **동기적인 store action만** 넣는다.  
`await addWorkflowNode(...)`, `await deleteWorkflowNode(...)` 같은 API 호출은 wrapper **밖에서 먼저 완료**하고, 성공한 뒤의 로컬 동기화만 wrapper 안에 넣는다.

**dirty trigger가 있는 action의 변경:**

```typescript
addNode: (node) =>
  set((state) => {
    state.nodes.push(node);
    if (!state._isSyncing) state.isDirty = true;
  }),

onConnect: (connection) =>
  set((state) => {
    state.edges = addEdge(connection, current(state.edges));
    if (!state._isSyncing) state.isDirty = true;
  }),

// setStartNodeId, setEndNodeId, setCreationMethod도 동일 패턴
setStartNodeId: (id) =>
  set((state) => {
    state.startNodeId = id;
    if (!state._isSyncing) state.isDirty = true;
  }),
```

**호출부 변경:**

```typescript
// ServiceSelectionPanel.tsx — placeNode 내부
const nextWorkflow = await addWorkflowNode({ workflowId, body: ... });
// API 성공 → 로컬 동기화 (dirty 미발생)
batchServerSync(() => {
  addNode(toFlowNode(addedNode));
  if (isStart) setStartNodeId(addedNodeId);
  if (isEnd) setEndNodeId(addedNodeId);
  if (sourceNodeId) onConnect({ source: sourceNodeId, target: addedNodeId, ... });
});

// OutputPanel.tsx — placeWorkflowNode 내부 (workflowId 있을 때)
const nextWorkflow = await addWorkflowNode({ workflowId, body: ... });
batchServerSync(() => {
  addNode(toFlowNode(addedNode));
  onConnect({ source: sourceNodeId, target: addedNodeId, ... });
});

// ServiceSelectionPanel.tsx — API 삭제 성공 후
await deleteWorkflowNode({ workflowId, nodeId: placedNodeId });
batchServerSync(() => {
  removeNode(placedNodeId);
});

// OutputPanel.tsx — removeWorkflowNode 내부
await deleteWorkflowNode({ workflowId, nodeId });
batchServerSync(() => {
  removeNode(nodeId);
});

// Canvas.tsx:244 — 로컬 전용 (batchServerSync 미사용 → dirty 발생)
const tempNodeId = addNode("data-process", { ... });
onConnect({ source: sourceNodeId, target: tempNodeId, ... });
// → isDirty = true
```

### 4.4 Baseline (기준 상태)

Dirty 판단의 기준이 되는 "깨끗한 상태"를 정의한다.

| 시점 | 행동 |
|---|---|
| `hydrateWorkflow(payload)` 호출 시 | 서버에서 받은 상태로 hydrate. **dirty = false** (새 baseline) |
| `useSaveWorkflowMutation` 성공 시 | 저장 완료. **dirty = false** (새 baseline) |
| `resetEditor()` 호출 시 | 에디터 초기화. **dirty = false** |

### 4.5 Dirty Trigger (오염 조건)

`_isSyncing === false`일 때만 dirty를 켠다.

| Action | dirty 조건 | 근거 |
|---|---|---|
| `addNode` | `!_isSyncing` | 로컬 전용: Canvas useAddNode. API 후 동기화: ServiceSelectionPanel, OutputPanel |
| `removeNode` | `!_isSyncing` | 로컬 전용 삭제는 dirty. API 성공 후 `deleteWorkflowNode()` 뒤 로컬 동기화는 clean |
| `updateNodeConfig` | `!_isSyncing` | 로컬 전용: 패널 설정. API 후 동기화: OutputPanel |
| `onNodesChange` | `!_isSyncing` + **position 타입만** (아래 4.6 참조) | 위치 이동만 dirty. select/dimensions는 제외 |
| `onEdgesChange` | `!_isSyncing` + **remove/replace 타입만** (아래 4.6 참조) | 엣지 선택은 제외. 구조 변경만 dirty |
| `onConnect` | `!_isSyncing` | 로컬 전용: Canvas. API 후 동기화: ServiceSelectionPanel, OutputPanel |
| `setWorkflowName` | 항상 ✅ | 현재 이름 변경은 항상 로컬 전용 (zustand만 조작) |
| `setStartNodeId` | `!_isSyncing` | API 후 동기화: ServiceSelectionPanel. 직접 변경 경로가 생기면 dirty |
| `setEndNodeId` | `!_isSyncing` | 동일 |
| `setCreationMethod` | `!_isSyncing` | 로컬 전용: Canvas `handleSelectManual`. 서버 저장 대상 필드 |

Dirty를 트리거하지 **않는** action:

| Action | 이유 |
|---|---|
| `openPanel` / `closePanel` | UI 상태. 서버 데이터와 무관 |
| `setActivePlaceholder` | UI 상태 |
| `setExecutionStatus` | 서버에서 받는 상태. 로컬 변경 아님 |
| `setWorkflowMeta` | hydrate 전용 |

### 4.6 React Flow change 필터링

React Flow change는 구조 변경과 UI 상태 변경이 섞여 들어온다. dirty는 **서버 저장 대상 구조 변경만** 반영해야 한다.

#### NodeChange

| NodeChange 타입 | 의미 | dirty 여부 |
|---|---|---|
| `position` | 노드 위치 이동 (드래그) | ✅ 서버 저장 대상 |
| `dimensions` | 노드 크기 측정 (React Flow 내부) | ❌ 렌더링 메타. 서버 무관 |
| `select` | 노드 선택/해제 | ❌ UI 상태 |
| `remove` | 노드 삭제 | ❌ `removeNode`에서 별도 처리 |
| `add` | 노드 추가 | ❌ `addNode`에서 별도 처리 |
| `replace` | 노드 교체 | ✅ (발생 시 dirty) |

```typescript
onNodesChange: (changes) =>
  set((state) => {
    state.nodes = applyNodeChanges<Node<FlowNodeData>>(
      changes as NodeChange<Node<FlowNodeData>>[],
      current(state.nodes),
    );

    // dirty trigger: position/replace만
    if (!state._isSyncing) {
      const hasDirtyChange = changes.some(
        (c) => c.type === "position" || c.type === "replace",
      );
      if (hasDirtyChange) state.isDirty = true;
    }
  }),
```

#### EdgeChange

| EdgeChange 타입 | 의미 | dirty 여부 |
|---|---|---|
| `select` | 엣지 선택/해제 | ❌ UI 상태 |
| `remove` | 엣지 삭제 | ✅ 서버 저장 대상 |
| `replace` | 엣지 교체 | ✅ 서버 저장 대상 |

```typescript
onEdgesChange: (changes) =>
  set((state) => {
    state.edges = applyEdgeChanges(changes, current(state.edges));

    if (!state._isSyncing) {
      const hasDirtyChange = changes.some(
        (c) => c.type === "remove" || c.type === "replace",
      );
      if (hasDirtyChange) state.isDirty = true;
    }
  }),
```

**주의:** `position` change는 드래그 중 매 프레임 발생한다. dirty flag는 boolean이므로 한 번 true가 되면 이후 반복 set은 no-op에 가깝다. immer가 같은 값 할당을 최적화하므로 성능 문제 없음.

### 4.7 Dirty Reset (초기화)

| 시점 | 방법 |
|---|---|
| `hydrateWorkflow` | `state.isDirty = false` |
| 저장 성공 후 | 저장 mutation의 `onSuccess`에서 `useWorkflowStore.setState({ isDirty: false })` |
| `resetEditor` | initialState에 `isDirty: false` 포함 |

### 4.8 실행 전 저장 가드 (EditorRemoteBar)

```typescript
// EditorRemoteBar.tsx 변경사항

const isDirty = useWorkflowStore((state) => state.isDirty);

const handleRun = async () => {
  if (isDirty) {
    toaster.create({
      title: "저장되지 않은 변경이 있습니다",
      description: "실행 전에 워크플로우를 저장해주세요.",
      type: "warning",
    });
    return;
  }
  // 기존 실행 로직
};
```

**추천: 경고 + 차단.** 자동 저장은 사용자가 의도하지 않은 불완전 상태를 서버에 반영할 수 있다. 명시적 저장이 더 안전하다.

---

## 5. 구현 범위

### 5.1 이번 작업 (스코프)

1. **workflowStore에 `isDirty` + `_isSyncing` + `batchServerSync` 추가** — 4.3~4.7 명세대로 구현
2. **dirty trigger 분기:** 모든 데이터 변경 action에 `!_isSyncing` 가드 추가. `onNodesChange`는 position/replace, `onEdgesChange`는 remove/replace만 dirty
3. **API 성공 후 동기화 경로에 `batchServerSync` 적용** — ServiceSelectionPanel.placeNode, ServiceSelectionPanel.handleBackFromRequirement, OutputPanel.placeWorkflowNode, OutputPanel.removeWorkflowNode
4. **EditorRemoteBar에 실행 전 저장 가드 추가** — dirty 상태에서 실행 시 경고 토스트 + 차단

### 5.2 이번 작업 아님 (후속)

| 항목 | 이유 |
|---|---|
| Canvas.tsx `useAddNode` API 전환 | 저장 가드가 위험을 제거. UX 변경 없이 정합성 확보됨 |
| OutputPanel `createLocalNode` 변경 | 현재 구조가 이미 합리적 |
| NodeCategoryDrawer / AddNodeButton 삭제 | 데드 코드 정리. 별도 이슈로 분리 |
| `useAddNode` 훅 자체 삭제 | Canvas에서 아직 사용 중 |
| 워크플로우 생성 플로우 정리 | `workflowId` 없을 때의 전체 흐름 |

---

## 6. 영향 분석

| 대상 | 변경 |
|---|---|
| `features/workflow-editor/model/workflowStore.ts` | `isDirty`, `_isSyncing` 상태 추가. `batchServerSync` action 추가. 데이터 변경 action에 `!_isSyncing` dirty 가드. `onNodesChange`/`onEdgesChange`에 change type 필터링 |
| `features/add-node/ui/ServiceSelectionPanel.tsx` | `placeNode`, `handleBackFromRequirement` 내 store 호출을 `batchServerSync`로 감싸기 |
| `widgets/output-panel/ui/OutputPanel.tsx` | `placeWorkflowNode`, `removeWorkflowNode` 내 store 호출을 `batchServerSync`로 감싸기 |
| `widgets/editor-remote-bar/ui/EditorRemoteBar.tsx` | 실행 전 dirty 체크 + 경고 토스트 |
| `features/add-node/model/useAddNode.ts` | 변경 없음 (Canvas에서 아직 사용. `batchServerSync` 밖이므로 dirty 발생) |
| `features/add-node/ui/NodeCategoryDrawer.tsx` | 변경 없음 (데드 코드. 후속 삭제 대상) |
| `features/add-node/ui/AddNodeButton.tsx` | 변경 없음 (데드 코드. 후속 삭제 대상) |

---

## 7. 체크리스트

### 스토어

- [ ] `workflowStore`에 `isDirty: boolean`, `_isSyncing: boolean` 상태 추가
- [ ] `batchServerSync(fn)` action 추가: `_isSyncing = true → try { fn() } finally { _isSyncing = false }`
- [ ] dirty trigger: `addNode`, `removeNode`, `updateNodeConfig`, `onNodesChange`(position/replace만), `onEdgesChange`(remove/replace만), `onConnect`, `setWorkflowName`, `setStartNodeId`, `setEndNodeId`, `setCreationMethod` — 모두 `!_isSyncing` 가드
- [ ] dirty reset: `hydrateWorkflow`, 저장 성공 후, `resetEditor`

### 호출부

- [ ] `ServiceSelectionPanel.placeNode`에서 `addNode` + `onConnect` + `setStartNodeId`/`setEndNodeId`를 `batchServerSync`로 감싸기
- [ ] `ServiceSelectionPanel.handleBackFromRequirement`에서 `removeNode`를 `batchServerSync`로 감싸기
- [ ] `OutputPanel.placeWorkflowNode`에서 `addNode` + `onConnect` + `updateNodeConfig`를 `batchServerSync`로 감싸기
- [ ] `OutputPanel.removeWorkflowNode`에서 `removeNode`를 `batchServerSync`로 감싸기
- [ ] `EditorRemoteBar`에서 실행 전 `isDirty` 체크 → 경고 토스트 + 실행 차단

### 검증

- [ ] Canvas 임시 노드 추가 → `isDirty = true` 확인
- [ ] ServiceSelectionPanel API 노드 추가 → `isDirty` 변화 없음 확인
- [ ] OutputPanel API 노드 추가 → `isDirty` 변화 없음 확인
- [ ] 노드 선택만 → `isDirty` 변화 없음 확인
- [ ] 노드 드래그 이동 → `isDirty = true` 확인
- [ ] 저장 후 → `isDirty = false` 확인
- [ ] dirty 상태에서 실행 버튼 → 경고 토스트 + 차단 확인
- [ ] clean 상태에서 실행 버튼 → 정상 실행 확인
- [ ] (후속) NodeCategoryDrawer + AddNodeButton 데드 코드 삭제 이슈 생성
