# 노드 설정 위자드 상세 설계

> **작성일:** 2026-04-05
> **최종 수정:** 2026-04-06 (v2 — 수동 테스트 피드백 + 리뷰 반영)
> **선행 문서:** [FRONTEND_DESIGN_DOCUMENT.md](./FRONTEND_DESIGN_DOCUMENT.md), [FOUNDATION_IMPLEMENTATION_PLAN.md](./FOUNDATION_IMPLEMENTATION_PLAN.md)
> **목적:** 시작/도착 노드 및 중간 노드의 설정 위자드 흐름을 설계한다.

---

## 목차

1. [설계 원칙](#1-설계-원칙)
2. [위자드 흐름 정의](#2-위자드-흐름-정의)
3. [Store 설계](#3-store-설계)
4. [ServiceSelectionPanel 설계](#4-serviceselectionpanel-설계)
5. [OutputPanel 설계](#5-outputpanel-설계)
6. [InputPanel 설계](#6-inputpanel-설계)
7. [패널 닫기 규칙](#7-패널-닫기-규칙)
8. [노드 인터랙션 규칙](#8-노드-인터랙션-규칙)
9. [Edge 렌더링](#9-edge-렌더링)
10. [상태 전이 다이어그램](#10-상태-전이-다이어그램)
11. [비정상 종료 및 상태 정리](#11-비정상-종료-및-상태-정리)
12. [파일별 변경 요약](#12-파일별-변경-요약)

---

## 1. 설계 원칙

### 1.1 패널 사용 분리

| 노드 유형 | 설정 수단 | 이유 |
|-----------|-----------|------|
| **시작/도착 노드** | ServiceSelectionPanel (중앙 오버레이) 내부에서 전체 위자드 진행 | 아직 캔버스에 노드가 없거나, 초기 설정 단계이므로 전체 화면 가이드가 적합 |
| **중간 노드** | (임시) ServiceSelectionPanel — 카테고리 선택 only → 듀얼 패널 (InputPanel + OutputPanel) | 이미 캔버스에 배치된 노드를 보면서 설정해야 하므로 사이드 패널이 적합 |

> **v1 대비 핵심 변경:** v1에서는 시작/도착 노드의 요구사항·인증 단계를 OutputPanel에서 처리했다. v2에서는 **ServiceSelectionPanel 내부**에서 모든 단계를 완료한다. OutputPanel은 "이미 배치된 노드의 설정 패널"로만 사용된다.

### 1.2 중간 노드 entry UI — 임시 방안과 목표

FRONTEND_DESIGN_DOCUMENT.md는 중간 노드용 entry UI로 **ChoicePanel**(선택지 매핑 API 기반)을 계획하고 있다. 하지만 백엔드 API가 미연동이므로, 현재 단계에서는 다음 임시 방안을 사용한다:

| 단계 | 현재 (임시) | 목표 (Phase 2) |
|------|------------|----------------|
| 중간 placeholder 클릭 | ServiceSelectionPanel — **카테고리 선택만** | ChoicePanel — 이전 노드 outputDataType 기반 선택지 API |
| 노드 결정 | 프론트엔드 카테고리 목록 | 백엔드 선택지 매핑 결과 |
| 이후 설정 | 듀얼 패널 (InputPanel + OutputPanel) | 동일 |

**중간 노드에서 ServiceSelectionPanel은 카테고리 선택(step 1)만 사용한다.** 서비스 선택(step 2), 요구사항(step 3), 인증(step 4)은 오버레이에서 처리하지 않는다. 카테고리 선택 후 노드를 배치하고, 요구사항은 OutputPanel에서 처리한다.

### 1.3 패널 독점 규칙

동시에 하나의 패널 모드만 활성화된다:
- ServiceSelectionPanel이 열려 있으면 InputPanel/OutputPanel은 숨김
- InputPanel/OutputPanel이 열려 있으면 ServiceSelectionPanel은 숨김

### 1.4 통일된 닫기 동작

모든 패널은 동일한 3가지 방법으로 닫을 수 있어야 한다:
1. **X 버튼** 클릭
2. **캔버스 빈 영역** 클릭
3. **ESC** 키

### 1.5 isConfigured 판정

`isConfigured`는 `node.data.config.isConfigured` (BaseNodeConfig의 필드)이다. `node.data` 직접 필드가 아님에 유의.

store의 `updateNodeConfig()`는 config를 **교체(replace)** 한다:

```typescript
// 현재 store 구현 — config를 교체하며 isConfigured: true 주입
node.data.config = { ...전달된config, isConfigured: true };
```

따라서 `updateNodeConfig()` 호출 시 **기존 config를 스프레드**하여 기존 필드(service 등)가 유실되지 않도록 해야 한다:

```typescript
// 올바른 호출 — 기존 config 보존
updateNodeConfig(nodeId, { ...node.data.config, ...req.configPreset });

// 잘못된 호출 — 기존 필드 유실
updateNodeConfig(nodeId, req.configPreset);  // ❌ service 등 사라짐
updateNodeConfig(nodeId, {});                // ❌ isConfigured만 남음
```

> **v2 권장 변경:** store의 `updateNodeConfig`를 merge 방식으로 수정하면, 호출부마다 기존 config를 스프레드할 필요가 없어진다. 3.5절 참조.

**원칙:** `updateNodeConfig()`는 **위자드의 최종 완료 시점에만** 호출한다. 서비스 선택 시점에 config에 service를 주입할 때는 `updateNodeConfig()` 대신 노드 생성 시 초기 config로 전달하여, 위자드 미완료 노드가 "설정 완료"로 표시되지 않도록 한다.

```typescript
// 올바른 흐름 — 서비스 선택 시
placeNode(meta, service);
// → addNode 내부에서 config.service = service.value 주입
// → config.isConfigured는 false 유지

// 위자드 최종 완료 시점에만
updateNodeConfig(nodeId, { ...node.data.config, ...req.configPreset });
// → config.isConfigured: true 설정
```

---

## 2. 위자드 흐름 정의

### 2.1 시작/도착 노드 설정 흐름

시작/도착 노드는 **ServiceSelectionPanel 내부**에서 모든 단계를 완료한다.

```
[Placeholder 클릭]
    │
    ▼
┌─────────────────────────────────────────────────────┐
│  Step 1: 카테고리 선택 (ServiceSelectionPanel)       │
│  - 캔버스 중앙 오버레이                               │
│  - 제목: "어디에서 어디로 갈까요?"                      │
│  - 분기:                                             │
│    A) 서비스 있는 카테고리 → Step 2                    │
│    B) 서비스 없음 + 요구사항 있음 (web-scraping)       │
│       → 바로 배치 → Step 3                           │
│    C) 서비스 없음 + 요구사항 없음 (processing 등)      │
│       → 바로 배치 + updateNodeConfig → 오버레이 닫힘   │
└─────────────────────────────────────────────────────┘
    │
    ├── A) 서비스 있는 카테고리
    ▼
┌─────────────────────────────────────────────────────┐
│  Step 2: 서비스 선택 (ServiceSelectionPanel 내부)     │
│  - 서비스 그리드 표시                                 │
│  - "뒤로" → Step 1                                   │
│  - 서비스 선택 시:                                    │
│    1. placeNode(meta, service) — 노드를 캔버스에 배치  │
│    2. 요구사항 있으면 → Step 3                         │
│    3. 요구사항 없으면 → 오버레이 닫힘                   │
└─────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────┐
│  Step 3: 요구사항 선택 (ServiceSelectionPanel 내부)   │
│  - 오버레이 내에서 요구사항 목록 표시                   │
│  - "뒤로" → 노드 제거 + Step 2로 복귀                 │
│  -       (서비스 없이 온 경우 → Step 1로 복귀)         │
│  - 요구사항 선택 시:                                  │
│    인증 필요 → Step 4                                │
│    인증 불필요 → updateNodeConfig + 오버레이 닫힘      │
└─────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────┐
│  Step 4: 인증 (ServiceSelectionPanel 내부)           │
│  - 오버레이 내에서 인증 UI 표시                       │
│  - "뒤로" → Step 3                                   │
│  - 인증 완료 → updateNodeConfig + 오버레이 닫힘       │
└─────────────────────────────────────────────────────┘
```

### 2.2 중간 노드 설정 흐름

중간 노드는 2단계로 진행된다:
1. **카테고리 선택** — ServiceSelectionPanel (카테고리만, 임시)
2. **설정** — 듀얼 패널 (InputPanel + OutputPanel)

```
[중간 placeholder 클릭]
    │
    ▼
┌─────────────────────────────────────────────────────┐
│  카테고리 선택 (ServiceSelectionPanel — 카테고리 only) │
│  - 중간 노드용 카테고리 목록 표시                      │
│  - 카테고리 선택 시:                                  │
│    1. placeNode(meta) — 노드 배치                    │
│    2. 오버레이 닫힘                                   │
│    3. 듀얼 패널 자동 오픈                              │
└─────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────┐
│  듀얼 패널                                           │
│  - 왼쪽: InputPanel (이전 노드의 출력 데이터)          │
│  - 오른쪽: OutputPanel                               │
│    - isConfigured === false → 요구사항 목록 표시       │
│    - isConfigured === true → PanelRenderer (일반 설정) │
│  - 요구사항 선택 시 updateNodeConfig → PanelRenderer   │
└─────────────────────────────────────────────────────┘
```

> **향후 변경:** ChoicePanel + 선택지 매핑 API 연동 시, 카테고리 선택 단계가 ChoicePanel로 대체된다. 듀얼 패널 흐름은 동일하게 유지.

### 2.3 시작 노드의 InputPanel

시작 노드 클릭 시 InputPanel에는 "이전 노드" 대신 **사용자 데이터**(향후 연동 시 사용자 계정 정보 등)를 표시한다. 현재 단계에서는 "시작점" 안내 메시지를 표시한다.

---

## 3. Store 설계

### 3.1 위자드 관련 store 필드 — 제거

v1에서 사용하던 다음 3개 필드를 **store에서 제거**한다:

| 필드 | v1 용도 | v2에서 불필요한 이유 |
|------|---------|---------------------|
| `wizardStep` | OutputPanel의 위자드 단계 분기 | 시작/도착 위자드가 SSP 로컬 상태로 이동 |
| `wizardConfigPreset` | 인증 대기 중 configPreset 임시 저장 | SSP 로컬 상태로 이동 |
| `wizardSourcePlaceholder` | 뒤로가기 시 placeholder 복원 | SSP 로컬 상태로 이동 (SSP가 열려 있는 동안 로컬 상태 유지) |

**제거 대상 액션:** `setWizardStep`, `setWizardConfigPreset`, `setWizardSourcePlaceholder`

**제거 후 initialState:**

```typescript
const initialState: WorkflowEditorState = {
  nodes: [],
  edges: [],
  workflowId: "",
  workflowName: "",
  executionStatus: "idle",
  activePanelNodeId: null,
  startNodeId: null,
  endNodeId: null,
  creationMethod: null,
  activePlaceholder: null,
  // wizardStep, wizardConfigPreset, wizardSourcePlaceholder 제거
};
```

### 3.2 유지되는 store 상태

| 필드 | 용도 |
|------|------|
| `activePlaceholder` | ServiceSelectionPanel 표시 여부 + 위치 정보 |
| `activePanelNodeId` | InputPanel/OutputPanel 표시 대상 노드 |
| `startNodeId` / `endNodeId` | 시작/도착 노드 추적 |
| `creationMethod` | 수동/AI 생성 모드 |

### 3.3 removeNode 수정

v1에서 wizard 상태를 정리하던 로직을 제거하고, 패널 정리만 유지:

```typescript
removeNode: (id) =>
  set((state) => {
    // ... 기존 노드/엣지 삭제 로직 ...

    // 삭제된 노드가 패널 대상이면 패널 닫기
    if (state.activePanelNodeId && removeTargets.has(state.activePanelNodeId)) {
      state.activePanelNodeId = null;
    }

    // ... startNodeId/endNodeId 정리 ...
  }),
```

### 3.4 openPanel 수정

v1에서 wizard 상태를 정리하던 로직을 제거:

```typescript
openPanel: (nodeId) =>
  set((state) => {
    state.activePanelNodeId = nodeId;
  }),
```

### 3.5 updateNodeConfig — merge 방식으로 변경

현재 store의 `updateNodeConfig`는 전달된 config로 **교체**한다:

```typescript
// 현재 (v1) — 교체 방식
updateNodeConfig: (nodeId, config) =>
  set((state) => {
    const node = state.nodes.find((n) => n.id === nodeId);
    if (node) {
      node.data = {
        ...node.data,
        config: { ...config, isConfigured: true },
      };
    }
  }),
```

이 방식은 호출부에서 기존 config를 매번 스프레드해야 해서 실수하기 쉽다. v2에서는 **merge 방식**으로 변경한다:

```typescript
// 변경 후 (v2) — merge 방식
updateNodeConfig: (nodeId, config) =>
  set((state) => {
    const node = state.nodes.find((n) => n.id === nodeId);
    if (node) {
      node.data.config = {
        ...node.data.config,  // 기존 config 보존
        ...config,            // 전달된 값으로 덮어쓰기
        isConfigured: true,   // 항상 true 주입
      };
    }
  }),
```

이렇게 하면 호출부에서 기존 config를 스프레드할 필요가 없다:

```typescript
// merge 방식에서는 부분 값만 전달해도 안전
updateNodeConfig(nodeId, req.configPreset);
// → 기존 service, account 등은 유지되면서 configPreset만 merge됨
```

### 3.6 resetEditor

`initialState` 스프레드로 전체 상태가 초기화된다. wizard 관련 필드가 store에서 제거되었으므로 추가 정리 불필요.

---

## 4. ServiceSelectionPanel 설계

### 4.1 책임 범위

| 모드 | 진입 조건 | 처리 단계 |
|------|-----------|-----------|
| **시작/도착 위자드** | 시작/도착 placeholder 클릭 | category → service → requirement → auth (전체) |
| **중간 노드 카테고리 선택** (임시) | 중간 placeholder 클릭 | category only → 노드 배치 후 오버레이 닫힘 |

### 4.2 모드 판별

중간 노드인지 시작/도착인지는 `activePlaceholder.id`로 판별한다:

```typescript
const isMiddleNodeMode =
  activePlaceholder?.id !== "placeholder-start" &&
  activePlaceholder?.id !== "placeholder-end";
```

### 4.3 로컬 상태

```typescript
type WizardStep = "category" | "service" | "requirement" | "auth";

const [step, setStep] = useState<WizardStep>("category");
const [searchQuery, setSearchQuery] = useState("");
const [selectedMeta, setSelectedMeta] = useState<NodeMeta | null>(null);
const [selectedService, setSelectedService] = useState<ServiceOption | null>(null);
const [placedNodeId, setPlacedNodeId] = useState<string | null>(null);
const [selectedRequirementPreset, setSelectedRequirementPreset] =
  useState<Record<string, unknown> | null>(null);
```

모든 위자드 상태가 **로컬**이다. store에는 `activePlaceholder` 하나만 사용하여 오버레이 표시 여부를 제어한다.

### 4.4 X 버튼

```typescript
// 오버레이 헤더에 추가
<Box cursor="pointer" onClick={handleOverlayClose}>
  <Icon as={MdCancel} boxSize={6} color="gray.600" />
</Box>
```

### 4.5 handleCategorySelect

```typescript
const handleCategorySelect = (meta: NodeMeta) => {
  // ── 중간 노드 모드: 카테고리만 선택하고 종료 ──
  if (isMiddleNodeMode) {
    const nodeId = placeNode(meta);
    if (!nodeId) return;
    resetWizard();
    openPanel(nodeId);  // 듀얼 패널 열기
    return;
  }

  // ── 시작/도착 노드 모드: 전체 위자드 진행 ──
  const serviceGroup = CATEGORY_SERVICE_MAP[meta.type];

  if (serviceGroup && serviceGroup.services.length > 0) {
    // A) 서비스 있는 카테고리 → Step 2
    setSelectedMeta(meta);
    setStep("service");
    return;
  }

  // 서비스 없는 노드 → 바로 배치
  const nodeId = placeNode(meta);
  if (!nodeId) return;

  const reqGroup = SERVICE_REQUIREMENTS[meta.type];
  if (reqGroup) {
    // B) 서비스 없음 + 요구사항 있음 → Step 3
    setSelectedMeta(meta);
    setPlacedNodeId(nodeId);
    setStep("requirement");
    return;
  }

  // C) 서비스 없음 + 요구사항 없음 → 바로 완료
  // merge 방식이므로 {}를 전달해도 기존 config는 유지되고 isConfigured만 true로 설정됨
  updateNodeConfig(nodeId, {});
  resetWizard();
};
```

### 4.6 handleServiceSelect

```typescript
const handleServiceSelect = (service: ServiceOption) => {
  if (!selectedMeta) return;

  const nodeId = placeNode(selectedMeta, service);
  if (!nodeId) return;

  setSelectedService(service);
  setPlacedNodeId(nodeId);

  const reqGroup = SERVICE_REQUIREMENTS[selectedMeta.type];
  if (reqGroup) {
    // 요구사항 있음 → Step 3
    setStep("requirement");
    return;
  }

  // 요구사항 없음 → 완료 (service는 placeNode에서 이미 주입됨, merge로 보존)
  updateNodeConfig(nodeId, {});
  resetWizard();
};
```

### 4.7 handleRequirementSelect

```typescript
const handleRequirementSelect = (req: ServiceRequirement) => {
  if (!placedNodeId || !selectedMeta) return;

  const serviceGroup = CATEGORY_SERVICE_MAP[selectedMeta.type];

  if (serviceGroup?.requiresAuth) {
    // 인증 필요 → configPreset 임시 저장 후 Step 4
    setSelectedRequirementPreset(req.configPreset);
    setStep("auth");
    return;
  }

  // 인증 불필요 → config 적용 후 종료
  updateNodeConfig(placedNodeId, req.configPreset);
  resetWizard();
};
```

### 4.8 handleAuth

```typescript
const handleAuth = () => {
  if (!placedNodeId || !selectedRequirementPreset) return;

  // TODO: 실제 OAuth 인증 흐름 연동
  updateNodeConfig(placedNodeId, selectedRequirementPreset);
  resetWizard();
};
```

### 4.9 뒤로가기 핸들러

```typescript
// Step 2 (서비스) → Step 1 (카테고리)
const handleBackToCategory = () => {
  setSelectedMeta(null);
  setSelectedService(null);
  setStep("category");
};

// Step 3 (요구사항) → 이전 단계
const handleBackFromRequirement = () => {
  // 배치된 노드 제거
  if (placedNodeId) {
    removeNode(placedNodeId);
    setPlacedNodeId(null);
  }

  if (selectedService) {
    // 서비스 선택을 거쳐 온 경우 → Step 2
    setSelectedService(null);
    setStep("service");
  } else {
    // 서비스 없이 바로 온 경우 (web-scraping 등) → Step 1
    setSelectedMeta(null);
    setStep("category");
  }
};

// Step 4 (인증) → Step 3 (요구사항)
const handleBackToRequirement = () => {
  setSelectedRequirementPreset(null);
  setStep("requirement");
};
```

### 4.10 handleOverlayClose (X / 배경 클릭 / ESC)

```typescript
const handleOverlayClose = () => {
  // 배치된 노드가 있으면 캔버스에 유지 (config 미완료 상태)
  resetWizard();
};
```

### 4.11 resetWizard

```typescript
const resetWizard = () => {
  setStep("category");
  setSearchQuery("");
  setSelectedMeta(null);
  setSelectedService(null);
  setPlacedNodeId(null);
  setSelectedRequirementPreset(null);
  setActivePlaceholder(null);  // 오버레이 닫힘
};
```

### 4.12 ESC 키 처리

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && activePlaceholder) {
      handleOverlayClose();
    }
  };
  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [activePlaceholder]);
```

### 4.13 렌더링 분기

```typescript
// 오버레이 콘텐츠
{step === "category" && <CategoryGrid ... />}
{step === "service" && !isMiddleNodeMode && <ServiceGrid ... />}
{step === "requirement" && !isMiddleNodeMode && <RequirementList ... />}
{step === "auth" && !isMiddleNodeMode && <AuthPrompt ... />}
```

> 중간 노드 모드에서는 `step`이 항상 `"category"`에서 끝나므로 service/requirement/auth 가드는 안전장치이다.

### 4.14 store 구독

```typescript
// 읽기
const activePlaceholder = useWorkflowStore((s) => s.activePlaceholder);
const startNodeId = useWorkflowStore((s) => s.startNodeId);
const endNodeId = useWorkflowStore((s) => s.endNodeId);

// 쓰기
const setActivePlaceholder = useWorkflowStore((s) => s.setActivePlaceholder);
const setStartNodeId = useWorkflowStore((s) => s.setStartNodeId);
const setEndNodeId = useWorkflowStore((s) => s.setEndNodeId);
const openPanel = useWorkflowStore((s) => s.openPanel);
const removeNode = useWorkflowStore((s) => s.removeNode);
const updateNodeConfig = useWorkflowStore((s) => s.updateNodeConfig);
const onConnect = useWorkflowStore((s) => s.onConnect);
```

---

## 5. OutputPanel 설계

### 5.1 책임 범위

OutputPanel은 **이미 캔버스에 배치된 노드**의 설정 패널로만 사용된다. 시작/도착 노드의 위자드 UI는 포함하지 않는다.

| 시나리오 | OutputPanel 내용 |
|----------|-----------------|
| 중간 노드 (isConfigured === false, 요구사항 있음) | 요구사항 목록 |
| 중간 노드 (isConfigured === true) | PanelRenderer (노드별 설정 UI) |
| 시작/도착 노드 클릭 (설정 완료 후) | PanelRenderer (노드별 설정 UI) |
| 시작/도착 노드 위자드 중 | **표시하지 않음** — ServiceSelectionPanel이 처리 |

### 5.2 콘텐츠 분기 로직

```typescript
const activeNode = useWorkflowStore(
  (s) => s.nodes.find((n) => n.id === s.activePanelNodeId) ?? null,
);
const requirementGroup = activeNode
  ? SERVICE_REQUIREMENTS[activeNode.data.type]
  : undefined;
const isConfigured = activeNode?.data.config.isConfigured ?? false;

// 콘텐츠 영역
{!isConfigured && requirementGroup ? (
  <RequirementSelector
    requirements={requirementGroup.requirements}
    onSelect={handleRequirementSelect}
  />
) : (
  <PanelRenderer />
)}
```

> **isConfigured 판별:** `node.data.config.isConfigured` (BaseNodeConfig의 필드)를 직접 참조한다. `action != null` 같은 임시 필드 검사는 사용하지 않는다. v2에서 `updateNodeConfig()`를 merge 방식으로 변경하면(3.5절), 호출 시 자동으로 `isConfigured: true`가 주입된다.

### 5.3 중간 노드 요구사항 선택 핸들러

```typescript
const handleRequirementSelect = (req: ServiceRequirement) => {
  if (!activePanelNodeId) return;

  // merge 방식이므로 configPreset만 전달해도 기존 config가 보존됨
  updateNodeConfig(activePanelNodeId, req.configPreset);
  // → config.isConfigured: true 자동 설정
  // → 자동으로 PanelRenderer로 전환됨
};
```

> **중간 노드는 인증 분기가 없다.** 중간 노드의 서비스 인증은 시작/도착 노드 설정 시 이미 완료된 것으로 간주한다.

### 5.4 헤더

```typescript
const getHeaderTitle = (): string => {
  if (!isConfigured && requirementGroup) {
    return requirementGroup.title;  // "어떻게 사용하시겠어요?" 등
  }
  return "설정";
};
```

### 5.5 닫기

```typescript
const handleClose = () => {
  closePanel();
};
```

### 5.6 제거 대상 (v1에서 삭제)

| 컴포넌트 / 코드 | 이유 |
|-----------------|------|
| `WizardRequirementContent` | ServiceSelectionPanel로 이동 |
| `WizardAuthContent` | ServiceSelectionPanel로 이동 |
| `finishWizard()` 헬퍼 | store wizard 필드 제거로 불필요 |
| `handleAuth()` | ServiceSelectionPanel로 이동 |
| `handleBackToService()` | ServiceSelectionPanel로 이동 |
| `handleBackToRequirement()` | ServiceSelectionPanel로 이동 |
| `wizardStep` 구독 | store에서 제거 |
| `wizardConfigPreset` 구독 | store에서 제거 |
| `wizardSourcePlaceholder` 구독 | store에서 제거 |

---

## 6. InputPanel 설계

### 6.1 표시 조건

```typescript
const isOpen = Boolean(activePanelNodeId) && activePlaceholder === null;
```

ServiceSelectionPanel이 열려 있으면(`activePlaceholder !== null`) InputPanel은 숨긴다.

> **v1 대비 변경:** `wizardStep === null` 조건 제거. `wizardStep`이 store에서 제거되었으므로 `activePlaceholder` 기준으로 판별한다.

### 6.2 시작 노드 클릭 시

시작 노드에는 "이전 노드"가 없다. InputPanel에 "시작점" 안내를 표시한다:

```typescript
if (!sourceNode) {
  return (
    <Box p={6}>
      <Text fontSize="md" fontWeight="medium">시작점</Text>
      <Text fontSize="sm" color="text.secondary" mt={2}>
        워크플로우의 입력 데이터
      </Text>
      {/* TODO: 사용자 계정 데이터 연동 */}
    </Box>
  );
}
```

### 6.3 닫기 동작

InputPanel은 OutputPanel과 수명을 공유한다. OutputPanel이 닫히면 `activePanelNodeId`가 `null`이 되어 InputPanel도 자동으로 닫힌다. 별도 닫기 로직 불필요. InputPanel 자체 X 버튼은 `closePanel()`을 호출한다.

---

## 7. 패널 닫기 규칙

### 7.1 공통 규칙

| 패널 | X 버튼 | 캔버스 빈 영역 클릭 | ESC 키 |
|------|--------|---------------------|--------|
| ServiceSelectionPanel | `handleOverlayClose()` | `setActivePlaceholder(null)` | `handleOverlayClose()` |
| OutputPanel | `closePanel()` | `closePanel()` | `closePanel()` |
| InputPanel | `closePanel()` | `closePanel()` (OutputPanel과 함께) | `closePanel()` |

### 7.2 Canvas.tsx onPaneClick

```typescript
const handlePaneClick = () => {
  // ServiceSelectionPanel 닫기
  if (activePlaceholder) {
    setActivePlaceholder(null);
  }

  // InputPanel + OutputPanel 닫기
  if (activePanelNodeId) {
    closePanel();
  }
};
```

### 7.3 ESC 키 전역 리스너

```typescript
// Canvas.tsx 또는 WorkflowEditorPage.tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;

    // ServiceSelectionPanel이 열려 있으면 먼저 닫기
    if (activePlaceholder) {
      setActivePlaceholder(null);
      return;
    }

    // 듀얼 패널이 열려 있으면 닫기
    if (activePanelNodeId) {
      closePanel();
    }
  };

  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [activePlaceholder, activePanelNodeId]);
```

---

## 8. 노드 인터랙션 규칙

### 8.1 삭제 버튼 — Hover 표시

노드의 삭제 X 버튼은 **hover 시에만** 표시한다. 패널이 노드를 가릴 수 있으므로 hover가 접근하기 쉽다.

```typescript
// BaseNode.tsx
const [isHovered, setIsHovered] = useState(false);

<Box
  onMouseEnter={() => setIsHovered(true)}
  onMouseLeave={() => setIsHovered(false)}
>
  {/* 노드 내용 */}
  {isHovered && (
    <Box position="absolute" top={-2} right={-2} onClick={handleDelete}>
      <Icon as={MdCancel} boxSize={5} />
    </Box>
  )}
</Box>
```

### 8.2 노드 선택 시 화면 중앙 고정

노드를 클릭하면:
1. 해당 노드를 **화면 중앙**에 위치시킨다 (`setCenter` 사용)
2. 선택된 노드는 **드래그 불가** — 패널과의 시각적 관계를 유지

```typescript
// Canvas.tsx — handleNodeClick
const handleNodeClick = (_: React.MouseEvent, node: Node) => {
  openPanel(node.id);

  const { x, y } = node.position;
  reactFlowInstance.setCenter(x + nodeWidth / 2, y + nodeHeight / 2, {
    duration: 300,
    zoom: reactFlowInstance.getZoom(),
  });
};
```

선택된 노드의 드래그 비활성화:

```typescript
// Canvas.tsx 또는 BaseNode.tsx
// 패널이 열린 노드는 draggable: false
const nodesWithDragControl = nodes.map((node) => ({
  ...node,
  draggable: node.id !== activePanelNodeId,
}));
```

### 8.3 Handle(연결점) 숨김

모든 노드에서 Handle을 **시각적으로 숨긴다**. React Flow의 Edge 렌더링을 위해 DOM에는 유지하되, 사용자에게는 보이지 않도록 한다.

```typescript
// BaseNode.tsx
<Handle
  type="source"
  position={Position.Right}
  style={{ opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
/>
<Handle
  type="target"
  position={Position.Left}
  style={{ opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
/>
```

> **주의:** Handle을 완전히 제거하면 React Flow가 Edge를 렌더링하지 못한다. `opacity: 0` + `pointerEvents: "none"`으로 보이지 않되 기능은 유지한다.

---

## 9. Edge 렌더링

### 9.1 연결선 표시

노드 간 연결을 시각적으로 표시하는 Edge를 렌더링한다. `workflowStore`의 `edges` 배열을 Canvas에 전달한다.

### 9.2 Edge 스타일

```typescript
const defaultEdgeOptions: DefaultEdgeOptions = {
  type: "smoothstep",
  animated: false,
  style: {
    stroke: "#94a3b8",  // gray.400
    strokeWidth: 2,
  },
};
```

### 9.3 자동 연결

노드 배치 시 `placeNode()` 내부에서 `onConnect()`를 호출하여 Edge를 자동 생성한다. 사용자가 수동으로 Handle을 드래그하여 연결하는 기능은 제공하지 않는다.

---

## 10. 상태 전이 다이어그램

### 10.1 시작/도착 노드 위자드 (ServiceSelectionPanel 로컬 상태)

```
┌──────────────────────────────────────────────────────────────────┐
│ 초기 상태                                                        │
│ activePlaceholder: null                                          │
│ activePanelNodeId: null                                          │
│ SSP: 닫힘                                                        │
└──────────────────────────────────────────────────────────────────┘
        │
        │ Placeholder 클릭
        │ → setActivePlaceholder({ id, position })
        ▼
┌──────────────────────────────────────────────────────────────────┐
│ 카테고리 선택 (SSP — step: "category")                            │
│ activePlaceholder: { id, position }                              │
│ activePanelNodeId: null                                          │
│ SSP 로컬: step="category", placedNodeId=null                     │
└──────────────────────────────────────────────────────────────────┘
        │
        │ 카테고리 선택 (서비스 있음)
        ▼
┌──────────────────────────────────────────────────────────────────┐
│ 서비스 선택 (SSP — step: "service")                               │
│ activePlaceholder: { id, position }                              │
│ SSP 로컬: step="service", selectedMeta=meta                      │
└──────────────────────────────────────────────────────────────────┘
        │
        │ 서비스 선택 → placeNode(meta, service)
        ▼
┌──────────────────────────────────────────────────────────────────┐
│ 요구사항 선택 (SSP — step: "requirement")                         │
│ activePlaceholder: { id, position }                              │
│ SSP 로컬: placedNodeId=nodeId, step="requirement"                │
│ 캔버스: 노드 배치됨 (isConfigured: false)                         │
└──────────────────────────────────────────────────────────────────┘
        │
        ├── 인증 필요
        │   → setSelectedRequirementPreset(req.configPreset)
        │   → setStep("auth")
        │   ▼
        │ ┌────────────────────────────────────────────────────────┐
        │ │ 인증 (SSP — step: "auth")                               │
        │ │ SSP 로컬: selectedRequirementPreset={ ... }             │
        │ └────────────────────────────────────────────────────────┘
        │       │
        │       │ 인증 완료
        │       │ → updateNodeConfig(nodeId, preset)
        │       │ → resetWizard()
        │       ▼
        │   ┌──────────────────────────────────────────────────────┐
        │   │ 완료 — SSP 닫힘                                       │
        │   │ activePlaceholder: null                               │
        │   │ 노드: isConfigured: true                              │
        │   └──────────────────────────────────────────────────────┘
        │
        └── 인증 불필요
            → updateNodeConfig(nodeId, req.configPreset)
            → resetWizard()
            ▼
          ┌────────────────────────────────────────────────────────┐
          │ 완료 — SSP 닫힘                                         │
          │ activePlaceholder: null                                 │
          │ 노드: isConfigured: true                                │
          └────────────────────────────────────────────────────────┘
```

### 10.2 중간 노드 설정 (SSP 카테고리 → 듀얼 패널)

```
┌──────────────────────────────────────────────────────────────────┐
│ 중간 placeholder 클릭                                             │
│ → setActivePlaceholder({ id, position })                         │
└──────────────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────────┐
│ 카테고리 선택 (SSP — step: "category", isMiddleNodeMode=true)     │
└──────────────────────────────────────────────────────────────────┘
        │
        │ 카테고리 선택 → placeNode(meta) → resetWizard()
        │                                → openPanel(nodeId)
        ▼
┌──────────────────────────────────────────────────────────────────┐
│ 듀얼 패널                                                         │
│ activePlaceholder: null (SSP 닫힘)                                │
│ activePanelNodeId: nodeId                                        │
│ InputPanel: 이전 노드 출력 데이터                                  │
│ OutputPanel: 요구사항 목록 (isConfigured: false)                   │
└──────────────────────────────────────────────────────────────────┘
        │
        │ 요구사항 선택 → updateNodeConfig(nodeId, req.configPreset)
        ▼
┌──────────────────────────────────────────────────────────────────┐
│ 설정 완료                                                         │
│ OutputPanel: PanelRenderer (isConfigured: true)                   │
└──────────────────────────────────────────────────────────────────┘
```

### 10.3 Store 상태 스냅샷

**시작/도착 노드 (SSP 로컬 상태 중심):**

| 단계 | `activePlaceholder` | `activePanelNodeId` | SSP 열림 | 듀얼 패널 |
|------|-------|-------|--------|--------|
| 초기 | `null` | `null` | X | X |
| 카테고리 선택 | `{ id, pos }` | `null` | O | X |
| 서비스 선택 | `{ id, pos }` | `null` | O | X |
| 요구사항 선택 | `{ id, pos }` | `null` | O | X |
| 인증 | `{ id, pos }` | `null` | O | X |
| 완료 | `null` | `null` | X | X |

**중간 노드:**

| 단계 | `activePlaceholder` | `activePanelNodeId` | SSP 열림 | 듀얼 패널 |
|------|-------|-------|--------|--------|
| placeholder 클릭 | `{ id, pos }` | `null` | O | X |
| 카테고리 선택 → 배치 | `null` | `nodeId` | X | O |
| 요구사항 선택 후 | `null` | `nodeId` | X | O |

---

## 11. 비정상 종료 및 상태 정리

### 11.1 ServiceSelectionPanel 위자드 중

위자드 상태가 **SSP 로컬**이므로, `resetWizard()`가 호출되면 모든 상태가 정리된다. store 정리 로직은 불필요.

| 트리거 | 처리 | 배치된 노드 |
|--------|------|-------------|
| X 버튼 | `resetWizard()` | 유지 (isConfigured: false) |
| 캔버스 빈 영역 클릭 | `setActivePlaceholder(null)` → SSP unmount → 로컬 상태 소멸 | 유지 |
| ESC 키 | `resetWizard()` | 유지 |

> **배치된 노드의 미완료 상태:** 요구사항/인증 단계에서 닫기하면 노드는 캔버스에 남지만 `isConfigured: false`이다. 사용자가 이 노드를 클릭하면 듀얼 패널에서 요구사항을 설정할 수 있다.

### 11.2 듀얼 패널 중

| 트리거 | 처리 |
|--------|------|
| X 버튼 | `closePanel()` → 양쪽 패널 닫힘 |
| 캔버스 빈 영역 클릭 | `closePanel()` |
| ESC 키 | `closePanel()` |
| 다른 노드 클릭 | `openPanel(새 nodeId)` → 패널 전환 |

### 11.3 노드 삭제 시

```typescript
removeNode: (id) =>
  set((state) => {
    // ... 기존 노드/엣지 삭제 로직 ...

    // 삭제된 노드가 패널 대상이면 패널 닫기
    if (state.activePanelNodeId && removeTargets.has(state.activePanelNodeId)) {
      state.activePanelNodeId = null;
    }

    // ... startNodeId/endNodeId 정리 ...
  }),
```

### 11.4 에디터 이탈

`resetEditor`로 전체 store 상태가 초기화된다. SSP 로컬 상태는 컴포넌트 unmount 시 자동 소멸.

---

## 12. 파일별 변경 요약

### 12.1 `src/features/add-node/ui/ServiceSelectionPanel.tsx`

| 변경 | 내용 |
|------|------|
| 추가 | `RequirementList` 컴포넌트 (요구사항 목록 UI) |
| 추가 | `AuthPrompt` 컴포넌트 (인증 UI) |
| 변경 | `WizardStep` 타입 → `"category" \| "service" \| "requirement" \| "auth"` |
| 추가 | `placedNodeId`, `selectedService`, `selectedRequirementPreset` 로컬 상태 |
| 추가 | `isMiddleNodeMode` 판별 로직 |
| 변경 | `handleCategorySelect` → 중간 노드 / 시작·도착 노드 분기 |
| 추가 | `handleRequirementSelect`, `handleAuth` 핸들러 |
| 추가 | `handleBackToCategory`, `handleBackFromRequirement`, `handleBackToRequirement` 핸들러 |
| 추가 | X 버튼, ESC 키 리스너 |
| 추가 | `removeNode`, `updateNodeConfig`, `openPanel` store 구독 |

### 12.2 `src/widgets/output-panel/ui/OutputPanel.tsx`

| 변경 | 내용 |
|------|------|
| 제거 | `WizardRequirementContent`, `WizardAuthContent` 컴포넌트 |
| 제거 | `finishWizard()`, `handleAuth()`, `handleBackToService()`, `handleBackToRequirement()` |
| 제거 | `wizardStep`, `wizardConfigPreset`, `wizardSourcePlaceholder` 구독 |
| 추가 | `RequirementSelector` (중간 노드용 — `isConfigured` false이고 요구사항 있을 때) |
| 변경 | 헤더 → `isConfigured` + `requirementGroup` 기반 분기 |
| 변경 | 닫기 → 단순 `closePanel()` |

### 12.3 `src/widgets/input-panel/ui/InputPanel.tsx`

| 변경 | 내용 |
|------|------|
| 변경 | `isOpen` 조건 → `activePanelNodeId && activePlaceholder === null` |
| 제거 | `wizardStep` 구독 |
| 추가 | 시작 노드 클릭 시 "시작점" 안내 (소스 노드 없는 경우) |

### 12.4 `src/widgets/canvas/ui/Canvas.tsx`

| 변경 | 내용 |
|------|------|
| 추가 | `onPaneClick` → `closePanel()` + `setActivePlaceholder(null)` |
| 추가 | ESC 키 전역 리스너 |
| 추가 | 일반 노드 클릭 시 `setCenter` (화면 중앙 이동) |
| 추가 | 선택 노드 드래그 비활성화 (`activePanelNodeId`와 일치하면 `draggable: false`) |
| 추가 | `defaultEdgeOptions` (Edge 스타일 설정) |

### 12.5 `src/entities/node/ui/BaseNode.tsx`

| 변경 | 내용 |
|------|------|
| 변경 | 삭제 버튼 → `selected` 대신 hover 상태로 표시 |
| 변경 | Handle → `opacity: 0, pointerEvents: "none"` (시각적 숨김, DOM 유지) |

### 12.6 `src/shared/model/workflowStore.ts`

| 변경 | 내용 |
|------|------|
| 제거 | `wizardStep`, `wizardConfigPreset`, `wizardSourcePlaceholder` 상태 |
| 제거 | `setWizardStep`, `setWizardConfigPreset`, `setWizardSourcePlaceholder` 액션 |
| 변경 | `removeNode` → wizard 정리 로직 제거, 패널 정리만 유지 |
| 변경 | `openPanel` → wizard 정리 로직 제거 |
| 유지 | `updateNodeConfig` → `isConfigured: true` 자동 설정 |

### 12.7 변경하지 않는 파일

| 파일 | 이유 |
|------|------|
| `serviceMap.ts` | 데이터 변경 없음 |
| `serviceRequirements.ts` | 데이터 변경 없음 |
| `PanelRenderer.tsx` | 기존 동작 유지 |
| `WorkflowEditorPage.tsx` | 레이아웃 구조 변경 없음 |
