# 위자드 구현 리팩토링 설계

> **작성일:** 2026-04-06
> **최종 수정:** 2026-04-08 (v3 설계 반영 — ChoicePanel 기반 중간 노드)
> **이슈:** #62
> **선행:** #60 (feat#60-wizard-ui-flow), [NODE_SETUP_WIZARD_DESIGN.md](./NODE_SETUP_WIZARD_DESIGN.md)
> **목적:** #60 구현(v1) 이후 발견된 문제를 수정하고, v3 설계 구조로 전환한다.

---

## 목차

1. [완료된 리팩토링 (v1 → v1.1)](#1-완료된-리팩토링-v1--v11)
2. [v2 구조 전환 (완료)](#2-v2-구조-전환-완료)
3. [v3 구조 전환 (예정)](#3-v3-구조-전환-예정)

---

## 1. 완료된 리팩토링 (v1 → v1.1)

> 이 섹션의 변경은 이미 `refector#62wizard-sync-docs` 브랜치에서 구현·머지 완료되었다.

### 1.1 `requiresAuth` 중복 제거

`serviceRequirements.ts`의 `ServiceRequirementGroup.requiresAuth`를 제거하고, `serviceMap.ts`의 `CategoryServiceGroup.requiresAuth`를 단일 출처로 확정했다.

### 1.2 `import type` 컨벤션 수정

`OutputPanel.tsx`에서 value import와 type import를 분리했다.

---

## 2. v2 구조 전환 (완료)

> v2 변경은 구현 완료 상태. v3에서 추가 변경이 필요한 부분은 3절 참조.

### 2.1 v2에서 완료된 변경

| 영역 | v1 → v2 변경 | 상태 |
|------|-------------|------|
| 시작/도착 위자드 | SSP 내부에서 전체 완료 (4단계 로컬 위자드) | ✅ 완료 |
| 위자드 상태 소유권 | store에서 SSP 로컬 상태로 이동 | ✅ 완료 |
| updateNodeConfig | replace → merge 방식 | ✅ 완료 |
| 패널 닫기 | X + 캔버스 빈 영역 + ESC | ✅ 완료 |
| 삭제 버튼 | selected → hover 표시 | ✅ 완료 |
| Handle | 전체 숨김 (opacity: 0) | ✅ 완료 |
| Edge | smoothstep 렌더링 | ✅ 완료 |
| 노드 선택 시 | 화면 중앙 고정 + 드래그 비활성화 | ✅ 완료 |
| 중간 노드 entry | SSP 카테고리 only → 듀얼 패널 | ⚠️ v3에서 교체 |
| OutputPanel | RequirementSelector 포함 | ⚠️ v3에서 제거 |

---

## 3. v3 구조 전환 (예정)

> 중간 노드의 entry UI를 SSP 카테고리 선택에서 **ChoicePanel**(매핑 규칙 기반 선택지)로 교체한다. [NODE_SETUP_WIZARD_DESIGN.md](./NODE_SETUP_WIZARD_DESIGN.md) v3 참조.

### 3.1 변경 개요

| 영역 | v2 (현재 구현) | v3 (목표) |
|------|---------------|-----------|
| 중간 노드 entry | SSP 카테고리 선택 (임시) | **ChoicePanel** — 이전 노드 outputDataType 기반 매핑 규칙 |
| SSP 역할 | 시작/도착 + 중간 노드 분기 (`isMiddleNodeMode`) | 시작/도착 노드 전용 (`isMiddleNodeMode` 제거) |
| OutputPanel | RequirementSelector + PanelRenderer | **PanelRenderer 전용** (RequirementSelector 제거) |
| 중간 노드 데이터 | 카테고리 목록 (NODE_REGISTRY) | `mapping_rules.json` 정적 mock 데이터 |
| 중간 노드 선택 흐름 | 카테고리 1단계 | 처리 방식 → 액션 → 후속 설정 (최대 3단계) |
| placeholder 분기 | 모든 placeholder → SSP | 시작/도착 → SSP, 중간 → ChoicePanel |

### 3.2 파일별 변경 상세

[NODE_SETUP_WIZARD_DESIGN.md 13장](./NODE_SETUP_WIZARD_DESIGN.md#13-파일별-변경-요약) 참조.

| 파일 | 주요 변경 |
|------|-----------|
| `src/features/choice-panel/` (신규) | ChoicePanel UI + 매핑 규칙 model + 타입 변환 유틸 |
| `ServiceSelectionPanel.tsx` | `isMiddleNodeMode` 제거, 시작/도착 전용으로 제한 |
| `OutputPanel.tsx` | `RequirementSelector` 제거, `SERVICE_REQUIREMENTS` 의존 제거, PanelRenderer 전용 |
| `WorkflowEditorPage.tsx` | ChoicePanel 컴포넌트 렌더링 추가 |

### 3.3 구현 순서 (권장)

```
1. ChoicePanel feature 뼈대 연결 — model 3개(완료) + UI 컴포넌트 + index.ts
2. ServiceSelectionPanel.tsx — isMiddleNodeMode 제거, 시작/도착 전용
3. ChoicePanel 중간 노드 위자드 흐름 구현 — 3단계 선택 + 노드 생성
4. WorkflowEditorPage + Canvas — placeholder 유형별 분기, ChoicePanel 렌더링
5. OutputPanel.tsx — RequirementSelector 제거, PanelRenderer 전용
6. 통합 검증 — 회귀 및 UX 점검
```

> 순서 근거: ChoicePanel 뼈대를 먼저 만들어야 SSP에서 중간 노드 분기를 제거할 수 있다. Canvas 분기와 OutputPanel 단순화는 ChoicePanel이 동작한 뒤에 진행해야 중간 전환 기간에도 빌드가 깨지지 않는다.
