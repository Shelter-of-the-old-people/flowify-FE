# AddNodeButton / NodeCategoryDrawer 데드 코드 삭제 설계

> **작성일:** 2026-04-16
> **대상:** `src/features/add-node/ui/AddNodeButton.tsx`, `src/features/add-node/ui/NodeCategoryDrawer.tsx`
> **선행 문서:** `docs/USE_ADD_NODE_API_MIGRATION.md` §5.2 "후속 작업"
> **목적:** 런타임에 도달 불가능한 두 컴포넌트를 삭제하여 `features/add-node`의 범위를 축소한다.

---

## 1. 배경

`docs/USE_ADD_NODE_API_MIGRATION.md`에서 `NodeCategoryDrawer`는 런타임 도달 불가 코드로 분류됐다. 이번 작업은 그 정리를 실제로 수행한다.

### 1.1 왜 지금 지우나

| 이유 | 설명 |
|---|---|
| 서버 정합성 위험 잔존 | `NodeCategoryDrawer.handleNodeClick`은 `useAddNode` → `addNode(type)`만 호출. API 없음, 후속 교체 없음. 누군가 `AddNodeButton`을 실수로 import하면 즉시 정합성 깨짐 |
| 유지보수 부담 | 사용 안 되는 코드가 계속 타입 체크/번들 분석/리팩토링 대상에 포함됨 |
| `useAddNode` 삭제의 전제 | 후속 과제 B(Canvas API 전환) 이후 `useAddNode` 자체를 지울 건데, 이 데드 경로가 남아있으면 호출부가 2곳 → 1곳으로만 보여 판단이 흐려짐 |

### 1.2 왜 지금까지 안 지웠나

- 원래 노드 추가의 "기본 UI" 후보였음 (드로어 → 타입 선택 → 추가)
- 이후 placeholder 기반 플로우(ServiceSelectionPanel)로 방향 전환하면서 사실상 쓰임새가 사라짐
- 코드 자체는 동작하는 것처럼 보여서 "언젠가 쓸 수도"로 남아있던 코드

---

## 2. 삭제 대상 확정

### 2.1 파일 삭제

| 파일 | 사용처 | 판정 |
|---|---|---|
| `src/features/add-node/ui/AddNodeButton.tsx` | 0곳 (grep 결과 파일 자체에만 존재) | ✅ 삭제 |
| `src/features/add-node/ui/NodeCategoryDrawer.tsx` | `AddNodeButton` 1곳 (함께 삭제됨) | ✅ 삭제 |

### 2.2 유지

| 파일 | 이유 |
|---|---|
| `src/features/add-node/model/useAddNode.ts` | `Canvas.tsx:188`, `OutputPanel.tsx:221`에서 사용 중. 후속 과제 B에서 처리 |
| `src/features/add-node/ui/ServiceSelectionPanel.tsx` | 활성 경로. 데드 아님 |
| `src/features/add-node/model/{serviceMap,serviceRequirements}.ts` | `ServiceSelectionPanel`이 사용 |

### 2.3 public API 영향

`src/features/add-node/ui/index.ts` 현재 상태:
```typescript
export * from "./ServiceSelectionPanel";
```

`AddNodeButton`도 `NodeCategoryDrawer`도 **이미 barrel에서 export되지 않는다.** 즉, 외부 import 경로가 없다. 삭제해도 외부 소비자 영향 0.

---

## 3. 삭제 대상 아님 (주의)

혼동 방지용으로 명시:

| 혼동 가능 항목 | 왜 삭제 아님 |
|---|---|
| `useAddNode` 훅 | Canvas/OutputPanel 활성 호출. 후속 과제 |
| `addNode` store action | 전체 노드 추가 경로의 기반. 유지 |
| `ServiceSelectionPanel` | 활성 경로 |
| `features/add-node` 디렉터리 자체 | `useAddNode` + `ServiceSelectionPanel`이 남아 있으므로 유지 |

---

## 4. 변경 리스트

### 4.1 삭제

```
src/features/add-node/ui/AddNodeButton.tsx          (전체 삭제)
src/features/add-node/ui/NodeCategoryDrawer.tsx     (전체 삭제)
```

### 4.2 수정

없음. `ui/index.ts`가 이미 `AddNodeButton`/`NodeCategoryDrawer`를 export하지 않으므로 barrel 파일 수정 불필요.

### 4.3 의존성 정리 확인

`NodeCategoryDrawer.tsx`에서만 쓰던 import가 다른 곳에서 유일한 사용처인지 체크:

| import | 다른 사용처 | 조치 |
|---|---|---|
| `getNodesByCategory` from `@/entities/node` | (확인 필요) | 있으면 유지, 없으면 후속 과제로 분리 |
| `NodeCategory` type | (확인 필요) | 동일 |
| Chakra `DrawerRoot` 계열 | 다수 | 유지 |

`entities/node`의 것들은 이번 PR 범위에서 건드리지 않는다. 삭제 후 타입 체크/ESLint가 `unused export` 경고를 내면 후속 이슈로 분리.

---

## 5. 검증

### 5.1 Pre-check (삭제 전)

```bash
# 두 컴포넌트가 정말 외부 import되지 않는지 재확인
rg "AddNodeButton" src/
rg "NodeCategoryDrawer" src/
```

**기대 결과:**
- `AddNodeButton`: `AddNodeButton.tsx` 내부만
- `NodeCategoryDrawer`: `AddNodeButton.tsx` + `NodeCategoryDrawer.tsx` 내부만

Pre-check에서 다른 파일이 나오면 **즉시 중단**하고 해당 사용처를 분석한다.

### 5.2 Post-check (삭제 후)

| 명령 | 기대 |
|---|---|
| `pnpm tsc --noEmit` | 에러 0 |
| `pnpm eslint src/` | 에러 0 (unused import 경고만 가능, 그것도 없어야 함) |
| `pnpm build` | 성공 |
| 수동: 에디터 페이지 진입 | 기존과 동일 (데드 코드 삭제이므로 UI 변화 없어야 함) |
| 수동: placeholder 클릭 → ServiceSelectionPanel 동작 | 정상 |
| 수동: OutputPanel 위저드 노드 생성 | 정상 |

### 5.3 회귀 없음 확인

삭제 후 다음 시나리오가 모두 이전과 동일하게 동작해야 한다:

- [ ] 신규 워크플로우 생성 → 시작/끝 노드 배치 (ServiceSelectionPanel)
- [ ] 중간 placeholder 클릭 → 임시 data-process 노드 생성 (Canvas useAddNode)
- [ ] OutputPanel 위저드 → API 경유 노드 추가 (useAddNode createLocalNode 포함)
- [ ] 노드 삭제 / 엣지 삭제 / 저장 / 실행

---

## 6. 위험도

**🟢 매우 낮음**

- 삭제 대상 2파일 모두 barrel export에 포함되지 않음
- 진입점 0곳
- 타입 체크가 잡아낼 수 있는 실수 여지만 존재 (만약 삭제 시 누군가 쓰고 있었다면 tsc가 바로 에러)
- 런타임 동작 변화 없음

---

## 7. 체크리스트

- [ ] Pre-check: `AddNodeButton` grep 결과가 `AddNodeButton.tsx` 1파일뿐인지 재확인
- [ ] Pre-check: `NodeCategoryDrawer` grep 결과가 두 파일 내부뿐인지 재확인
- [ ] `src/features/add-node/ui/AddNodeButton.tsx` 삭제
- [ ] `src/features/add-node/ui/NodeCategoryDrawer.tsx` 삭제
- [ ] `pnpm tsc --noEmit` 통과
- [ ] `pnpm eslint src/` 통과
- [ ] `pnpm build` 통과
- [ ] 에디터 페이지 수동 동작 확인 (위 5.2 시나리오)
- [ ] 커밋 메시지: `chore: add-node 데드 코드 정리`

---

## 8. 후속 연결

이 작업이 끝나면 `features/add-node`의 남은 구성은:

```
features/add-node/
├── model/
│   ├── useAddNode.ts           ← Canvas/OutputPanel 활성. 후속 B에서 처리
│   ├── serviceMap.ts
│   ├── serviceRequirements.ts
│   └── index.ts
└── ui/
    ├── ServiceSelectionPanel.tsx
    └── index.ts
```

이 상태에서 후속 과제 B(Canvas `useAddNode` API 전환)를 시작하면 `useAddNode` 호출부가 Canvas 1곳, OutputPanel 1곳으로 명확히 보인다. B가 끝나면 `useAddNode`도 삭제되며, 최종적으로는 `features/add-node`에 `ServiceSelectionPanel` 중심의 경로만 남는다.
