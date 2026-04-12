# 워크플로우 목록 페이지 구조 리팩토링 문서

> **작성일**: 2026-04-12
> **이슈**: #74
> **브랜치**: `refector#74-workflow-list-page-structure`
> **대상 화면**: `/workflows`
> **선행 문서**: [WORKFLOW_LIST_PAGE_DESIGN.md](./WORKFLOW_LIST_PAGE_DESIGN.md)
> **목적**: 워크플로우 목록 페이지를 `mypage`와 유사한 구조로 정리하여, 페이지는 섹션만 조합하고 실제 상태/로직/UI 연결은 섹션 내부에서 담당하도록 리팩토링한다.

---

## 목차

1. [개요](#1-개요)
2. [리팩토링 목표](#2-리팩토링-목표)
3. [구조 설계](#3-구조-설계)
4. [파일별 역할](#4-파일별-역할)
5. [진행 원칙](#5-진행-원칙)
6. [제외 범위](#6-제외-범위)
7. [검증 기준](#7-검증-기준)
8. [후속 작업](#8-후속-작업)

---

## 1. 개요

기존 리팩토링 방향에서는 `WorkflowsPage.tsx`에서 page model 훅을 호출하고, 그 결과를 하위 UI 컴포넌트에 props로 전달하는 구조를 사용했다.

이 구조도 책임 분리 자체는 가능하지만, 현재 프로젝트에서 참고하는 `seed-fe`의 `mypage` 구조와 비교하면 페이지가 여전히 많은 연결 책임을 가지고 있다.

예시 기준:

- `MyPage.tsx`
  - 페이지는 섹션만 조합
- `ProjectListSection.tsx`
  - 내부에서 hook 호출
  - 내부에서 toolbar, list item, dialog를 조합

이번 리팩토링은 이 방향을 워크플로우 목록 페이지에도 맞추는 것을 목표로 한다.

즉, 페이지는 더 얇아지고 섹션이 실제 화면 단위 컨테이너 역할을 담당한다.

---

## 2. 리팩토링 목표

- `WorkflowsPage.tsx`는 페이지 외곽 레이아웃과 섹션 조합만 담당한다.
- 목록 조회, 무한 스크롤, 필터 상태, 생성/상세 이동/활성 토글 핸들러는 섹션 내부에서 사용한다.
- 페이지가 직접 `WorkflowFilterTabs`, `WorkflowRow`, `useWorkflowsPage`를 연결하지 않도록 정리한다.
- `WorkflowListSection`이 목록 영역의 실질적인 컨테이너가 되도록 구성한다.
- 세부 UI 컴포넌트는 현재처럼 표현 중심으로 유지한다.
- `docs/CONVENTION.md` 기준의 import, props 타입, Chakra UI 규칙을 유지한다.

---

## 3. 구조 설계

### 3.1 목표 디렉토리 구조

```text
src/pages/workflows/
├─ WorkflowsPage.tsx
├─ index.ts
├─ model/
│  ├─ constants.ts
│  ├─ index.ts
│  ├─ types.ts
│  ├─ useWorkflowsPage.ts
│  └─ workflow-list.ts
└─ ui/
   ├─ index.ts
   ├─ ServiceBadge.tsx
   ├─ WorkflowFilterTabs.tsx
   ├─ WorkflowRow.tsx
   └─ section/
      ├─ index.ts
      └─ WorkflowListSection.tsx
```

### 3.2 레이어 책임

- `WorkflowsPage.tsx`
  - 페이지 외곽 레이아웃만 담당
  - `WorkflowListSection`만 조합
- `ui/section/WorkflowListSection.tsx`
  - 목록 화면 단위 조합
  - `useWorkflowsPage` 호출
  - `WorkflowFilterTabs`, `WorkflowRow` 연결
  - 로딩/에러/빈 상태 UI 처리
- `model/useWorkflowsPage.ts`
  - 목록 조회
  - 무한 스크롤
  - 필터 상태
  - 생성/상세 이동/활성 토글 핸들러
- `model/workflow-list.ts`
  - 정렬
  - 상대 시간 라벨
  - 구축 진행 상태 계산
  - 경고 메시지 추출
  - 시작/종료 노드 추출
  - 서비스 아이콘 키 매핑
- `ui/*`
  - 표현 중심 UI 컴포넌트

---

## 4. 파일별 역할

| 파일 | 역할 |
|------|------|
| `src/pages/workflows/WorkflowsPage.tsx` | 페이지 조합 전용 진입점 |
| `src/pages/workflows/ui/section/WorkflowListSection.tsx` | 목록 섹션 컨테이너 |
| `src/pages/workflows/model/useWorkflowsPage.ts` | 목록 상태/핸들러 관리 |
| `src/pages/workflows/model/workflow-list.ts` | 순수 계산 로직 |
| `src/pages/workflows/ui/WorkflowFilterTabs.tsx` | 상태 필터 탭 UI |
| `src/pages/workflows/ui/WorkflowRow.tsx` | 워크플로우 row UI |
| `src/pages/workflows/ui/ServiceBadge.tsx` | 서비스 배지 UI |

---

## 5. 진행 원칙

### 5.1 `mypage` 구조 참고

이번 작업은 아래 구조를 기준으로 삼는다.

- 페이지는 섹션만 import
- 섹션이 hook과 하위 UI를 내부에서 연결
- item 컴포넌트는 props 기반 표현 컴포넌트로 유지

즉 `WorkflowsPage -> WorkflowListSection -> WorkflowFilterTabs / WorkflowRow` 흐름으로 정리한다.

### 5.2 페이지 책임 최소화

페이지에서는 아래를 하지 않는다.

- 목록 query 호출
- 필터 상태 보유
- 무한 스크롤 observer 연결
- 목록 row 렌더링 반복
- 로딩/에러/빈 상태 분기

이 책임은 모두 섹션 내부로 이동한다.

### 5.3 표현 컴포넌트는 과도하게 비대해지지 않게 유지

`WorkflowRow`, `WorkflowFilterTabs`, `ServiceBadge`는 데이터 fetch를 직접 하지 않고, 현재처럼 표현 중심 컴포넌트로 유지한다.

즉 “모든 컴포넌트가 hook을 직접 갖는 구조”가 아니라, “섹션 컨테이너가 내부에서 필요한 것들을 조합하는 구조”를 목표로 한다.

---

## 6. 제외 범위

이번 리팩토링에서는 아래 항목은 포함하지 않는다.

- 목록 우측 액션 버튼의 실제 실행 API 연동
- 서비스 SVG 아이콘의 별도 폴더 분리
- 백엔드 목록 조회 방식을 페이지네이션에서 커서 기반 무한 스크롤로 변경
- 목록 row UI 디자인 변경
- `warnings` 모델 자체 변경

즉 이번 작업은 구조 리팩토링에 집중하고, 동작 변경은 최소화한다.

---

## 7. 검증 기준

- `pnpm run lint` 통과
- `pnpm run build` 통과
- `/workflows` 화면에서 아래 동작 유지 확인
  - 목록 조회
  - 최근 업데이트순 정렬
  - `전체 / 실행 / 중지됨` 필터
  - 무한 스크롤
  - 워크플로우 생성
  - 목록 row hover 경고 메시지
  - 상세 화면 이동

---

## 8. 후속 작업

- 목록 row 액션 버튼의 의미(`active` 토글 vs 실제 실행 API)를 백엔드 스펙과 다시 정리
- 서비스 SVG 아이콘을 공용 아이콘 폴더로 정리
- 필요 시 `ui` 컴포넌트 단위 테스트 또는 스냅샷 테스트 도입
- 백엔드 목록 조회가 무한 스크롤 친화적으로 바뀌면 프론트 page model도 함께 정리

---

## 결론

이번 리팩토링의 핵심은 “페이지는 섹션만 조합하고, 실제 연결 책임은 섹션 내부에 둔다”는 것이다.

정리 기준은 아래와 같다.

- `WorkflowsPage`는 얇게 유지한다.
- `WorkflowListSection`이 실제 목록 컨테이너 역할을 맡는다.
- `model`은 상태와 로직을 맡고, `ui`는 표현을 맡는다.

이 문서는 `#74 워크플로우 목록 페이지 구조 리팩토링`의 기준 문서로 사용한다.
