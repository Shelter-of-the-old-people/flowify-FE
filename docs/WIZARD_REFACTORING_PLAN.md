# 위자드 구현 리팩토링 설계

> **작성일:** 2026-04-06
> **최종 수정:** 2026-04-07 (v2 설계 반영)
> **이슈:** #62
> **선행:** #60 (feat#60-wizard-ui-flow), [NODE_SETUP_WIZARD_DESIGN.md](./NODE_SETUP_WIZARD_DESIGN.md)
> **목적:** #60 구현(v1) 이후 발견된 문제를 수정하고, v2 설계 구조로 전환한다.

---

## 목차

1. [완료된 리팩토링 (v1 → v1.1)](#1-완료된-리팩토링-v1--v11)
2. [v2 구조 전환 (예정)](#2-v2-구조-전환-예정)

---

## 1. 완료된 리팩토링 (v1 → v1.1)

> 이 섹션의 변경은 이미 `refector#62wizard-sync-docs` 브랜치에서 구현·머지 완료되었다.

### 1.1 `requiresAuth` 중복 제거

`serviceRequirements.ts`의 `ServiceRequirementGroup.requiresAuth`를 제거하고, `serviceMap.ts`의 `CategoryServiceGroup.requiresAuth`를 단일 출처로 확정했다.

### 1.2 `import type` 컨벤션 수정

`OutputPanel.tsx`에서 value import와 type import를 분리했다.

---

## 2. v2 구조 전환 (예정)

> 수동 테스트 피드백을 반영한 v2 설계([NODE_SETUP_WIZARD_DESIGN.md](./NODE_SETUP_WIZARD_DESIGN.md))에 따라 다음 변경을 수행한다.

### 2.1 변경 개요

| 영역 | v1 (현재 구현) | v2 (목표) |
|------|---------------|-----------|
| 시작/도착 위자드 | SSP(카테고리·서비스) → OutputPanel(요구사항·인증) | SSP 내부에서 전체 완료 |
| 위자드 상태 소유권 | `workflowStore` (`wizardStep`, `wizardConfigPreset`, `wizardSourcePlaceholder`) | SSP 로컬 상태 |
| 중간 노드 entry | SSP에서 전체 위자드 동일 흐름 | SSP 카테고리 only → 듀얼 패널 |
| OutputPanel 역할 | 위자드 UI + 설정 UI | 설정 UI 전용 (중간 노드 요구사항 포함) |
| isConfigured 판정 | 서비스 선택 시 `updateNodeConfig()` 호출 (조기 설정) | 위자드 최종 완료 시에만 `updateNodeConfig()` 호출 |
| updateNodeConfig 방식 | replace (`{ ...전달config, isConfigured: true }`) | merge (`{ ...기존config, ...전달config, isConfigured: true }`) |
| 패널 닫기 | X 버튼만 | X + 캔버스 빈 영역 클릭 + ESC |
| 삭제 버튼 | 노드 선택(selected) 시 | 노드 hover 시 |
| Handle | 소스 Handle 표시 | 전체 숨김 (DOM 유지, opacity: 0) |
| Edge | 미표시 | smoothstep Edge 렌더링 |
| 노드 선택 시 | — | 화면 중앙 고정 + 드래그 비활성화 |

### 2.2 파일별 변경 상세

[NODE_SETUP_WIZARD_DESIGN.md 12장](./NODE_SETUP_WIZARD_DESIGN.md#12-파일별-변경-요약) 참조.

| 파일 | 주요 변경 |
|------|-----------|
| `workflowStore.ts` | wizard 필드 제거 + `updateNodeConfig` replace→merge 방식으로 변경 |
| `ServiceSelectionPanel.tsx` | 요구사항·인증 단계 추가, 중간 노드 모드 분기, X 버튼·ESC 리스너 |
| `OutputPanel.tsx` | 위자드 UI 제거, 중간 노드용 `RequirementSelector` 추가 |
| `InputPanel.tsx` | 표시 조건 변경 (`wizardStep` → `activePlaceholder`), 시작 노드 안내 |
| `Canvas.tsx` | `onPaneClick` 패널 닫기, ESC 전역 리스너, `setCenter`, 드래그 제어, Edge 설정 |
| `BaseNode.tsx` | hover 삭제 버튼, Handle 숨김 |

### 2.3 구현 순서 (권장)

```
1. workflowStore.ts — wizard 필드 제거 + updateNodeConfig 호출 시점 정리
2. ServiceSelectionPanel.tsx — 4단계 위자드 + 중간 노드 모드
3. OutputPanel.tsx — 위자드 UI 제거 + RequirementSelector
4. InputPanel.tsx — 표시 조건 + 시작 노드 안내
5. Canvas.tsx — onPaneClick, ESC, setCenter, draggable, Edge
6. BaseNode.tsx — hover 삭제 + Handle 숨김
```

> 순서 근거: store를 먼저 정리해야 컴포넌트에서 제거된 필드를 참조하지 않는다. SSP → OutputPanel → InputPanel은 의존 방향 순서. Canvas와 BaseNode는 독립적이므로 마지막.
