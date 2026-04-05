# 노드 설정 위자드 상세 설계

> **작성일:** 2026-04-05
> **선행 문서:** [FRONTEND_DESIGN_DOCUMENT.md](./FRONTEND_DESIGN_DOCUMENT.md), [FOUNDATION_IMPLEMENTATION_PLAN.md](./FOUNDATION_IMPLEMENTATION_PLAN.md)
> **목적:** 시작/도착 노드 추가 시 진행되는 위자드 흐름을 기존 패널 인프라(OutputPanel)를 재활용하여 설계한다.

---

## 목차

1. [설계 원칙](#1-설계-원칙)
2. [현행 구조 분석](#2-현행-구조-분석)
3. [위자드 흐름 정의](#3-위자드-흐름-정의)
4. [Store 변경 설계](#4-store-변경-설계)
5. [ServiceSelectionPanel 변경 설계](#5-serviceselectionpanel-변경-설계)
6. [OutputPanel 변경 설계](#6-outputpanel-변경-설계)
7. [상태 전이 다이어그램](#7-상태-전이-다이어그램)
8. [뒤로가기 처리](#8-뒤로가기-처리)
9. [파일별 변경 요약](#9-파일별-변경-요약)

---

## 1. 설계 원칙

### 1.1 기존 구현 재활용 우선

새로운 레이아웃이나 패널 컴포넌트를 만들지 않는다. 이미 동일한 레이아웃을 가진 `OutputPanel`이 존재하므로, **패널 내부 콘텐츠와 헤더 제목만 교체**하여 위자드 단계를 표현한다.

### 1.2 관심사 분리

| 컴포넌트 | 책임 |
|----------|------|
| `ServiceSelectionPanel` | 카테고리 선택, 서비스 선택 (캔버스 중앙 오버레이) |
| `OutputPanel` | 요구사항 선택, 인증 요청 (오른쪽 슬라이드 패널) |
| `workflowStore` | 위자드 상태(`wizardStep`) 관리 |

서비스 선택까지는 노드가 아직 캔버스에 없으므로 전체 화면 오버레이가 적합하다. 서비스 선택 후 노드가 캔버스에 배치되면, 이미 존재하는 오른쪽 패널(`OutputPanel`)에서 추가 설정을 진행하는 것이 자연스럽다.

---

## 2. 현행 구조 분석

### 2.1 ServiceSelectionPanel (현재)

```
위자드 전체를 하나의 오버레이에서 처리:
  step: "category" → "service" → "requirement" → "auth"
```

**문제점:**
- `requirement`와 `auth` 단계에서 왼쪽에 서비스 아이콘을 자체 렌더링하지만, 이 시점에 이미 노드가 캔버스에 배치되어 있다.
- 노드가 배치된 후에도 전체 화면 오버레이가 캔버스를 가리고 있어, 사용자가 배치된 노드를 볼 수 없다.
- `OutputPanel`과 동일한 "오른쪽 패널" 레이아웃을 중복 구현하고 있다.

### 2.2 OutputPanel (현재)

```typescript
// 690px 오른쪽 슬라이드 패널
// 헤더: "설정" (고정) + 닫기 버튼
// 콘텐츠: PanelRenderer (항상)
```

**재활용 포인트:**
- 레이아웃 (위치, 크기, 애니메이션, 스타일) → 그대로 사용
- 헤더 → 제목만 동적으로 변경
- 콘텐츠 영역 → `wizardStep`에 따라 `PanelRenderer` 또는 위자드 UI 렌더링

---

## 3. 위자드 흐름 정의

### 3.1 시작/도착 노드 설정 흐름

```
[Placeholder 클릭]
    │
    ▼
┌─────────────────────────────────────────────────┐
│  Step 1: 카테고리 선택 (ServiceSelectionPanel)  │
│  - 캔버스 중앙 오버레이                          │
│  - 분기:                                        │
│    A) 서비스 있는 카테고리 → Step 2로             │
│    B) 서비스 없음 + 요구사항 있음 (web-scraping)  │
│       → 바로 배치 → Step 3 (OutputPanel)         │
│    C) 서비스 없음 + 요구사항 없음 (processing 등) │
│       → 바로 배치 후 종료                        │
└─────────────────────────────────────────────────┘
    │
    ├── A) 서비스 있는 카테고리
    ▼
┌─────────────────────────────────────────────────┐
│  Step 2: 서비스 선택 (ServiceSelectionPanel)     │
│  - 캔버스 중앙 오버레이                          │
│  - 서비스 선택 시:                               │
│    1. placeNode() — 노드를 캔버스에 배치          │
│    2. openPanel(nodeId) — OutputPanel 열기        │
│    3. setWizardStep("requirement") — 위자드 전환  │
│    4. setActivePlaceholder(null) — 오버레이 닫기  │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│  Step 3: 요구사항 선택 (OutputPanel 내부)         │
│  - 오른쪽 슬라이드 패널                          │
│  - 헤더 제목: SERVICE_REQUIREMENTS[type].title   │
│  - 캔버스에 배치된 노드가 보임                    │
│  - 인증 필요 → Step 4 / 불필요 → 완료            │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│  Step 4: 인증 (OutputPanel 내부)                 │
│  - 오른쪽 슬라이드 패널                          │
│  - 헤더 제목: "인증"                             │
│  - OAuth 연동 후 → 완료                          │
└─────────────────────────────────────────────────┘
```

### 3.2 위자드 중 InputPanel 숨김

`InputPanel`과 `OutputPanel`은 둘 다 `activePanelNodeId`를 보고 열린다. 위자드에서 `openPanel(nodeId)`를 호출하면 `InputPanel`도 함께 열리는 문제가 발생한다.

시작/도착 노드 위자드에서 "들어오는 데이터"는 의미가 없으므로, `InputPanel`은 **위자드 비활성 상태에서만 표시**한다.

```typescript
// InputPanel 내부
const wizardStep = useWorkflowStore((s) => s.wizardStep);
const isOpen = Boolean(activePanelNodeId) && wizardStep === null;
```

이 조건으로 위자드 진행 중에는 OutputPanel만 열리고, 위자드 완료(`wizardStep === null`) 후 중간 노드 클릭 시에는 양쪽 패널이 정상적으로 동시에 열린다.

### 3.3 중간 노드 설정 흐름 (참고)

중간 노드 클릭 시에는 위자드가 아닌 기존 흐름을 따른다:
- 왼쪽: `InputPanel` ("들어오는 데이터") — `wizardStep === null`이므로 표시됨
- 오른쪽: `OutputPanel` ("설정" — `PanelRenderer`) — `wizardStep === null`이므로 기존 동작
- `wizardStep`은 `null`이므로 기존 동작에 영향 없음

---

## 4. Store 변경 설계

### 4.1 새로운 상태 필드

```typescript
// WorkflowEditorState에 추가
interface WorkflowEditorState {
  // ... 기존 필드 ...

  /**
   * 위자드 단계 (시작/도착 노드 설정 시에만 사용)
   * - "requirement": 요구사항 선택 단계
   * - "auth": 인증 단계
   * - null: 위자드 비활성 (일반 패널 모드)
   */
  wizardStep: "requirement" | "auth" | null;

  /**
   * 위자드 진행 중 선택된 요구사항의 configPreset 임시 저장.
   * 인증 완료 후 노드 config에 반영된다.
   */
  wizardConfigPreset: Record<string, unknown> | null;

  /**
   * 위자드 시작 시의 placeholder 정보 보존.
   * 요구사항 → 서비스 선택 뒤로가기 시 ServiceSelectionPanel 복원에 사용된다.
   */
  wizardSourcePlaceholder: {
    id: string;
    position: { x: number; y: number };
  } | null;
}
```

### 4.2 새로운 액션

```typescript
// WorkflowEditorActions에 추가
interface WorkflowEditorActions {
  // ... 기존 액션 ...

  /** 위자드 단계 설정 */
  setWizardStep: (step: "requirement" | "auth" | null) => void;

  /** 위자드 configPreset 임시 저장 */
  setWizardConfigPreset: (preset: Record<string, unknown> | null) => void;

  /** 위자드 시작 시 placeholder 정보 보존 */
  setWizardSourcePlaceholder: (
    placeholder: { id: string; position: { x: number; y: number } } | null,
  ) => void;
}
```

### 4.3 초기 상태 변경

```typescript
const initialState: WorkflowEditorState = {
  // ... 기존 ...
  wizardStep: null,
  wizardConfigPreset: null,
  wizardSourcePlaceholder: null,
};
```

### 4.4 액션 구현

```typescript
setWizardStep: (step) =>
  set((state) => {
    state.wizardStep = step;
  }),

setWizardConfigPreset: (preset) =>
  set((state) => {
    state.wizardConfigPreset = preset;
  }),

setWizardSourcePlaceholder: (placeholder) =>
  set((state) => {
    state.wizardSourcePlaceholder = placeholder;
  }),
```

### 4.5 resetEditor 변경

`resetEditor`는 이미 `initialState`를 스프레드하므로, 초기 상태에 `wizardStep: null`, `wizardConfigPreset: null`, `wizardSourcePlaceholder: null`이 포함되면 자동으로 초기화된다. 추가 변경 불필요.

---

## 5. ServiceSelectionPanel 변경 설계

### 5.1 제거 대상

| 컴포넌트 / 코드 | 이유 |
|-----------------|------|
| `RequirementPanel` 컴포넌트 | OutputPanel에서 렌더링 |
| `AuthPanel` 컴포넌트 | OutputPanel에서 렌더링 |
| `WizardStep` 타입의 `"requirement"` \| `"auth"` | 더 이상 이 컴포넌트에서 처리하지 않음 |
| `selectedService` 상태 | 위자드 단계가 이 컴포넌트를 벗어남 |
| `placedNodeId` 상태 | `activePanelNodeId`로 대체 |
| `selectedRequirementPreset` 상태 | `wizardConfigPreset`(store)로 대체 |
| `finalizeConfig` 콜백 | OutputPanel 측으로 이동 |
| 제목의 `"requirement"` / `"auth"` case | 이 컴포넌트에서 불필요 |

### 5.2 유지 대상

| 컴포넌트 / 코드 | 역할 |
|-----------------|------|
| `CategoryGrid` | Step 1 카테고리 선택 UI |
| `ServiceGrid` | Step 2 서비스 선택 UI |
| `placeNode(meta, service?)` | 노드 배치 + 관계 설정 (service optional — 서비스 없는 노드도 재사용) |
| `handleCategorySelect()` | 카테고리 선택 핸들러 |
| `resetWizard()` | 로컬 상태 초기화 |

### 5.3 WizardStep 타입 변경

```typescript
// 변경 전
type WizardStep = "category" | "service" | "requirement" | "auth";

// 변경 후
type WizardStep = "category" | "service";
```

### 5.4 handleCategorySelect 변경 — 서비스 없는 노드의 요구사항 분기

현재 구현은 서비스가 없는 노드를 무조건 "바로 배치 후 종료"로 처리하지만, `web-scraping`처럼 서비스는 없으면서 요구사항은 있는 노드가 존재한다. "서비스 없음"과 "요구사항 없음"을 분리해야 한다.

```typescript
// 변경 후: placeNode 재사용 + 서비스 없는 노드도 요구사항 유무를 확인
const handleCategorySelect = (meta: NodeMeta) => {
  const serviceGroup = CATEGORY_SERVICE_MAP[meta.type];

  if (serviceGroup && serviceGroup.services.length > 0) {
    // A) 서비스 있는 카테고리 → Step 2 (서비스 선택)
    setSelectedMeta(meta);
    setStep("service");
    return;
  }

  // 서비스 없는 노드 → placeNode로 바로 배치 (service 생략)
  const nodeId = placeNode(meta);
  if (!nodeId) return;

  // 요구사항 확인: 서비스 없어도 요구사항이 있을 수 있음 (예: web-scraping)
  const reqGroup = SERVICE_REQUIREMENTS[meta.type];
  if (reqGroup) {
    // B) 서비스 없음 + 요구사항 있음 → OutputPanel로 전환
    setWizardSourcePlaceholder(activePlaceholder);
    openPanel(nodeId);
    setWizardStep("requirement");
  }

  // C) 서비스 없음 + 요구사항 없음 → 종료 (B 경로도 오버레이는 닫아야 함)
  resetWizard();
};
```

### 5.5 handleServiceSelect 변경

```typescript
// 변경 전: 서비스 선택 후 자체적으로 requirement 단계로 전환
const handleServiceSelect = (service: ServiceOption) => {
  const nodeId = placeNode(selectedMeta, service);
  setSelectedService(service);
  setPlacedNodeId(nodeId);
  const reqGroup = SERVICE_REQUIREMENTS[selectedMeta.type];
  if (reqGroup) {
    setStep("requirement");  // ← 오버레이 내부에서 처리
  } else {
    resetWizard();
  }
};

// 변경 후: 서비스 선택 → 노드 배치 → OutputPanel로 전환
const handleServiceSelect = (service: ServiceOption) => {
  if (!selectedMeta) return;

  const nodeId = placeNode(selectedMeta, service);
  if (!nodeId) return;

  const reqGroup = SERVICE_REQUIREMENTS[selectedMeta.type];
  if (reqGroup) {
    // 뒤로가기 복원용 placeholder 저장
    setWizardSourcePlaceholder(activePlaceholder);
    // OutputPanel에서 요구사항 선택을 진행
    openPanel(nodeId);
    setWizardStep("requirement");
  }

  // ServiceSelectionPanel 오버레이 닫기
  resetWizard();
};
```

**핵심 변경:** `setStep("requirement")` 대신 `openPanel(nodeId)` + `setWizardStep("requirement")`을 호출하고, 자신은 닫힌다(`resetWizard()`).

### 5.5 새로 필요한 store 구독

```typescript
const openPanel = useWorkflowStore((s) => s.openPanel);
const setWizardStep = useWorkflowStore((s) => s.setWizardStep);
```

### 5.6 제거 가능한 로컬 상태

```typescript
// 제거
const [selectedService, setSelectedService] = useState<ServiceOption | null>(null);
const [placedNodeId, setPlacedNodeId] = useState<string | null>(null);
const [selectedRequirementPreset, setSelectedRequirementPreset] = useState<...>(undefined);
```

---

## 6. OutputPanel 변경 설계

### 6.1 설계 방향

OutputPanel의 **레이아웃은 그대로 유지**하고, 내부 콘텐츠만 `wizardStep`에 따라 분기한다.

### 6.2 콘텐츠 분기 로직

```typescript
// OutputPanel 내부 렌더링 로직
const wizardStep = useWorkflowStore((s) => s.wizardStep);

// 헤더 제목 결정
const getHeaderTitle = (): string => {
  switch (wizardStep) {
    case "requirement":
      return requirementGroup?.title ?? "설정";
    case "auth":
      return "인증";
    default:
      return "설정";
  }
};

// 콘텐츠 영역
{wizardStep === "requirement" && <WizardRequirementContent />}
{wizardStep === "auth" && <WizardAuthContent />}
{wizardStep === null && <PanelRenderer />}
```

### 6.3 WizardRequirementContent 컴포넌트

OutputPanel 내부에서만 사용되는 **로컬 컴포넌트**로 정의한다. 별도 파일로 분리하지 않는다.

```typescript
/**
 * OutputPanel 내부 위자드 콘텐츠: 요구사항 선택.
 * 기존 RequirementPanel의 "오른쪽 패널 내용"만 추출한 것.
 */
const WizardRequirementContent = ({
  requirements,
  onSelect,
  onBack,
}: {
  requirements: ServiceRequirement[];
  onSelect: (req: ServiceRequirement) => void;
  onBack: () => void;
}) => (
  <Box p={6}>
    <Box mb={4} cursor="pointer" display="inline-flex" alignItems="center" onClick={onBack}>
      <Text fontSize="sm" color="text.secondary">뒤로</Text>
    </Box>

    <Box display="flex" flexDirection="column" gap={4}>
      {requirements.map((req) => (
        <Box
          key={req.id}
          display="flex"
          gap={3}
          alignItems="center"
          cursor="pointer"
          px={6}
          py={4}
          borderRadius="3xl"
          _hover={{ bg: "gray.50" }}
          transition="background 150ms ease"
          onClick={() => onSelect(req)}
        >
          <Box display="flex" alignItems="center" justifyContent="center" p={3}>
            <Icon as={req.iconComponent} boxSize={6} />
          </Box>
          <Text fontSize="md" fontWeight="bold">
            {req.label}
          </Text>
        </Box>
      ))}
    </Box>
  </Box>
);
```

### 6.4 WizardAuthContent 컴포넌트

```typescript
/**
 * OutputPanel 내부 위자드 콘텐츠: 인증 요청.
 */
const WizardAuthContent = ({
  onAuth,
  onBack,
}: {
  onAuth: () => void;
  onBack: () => void;
}) => (
  <Box p={6}>
    <Box mb={4} cursor="pointer" display="inline-flex" alignItems="center" onClick={onBack}>
      <Text fontSize="sm" color="text.secondary">뒤로</Text>
    </Box>

    <Text fontSize="md" mb={6}>
      인증은 가장 처음 한 번만 진행됩니다.
    </Text>
    <Box
      border="1px solid"
      borderColor="gray.200"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={16}
      py={3}
      cursor="pointer"
      _hover={{ bg: "gray.50" }}
      transition="background 150ms ease"
      onClick={onAuth}
    >
      <Text fontSize="md" fontWeight="semibold">
        구글 계정으로 인증하기
      </Text>
    </Box>
  </Box>
);
```

### 6.5 OutputPanel 내부 핸들러

```typescript
// 위자드 종료 헬퍼 — 3필드 일괄 정리
const finishWizard = () => {
  setWizardConfigPreset(null);
  setWizardStep(null);
  setWizardSourcePlaceholder(null);
};

// 요구사항 선택 시
const handleRequirementSelect = (req: ServiceRequirement) => {
  if (!activePanelNodeId || !activeNode) return;

  const serviceGroup = CATEGORY_SERVICE_MAP[activeNode.data.type];

  if (serviceGroup?.requiresAuth) {
    // configPreset 임시 저장 후 인증 단계로
    setWizardConfigPreset(req.configPreset);
    setWizardStep("auth");
    return;
  }

  // 인증 불필요 → configPreset 바로 적용 후 위자드 종료
  updateNodeConfig(activePanelNodeId, {
    ...activeNode.data.config,
    ...req.configPreset,
  });
  finishWizard();
};

// 인증 완료 시
const handleAuth = () => {
  // TODO: 실제 OAuth 인증 흐름 연동
  if (!activePanelNodeId || !wizardConfigPreset) return;

  const currentNode = nodes.find((node) => node.id === activePanelNodeId);
  if (currentNode) {
    updateNodeConfig(activePanelNodeId, {
      ...currentNode.data.config,
      ...wizardConfigPreset,
    });
  }

  finishWizard();
};

// 요구사항 → 서비스 선택으로 뒤로가기
const handleBackToService = () => {
  const sourcePlaceholder = wizardSourcePlaceholder;

  if (activePanelNodeId) removeNode(activePanelNodeId);

  setWizardStep(null);
  setWizardConfigPreset(null);
  closePanel();
  setActivePlaceholder(sourcePlaceholder);
  setWizardSourcePlaceholder(null);
};

// 인증 → 요구사항으로 뒤로가기
const handleBackToRequirement = () => {
  setWizardStep("requirement");
  setWizardConfigPreset(null);
};
```

### 6.6 닫기 버튼 동작

위자드 진행 중(`wizardStep !== null`)에 닫기 버튼을 누르면:

```typescript
const handleClose = () => {
  if (wizardStep !== null) {
    // 위자드 진행 중 닫기 → 위자드 상태 전체 초기화
    setWizardStep(null);
    setWizardConfigPreset(null);
    setWizardSourcePlaceholder(null);
  }
  closePanel();
};
```

### 6.7 OutputPanel에 필요한 추가 import

```typescript
import type { ServiceRequirement } from "@/features/add-node";
import { CATEGORY_SERVICE_MAP, SERVICE_REQUIREMENTS } from "@/features/add-node";
```

> **주의:** `OutputPanel`은 widgets 계층이고, `add-node`는 features 계층이다. FSD 규칙상 상위 계층(widgets)이 하위 계층(features)을 import하는 것은 허용된다.

### 6.8 현재 노드의 요구사항 그룹 조회

OutputPanel에서 현재 활성 노드의 `NodeType`을 기반으로 요구사항을 조회한다:

```typescript
const activeNode = useWorkflowStore(
  (s) => s.nodes.find((n) => n.id === s.activePanelNodeId) ?? null,
);
const requirementGroup = activeNode
  ? SERVICE_REQUIREMENTS[activeNode.data.type]
  : undefined;
```

---

## 7. 상태 전이 다이어그램

### 7.1 전체 흐름 (상태 기준)

```
┌──────────────────────────────────────────────────────────────────┐
│ 초기 상태                                                        │
│ activePlaceholder: null                                          │
│ activePanelNodeId: null                                          │
│ wizardStep: null                                                 │
└──────────────────────────────────────────────────────────────────┘
        │
        │ Placeholder 클릭
        │ → setActivePlaceholder({ id, position })
        ▼
┌──────────────────────────────────────────────────────────────────┐
│ 카테고리/서비스 선택 중 (ServiceSelectionPanel 렌더링)             │
│ activePlaceholder: { id, position }                              │
│ activePanelNodeId: null                                          │
│ wizardStep: null                                                 │
└──────────────────────────────────────────────────────────────────┘
        │
        │ 서비스 선택
        │ → placeNode() → nodeId 반환
        │ → openPanel(nodeId)
        │ → setWizardStep("requirement")
        │ → setActivePlaceholder(null)  // 오버레이 닫힘
        ▼
┌──────────────────────────────────────────────────────────────────┐
│ 요구사항 선택 중 (OutputPanel — requirement 콘텐츠)               │
│ activePlaceholder: null                                          │
│ activePanelNodeId: nodeId                                        │
│ wizardStep: "requirement"                                        │
└──────────────────────────────────────────────────────────────────┘
        │
        ├── 인증 필요
        │   → setWizardConfigPreset(req.configPreset)
        │   → setWizardStep("auth")
        │   ▼
        │ ┌────────────────────────────────────────────────────────┐
        │ │ 인증 중 (OutputPanel — auth 콘텐츠)                     │
        │ │ activePanelNodeId: nodeId                              │
        │ │ wizardStep: "auth"                                     │
        │ │ wizardConfigPreset: { ... }                            │
        │ └────────────────────────────────────────────────────────┘
        │       │
        │       │ 인증 완료
        │       │ → updateNodeConfig(nodeId, merged config)
        │       │ → finishWizard()  // wizardStep, wizardConfigPreset, wizardSourcePlaceholder → null
        │       ▼
        │   ┌──────────────────────────────────────────────────────┐
        │   │ 일반 패널 모드 (OutputPanel — PanelRenderer)          │
        │   │ activePanelNodeId: nodeId                            │
        │   │ wizardStep: null                                     │
        │   └──────────────────────────────────────────────────────┘
        │
        └── 인증 불필요
            → updateNodeConfig(nodeId, req.configPreset)
            → finishWizard()
            ▼
          ┌────────────────────────────────────────────────────────┐
          │ 일반 패널 모드 (OutputPanel — PanelRenderer)            │
          │ activePanelNodeId: nodeId                              │
          │ wizardStep: null                                       │
          └────────────────────────────────────────────────────────┘
```

### 7.2 Store 상태 스냅샷 (각 단계별)

| 단계 | `activePlaceholder` | `activePanelNodeId` | `wizardStep` | `wizardConfigPreset` | ServiceSelectionPanel | OutputPanel |
|------|-------|-------|--------|--------|------|------|
| 초기 | `null` | `null` | `null` | `null` | 숨김 | 숨김 |
| 카테고리 선택 | `{ id, pos }` | `null` | `null` | `null` | 표시 | 숨김 |
| 서비스 선택 | `{ id, pos }` | `null` | `null` | `null` | 표시 | 숨김 |
| 요구사항 선택 | `null` | `nodeId` | `"requirement"` | `null` | 숨김 | 표시 |
| 인증 | `null` | `nodeId` | `"auth"` | `{ ... }` | 숨김 | 표시 |
| 완료 | `null` | `nodeId` | `null` | `null` | 숨김 | 표시 |

---

## 8. 뒤로가기 처리

### 8.1 요구사항 → 서비스 선택으로 돌아가기

요구사항 단계에서 "뒤로"를 누르면:

1. 캔버스에 배치된 노드를 **제거**해야 한다 (`removeNode(activePanelNodeId)`)
2. OutputPanel을 닫는다 (`closePanel()`)
3. 위자드 상태를 초기화한다 (`setWizardStep(null)`)
4. ServiceSelectionPanel을 다시 열어야 한다 (`setActivePlaceholder(원래 placeholder 정보)`)

**문제:** 서비스 선택 시 `setActivePlaceholder(null)`로 placeholder 정보를 잃어버린다.

**해결 방안:** store에 `wizardSourcePlaceholder`를 추가하여 위자드 시작 시의 placeholder 정보를 보존한다.

```typescript
// Store에 추가
wizardSourcePlaceholder: {
  id: string;
  position: { x: number; y: number };
} | null;

setWizardSourcePlaceholder: (
  placeholder: { id: string; position: { x: number; y: number } } | null
) => void;
```

**서비스 선택 시:**

```typescript
// 현재 activePlaceholder 정보를 wizardSourcePlaceholder에 저장
setWizardSourcePlaceholder(activePlaceholder);
```

**뒤로가기 시:**

```typescript
const handleBackToService = () => {
  // 1. 노드 제거
  if (activePanelNodeId) removeNode(activePanelNodeId);
  // 2. 위자드 상태 초기화
  setWizardStep(null);
  setWizardConfigPreset(null);
  // 3. 패널 닫기
  closePanel();
  // 4. ServiceSelectionPanel 다시 열기
  setActivePlaceholder(wizardSourcePlaceholder);
  setWizardSourcePlaceholder(null);
};
```

### 8.2 인증 → 요구사항으로 돌아가기

노드는 캔버스에 유지되고, 단계만 전환한다.

```typescript
const handleBackToRequirement = () => {
  setWizardStep("requirement");
  setWizardConfigPreset(null);
};
```

### 8.3 비정상 종료 시 위자드 상태 정리

위자드 진행 중 happy path가 아닌 경로로 이탈하는 케이스에서 `wizardStep`, `wizardConfigPreset`, `wizardSourcePlaceholder`가 stale 상태로 남지 않도록 기존 액션에 정리 로직을 추가한다.

#### 케이스 1: 위자드 중 노드 삭제

사용자가 위자드 진행 중인 노드를 삭제하면(예: 키보드 Delete), `removeNode`가 호출된다. 삭제 대상이 현재 위자드 대상 노드인 경우 위자드 상태를 함께 정리해야 한다.

```typescript
// removeNode 액션 내부에 추가
removeNode: (id) =>
  set((state) => {
    // ... 기존 노드/엣지 삭제 로직 ...

    // 기존: activePanelNodeId 정리
    if (state.activePanelNodeId && removeTargets.has(state.activePanelNodeId)) {
      state.activePanelNodeId = null;

      // 추가: 위자드 진행 중이었다면 위자드 상태도 정리
      if (state.wizardStep !== null) {
        state.wizardStep = null;
        state.wizardConfigPreset = null;
        state.wizardSourcePlaceholder = null;
      }
    }

    // ... 기존 startNodeId/endNodeId 정리 ...
  }),
```

#### 케이스 2: 위자드 중 패널 강제 닫기 (닫기 버튼)

6.6절에서 정의한 `handleClose`가 이 케이스를 처리한다. OutputPanel의 닫기 버튼은 `closePanel()` 호출 전에 위자드 상태를 먼저 초기화한다.

#### 케이스 3: 위자드 중 다른 노드 클릭 (`openPanel` 재호출)

사용자가 위자드 진행 중 캔버스의 다른 노드를 클릭하면 `openPanel(다른NodeId)`가 호출된다. `activePanelNodeId`가 바뀌면서 위자드 컨텍스트가 유실된다.

```typescript
// openPanel 액션 수정
openPanel: (nodeId) =>
  set((state) => {
    // 다른 노드로 전환 시 진행 중인 위자드 정리
    if (state.wizardStep !== null && state.activePanelNodeId !== nodeId) {
      state.wizardStep = null;
      state.wizardConfigPreset = null;
      state.wizardSourcePlaceholder = null;
    }
    state.activePanelNodeId = nodeId;
  }),
```

#### 케이스 4: 에디터 이탈 (`resetEditor`)

`resetEditor`는 `initialState`를 스프레드하므로, 초기 상태에 `wizardStep: null`, `wizardConfigPreset: null`, `wizardSourcePlaceholder: null`이 포함되면 자동으로 정리된다. 추가 변경 불필요.

#### 정리 규칙 요약

| 트리거 | 조건 | 정리 대상 |
|--------|------|-----------|
| `removeNode(id)` | 삭제 대상이 `activePanelNodeId`이고 `wizardStep !== null` | `wizardStep`, `wizardConfigPreset`, `wizardSourcePlaceholder` → `null` |
| `closePanel()` (OutputPanel 닫기 버튼) | `wizardStep !== null` | `wizardStep`, `wizardConfigPreset`, `wizardSourcePlaceholder` → `null` (handleClose에서 처리) |
| `openPanel(nodeId)` | `wizardStep !== null`이고 `nodeId !== activePanelNodeId` | `wizardStep`, `wizardConfigPreset`, `wizardSourcePlaceholder` → `null` |
| `resetEditor()` | 항상 | `initialState` 스프레드로 자동 정리 |

---

## 9. 파일별 변경 요약

### 9.1 `src/shared/model/workflowStore.ts`

| 변경 | 내용 |
|------|------|
| State 추가 | `wizardStep`, `wizardConfigPreset`, `wizardSourcePlaceholder` |
| Actions 추가 | `setWizardStep`, `setWizardConfigPreset`, `setWizardSourcePlaceholder` |
| initialState 추가 | 3개 필드 `null` 초기값 |
| `removeNode` 수정 | 삭제 대상이 위자드 대상 노드일 때 위자드 상태 정리 |
| `openPanel` 수정 | 다른 노드로 전환 시 진행 중인 위자드 상태 정리 |

### 9.2 `src/features/add-node/ui/ServiceSelectionPanel.tsx`

| 변경 | 내용 |
|------|------|
| 제거 | `RequirementPanel`, `AuthPanel` 컴포넌트 |
| 제거 | `selectedService`, `placedNodeId`, `selectedRequirementPreset` 로컬 상태 |
| 제거 | `finalizeConfig` 콜백 |
| 변경 | `WizardStep` 타입 → `"category" \| "service"` |
| 변경 | `handleServiceSelect` → `openPanel` + `setWizardStep` 호출 후 `resetWizard` |
| 변경 | `handleCategorySelect` → 서비스 없는 노드에서도 요구사항 유무 분기 추가 |
| 추가 | `openPanel`, `setWizardStep`, `setWizardSourcePlaceholder` store 구독 |

### 9.3 `src/widgets/input-panel/ui/InputPanel.tsx`

| 변경 | 내용 |
|------|------|
| 추가 | `wizardStep` store 구독 |
| 변경 | `isOpen` 조건에 `wizardStep === null` 추가 — 위자드 중 숨김 |

### 9.4 `src/widgets/output-panel/ui/OutputPanel.tsx`

| 변경 | 내용 |
|------|------|
| 추가 | `wizardStep` store 구독 |
| 추가 | `WizardRequirementContent` 로컬 컴포넌트 |
| 추가 | `WizardAuthContent` 로컬 컴포넌트 |
| 변경 | 헤더 제목 → `wizardStep` 기반 동적 텍스트 |
| 변경 | 콘텐츠 영역 → `wizardStep` 분기 (`requirement` / `auth` / `null`) |
| 변경 | 닫기 버튼 → 위자드 상태 초기화 포함 |
| 추가 | `handleRequirementSelect`, `handleAuth`, `handleBackToService`, `handleBackToRequirement` 핸들러 |
| 추가 | `CATEGORY_SERVICE_MAP`, `SERVICE_REQUIREMENTS` import |

### 9.5 `src/features/add-node/ui/index.ts`

변경 없음.

### 9.6 `src/features/add-node/model/index.ts`

변경 없음. `serviceMap`, `serviceRequirements`는 이미 export되어 있다.

### 9.7 변경하지 않는 파일

| 파일 | 이유 |
|------|------|
| `Canvas.tsx` | placeholder 로직 변경 없음 |
| `PanelRenderer.tsx` | 기존 동작 유지 |
| `WorkflowEditorPage.tsx` | 레이아웃 구조 변경 없음 |
| `serviceMap.ts` | 데이터 변경 없음 |
| `serviceRequirements.ts` | 데이터 변경 없음 |
