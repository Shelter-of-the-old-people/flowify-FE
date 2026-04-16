# 에디터 하단 리모컨 바 설계 문서

> **작성일:** 2026-04-15
> **대상 화면:** `/workflows/:id/edit` (워크플로우 편집 화면)
> **목적:** 기존 상단 `EditorToolbar`를 철거하고 하단 고정 리모컨 바로 병합한다. Figma 시안 기준의 시각 스펙과 확정된 동작 요구사항을 한 문서로 고정하여 구현 착수 전 팀 합의 근거로 삼는다.
> **참고 시안:** [Figma 1882-3344](https://www.figma.com/design/liTdK7QHV5tufaQW8DwV6U/Untitled?node-id=1882-3344&m=dev)

---

## 목차

1. [개요](#1-개요)
2. [구현 범위](#2-구현-범위)
3. [UI 설계](#3-ui-설계)
4. [동작 설계](#4-동작-설계)
5. [상태별 렌더 매트릭스](#5-상태별-렌더-매트릭스)
6. [데이터 및 API 정합성](#6-데이터-및-api-정합성)
7. [주요 구현 파일](#7-주요-구현-파일)
8. [리스크 및 후속 작업](#8-리스크-및-후속-작업)

---

## 1. 개요

### 1.1 배경

현재 워크플로우 편집 화면은 상단 `EditorToolbar`에 워크플로우 이름 편집, 실행 버튼, 저장 버튼, 롤백 버튼, 실행/저장 상태 메시지가 모여 있다. 중간 발표를 앞두고 다음 목표가 추가되었다.

- 편집 화면의 주요 조작을 **하단 한 곳**으로 모아 조작 동선을 줄인다.
- 중간 발표 시나리오에 필요한 **삭제** 기능을 바에 통합한다 (현재 편집 화면에 없음).
- Figma 시안 기준 시각 언어로 통일한다.

### 1.2 디자인-요구사항 정합성 맥락 (시나리오 C)

초기 분석 결과 REQ-2(7개 요소)는 현재 Figma 시안(이름 + 실행 버튼 + 저장 버튼 + 가운데 placeholder 슬롯)보다 **앞서간 상태**였다. 팀 회의에서 다음과 같이 정리되었다.

- **확장 전략(나)** 채택: Figma 시안의 시각 토큰 위에 REQ-2 나머지 요소(삭제 / 롤백 / 자동정렬 / 줌리셋 / 히스토리)를 임시 텍스트 버튼으로 얹는다.
- 가운데 placeholder 슬롯은 "버튼이 이런 식으로 배치된다"는 예시이며, 최종 기능 조합은 위 5개 후보로 한정한다.
- chevron은 업데이트된 Figma 1882-3344에서 제거되어 충돌 해소.
- 임시 버튼은 텍스트 라벨로 구현하고, 추후 디자이너 확정 아이콘으로 교체한다.

### 1.3 목적

- Figma 시안 시각 토큰(폭/배경/라디우스/그림자/타이포/간격)을 100% 반영한 하단 고정 바 구현
- 기존 `EditorToolbar`의 **모든 기능을 누락 없이 이전**
- 삭제 / 자동정렬 / 줌리셋 / 히스토리 자리 확보 (동작은 후속)
- 실행/중지 원버튼 토글 도입
- 이름 편집은 인라인 → 저장 버튼으로 서버 반영

---

## 2. 구현 범위

### 2.1 포함

- 하단 고정 리모컨 바 컨테이너 (Figma 1882-3344)
- 워크플로우 이름 표시 + 인라인 편집
- 실행/중지 원버튼 토글 (스플릿 버튼 왼쪽)
- 전체 저장 버튼 (스플릿 버튼 오른쪽)
- 롤백 버튼 (가운데 슬롯)
- 삭제 버튼 (가운데 슬롯) + 확인 모달 + 성공 시 목록 페이지 이동
- 자동정렬 / 줌리셋 / 히스토리 **임시 텍스트 버튼** (UI만, 동작은 disabled)
- 실행 상태 메시지 (바 위 고정 위치, 실행 중일 때만 노출)
- 상단 `EditorToolbar` 철거

### 2.2 제외

- 테스트 드롭다운 (CONFIRM-3: 스코프 i, 현 단계 미구현)
- AI 생성 버튼 (중간 발표 이후)
- 실행 이력 리스트 UI (보류)
- 템플릿으로 저장 (보류)
- React Flow `<Controls />`, `<MiniMap />`, `<Background />` 수정 (그대로 유지)
- 아이콘 교체 (임시 텍스트 → 아이콘 전환은 후속 작업)

---

## 3. UI 설계

### 3.1 바 컨테이너 시각 토큰

| 속성 | 값 | 출처 |
|---|---|---|
| width | 900px (고정) | Figma 1882:3344 |
| background | `#fefefe` | Figma |
| border | `1px solid #f2f2f2` | Figma |
| border-radius | `20px` | Figma |
| box-shadow | `0px 4px 4px rgba(0, 0, 0, 0.25)` | Figma |
| padding | `8px 24px` (y x) | Figma |
| gap (flex) | `16px` | Figma |
| align-items | `center` | Figma |
| overflow | `clip` | Figma |
| font-family | `Pretendard Variable` | Figma |

### 3.2 화면 내 배치

- `position: fixed`, `bottom: <피그마 위치 그대로>`, `left: 50%`, `transform: translateX(-50%)`
- z-index는 React Flow 캔버스와 설정 패널 사이 (패널보다 아래, 캔버스보다 위)
- 바 영역에서 발생하는 `wheel` / `pointerDown` 이벤트는 캔버스로 전파되지 않도록 `stopPropagation` 처리

### 3.3 바 레이아웃 (좌 → 우)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [워크플로우 이름]   [삭제][롤백][자동정렬][줌리셋][히스토리]   [실행 | 저장] │
└─────────────────────────────────────────────────────────────────────────┘
   왼쪽 그룹         가운데 flex-1 (gap 10, justify-center)     오른쪽 스플릿
```

- **왼쪽 그룹**: 이름 표시만 (shrink-0)
- **가운데 영역**: `flex: 1 0 0`, `gap: 10px`, `justify-content: center`, 5개 텍스트 버튼
- **오른쪽 스플릿**: 실행 + 저장이 이어붙은 스플릿 버튼 (shrink-0)

### 3.4 워크플로우 이름

| 상태 | 렌더 |
|---|---|
| 기본 | `<p>` 14px Pretendard Regular `#000000`, whitespace-nowrap |
| 편집 중 | 같은 타이포의 `<input>`로 치환, 자동 폭 또는 max-width 제한 |

- 기본 상태에서 텍스트 **클릭 시** 편집 모드로 전환
- 편집 모드에서 `Enter` 또는 blur 시 로컬 state 반영(이름만 zustand `setWorkflowName`)
- 서버 반영은 **저장 버튼 클릭 시** 전체 저장의 일부로 발생

### 3.5 가운데 임시 텍스트 버튼 5개

| 순서 | 라벨 (임시) | 스타일 |
|---|---|---|
| 1 | 삭제 | 공통 스타일 아래 참조 |
| 2 | 롤백 | 공통 |
| 3 | 자동정렬 | 공통 (disabled) |
| 4 | 줌리셋 | 공통 (disabled) |
| 5 | 히스토리 | 공통 (disabled) |

**공통 버튼 스타일 (Figma 오른쪽 실행 버튼 토큰 재사용)**

| 속성 | 값 |
|---|---|
| height | 32px |
| background | `#272727` |
| color | `#efefef` |
| border-radius | `10px` |
| padding | `4px 8px` |
| font | Pretendard Variable Regular 14px |
| disabled 상태 | opacity 0.5, cursor not-allowed |

> 임시 텍스트 라벨은 디자이너 확정 아이콘으로 교체 예정. 교체 시 현재 컨테이너 폭(32×n)과 gap(10px)은 유지.

### 3.6 오른쪽 스플릿 버튼 (실행 + 저장)

Figma 1878:3330 기준.

| 파트 | 스타일 |
|---|---|
| 실행 (왼쪽) | `bg #272727`, `rounded-l-[10px]`, `px-[8px]`, 높이 32px, play 아이콘(16×18) + "실행하기" 텍스트, gap 8px |
| 구분선 | `border-l #f6f6f6` 1px |
| 저장 (오른쪽) | `bg #272727`, `rounded-r-[10px]`, `px-[8px] py-[4px]`, "저장" 텍스트 |

- 텍스트/아이콘 색: `#efefef`, 폰트 14px Pretendard Regular
- 실행 파트는 **상태에 따라 라벨/아이콘 토글**: `실행하기 ▶` ↔ `중지 ■`
- 저장 파트는 텍스트 고정이나 `disabled` 상태 존재

### 3.7 실행 상태 메시지 (바 위)

```
        ┌──────────────┐
        │  실행 중…     │   ← 실행 중일 때만 노출
        └──────────────┘
┌─────────────────────────────────────────────┐
│            리모컨 바                          │
└─────────────────────────────────────────────┘
```

- 위치: 바 상단 중앙, 바와 4~8px 간격
- 내용: `normalizeExecutionStatus` → `running`일 때만 "실행 중…" 렌더
- `idle` / `success` / `failed`에서는 **렌더 자체를 하지 않음** (Q-δ 결정)
- 저장 성공/실패 메시지는 **제거** (버튼 스피너와 실패 시 에러 toast 로 대체)

---

## 4. 동작 설계

### 4.1 워크플로우 이름 편집

1. 이름 텍스트 클릭 → 인라인 input으로 전환
2. 사용자가 타이핑, `Enter` 또는 blur 시 zustand의 `setWorkflowName(name)` 호출 (로컬만 갱신, **서버 요청 없음**)
3. ESC 시 편집 취소, 기존 값 복원
4. **저장 버튼 클릭**이 발생해야 이름이 `saveWorkflow` 페이로드에 포함되어 서버로 전송됨
5. 저장 성공 전까지 페이지 이탈 시 기존 `beforeunload` / 라우터 가드 훅이 있으면 그대로 동작

### 4.2 실행/중지 토글

- **Idle / Success / Failed / Rollback_available** 상태
  - 버튼: `▶ 실행하기`
  - 클릭: `executeWorkflow(workflowId)` 호출
  - 응답 후 `executionStatus` → `running`으로 전환, 폴링 시작
- **Running / Pending** 상태
  - 버튼: `■ 중지`
  - 클릭: `stopExecution({ workflowId, executionId })` 호출 (Spring `POST /api/workflows/{id}/executions/{execId}/stop`)
  - 응답 후 폴링이 종료 상태로 수렴하면 버튼 라벨 복귀
- 실행 중 저장 버튼은 **비활성** (Q-β: 스냅샷 모호성 방지)

### 4.3 저장 버튼

- 클릭: `saveWorkflow({ workflowId, store })` — 이름, 노드, 엣지, config, start/end 노드 id 포함 **전체 저장**
- 저장 중에는 저장 파트에 스피너 표시, `disabled`
- 저장 성공/실패 메시지는 **바 위 슬롯에 표시하지 않음**. 실패 시 공용 toast/alert 훅으로 노출 (기존 에러 채널 재사용)
- 실행 중에는 `disabled`

### 4.4 롤백 버튼

- 렌더: **항상 슬롯에 존재** (폭 고정 이유, Q-γ)
- 활성 조건: `latestExecution?.status === "rollback_available"` 또는 `failed`
- 그 외: `disabled`
- 클릭: `rollbackExecution({ workflowId, executionId })` 호출, 응답 후 `executionStatus` 갱신

### 4.5 삭제 버튼

1. 클릭 → 확인 모달 표시 (REQ-6)
2. 저장되지 않은 변경사항이 있어도 **모달은 동일**하게 삭제 확인만 묻는다 (REQ-7)
3. 모달 "삭제" 확정 → `deleteWorkflow(workflowId)` 호출
4. **성공 시**: `/workflows`(목록 페이지)로 네비게이션
5. **실패 시**: 에디터에 머무름, 에러 toast 노출 (REQ-8)
6. 실행 중에는 안전을 위해 `disabled`

### 4.6 자동정렬 / 줌리셋 / 히스토리 (임시 버튼)

- 현재 단계에서는 전부 `disabled` 상태로 렌더
- 기능 연결은 본 문서 범위 밖, 후속 이슈에서 처리
- `title` 속성(hover)에 "추후 지원 예정" 표시 검토

### 4.7 바와 설정 패널 간섭

- REQ-10: 현재 설정 패널과 바의 위치는 간섭 없음 → 별도 회피 로직 불필요
- 단, 바는 `pointer-events: auto` / `stopPropagation` 로 React Flow 줌·팬 이벤트를 가로채지 않도록 구현

---

## 5. 상태별 렌더 매트릭스

| 상태 | 이름 편집 | 삭제 | 롤백 | 자동정렬 | 줌리셋 | 히스토리 | 실행 파트 | 저장 파트 | 상태 메시지 |
|---|---|---|---|---|---|---|---|---|---|
| idle | 가능 | 활성 | disabled | disabled | disabled | disabled | `▶ 실행하기` | 활성 | **숨김** |
| running / pending | 불가(읽기전용) | disabled | disabled | disabled | disabled | disabled | `■ 중지` | disabled | **"실행 중…"** |
| success | 가능 | 활성 | disabled | disabled | disabled | disabled | `▶ 실행하기` | 활성 | **숨김** |
| failed | 가능 | 활성 | 활성 | disabled | disabled | disabled | `▶ 실행하기` | 활성 | **숨김** |
| rollback_available | 가능 | 활성 | 활성 | disabled | disabled | disabled | `▶ 실행하기` | 활성 | **숨김** |

> **암시적 피드백 설계**: 성공/실패는 별도 메시지 없이 (1) 버튼 상태 복귀, (2) 실패 시 롤백 버튼 활성화로 표현된다. 발표 관객에게 성공/실패가 덜 명확할 수 있으므로 [§8 리스크](#8-리스크-및-후속-작업)에서 재검토.

---

## 6. 데이터 및 API 정합성

### 6.1 재사용 훅 / 액션 (신규 없음)

| 대상 | 출처 | 역할 |
|---|---|---|
| `useWorkflowStore` | `src/features/workflow-editor/model/workflowStore.ts` | 이름, 노드, 엣지, executionStatus, 편집 state |
| `setWorkflowName` | 동일 store | 인라인 이름 편집 반영 |
| `executeWorkflow` 훅 | 기존 편집 화면 사용처 그대로 | 실행 트리거 |
| `stopExecution` 훅 | Spring `POST /executions/{execId}/stop` 바인딩, **없으면 신규** | 중지 토글 |
| `saveWorkflow` 훅 | 기존 | 전체 저장 |
| `rollbackExecution` 훅 | 기존 | 실패 후 롤백 |
| `deleteWorkflow` 훅 | 기존 | 삭제 |
| `normalizeExecutionStatus` | `src/entities/execution/model/execution-utils.ts` | 바 상태 판정 |
| `isExecutionInFlight` | 동일 | 실행/중지 토글 판정 |
| `executionPollInterval` | 동일 | 폴링 주기 |

### 6.2 신규로 필요한 것

- **중지 훅**: Spring `POST /api/workflows/{id}/executions/{execId}/stop` 에 대응하는 tanstack-query mutation 훅. BACKEND_ARCHITECTURE.md §6에서 엔드포인트 존재 확인 필요 (현재 문서상 존재, 실제 컨트롤러 연결 재확인 필요).
- **삭제 확인 모달**: REQ-6 기준. 기존 공용 confirm dialog가 있으면 재사용, 없으면 최소 Chakra modal 1개 신설.
- **실행 중 편집 잠금 유틸**: 이름 편집 input이 `running`일 때 `readOnly` 되도록 조건 추가.

### 6.3 번들/성능

- 바 컴포넌트 자체는 경량 (아이콘 없음, 텍스트만)
- 신규 의존성 없음

---

## 7. 주요 구현 파일

### 7.1 신규

```
src/
├── widgets/
│   └── editor-remote-bar/
│       ├── ui/
│       │   ├── EditorRemoteBar.tsx             (바 컨테이너, 레이아웃, fixed 배치)
│       │   ├── WorkflowNameField.tsx           (인라인 편집 이름 필드)
│       │   ├── RunStopSplitButton.tsx          (실행/중지 + 저장 스플릿)
│       │   ├── MiddleSlotButtons.tsx           (삭제/롤백/자동정렬/줌리셋/히스토리)
│       │   ├── ExecutionStatusBadge.tsx        (바 위 상태 메시지)
│       │   └── DeleteConfirmDialog.tsx         (REQ-6 모달)
│       └── index.ts
└── features/
    └── workflow-editor/
        └── api/
            └── useStopExecution.ts             (신규 mutation 훅)
```

### 7.2 수정

| 파일 | 변경 |
|---|---|
| `src/widgets/editor-toolbar/...` | **삭제** (기능 이전 완료 확인 후) |
| 편집 페이지 (`src/pages/workflow-edit/...`) | 상단 `EditorToolbar` 제거, 하단 `EditorRemoteBar` 렌더 추가 |
| 라우팅 / 페이지 컴포넌트 | 삭제 성공 시 `/workflows`로 `navigate` |

### 7.3 테스트

- `EditorRemoteBar.test.tsx`: 상태별 렌더 매트릭스(§5) 각 행을 RTL 단위 테스트로 검증
- `WorkflowNameField.test.tsx`: 클릭 → input 전환 → Enter/blur → ESC 복원 케이스
- `RunStopSplitButton.test.tsx`: 실행 중 토글 / 저장 비활성
- `DeleteConfirmDialog.test.tsx`: 확정 시 훅 호출, 실패 시 에디터 유지

---

## 8. 리스크 및 후속 작업

### 8.1 리스크

| # | 리스크 | 영향 | 대응 |
|---|---|---|---|
| R1 | 성공/실패 메시지가 바에 없어 발표 관객이 상태 전환을 놓칠 수 있음 | 데모 가독성 저하 | 중간 발표 리허설 때 재확인, 필요 시 성공/실패 상태 **짧은 시간(1.5초) 한시 노출**로 스펙 수정 후보 |
| R2 | Spring `/stop` 엔드포인트 실제 바인딩 미확인 | 중지 토글 동작 불가 | BE 팀에 BACKEND_ARCHITECTURE.md §6 기준 재확인 요청 (구현 착수 전 블로커) |
| R3 | 임시 텍스트 버튼 3개(자동정렬/줌리셋/히스토리)가 disabled로 비어 보임 | UX 혼란 | `title` hover 안내 + 디자이너 확정 후 아이콘 교체 일정 확보 |
| R4 | 바 폭이 900px 고정 → 좁은 뷰포트(1280 이하)에서 캔버스 오버레이 범위 과다 | 시각 밀도 | 디자이너 확정 시 반응형 토큰 재논의 |
| R5 | 기존 설정 패널과 바의 z-index 충돌 가능성 | 패널 가려짐 | 패널 z-index 우위 유지, QA 시 재확인 |

### 8.2 후속 작업

- 임시 텍스트 버튼 → 확정 아이콘 교체
- 자동정렬 / 줌리셋 / 히스토리 실제 기능 연결
- 테스트 드롭다운 도입 시 실행 파트를 스플릿 구조로 재변경
- 실행 성공/실패 피드백 설계 재검토 (R1)
- 바 반응형 대응 (R4)

---

## 9. 체크리스트 (구현 착수 전)

- [ ] 본 문서 사용자 승인
- [ ] Spring `/stop` 엔드포인트 컨트롤러 존재 확인 (R2)
- [ ] 삭제 확인 모달 공용 컴포넌트 존재 여부 확인
- [ ] React Flow `<Controls />` / `<MiniMap />` 유지 정책 최종 확인
- [ ] 기존 `EditorToolbar` 의존성(다른 페이지/스토리북/테스트) 전수 검색
- [ ] 디자이너에 임시 5개 버튼 아이콘 요청 티켓 생성
