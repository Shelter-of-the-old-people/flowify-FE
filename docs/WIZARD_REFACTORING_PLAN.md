# 위자드 구현 리팩토링 설계

> **작성일:** 2026-04-06
> **이슈:** #62
> **선행:** #60 (feat#60-wizard-ui-flow), [NODE_SETUP_WIZARD_DESIGN.md](./NODE_SETUP_WIZARD_DESIGN.md)
> **목적:** #60 구현 후 발견된 데이터 중복, 컨벤션 위반을 수정하고, 설계 문서를 실제 구현과 동기화한다.

---

## 목차

1. [코드 리팩토링](#1-코드-리팩토링)
2. [설계 문서 동기화](#2-설계-문서-동기화)

---

## 1. 코드 리팩토링

### 1.1 `requiresAuth` 중복 제거

#### 현상

`requiresAuth`가 두 곳에 정의되어 있다:

| 파일 | 인터페이스 | 실제 사용 여부 |
|------|-----------|---------------|
| `serviceMap.ts` | `CategoryServiceGroup.requiresAuth` | ✅ `OutputPanel`에서 인증 분기에 사용 |
| `serviceRequirements.ts` | `ServiceRequirementGroup.requiresAuth` | ❌ 미사용 |

`OutputPanel`의 `handleRequirementSelect`는 `CATEGORY_SERVICE_MAP[type].requiresAuth`만 참조한다. `SERVICE_REQUIREMENTS`의 `requiresAuth`는 어디서도 읽지 않는다.

#### 변경

**`serviceRequirements.ts`:**

```typescript
// 변경 전
export interface ServiceRequirementGroup {
  title: string;
  requiresAuth: boolean;  // ← 제거
  requirements: ServiceRequirement[];
}

// 변경 후
export interface ServiceRequirementGroup {
  title: string;
  requirements: ServiceRequirement[];
}
```

각 항목에서 `requiresAuth` 값 제거:

```typescript
// 변경 전
storage: {
  title: "어떻게 사용하시겠어요?",
  requiresAuth: true,  // ← 제거
  requirements: [ ... ],
},

// 변경 후
storage: {
  title: "어떻게 사용하시겠어요?",
  requirements: [ ... ],
},
```

**`serviceMap.ts`:**

`CategoryServiceGroup.requiresAuth`에 단일 출처임을 명시하는 주석 추가:

```typescript
export interface CategoryServiceGroup {
  categoryIcon: IconType;
  categoryLabel: string;
  services: ServiceOption[];
  /**
   * OAuth 인증 필요 여부.
   * 인증 분기의 유일한 출처 — OutputPanel에서 이 값을 참조한다.
   */
  requiresAuth: boolean;
}
```

#### 영향 범위

- `serviceRequirements.ts` — 인터페이스 + 5개 항목에서 `requiresAuth` 제거
- `serviceMap.ts` — 주석만 추가, 구조 변경 없음
- 다른 파일 영향 없음 (기존에도 `SERVICE_REQUIREMENTS.requiresAuth`를 읽는 코드 없음)

---

### 1.2 `import type` 컨벤션 수정

#### 현상

`OutputPanel.tsx`에서 value import와 type import가 한 문장에 혼합되어 있다:

```typescript
import {
  CATEGORY_SERVICE_MAP,
  SERVICE_REQUIREMENTS,
  type ServiceRequirement,
} from "@/features/add-node";
```

프로젝트 컨벤션: `import type`은 value import와 **반드시 분리**한다.

#### 변경

```typescript
import { CATEGORY_SERVICE_MAP, SERVICE_REQUIREMENTS } from "@/features/add-node";
import type { ServiceRequirement } from "@/features/add-node";
```

#### 영향 범위

- `OutputPanel.tsx` — import 문 1줄 → 2줄 분리. 동작 변경 없음.

---

## 2. 설계 문서 동기화

`NODE_SETUP_WIZARD_DESIGN.md`의 코드 예시와 설명을 실제 구현에 맞춰 수정한다.

### 2.1 변경 항목 목록

| # | 문서 위치 | 설계 (현재) | 실제 구현 | 수정 방향 |
|---|-----------|-------------|-----------|-----------|
| A | 5.2 유지 대상 | `placeNode(meta, service)` 필수 인자 전제 | `placeNode(meta, service?)` — service optional | `placeNode` 시그니처를 optional로 수정, 설명 추가 |
| B | 5.4 handleCategorySelect | `addNode` 직접 호출 + 수동 관계 설정 | `placeNode(meta)` 재사용 | 코드 예시를 `placeNode` 재사용으로 교체 |
| C | 6.3 WizardRequirementContent | `{ requirements, onSelect }` props | `{ requirements, onSelect, onBack }` | `onBack` prop 추가 |
| D | 6.4 WizardAuthContent | `{ onAuth }` props | `{ onAuth, onBack }` | `onBack` prop 추가 |
| E | 6.5 handleRequirementSelect | 인증 불필요 시 `setWizardStep(null)` 단독 호출 | `finishWizard()` 헬퍼로 3필드 일괄 정리 | `finishWizard` 패턴 반영 |
| F | 6.5 handleAuth | 개별 `setWizardConfigPreset(null)` + `setWizardStep(null)` | `finishWizard()` 호출 | 동일하게 `finishWizard` 반영 |
| G | 4.5 resetEditor | `wizardStep`, `wizardConfigPreset`만 언급 | 3필드 모두 `initialState`로 초기화 | `wizardSourcePlaceholder` 추가 |
| H | 7.1 상태 전이 다이어그램 | 인증 완료/불필요 시 개별 set 호출 표기 | `finishWizard()` 호출 | 다이어그램 내 종료 흐름을 `finishWizard()`로 통일 |

### 2.2 각 항목 상세

#### A. `placeNode` 시그니처 변경 (5.2절)

유지 대상 테이블에서 `placeNode` 설명 수정:

```
// 변경 전
| `placeNode()` | 노드 배치 + 관계 설정 |

// 변경 후
| `placeNode(meta, service?)` | 노드 배치 + 관계 설정 (service optional — 서비스 없는 노드도 재사용) |
```

#### B. `handleCategorySelect` 코드 예시 교체 (5.4절)

설계 문서의 코드를 실제 구현과 일치시킨다:

```typescript
// 변경 전 (설계)
if (!activePlaceholder) return;
const nodeId = addNode(meta.type, { position: activePlaceholder.position });
const sourceNodeId = parseSourceNodeId(activePlaceholder.id);
if (activePlaceholder.id === "placeholder-start") setStartNodeId(nodeId);
else if (activePlaceholder.id === "placeholder-end") setEndNodeId(nodeId);
if (sourceNodeId) {
  onConnect({ source: sourceNodeId, target: nodeId, sourceHandle: null, targetHandle: null });
}

// 변경 후 (구현과 일치)
const nodeId = placeNode(meta);
if (!nodeId) return;
```

#### C. `WizardRequirementContent` props 추가 (6.3절)

```typescript
// 변경 전
const WizardRequirementContent = ({
  requirements,
  onSelect,
}: {
  requirements: ServiceRequirement[];
  onSelect: (req: ServiceRequirement) => void;
}) => (

// 변경 후
const WizardRequirementContent = ({
  requirements,
  onSelect,
  onBack,
}: {
  requirements: ServiceRequirement[];
  onSelect: (req: ServiceRequirement) => void;
  onBack: () => void;
}) => (
```

컴포넌트 내부에 뒤로가기 버튼 렌더링 코드도 추가한다.

#### D. `WizardAuthContent` props 추가 (6.4절)

```typescript
// 변경 전
const WizardAuthContent = ({
  onAuth,
}: {
  onAuth: () => void;
}) => (

// 변경 후
const WizardAuthContent = ({
  onAuth,
  onBack,
}: {
  onAuth: () => void;
  onBack: () => void;
}) => (
```

#### E, F. `finishWizard` 헬퍼 추가 (6.5절)

위자드 종료 시 3필드를 일괄 정리하는 `finishWizard` 헬퍼를 문서에 반영한다:

```typescript
// 신규 추가 — 위자드 종료 헬퍼
const finishWizard = () => {
  setWizardConfigPreset(null);
  setWizardStep(null);
  setWizardSourcePlaceholder(null);
};
```

`handleRequirementSelect`, `handleAuth`의 종료 부분을 `finishWizard()` 호출로 교체:

```typescript
// handleRequirementSelect — 인증 불필요 시
updateNodeConfig(activePanelNodeId, { ...activeNode.data.config, ...req.configPreset });
finishWizard();  // ← setWizardStep(null) 대신

// handleAuth
updateNodeConfig(activePanelNodeId, { ...currentNode.data.config, ...wizardConfigPreset });
finishWizard();  // ← 개별 set 호출 대신
```
