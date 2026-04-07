# 노드 설정 위자드 상세 설계

> **작성일:** 2026-04-05
> **최종 수정:** 2026-04-07 (v3 — 중간 노드 ChoicePanel 설계 반영)
> **선행 문서:** [FRONTEND_DESIGN_DOCUMENT.md](./FRONTEND_DESIGN_DOCUMENT.md), [FOUNDATION_IMPLEMENTATION_PLAN.md](./FOUNDATION_IMPLEMENTATION_PLAN.md)
> **목적:** 시작/도착 노드 및 중간 노드의 설정 위자드 흐름을 설계한다.
>
> **v3 변경 요약:** 중간 노드의 entry UI를 SSP 카테고리 선택에서 **ChoicePanel** (매핑 규칙 기반 선택지)으로 교체. `mapping_rules.json` mock 데이터를 프론트엔드에 내장하여 백엔드 API 없이 전체 흐름 구현.

---

## 목차

1. [설계 원칙](#1-설계-원칙)
2. [위자드 흐름 정의](#2-위자드-흐름-정의)
3. [Store 설계](#3-store-설계)
4. [ServiceSelectionPanel 설계](#4-serviceselectionpanel-설계)
5. [ChoicePanel 설계](#5-choicepanel-설계)
6. [OutputPanel 설계](#6-outputpanel-설계)
7. [InputPanel 설계](#7-inputpanel-설계)
8. [패널 닫기 규칙](#8-패널-닫기-규칙)
9. [노드 인터랙션 규칙](#9-노드-인터랙션-규칙)
10. [Edge 렌더링](#10-edge-렌더링)
11. [상태 전이 다이어그램](#11-상태-전이-다이어그램)
12. [비정상 종료 및 상태 정리](#12-비정상-종료-및-상태-정리)
13. [파일별 변경 요약](#13-파일별-변경-요약)

---

## 1. 설계 원칙

### 1.1 패널 사용 분리

| 노드 유형 | 설정 수단 | 이유 |
|-----------|-----------|------|
| **시작/도착 노드** | ServiceSelectionPanel (중앙 오버레이) 내부에서 전체 위자드 진행 | 아직 캔버스에 노드가 없거나, 초기 설정 단계이므로 전체 화면 가이드가 적합 |
| **중간 노드** | ChoicePanel (중앙 오버레이) — 이전 노드 outputDataType 기반 선택지 매핑 | 이전 노드의 출력 데이터 타입에 따라 가능한 처리 방식이 결정되므로, 카테고리가 아닌 매핑 규칙 기반 선택이 적합 |

> **v1 대비 핵심 변경:** v1에서는 시작/도착 노드의 요구사항·인증 단계를 OutputPanel에서 처리했다. v2에서는 **ServiceSelectionPanel 내부**에서 모든 단계를 완료한다. 중간 노드는 **ChoicePanel**이 처리하며, ServiceSelectionPanel과 OutputPanel은 관여하지 않는다.

### 1.2 중간 노드 entry UI — ChoicePanel

중간 노드는 **카테고리 선택이 아닌, 이전 노드의 출력 데이터 타입에 따른 선택지 매핑**으로 결정된다. 1200개 시나리오에서 추출한 매핑 규칙(`mapping_rules.json`)을 정적 mock 데이터로 프론트엔드에 내장하여, 백엔드 API 없이도 전체 흐름을 구현한다.

| 단계 | 현재 (mock 데이터) | 목표 (Phase 2) |
|------|-------------------|----------------|
| 중간 placeholder 클릭 | ChoicePanel — 정적 매핑 규칙 데이터 사용 | ChoicePanel — 백엔드 선택지 매핑 API |
| 노드 결정 | 프론트엔드 매핑 규칙 조회 | 백엔드 API 응답 |
| 이후 설정 | 듀얼 패널 (InputPanel + OutputPanel) | 동일 |

**ServiceSelectionPanel은 시작/도착 노드 전용이다.** 중간 노드에서는 사용하지 않는다.

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

현재 store의 `updateNodeConfig()`는 config를 **merge**하며 `isConfigured: true`를 주입한다:

```typescript
// 현재 store 구현 — 기존 config를 보존하며 merge
node.data.config = {
  ...node.data.config,
  ...전달된config,
  isConfigured: true,
};
```

따라서 호출부에서는 필요한 값만 부분적으로 전달해도 기존 `service`, `account` 같은 필드가 유지된다:

```typescript
// 부분 값만 전달해도 안전
updateNodeConfig(nodeId, req.configPreset);

// service는 placeNode에서 이미 주입되어 있으므로 유지됨
updateNodeConfig(nodeId, {});
```

**원칙:** `updateNodeConfig()`는 **위자드의 최종 완료 시점에만** 호출한다. 서비스 선택 시점에 config에 service를 주입할 때는 `updateNodeConfig()` 대신 노드 생성 시 초기 config로 전달하여, 위자드 미완료 노드가 "설정 완료"로 표시되지 않도록 한다.

```typescript
// 올바른 흐름 — 서비스 선택 시
placeNode(meta, service);
// → addNode 내부에서 config.service = service.value 주입
// → config.isConfigured는 false 유지

// 위자드 최종 완료 시점에만
updateNodeConfig(nodeId, req.configPreset);
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

중간 노드는 **ChoicePanel**에서 이전 노드의 출력 데이터 타입을 기반으로 선택지를 제공한다. 최대 3단계:

1. **처리 방식** (목록형 데이터일 때만) — "한 건씩" vs "전체 사용"
2. **액션 선택** — 데이터 타입별 가능한 처리 목록
3. **후속 설정** (해당 액션에 follow_up 또는 branch_config가 있을 때)

```
[중간 placeholder 클릭]
    │
    ├── 이전(leaf) 노드의 outputTypes[0] 확인
    │   → DataType(kebab) → MappingKey(SCREAMING_SNAKE) 변환
    │   → 매핑 규칙 데이터에서 해당 data_type 조회
    ▼
┌─────────────────────────────────────────────────────┐
│  Step 1: 처리 방식 (ChoicePanel)                      │
│  - requires_processing_method === true일 때만 표시     │
│  - 질문: "파일들을 어떻게 처리할까요?" 등               │
│  - 선택지:                                           │
│    A) node_type 있음 (예: LOOP)                       │
│       → 해당 노드 생성 + output_data_type 변경         │
│       → 새 output_data_type의 actions 조회             │
│       → actions 비어있으면 완료, 있으면 Step 2          │
│    B) node_type === null (예: "전체 사용")             │
│       → 노드 미생성, output_data_type 유지             │
│       → 현재 data_type의 actions 조회                  │
│       → actions 비어있으면 완료, 있으면 Step 2          │
│                                                      │
│  - requires_processing_method === false이면            │
│    바로 Step 2로 진행                                  │
└─────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────┐
│  Step 2: 액션 선택 (ChoicePanel)                      │
│  - priority 순으로 정렬된 선택지 목록                   │
│  - applicable_when 조건으로 필터링                     │
│  - 선택 시:                                          │
│    1. 해당 action의 node_type으로 노드 생성             │
│    2. follow_up 있으면 → Step 3                       │
│    3. branch_config 있으면 → Step 3                   │
│    4. 둘 다 없으면 → updateNodeConfig → 오버레이 닫힘   │
└─────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────┐
│  Step 3: 후속 설정 (ChoicePanel)                      │
│  - follow_up: 단일/다중 선택 또는 텍스트 입력           │
│  - branch_config: 분기 기준 선택 (multi_select 가능)   │
│  - 완료 → updateNodeConfig → 오버레이 닫힘             │
│  - "뒤로" → Step 2로 복귀 (노드 제거)                  │
└─────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────┐
│  완료                                                │
│  - ChoicePanel 닫힘 (activePlaceholder = null)        │
│  - 듀얼 패널 자동 오픈 (openPanel)                     │
│  - 노드: isConfigured: true                           │
└─────────────────────────────────────────────────────┘
```

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

`initialState` 스프레드로 전체 상태가 초기화된다. wizard 관련 필드가 store에서 제거되었으므로 추가 정리 불필요. SSP 및 ChoicePanel 로컬 상태는 컴포넌트 unmount 시 자동 소멸.

---

## 4. ServiceSelectionPanel 설계

### 4.1 책임 범위

ServiceSelectionPanel은 **시작/도착 노드 전용**이다. 중간 노드는 ChoicePanel이 담당한다 (5절 참조).

| 진입 조건 | 처리 단계 |
|-----------|-----------|
| 시작/도착 placeholder 클릭 (`placeholder-start` 또는 `placeholder-end`) | category → service → requirement → auth (전체) |

### 4.2 표시 조건

```typescript
const isStartOrEndPlaceholder =
  activePlaceholder?.id === "placeholder-start" ||
  activePlaceholder?.id === "placeholder-end";

// ServiceSelectionPanel은 isStartOrEndPlaceholder일 때만 렌더링
if (!isStartOrEndPlaceholder) return null;
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
  // ── 시작/도착 노드 전용: 전체 위자드 진행 ──
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
// 오버레이 콘텐츠 — 시작/도착 노드 전용
{step === "category" && <CategoryGrid ... />}
{step === "service" && <ServiceGrid ... />}
{step === "requirement" && <RequirementList ... />}
{step === "auth" && <AuthPrompt ... />}
```

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

## 5. ChoicePanel 설계

### 5.1 개요

ChoicePanel은 **중간 노드 전용** 선택지 매핑 패널이다. 이전 노드의 `outputTypes`를 기반으로 매핑 규칙 데이터를 조회하여, 사용자에게 가능한 처리 방식을 제공한다.

| 항목 | 내용 |
|------|------|
| **위치** | `src/features/choice-panel/` (새 feature) |
| **진입 조건** | 중간 placeholder 클릭 (`activePlaceholder.id`가 `placeholder-start`/`placeholder-end`가 아닌 경우) |
| **데이터 소스** | 정적 매핑 규칙 (Phase 2에서 백엔드 API로 교체) |
| **UI 형태** | 캔버스 중앙 오버레이 (SSP와 동일한 레이아웃) |
| **상태** | 모두 컴포넌트 로컬 상태 (store에는 `activePlaceholder`만 사용) |

### 5.2 매핑 규칙 데이터 구조

#### 파일 위치

```
src/features/choice-panel/
├── model/
│   ├── index.ts
│   ├── mappingRules.ts          ← 정적 매핑 규칙 데이터
│   ├── types.ts                 ← 매핑 규칙 타입 정의
│   └── dataTypeKeyMap.ts        ← DataType ↔ MappingKey 변환
├── ui/
│   ├── index.ts
│   ├── ChoicePanel.tsx           ← 메인 컴포넌트
│   ├── ProcessingMethodStep.tsx  ← Step 1: 처리 방식
│   ├── ActionStep.tsx            ← Step 2: 액션 선택
│   └── FollowUpStep.tsx          ← Step 3: 후속 설정
└── index.ts
```

#### 타입 정의 (`types.ts`)

```typescript
/** 매핑 규칙에서 사용하는 데이터 타입 키 (백엔드 형식) */
export type MappingDataTypeKey =
  | "FILE_LIST"
  | "SINGLE_FILE"
  | "EMAIL_LIST"
  | "SINGLE_EMAIL"
  | "SPREADSHEET_DATA"
  | "API_RESPONSE"
  | "SCHEDULE_DATA"
  | "TEXT";

/** 매핑 규칙에서 사용하는 노드 타입 (백엔드 형식) */
export type MappingNodeType =
  | "LOOP"
  | "CONDITION_BRANCH"
  | "AI"
  | "DATA_FILTER"
  | "AI_FILTER"
  | "PASSTHROUGH";

/** follow_up 옵션 */
export interface FollowUpOption {
  id: string;
  label: string;
  type?: "text_input";
}

/** follow_up 설정 */
export interface FollowUp {
  question: string;
  options?: FollowUpOption[];
  options_source?: "fields_from_data" | "fields_from_service";
  multi_select?: boolean;
  description?: string;
}

/** branch_config 설정 */
export interface BranchConfig {
  question: string;
  options?: FollowUpOption[];
  options_source?: "fields_from_data";
  multi_select?: boolean;
  description?: string;
}

/** applicable_when 조건 */
export interface ApplicableWhen {
  file_subtype?: string[];
}

/** 처리 방식 옵션 (Step 1) */
export interface ProcessingMethodOption {
  id: string;
  label: string;
  node_type: MappingNodeType | null;
  output_data_type: MappingDataTypeKey;
  priority: number;
}

/** 처리 방식 질문 */
export interface ProcessingMethod {
  question: string;
  options: ProcessingMethodOption[];
}

/** 액션 선택지 (Step 2) */
export interface MappingAction {
  id: string;
  label: string;
  node_type: MappingNodeType;
  output_data_type: MappingDataTypeKey;
  priority: number;
  description?: string;
  applicable_when?: ApplicableWhen;
  follow_up?: FollowUp;
  branch_config?: BranchConfig;
}

/** 데이터 타입별 매핑 규칙 */
export interface DataTypeMapping {
  label: string;
  description: string;
  requires_processing_method: boolean;
  processing_method?: ProcessingMethod;
  actions: MappingAction[];
}

/** 전체 매핑 규칙 */
export interface MappingRules {
  data_types: Record<MappingDataTypeKey, DataTypeMapping>;
  node_types: Record<MappingNodeType, { label: string; description: string }>;
  service_fields: Record<string, string[]>;
}
```

#### DataType ↔ MappingKey 변환 (`dataTypeKeyMap.ts`)

프론트엔드의 `DataType` (kebab-case)과 매핑 규칙의 키 (SCREAMING_SNAKE_CASE)는 1:1 대응한다:

```typescript
import type { DataType } from "@/entities/node";

import type { MappingDataTypeKey } from "./types";

const DATA_TYPE_TO_MAPPING_KEY: Record<DataType, MappingDataTypeKey> = {
  "file-list": "FILE_LIST",
  "single-file": "SINGLE_FILE",
  text: "TEXT",
  spreadsheet: "SPREADSHEET_DATA",
  "email-list": "EMAIL_LIST",
  "single-email": "SINGLE_EMAIL",
  "schedule-data": "SCHEDULE_DATA",
  "api-response": "API_RESPONSE",
};

const MAPPING_KEY_TO_DATA_TYPE: Record<MappingDataTypeKey, DataType> = {
  FILE_LIST: "file-list",
  SINGLE_FILE: "single-file",
  TEXT: "text",
  SPREADSHEET_DATA: "spreadsheet",
  EMAIL_LIST: "email-list",
  SINGLE_EMAIL: "single-email",
  SCHEDULE_DATA: "schedule-data",
  API_RESPONSE: "api-response",
};

export const toMappingKey = (dataType: DataType): MappingDataTypeKey =>
  DATA_TYPE_TO_MAPPING_KEY[dataType];

export const toDataType = (mappingKey: MappingDataTypeKey): DataType =>
  MAPPING_KEY_TO_DATA_TYPE[mappingKey];
```

#### 백엔드 노드 타입 → 프론트엔드 NodeType 변환

매핑 규칙의 6가지 `MappingNodeType`을 프론트엔드의 15가지 `NodeType`으로 변환한다:

```typescript
import type { NodeType } from "@/entities/node";

import type { MappingNodeType } from "./types";

export const MAPPING_NODE_TYPE_MAP: Record<MappingNodeType, NodeType> = {
  LOOP: "loop",
  CONDITION_BRANCH: "condition",
  AI: "llm",
  DATA_FILTER: "filter",
  AI_FILTER: "filter",      // config에서 AI 모드 구분
  PASSTHROUGH: "data-process", // operation: null로 패스스루 표현
};
```

> **AI_FILTER vs DATA_FILTER:** 둘 다 프론트엔드 `"filter"` NodeType으로 매핑된다. `FilterNodeConfig`에 `isAiFilter` 같은 구분 필드를 추가하거나, 별도 NodeType을 신설할 수 있다. 현 단계에서는 동일하게 `"filter"`로 매핑하고, 추후 필요 시 분리한다.

#### 매핑 규칙 데이터 (`mappingRules.ts`)

`mapping_rules.json`의 내용을 TypeScript 상수로 내장한다:

```typescript
import type { MappingRules } from "./types";

export const MAPPING_RULES: MappingRules = {
  data_types: {
    FILE_LIST: {
      label: "파일 목록",
      description: "여러 파일이 들어오는 경우",
      requires_processing_method: true,
      processing_method: {
        question: "파일들을 어떻게 처리할까요?",
        options: [
          { id: "one_by_one", label: "한 파일씩", node_type: "LOOP", output_data_type: "SINGLE_FILE", priority: 1 },
          { id: "all_at_once", label: "전체를 하나로 합쳐서", node_type: null, output_data_type: "FILE_LIST", priority: 2 },
        ],
      },
      actions: [],
    },
    // ... 나머지 7개 data_type (SINGLE_FILE, EMAIL_LIST, SINGLE_EMAIL, SPREADSHEET_DATA, API_RESPONSE, SCHEDULE_DATA, TEXT)
  },
  node_types: { /* ... */ },
  service_fields: { /* ... */ },
};
```

> **Phase 2 전환:** `MAPPING_RULES` 상수 대신 API 호출로 교체하면 된다. 타입과 컴포넌트 로직은 동일하게 유지.

### 5.3 로컬 상태

```typescript
type ChoiceStep = "processing-method" | "action" | "follow-up";

const [step, setStep] = useState<ChoiceStep>("processing-method");
const [currentDataTypeKey, setCurrentDataTypeKey] = useState<MappingDataTypeKey | null>(null);
const [selectedProcessingOption, setSelectedProcessingOption] = useState<ProcessingMethodOption | null>(null);
const [selectedAction, setSelectedAction] = useState<MappingAction | null>(null);
const [placedNodeId, setPlacedNodeId] = useState<string | null>(null);
const [followUpSelections, setFollowUpSelections] = useState<Record<string, string | string[]>>({});
```

| 상태 | 용도 |
|------|------|
| `step` | 현재 표시 중인 단계 |
| `currentDataTypeKey` | 현재 조회 중인 데이터 타입 키 (처리 방식 선택 후 변경될 수 있음) |
| `selectedProcessingOption` | Step 1에서 선택한 처리 방식 |
| `selectedAction` | Step 2에서 선택한 액션 |
| `placedNodeId` | 배치된 노드 ID (뒤로가기 시 제거용) |
| `followUpSelections` | Step 3에서 수집한 후속 설정 값 |

### 5.4 초기화 — 이전 노드 outputTypes 확인

ChoicePanel이 열릴 때, 이전(leaf) 노드의 `outputTypes[0]`을 확인하여 초기 데이터 타입을 결정한다:

```typescript
// ChoicePanel.tsx
const activePlaceholder = useWorkflowStore((s) => s.activePlaceholder);
const nodes = useWorkflowStore((s) => s.nodes);
const edges = useWorkflowStore((s) => s.edges);

// 중간 placeholder인지 판별
const isMiddlePlaceholder =
  activePlaceholder !== null &&
  activePlaceholder.id !== "placeholder-start" &&
  activePlaceholder.id !== "placeholder-end";

// 이전 노드의 outputTypes 확인
const parentNodeId = activePlaceholder?.id?.replace("placeholder-", "") ?? null;
const parentNode = parentNodeId
  ? nodes.find((n) => n.id === parentNodeId)
  : null;
const parentOutputType = parentNode?.data.outputTypes[0] ?? null;

useEffect(() => {
  if (!isMiddlePlaceholder || !parentOutputType) return;

  const mappingKey = toMappingKey(parentOutputType);
  const dataType = MAPPING_RULES.data_types[mappingKey];
  setCurrentDataTypeKey(mappingKey);

  if (dataType.requires_processing_method) {
    setStep("processing-method");
  } else {
    setStep("action");
  }
}, [isMiddlePlaceholder, parentOutputType]);
```

> **parentNodeId 계산:** Canvas.tsx에서 중간 placeholder의 id는 `placeholder-${leafId}` 형식이다. `leafId`를 추출하여 부모 노드를 찾는다.

### 5.5 Step 1 — 처리 방식 선택 (`handleProcessingMethodSelect`)

```typescript
const handleProcessingMethodSelect = (option: ProcessingMethodOption) => {
  setSelectedProcessingOption(option);

  // LOOP 등 node_type이 있으면 노드 생성
  if (option.node_type) {
    const frontendNodeType = MAPPING_NODE_TYPE_MAP[option.node_type];
    const meta = NODE_REGISTRY[frontendNodeType];
    const nodeId = placeNode(meta);
    if (!nodeId) return;

    // output_data_type에 맞게 노드의 outputTypes 설정
    const newOutputDataType = toDataType(option.output_data_type);
    updateNodeConfig(nodeId, {}); // 처리 방식 노드는 바로 설정 완료
    setPlacedNodeId(nodeId);
  }

  // 새 output_data_type으로 actions 조회
  const nextDataType = MAPPING_RULES.data_types[option.output_data_type];
  setCurrentDataTypeKey(option.output_data_type);

  if (nextDataType.actions.length === 0) {
    // 액션 없음 → 완료 (LOOP 노드만 생성된 경우)
    resetChoice();
    if (option.node_type && placedNodeId) {
      openPanel(placedNodeId);
    }
    return;
  }

  // 액션 있음 → Step 2
  setStep("action");
};
```

> **LOOP 노드 + 후속 액션:** FILE_LIST에서 "한 파일씩" 선택 시 LOOP 노드가 생성되고, SINGLE_FILE의 actions가 표시된다. 사용자가 액션을 선택하면 **두 번째 노드**가 LOOP 뒤에 추가된다. 즉 하나의 ChoicePanel 세션에서 최대 2개 노드가 생성될 수 있다.

### 5.6 Step 2 — 액션 선택 (`handleActionSelect`)

```typescript
const handleActionSelect = (action: MappingAction) => {
  setSelectedAction(action);

  // 노드 생성
  const frontendNodeType = MAPPING_NODE_TYPE_MAP[action.node_type];
  const meta = NODE_REGISTRY[frontendNodeType];
  const nodeId = placeNode(meta);
  if (!nodeId) return;
  setPlacedNodeId(nodeId);

  // follow_up 또는 branch_config가 있으면 Step 3
  if (action.follow_up || action.branch_config) {
    setStep("follow-up");
    return;
  }

  // 후속 설정 없음 → 바로 완료
  const outputDataType = toDataType(action.output_data_type);
  updateNodeConfig(nodeId, {
    choiceActionId: action.id,
    outputDataType,
  });
  resetChoice();
  openPanel(nodeId);
};
```

### 5.7 Step 3 — 후속 설정 (`handleFollowUpComplete`)

```typescript
const handleFollowUpComplete = (selections: Record<string, string | string[]>) => {
  if (!placedNodeId || !selectedAction) return;

  const outputDataType = toDataType(selectedAction.output_data_type);
  updateNodeConfig(placedNodeId, {
    choiceActionId: selectedAction.id,
    outputDataType,
    followUpSelections: selections,
  });
  resetChoice();
  openPanel(placedNodeId);
};
```

### 5.8 뒤로가기

```typescript
// Step 2 → Step 1 (처리 방식이 있었던 경우만)
const handleBackToProcessingMethod = () => {
  // 액션 단계에서 배치한 노드 제거
  if (placedNodeId && selectedAction) {
    removeNode(placedNodeId);
    setPlacedNodeId(null);
  }
  setSelectedAction(null);

  // 처리 방식 선택이 있었으면 Step 1로, 없었으면 닫기
  if (selectedProcessingOption) {
    // 처리 방식에서 생성한 노드도 제거
    // (LOOP 노드 등)
    setSelectedProcessingOption(null);
    setStep("processing-method");
  }
};

// Step 3 → Step 2
const handleBackToAction = () => {
  if (placedNodeId) {
    removeNode(placedNodeId);
    setPlacedNodeId(null);
  }
  setSelectedAction(null);
  setFollowUpSelections({});
  setStep("action");
};
```

### 5.9 닫기 및 초기화

```typescript
const resetChoice = () => {
  setStep("processing-method");
  setCurrentDataTypeKey(null);
  setSelectedProcessingOption(null);
  setSelectedAction(null);
  setPlacedNodeId(null);
  setFollowUpSelections({});
  setActivePlaceholder(null); // 오버레이 닫힘
};

const handleOverlayClose = () => {
  // 배치된 노드가 있으면 캔버스에 유지 (config 미완료 상태)
  resetChoice();
};
```

### 5.10 렌더링 분기

```typescript
if (!isMiddlePlaceholder) return null;

const dataType = currentDataTypeKey
  ? MAPPING_RULES.data_types[currentDataTypeKey]
  : null;

return (
  <Box /* 오버레이 컨테이너 — SSP와 동일한 레이아웃 */>
    {/* 헤더: 데이터 타입 라벨 + X 버튼 */}
    <Box display="flex" justifyContent="space-between" alignItems="center">
      <Text fontSize="xl" fontWeight="medium">
        {dataType?.label ?? "처리 방식 선택"}
      </Text>
      <Box cursor="pointer" onClick={handleOverlayClose}>
        <Icon as={MdCancel} boxSize={6} color="gray.600" />
      </Box>
    </Box>

    {/* Step 1: 처리 방식 */}
    {step === "processing-method" && dataType?.processing_method && (
      <ProcessingMethodStep
        processingMethod={dataType.processing_method}
        onSelect={handleProcessingMethodSelect}
      />
    )}

    {/* Step 2: 액션 선택 */}
    {step === "action" && dataType && (
      <ActionStep
        actions={dataType.actions}
        onSelect={handleActionSelect}
        onBack={selectedProcessingOption ? handleBackToProcessingMethod : undefined}
      />
    )}

    {/* Step 3: 후속 설정 */}
    {step === "follow-up" && selectedAction && (
      <FollowUpStep
        followUp={selectedAction.follow_up ?? null}
        branchConfig={selectedAction.branch_config ?? null}
        onComplete={handleFollowUpComplete}
        onBack={handleBackToAction}
      />
    )}
  </Box>
);
```

### 5.11 하위 컴포넌트

#### ProcessingMethodStep

```typescript
interface ProcessingMethodStepProps {
  processingMethod: ProcessingMethod;
  onSelect: (option: ProcessingMethodOption) => void;
}

// UI: 질문 텍스트 + 선택지 목록 (priority 순 정렬)
// 각 선택지는 클릭 시 onSelect 호출
```

#### ActionStep

```typescript
interface ActionStepProps {
  actions: MappingAction[];
  onSelect: (action: MappingAction) => void;
  onBack?: () => void;
}

// UI: 선택지 목록 (priority 순 정렬, applicable_when 필터링)
// "그대로 전달" (PASSTHROUGH)은 항상 맨 아래 (priority: 99)
// 뒤로 버튼 (onBack이 있을 때만)
```

#### FollowUpStep

```typescript
interface FollowUpStepProps {
  followUp: FollowUp | null;
  branchConfig: BranchConfig | null;
  onComplete: (selections: Record<string, string | string[]>) => void;
  onBack: () => void;
}

// UI:
// - follow_up: 질문 + 옵션 목록 (단일 선택 또는 텍스트 입력)
// - branch_config: 질문 + 옵션 목록 (multi_select 가능)
// - options_source가 "fields_from_data" 또는 "fields_from_service"이면
//   해당 데이터에서 동적으로 옵션 생성 (Phase 2에서 구현, 현재는 description 표시)
// - type: "text_input"인 옵션은 자유 입력 필드로 렌더링
// - 완료 버튼 + 뒤로 버튼
```

### 5.12 placeNode — 중간 노드 배치

ChoicePanel에서 노드를 배치할 때는 SSP의 `placeNode`와 동일한 로직을 사용하되, 중간 노드 전용 설정을 추가한다:

```typescript
const placeNode = (meta: NodeMeta, outputDataType?: DataType): string | null => {
  // 1. addNode로 노드 생성 (위치는 activePlaceholder.position 사용)
  // 2. 이전 노드 → 새 노드 Edge 자동 연결 (onConnect)
  // 3. outputDataType이 전달되면 node.data.outputTypes 설정
  // 4. 반환: 생성된 nodeId
};
```

> **SSP와 placeNode 공유:** SSP의 `placeNode` 로직을 공통 유틸리티로 추출하여 ChoicePanel과 공유하거나, 각각 독립적으로 구현한다. 현 단계에서는 ChoicePanel 내부에 구현하고, 추후 리팩토링 시 공통화.

### 5.13 Store 구독

```typescript
// 읽기
const activePlaceholder = useWorkflowStore((s) => s.activePlaceholder);
const nodes = useWorkflowStore((s) => s.nodes);
const edges = useWorkflowStore((s) => s.edges);

// 쓰기
const setActivePlaceholder = useWorkflowStore((s) => s.setActivePlaceholder);
const openPanel = useWorkflowStore((s) => s.openPanel);
const removeNode = useWorkflowStore((s) => s.removeNode);
const updateNodeConfig = useWorkflowStore((s) => s.updateNodeConfig);
const onConnect = useWorkflowStore((s) => s.onConnect);
```

### 5.14 ESC 키 처리

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && isMiddlePlaceholder) {
      handleOverlayClose();
    }
  };
  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [isMiddlePlaceholder]);
```

### 5.15 applicable_when 필터링

`applicable_when` 조건은 현재 단계에서는 **무시**한다 (모든 선택지 표시). 이유:
- `file_subtype` 같은 런타임 컨텍스트 정보가 프론트엔드에 없음
- Phase 2에서 백엔드 API가 컨텍스트를 받아 필터링된 결과를 반환

```typescript
// 현재: 모든 actions 표시
const filteredActions = actions.sort((a, b) => a.priority - b.priority);

// Phase 2: applicable_when 필터링
// const filteredActions = actions
//   .filter((a) => !a.applicable_when || matchesContext(a.applicable_when, context))
//   .sort((a, b) => a.priority - b.priority);
```

### 5.16 options_source 처리

`options_source`가 `"fields_from_data"` 또는 `"fields_from_service"`인 경우, 런타임 데이터에서 옵션을 생성해야 한다. 현재 단계에서는:

- `fields_from_service`: `MAPPING_RULES.service_fields`에서 해당 서비스의 필드 목록을 가져온다 (서비스 정보는 이전 노드의 config에서 확인)
- `fields_from_data`: description만 표시하고, 실제 필드 선택은 Phase 2에서 구현

### 5.17 ChoicePanel과 SSP의 표시 조건

Canvas에서 placeholder 클릭 시, SSP와 ChoicePanel 중 하나만 표시해야 한다:

```typescript
// WorkflowEditorPage.tsx 또는 Canvas 레벨에서 분기
const isStartOrEndPlaceholder =
  activePlaceholder?.id === "placeholder-start" ||
  activePlaceholder?.id === "placeholder-end";

const isMiddlePlaceholder =
  activePlaceholder !== null && !isStartOrEndPlaceholder;

// ServiceSelectionPanel: isStartOrEndPlaceholder일 때만 렌더링
// ChoicePanel: isMiddlePlaceholder일 때만 렌더링
```

---

## 6. OutputPanel 설계

### 6.1 책임 범위

OutputPanel은 **이미 캔버스에 배치된 노드**의 설정 패널로만 사용된다. 시작/도착 노드의 위자드 UI는 포함하지 않으며, 중간 노드의 초기 설정도 포함하지 않는다 (ChoicePanel이 담당).

| 시나리오 | OutputPanel 내용 |
|----------|-----------------|
| 모든 노드 (isConfigured === true) | PanelRenderer (노드별 설정 UI) |
| 모든 노드 (isConfigured === false) | PanelRenderer (기본 상태) |
| 시작/도착 노드 위자드 중 | **표시하지 않음** — SSP가 처리 |
| 중간 노드 ChoicePanel 중 | **표시하지 않음** — ChoicePanel이 처리 |

> **RequirementSelector 제거:** v3에서 중간 노드의 초기 설정은 ChoicePanel의 액션/후속 설정 단계에서 처리한다. OutputPanel에서 RequirementSelector를 제거한다.

### 6.2 콘텐츠 분기 로직

```typescript
const activeNode = useWorkflowStore(
  (s) => s.nodes.find((n) => n.id === s.activePanelNodeId) ?? null,
);

// 콘텐츠 영역 — PanelRenderer만 표시
<PanelRenderer />
```

> **isConfigured 판별:** `node.data.config.isConfigured` (BaseNodeConfig의 필드)를 직접 참조한다. PanelRenderer 내부에서 isConfigured 상태에 따라 UI를 조정한다.

### 6.3 헤더

```typescript
const getHeaderTitle = (): string => {
  return "설정";
};
```

### 6.4 닫기

```typescript
const handleClose = () => {
  closePanel();
};
```

### 6.5 제거 대상 (v1/v2-임시에서 삭제)

| 컴포넌트 / 코드 | 이유 |
|-----------------|------|
| `WizardRequirementContent` | ServiceSelectionPanel로 이동 (v1) |
| `WizardAuthContent` | ServiceSelectionPanel로 이동 (v1) |
| `RequirementSelector` | ChoicePanel로 이동 (중간 노드 설정) |
| `SERVICE_REQUIREMENTS` import | OutputPanel에서 더 이상 사용하지 않음 |
| `finishWizard()` 헬퍼 | store wizard 필드 제거로 불필요 |
| `handleAuth()` | ServiceSelectionPanel로 이동 |
| `handleRequirementSelect()` | ChoicePanel로 이동 |
| `wizardStep` 구독 | store에서 제거 |
| `wizardConfigPreset` 구독 | store에서 제거 |
| `wizardSourcePlaceholder` 구독 | store에서 제거 |

---

## 7. InputPanel 설계

### 7.1 표시 조건

```typescript
const isOpen = Boolean(activePanelNodeId) && activePlaceholder === null;
```

ServiceSelectionPanel이 열려 있으면(`activePlaceholder !== null`) InputPanel은 숨긴다.

> **v1 대비 변경:** `wizardStep === null` 조건 제거. `wizardStep`이 store에서 제거되었으므로 `activePlaceholder` 기준으로 판별한다.

### 7.2 시작 노드 클릭 시

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

### 7.3 닫기 동작

InputPanel은 OutputPanel과 수명을 공유한다. OutputPanel이 닫히면 `activePanelNodeId`가 `null`이 되어 InputPanel도 자동으로 닫힌다. 별도 닫기 로직 불필요. InputPanel 자체 X 버튼은 `closePanel()`을 호출한다.

---

## 8. 패널 닫기 규칙

### 8.1 공통 규칙

| 패널 | X 버튼 | 캔버스 빈 영역 클릭 | ESC 키 |
|------|--------|---------------------|--------|
| ServiceSelectionPanel | `handleOverlayClose()` | `setActivePlaceholder(null)` | `handleOverlayClose()` |
| ChoicePanel | `handleOverlayClose()` | `setActivePlaceholder(null)` | `handleOverlayClose()` |
| OutputPanel | `closePanel()` | `closePanel()` | `closePanel()` |
| InputPanel | `closePanel()` | `closePanel()` (OutputPanel과 함께) | `closePanel()` |

### 8.2 Canvas.tsx onPaneClick

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

### 8.3 ESC 키 전역 리스너

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

## 9. 노드 인터랙션 규칙

### 9.1 삭제 버튼 — Hover 표시

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

### 9.2 노드 선택 시 화면 중앙 고정

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

### 9.3 Handle(연결점) 숨김

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

## 10. Edge 렌더링

### 10.1 연결선 표시

노드 간 연결을 시각적으로 표시하는 Edge를 렌더링한다. `workflowStore`의 `edges` 배열을 Canvas에 전달한다.

### 10.2 Edge 스타일

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

### 10.3 자동 연결

노드 배치 시 `placeNode()` 내부에서 `onConnect()`를 호출하여 Edge를 자동 생성한다. 사용자가 수동으로 Handle을 드래그하여 연결하는 기능은 제공하지 않는다.

---

## 11. 상태 전이 다이어그램

### 11.1 시작/도착 노드 위자드 (ServiceSelectionPanel 로컬 상태)

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

### 11.2 중간 노드 설정 (ChoicePanel)

```
┌──────────────────────────────────────────────────────────────────┐
│ 중간 placeholder 클릭                                             │
│ → setActivePlaceholder({ id, position })                         │
│ → 이전 노드의 outputTypes[0] → MappingKey 변환                    │
└──────────────────────────────────────────────────────────────────┘
        │
        ├── requires_processing_method === true
        ▼
┌──────────────────────────────────────────────────────────────────┐
│ 처리 방식 선택 (ChoicePanel — step: "processing-method")          │
│ activePlaceholder: { id, position }                              │
│ ChoicePanel 로컬: step="processing-method"                       │
└──────────────────────────────────────────────────────────────────┘
        │
        │ 처리 방식 선택 (예: "한 파일씩" → LOOP 노드 생성)
        │ → 새 output_data_type으로 actions 조회
        ▼
┌──────────────────────────────────────────────────────────────────┐
│ 액션 선택 (ChoicePanel — step: "action")                          │
│ ChoicePanel 로컬: step="action", currentDataTypeKey 갱신          │
│ 캔버스: LOOP 노드 배치됨 (처리 방식에서 생성된 경우)                │
└──────────────────────────────────────────────────────────────────┘
        │
        │ 액션 선택 (예: "내용 요약" → AI/llm 노드 생성)
        ├── follow_up 있음
        ▼
┌──────────────────────────────────────────────────────────────────┐
│ 후속 설정 (ChoicePanel — step: "follow-up")                       │
│ ChoicePanel 로컬: selectedAction, placedNodeId                   │
└──────────────────────────────────────────────────────────────────┘
        │
        │ 후속 설정 완료 → updateNodeConfig
        │ → resetChoice() → openPanel(nodeId)
        ▼
┌──────────────────────────────────────────────────────────────────┐
│ 완료                                                              │
│ activePlaceholder: null (ChoicePanel 닫힘)                        │
│ activePanelNodeId: nodeId (듀얼 패널 오픈)                         │
│ 노드: isConfigured: true                                         │
└──────────────────────────────────────────────────────────────────┘
```

### 11.3 Store 상태 스냅샷

**시작/도착 노드 (SSP 로컬 상태 중심):**

| 단계 | `activePlaceholder` | `activePanelNodeId` | SSP 열림 | 듀얼 패널 |
|------|-------|-------|--------|--------|
| 초기 | `null` | `null` | X | X |
| 카테고리 선택 | `{ id, pos }` | `null` | O | X |
| 서비스 선택 | `{ id, pos }` | `null` | O | X |
| 요구사항 선택 | `{ id, pos }` | `null` | O | X |
| 인증 | `{ id, pos }` | `null` | O | X |
| 완료 | `null` | `null` | X | X |

**중간 노드 (ChoicePanel 로컬 상태 중심):**

| 단계 | `activePlaceholder` | `activePanelNodeId` | ChoicePanel 열림 | 듀얼 패널 |
|------|-------|-------|--------|--------|
| placeholder 클릭 | `{ id, pos }` | `null` | O | X |
| 처리 방식 선택 | `{ id, pos }` | `null` | O | X |
| 액션 선택 | `{ id, pos }` | `null` | O | X |
| 후속 설정 | `{ id, pos }` | `null` | O | X |
| 완료 → 듀얼 패널 | `null` | `nodeId` | X | O |

---

## 12. 비정상 종료 및 상태 정리

### 12.1 ServiceSelectionPanel 위자드 중

위자드 상태가 **SSP 로컬**이므로, `resetWizard()`가 호출되면 모든 상태가 정리된다. store 정리 로직은 불필요.

| 트리거 | 처리 | 배치된 노드 |
|--------|------|-------------|
| X 버튼 | `resetWizard()` | 유지 (isConfigured: false) |
| 캔버스 빈 영역 클릭 | `setActivePlaceholder(null)` → SSP unmount → 로컬 상태 소멸 | 유지 |
| ESC 키 | `resetWizard()` | 유지 |

> **배치된 노드의 미완료 상태:** 요구사항/인증 단계에서 닫기하면 노드는 캔버스에 남지만 `isConfigured: false`이다. 사용자가 이 노드를 클릭하면 듀얼 패널에서 요구사항을 설정할 수 있다.

### 12.2 ChoicePanel 중

ChoicePanel 상태가 **로컬**이므로, `resetChoice()`가 호출되면 모든 상태가 정리된다.

| 트리거 | 처리 | 배치된 노드 |
|--------|------|-------------|
| X 버튼 | `handleOverlayClose()` | 유지 (isConfigured: false) |
| 캔버스 빈 영역 클릭 | `setActivePlaceholder(null)` → ChoicePanel unmount → 로컬 상태 소멸 | 유지 |
| ESC 키 | `handleOverlayClose()` | 유지 |

> **배치된 노드의 미완료 상태:** 액션/후속 설정 단계에서 닫기하면 노드는 캔버스에 남지만 `isConfigured: false`이다. 사용자가 이 노드를 클릭하면 듀얼 패널에서 설정을 계속할 수 있다.

### 12.3 듀얼 패널 중

| 트리거 | 처리 |
|--------|------|
| X 버튼 | `closePanel()` → 양쪽 패널 닫힘 |
| 캔버스 빈 영역 클릭 | `closePanel()` |
| ESC 키 | `closePanel()` |
| 다른 노드 클릭 | `openPanel(새 nodeId)` → 패널 전환 |

### 12.4 노드 삭제 시

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

### 12.5 에디터 이탈

`resetEditor`로 전체 store 상태가 초기화된다. SSP 로컬 상태는 컴포넌트 unmount 시 자동 소멸.

---

## 13. 파일별 변경 요약

### 13.1 `src/features/add-node/ui/ServiceSelectionPanel.tsx`

| 변경 | 내용 |
|------|------|
| 추가 | `RequirementList` 컴포넌트 (요구사항 목록 UI) |
| 추가 | `AuthPrompt` 컴포넌트 (인증 UI) |
| 변경 | `WizardStep` 타입 → `"category" \| "service" \| "requirement" \| "auth"` |
| 추가 | `placedNodeId`, `selectedService`, `selectedRequirementPreset` 로컬 상태 |
| **제거** | `isMiddleNodeMode` 판별 로직 — 시작/도착 전용으로 변경 |
| 변경 | `handleCategorySelect` → 시작/도착 노드 전용 (중간 노드 분기 제거) |
| 추가 | `handleRequirementSelect`, `handleAuth` 핸들러 |
| 추가 | `handleBackToCategory`, `handleBackFromRequirement`, `handleBackToRequirement` 핸들러 |
| 추가 | X 버튼, ESC 키 리스너 |
| 변경 | 표시 조건 → `placeholder-start` 또는 `placeholder-end`일 때만 렌더링 |
| 추가 | `removeNode`, `updateNodeConfig`, `openPanel` store 구독 |

### 13.2 `src/features/choice-panel/` (신규)

| 파일 | 내용 |
|------|------|
| `model/types.ts` | MappingRules, MappingAction, FollowUp, BranchConfig 등 타입 정의 |
| `model/mappingRules.ts` | `mapping_rules.json` 기반 정적 매핑 규칙 데이터 (MAPPING_RULES 상수) |
| `model/dataTypeKeyMap.ts` | `DataType` ↔ `MappingDataTypeKey` 변환 유틸 (toMappingKey, toDataType) |
| `ui/ChoicePanel.tsx` | 메인 컴포넌트 — 3단계 선택 흐름 관리 |
| `ui/ProcessingMethodStep.tsx` | Step 1: 처리 방식 선택 UI |
| `ui/ActionStep.tsx` | Step 2: 액션 선택 UI (priority 정렬) |
| `ui/FollowUpStep.tsx` | Step 3: 후속 설정 UI (follow_up + branch_config) |
| `index.ts` | feature 공개 API |

### 13.3 `src/widgets/output-panel/ui/OutputPanel.tsx`

| 변경 | 내용 |
|------|------|
| 제거 | `WizardRequirementContent`, `WizardAuthContent` 컴포넌트 |
| **제거** | `RequirementSelector` — ChoicePanel로 이동 |
| **제거** | `SERVICE_REQUIREMENTS` import |
| 제거 | `finishWizard()`, `handleAuth()`, `handleBackToService()`, `handleBackToRequirement()` |
| 제거 | `wizardStep`, `wizardConfigPreset`, `wizardSourcePlaceholder` 구독 |
| 변경 | 콘텐츠 → `PanelRenderer`만 표시 |
| 변경 | 헤더 → "설정" 고정 |
| 변경 | 닫기 → 단순 `closePanel()` |

### 13.4 `src/widgets/input-panel/ui/InputPanel.tsx`

| 변경 | 내용 |
|------|------|
| 변경 | `isOpen` 조건 → `activePanelNodeId && activePlaceholder === null` |
| 제거 | `wizardStep` 구독 |
| 추가 | 시작 노드 클릭 시 "시작점" 안내 (소스 노드 없는 경우) |

### 13.5 `src/widgets/canvas/ui/Canvas.tsx`

| 변경 | 내용 |
|------|------|
| 추가 | `onPaneClick` → `closePanel()` + `setActivePlaceholder(null)` |
| 추가 | ESC 키 전역 리스너 |
| 추가 | 일반 노드 클릭 시 `setCenter` (화면 중앙 이동) |
| 추가 | 선택 노드 드래그 비활성화 (`activePanelNodeId`와 일치하면 `draggable: false`) |
| 추가 | `defaultEdgeOptions` (Edge 스타일 설정) |

### 13.6 `src/entities/node/ui/BaseNode.tsx`

| 변경 | 내용 |
|------|------|
| 변경 | 삭제 버튼 → `selected` 대신 hover 상태로 표시 |
| 변경 | Handle → `opacity: 0, pointerEvents: "none"` (시각적 숨김, DOM 유지) |

### 13.7 `src/shared/model/workflowStore.ts`

| 변경 | 내용 |
|------|------|
| 제거 | `wizardStep`, `wizardConfigPreset`, `wizardSourcePlaceholder` 상태 |
| 제거 | `setWizardStep`, `setWizardConfigPreset`, `setWizardSourcePlaceholder` 액션 |
| 변경 | `removeNode` → wizard 정리 로직 제거, 패널 정리만 유지 |
| 변경 | `openPanel` → wizard 정리 로직 제거 |
| 변경 | `updateNodeConfig` → merge 방식 + `isConfigured: true` 자동 설정 |

### 13.8 `src/pages/workflow-editor/WorkflowEditorPage.tsx`

| 변경 | 내용 |
|------|------|
| 추가 | `ChoicePanel` 컴포넌트 렌더링 (SSP와 함께 배치) |

### 13.9 변경하지 않는 파일

| 파일 | 이유 |
|------|------|
| `serviceMap.ts` | 데이터 변경 없음 — 시작/도착 노드 전용 |
| `serviceRequirements.ts` | 데이터 변경 없음 — 시작/도착 노드 전용 |
| `PanelRenderer.tsx` | 기존 동작 유지 |
