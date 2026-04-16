# Canvas 임시 노드 API 전환 설계

> **작성일:** 2026-04-16
> **대상:** `src/widgets/canvas/ui/Canvas.tsx:244` — 중간 placeholder 클릭 시 임시 노드 생성 경로
> **선행 문서:** `docs/USE_ADD_NODE_API_MIGRATION.md` (저장 가드까지 구현 완료)
> **목적:** 현재 로컬 임시 ID(`crypto.randomUUID()`)로 생성되는 노드를 API 경유로 바꿔, 생성 직후부터 서버 ID로 노드를 식별 가능하게 한다.

---

## 1. 현재 상태 (저장 가드 구현 이후)

### 1.1 동작 흐름

```
사용자가 중간 placeholder 클릭 (placeholder-{sourceNodeId})
  → useAddNode.addNodeByType("data-process", { position, inputTypes, outputTypes, label })
  → crypto.randomUUID() → tempNodeId
  → addNode(node)            // 로컬, isDirty=true
  → onConnect(source → tempId)  // 로컬, isDirty=true
  → openPanel(tempNodeId)
  → (실행 버튼 누르면 저장 가드가 경고 + 차단)
```

### 1.2 저장 가드가 해결한 것 / 못한 것

| 항목 | 상태 |
|---|---|
| 저장 전 실행 시 서버 불일치 | ✅ 저장 가드가 차단 |
| 임시 노드 생성 직후 노드별 API 호출 | ❌ 서버가 tempNodeId를 모름 |
| 개별 노드 롤백 / 상태 조회 / choice 선택 | ❌ 저장 전까진 불가 |
| 새로고침 내구성 | ❌ 저장 전 임시 노드는 새로고침 시 사라짐 |
| UX 면 | ✅ 반응 즉시 |

**본질 문제:** 임시 노드는 저장 전까지 서버가 모른다. 저장 가드는 "실행 위험"만 막았지, "노드별 서버 작업 불가"는 그대로다. 본 설계는 이 남은 갭을 닫는다.

---

## 2. 옵션 비교

두 경로가 실질적으로 검토 대상이다. 이전 문서의 옵션 A/C다.

### 2.1 Option A — API 선행 (eager)

```
placeholder 클릭
  → addWorkflowNode({ workflowId, body: toNodeAddRequest({
      type: "data-process",
      position: panelNodePosition,
      role: "middle",
      prevNodeId: sourceNodeId,
      inputTypes, outputTypes,
    })})
  → 응답.nodes에서 findAddedNodeId → addedNodeId
  → batchServerSync(() => {
      addNode(toFlowNode(addedNode));
      onConnect({ source: sourceNodeId, target: addedNodeId });
    })
  → openPanel(addedNodeId)
```

| 항목 | 평가 |
|---|---|
| 정합성 | ✅ 생성 즉시 서버 ID |
| 구조 복잡도 | 🟢 낮음. ServiceSelectionPanel.placeNode, OutputPanel.placeWorkflowNode와 **동일 패턴** |
| 실패 처리 | 🟢 단순. API 실패 시 토스트만. 로컬엔 아무것도 쓰지 않으므로 롤백 대상 없음 |
| UX | 🟡 API 지연만큼 패널 오픈이 늦어짐. dev는 즉각, prod는 수백 ms |
| 로딩 UX | 필요: 중복 클릭 방지, 선택적으로 spinner |

### 2.2 Option C — 하이브리드 (optimistic + 후행 swap)

```
placeholder 클릭
  → 로컬 임시 노드 + 패널 오픈 (현행 그대로)
  → 패널에서 설정 확정 시점에 API 호출
  → 응답의 서버 노드로 tempId → serverId 교체
```

| 항목 | 평가 |
|---|---|
| 정합성 | 🟡 "패널 확정" 시점까진 여전히 tempId |
| 구조 복잡도 | 🔴 높음. 다음 신규 메커니즘 필요:<br>- tempId → serverId 교체 store action<br>- 엣지 재연결 (source/target의 tempId 교체)<br>- `activePanelNodeId` 재타겟<br>- 교체 중 사용자 추가 편집 처리 (race)<br>- API 실패 시 임시 노드 롤백 경로 |
| 실패 처리 | 🔴 복잡. 임시 노드 + 엣지 + 패널 상태를 모두 원복해야 함 |
| UX | 🟢 클릭 즉각 반응 |
| "확정" 시점 모호성 | 🔴 패널 닫기? `isConfigured=true`? 명시적 저장? 각각 트레이드오프 |

### 2.3 추천: **Option A**

근거:

1. **저장소 내 동일 패턴이 이미 있다.** `ServiceSelectionPanel.placeNode`(line 420), `OutputPanel.placeWorkflowNode`(line 414)가 정확히 같은 구조 — API 대기 후 `batchServerSync`로 로컬 반영. Canvas만 다르게 갈 이유 없음.
2. **복잡도가 압도적으로 낮다.** C는 신규 메커니즘 4-5개를 추가해야 하는 반면, A는 기존 mutation + batchServerSync 재사용.
3. **실패 처리가 단순.** A는 "아무것도 안 함 + 토스트". C는 local 롤백 시나리오 여러 개.
4. **UX 차이가 실질적으로 작다.** ServiceSelectionPanel도 같은 지연을 가지는데 사용자 불만 없었음. 중간 placeholder 클릭도 동일하게 인식될 것.
5. **C는 "config 로컬 편집 + 저장 시 일괄 전송"이라는 현재 패턴과도 어긋난다.** 구조는 API, config는 로컬이 일관된 규약인데, C는 구조마저 "나중 API"로 만듦.

이후는 Option A 기준으로 상세화한다.

---

## 3. Option A 상세 설계

### 3.1 변경 대상

- **`src/widgets/canvas/ui/Canvas.tsx`**: `handleNodeClick`의 중간 placeholder 분기
- **범위 한정:** 이번 작업은 **Canvas의 `useAddNode` import 제거**까지만 다룬다. `OutputPanel`의 `workflowId === ""` fallback과 `features/add-node/model/useAddNode.ts` 파일 삭제는 후속 과제다.

### 3.2 새 호출 흐름

```tsx
// Canvas.tsx, 중간 placeholder 분기 (기존 line 237-262)

const sourceNodeId = node.id.replace("placeholder-", "");
const sourceNode = nodes.find((n) => n.id === sourceNodeId);
const sourceOutputType = sourceNode?.data.outputTypes[0] ?? null;

if (!workflowId) {
  // Canvas surface 기준으로는 workflowId가 반드시 있어야 한다.
  // WorkflowEditorPage는 /workflow/:id 진입 후 hydrateWorkflow를 거쳐 Canvas를 렌더하므로
  // 여기까지 왔는데 workflowId가 비어 있으면 "add-node 전체" 문제가 아니라
  // Canvas 편집 surface의 방어 분기다. 토스트로 알리고 종료한다.
  toaster.create({
    title: "워크플로우 정보를 불러오지 못했습니다",
    description: "페이지를 새로고침해주세요.",
    type: "error",
  });
  return;
}

try {
  const previousNodes = useWorkflowStore.getState().nodes;
  const nextWorkflow = await addWorkflowNode({
    workflowId,
    body: toNodeAddRequest({
      type: "data-process",
      position: panelNodePosition,
      role: "middle",
      prevNodeId: sourceNodeId,
      inputTypes: sourceNode ? [...sourceNode.data.outputTypes] : undefined,
      outputTypes: sourceOutputType ? [sourceOutputType] : undefined,
    }),
  });

  const addedNodeId =
    findAddedNodeId(previousNodes, nextWorkflow.nodes) ??
    nextWorkflow.nodes.at(-1)?.id ??
    null;
  const addedNode = addedNodeId
    ? nextWorkflow.nodes.find((n) => n.id === addedNodeId)
    : null;

  if (!addedNodeId || !addedNode) {
    toaster.create({
      title: "노드 추가 실패",
      description: "서버 응답을 해석하지 못했습니다.",
      type: "error",
    });
    return;
  }

  batchServerSync(() => {
    addNode(toFlowNode(addedNode));
    onConnect({
      source: sourceNodeId,
      target: addedNodeId,
      sourceHandle: null,
      targetHandle: null,
    });
  });

  setActivePlaceholder(null);
  openPanel(addedNodeId);
} catch {
  toaster.create({
    title: "노드 추가 실패",
    description: "노드를 추가하지 못했습니다. 잠시 후 다시 시도해주세요.",
    type: "error",
  });
}
```

### 3.3 `label` 처리

현재 로컬 생성은 `label`을 `"설정 중"` 또는 `"가공"`으로 넣는다. API 응답은 서버가 결정한 라벨을 반환하므로, **클라이언트 기본 라벨을 override하지 않는다.** `toFlowNode`가 서버 라벨을 그대로 사용한다. 사용자 경험상 "설정 중"이 사라지지만, 어차피 패널이 즉시 열려 있으므로 라벨 가시성 문제는 없다.

만약 "설정 중" 라벨을 반드시 유지해야 한다면 API 성공 후 `updateNodeConfig`로 override 가능. 하지만 추천 안 함 — 서버 라벨을 신뢰하는 쪽이 일관적.

### 3.4 로딩 상태 UX

단일 API 호출 지연 동안 다음을 고려한다:

| 요소 | 처리 |
|---|---|
| 동일 **중간 placeholder** 중복 클릭 | mutation `isPending`을 체크. pending이면 클릭 무시 |
| 전역 visual feedback | 🟡 선택. placeholder 노드에 spinner를 덮을 수 있지만, 지연이 짧으면 오히려 번쩍임. **이번 스코프는 중복 클릭 차단만** 반영 |
| 네트워크 에러 | 토스트 + 캔버스 placeholder 유지. 로컬 노드/엣지 생성 없음 |

**구현 형태:**
```tsx
const { mutateAsync: addWorkflowNode, isPending: isAddPending } =
  useAddWorkflowNodeMutation();

const handleNodeClick = useCallback(async (event, node) => {
  const isStartOrEndPlaceholder =
    node.id === "placeholder-start" || node.id === "placeholder-end";
  const isMiddlePlaceholder =
    node.type === "placeholder" && !isStartOrEndPlaceholder;

  if (isMiddlePlaceholder && isAddPending) return;  // 중간 placeholder만 차단
  // ... 기존 분기
}, [isAddPending, ...]);
```

### 3.5 실패 처리

| 실패 케이스 | 동작 |
|---|---|
| API 에러 (4xx/5xx/네트워크) | 토스트 + 캔버스 placeholder 유지. 로컬 변경 없음 |
| 응답에 추가 노드를 찾지 못함 (`findAddedNodeId` null) | 토스트(이상 상태) + 종료. 캐시는 이미 `syncWorkflowCache`로 갱신됨 |
| batchServerSync 내부 예외 | store의 `try/finally`가 `_isSyncing`을 복구. 상위 try/catch가 토스트 |

**로컬 잔재 없음 보장:** A 옵션의 핵심 장점. API 대기 중엔 store에 아무것도 쓰지 않으므로 실패 시 청소할 것이 없다.

### 3.6 dirty flag 영향

- `batchServerSync` 안에서 `addNode` + `onConnect` 실행 → `isDirty`는 **켜지지 않음** (서버 정합 상태 유지)
- 이후 사용자가 패널에서 config 수정하면 `updateNodeConfig` → `isDirty = true` (기존 그대로)
- 즉, "생성 직후엔 clean, config 수정하면 dirty" — ServiceSelectionPanel 패턴과 동일

### 3.7 scope 제약

이번 PR에서 **하지 않는 것:**

- config 변경도 API로 밀기 (node update endpoint): 별도 이슈. 저장 버튼으로 일괄 전송이 기존 패턴
- 드래그 이동도 API로 밀기: 별도 이슈
- 패널 닫기 시 unconfigured 노드 자동 삭제: 별도 이슈 (현재는 저장 시 전송, 저장 안 하면 계속 남음)
- workflowId 없는 경로의 전체 생성 플로우 정리: 후속 과제 D

---

## 4. `useAddNode` 잔존 범위 정리

이번 작업은 `useAddNode`의 **Canvas 호출부 제거**까지만 다룬다. 훅 파일 자체는 아직 `OutputPanel` fallback이 사용하므로 삭제 대상이 아니다.

### 4.1 사전 점검

본 작업 PR의 Canvas 수정 후, 다음 grep으로 다른 호출부가 없음을 재확인:

```bash
rg "useAddNode" src/
```

**기대 결과:** `OutputPanel.tsx`의 fallback 경로만 잔존.

### 4.2 OutputPanel의 `createLocalNode` 재검토

OutputPanel도 `useAddNode`를 사용한다(`createLocalNode`, line 221). 하지만 용도가 다르다:

- **Canvas의 `useAddNode`**: 활성 노드 생성 경로. 이번에 API로 대체.
- **OutputPanel의 `useAddNode`** (`createLocalNode`): `placeWorkflowNode`가 `workflowId === ""` fallback 시에만 사용하는 위저드 임시 노드 경로.

즉, OutputPanel 쪽은 "워크플로우 생성 전 초기 상태"에서만 타는 경로. 후속 과제 D(워크플로우 생성 플로우 정리)에서 해소 예정이다.

**결론:** 이번 작업은 `useAddNode` 훅 파일을 **삭제하지 않는다.** OutputPanel이 아직 쓰고 있기 때문이다. 이번 PR의 목표는 Canvas를 영속 워크플로우 편집 경로로 정렬하는 것이지, 로컬 fallback 경로까지 함께 없애는 것이 아니다.

### 4.3 남은 후속

| 작업 | 선행 조건 |
|---|---|
| OutputPanel `createLocalNode` 제거 | 후속 과제 D (workflowId 없는 플로우 정리) |
| `features/add-node/model/useAddNode.ts` 삭제 | 위 작업 완료 |
| `features/add-node/model/index.ts`에서 export 제거 | 위 작업 완료 |

---

## 5. 영향 범위

| 대상 | 변경 |
|---|---|
| `src/widgets/canvas/ui/Canvas.tsx` | `useAddNode` import 제거. `useAddWorkflowNodeMutation` + `toNodeAddRequest` + `toFlowNode` + `findAddedNodeId` + `batchServerSync` 사용. `handleNodeClick` 중간 placeholder 분기를 async로 전환. 중복 클릭 가드 추가 |
| `src/features/add-node/model/useAddNode.ts` | 변경 없음 (OutputPanel이 아직 사용) |
| 기타 | 없음 |

---

## 6. 검증

### 6.1 기능 시나리오

- [ ] 신규 워크플로우 진입 → 시작/끝 노드 배치 (ServiceSelectionPanel, 기존) → 정상
- [ ] 중간 placeholder 클릭 → **API 요청 발생 확인 (Network 탭)** → 응답 후 노드 등장 → 패널 자동 오픈
- [ ] 생성된 노드 ID가 서버 응답 ID와 일치 (DevTools에서 store 검사)
- [ ] 생성 직후 `isDirty === false` 확인 (리모컨 바 실행 가드 안 걸림)
- [ ] 패널에서 config 수정 → `isDirty === true` → 실행 버튼 누르면 저장 가드 토스트
- [ ] 저장 후 → `isDirty === false` → 실행 정상
- [ ] API 실패 (network throttle / 5xx 주입) → 토스트 + placeholder 유지 + 로컬 변경 없음
- [ ] API 대기 중 같은 placeholder 재클릭 → 무시됨 (중복 요청 없음)

### 6.2 회귀 없음 확인

- [ ] ServiceSelectionPanel 경로 (start/end placeholder) 영향 없음
- [ ] OutputPanel 위저드 경로 영향 없음
- [ ] Canvas 노드 드래그 이동, 엣지 연결/삭제 기존과 동일
- [ ] dirty flag 거동 기존과 동일 (노드 드래그 → dirty, 선택만 → clean 등)

### 6.3 기술 검증

- [ ] `pnpm tsc --noEmit` 통과
- [ ] `pnpm eslint src/` 통과
- [ ] `pnpm build` 통과

---

## 7. 체크리스트

### 구현

- [ ] Canvas.tsx에 `useAddWorkflowNodeMutation` 연결
- [ ] `handleNodeClick`의 중간 placeholder 분기를 async API 호출로 교체
- [ ] API 성공 경로에 `batchServerSync(() => { addNode; onConnect; })` 적용
- [ ] API 실패/응답 파싱 실패 경로에 토스트 추가
- [ ] `isPending` 기반 중복 클릭 가드
- [ ] `useAddNode` import 제거

### 검증

- [ ] 6.1 기능 시나리오 전체 통과
- [ ] 6.2 회귀 없음 확인
- [ ] 6.3 기술 검증 통과

### 커밋

- [ ] 커밋 메시지 예시: `refactor: Canvas 임시 노드 생성 API 경유로 전환`

---

## 8. 후속 연결

이 작업 이후 남은 과제:

1. **후속 D** — `workflowId` 없는 플로우 정리. 해결되면 OutputPanel의 `createLocalNode` fallback 경로가 사라진다.
2. **후속 — `useAddNode` 훅 파일 삭제.** D 완료 후 진행.
3. **추가 정합성 (별건):**
   - 노드 config 변경을 node update API로 밀기
   - 노드 드래그 이동을 node position update API로 밀기
   - 둘 다 "저장 시 일괄 전송" 현 패턴을 유지할지 결정 후 진행
