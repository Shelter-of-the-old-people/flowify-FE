# Workflow List Auto-Run Toggle Frontend Design

> **작성일:** 2026-05-10
> **대상 화면:** `/workflows`
> **범위:** flowify-FE 단독 설계 문서
> **관련 저장소:** `flowify-BE-spring`, `flowify-BE`

---

## 1. 목적

이 문서는 워크플로우 목록에서 schedule workflow의 자동 실행을 바로 켜고 끌 수 있는 UI를 정의한다.

이번 기능의 목표는 다음과 같다.

- 목록의 `실행/중지` 버튼과 `자동 실행 on/off`를 분리한다.
- 사용자가 에디터에 들어가지 않고도 schedule workflow의 자동 실행을 바로 제어할 수 있게 한다.
- 기존 목록의 `실행/중지됨` 필터와 상태 의미는 유지한다.

---

## 2. 현재 상태 요약

### 2.1 이미 존재하는 것

- 워크플로우 응답에는 `trigger`와 `active`가 포함된다.
- 목록 row에는 현재 실행 기준의 `실행/중지` 버튼이 있다.
- FE에는 `useToggleWorkflowActiveMutation()`이 이미 존재한다.
- 에디터의 trigger settings에서 `active`를 저장할 수 있다.

### 2.2 현재 UX의 문제

- 목록의 실행 버튼은 현재 execution 제어이지, 자동 실행 제어가 아니다.
- 자동 실행을 끄려면 지금은 에디터로 들어가 저장해야 한다.
- 목록에서 자동 실행을 제어할 별도 액션이 없어 사용자가 헷갈리기 쉽다.

---

## 3. 설계 원칙

### 3.1 두 종류의 제어를 분리한다

- `실행/중지` 버튼: 지금 실행 중인 execution 제어
- `자동 실행` 버튼: 이후 schedule fire 여부 제어

두 액션은 같은 의미를 가지지 않으므로 UI도 분리한다.

### 3.2 자동 실행 토글은 schedule workflow에만 노출한다

- `manual` workflow에는 자동 실행 토글을 노출하지 않는다.
- `schedule + active=true`는 `자동 실행 켜짐`으로 표시한다.
- `schedule + active=false`는 `자동 실행 꺼짐`으로 표시한다.

### 3.3 owner만 변경 가능하다

- owner는 목록에서 자동 실행을 바로 켜고 끌 수 있다.
- shared user는 상태만 볼 수 있고 변경은 할 수 없다.

### 3.4 기존 목록 상태 의미는 유지한다

- 기존 목록의 `실행/중지됨` 필터와 상태 의미는 바꾸지 않는다.
- 자동 실행 on/off는 별도의 schedule 전용 액션으로만 노출한다.
- 즉, 목록의 기존 상태와 자동 실행 제어는 서로 다른 역할이다.

---

## 4. UI 설계

### 4.1 row 구성

목록 row 우측 액션 영역은 아래 순서로 둔다.

1. schedule workflow인 경우에만 자동 실행 상태 pill
2. 현재 execution 기준 run/stop 버튼
3. 상세 진입 버튼

### 4.2 상태 pill 문구

- `자동 실행 켜짐`
- `자동 실행 꺼짐`

### 4.3 상호작용 규칙

#### schedule owner

- `자동 실행 켜짐` pill 클릭 -> `active=false` 저장
- `자동 실행 꺼짐` pill 클릭 -> `active=true` 저장

#### manual workflow

- auto-run pill을 표시하지 않는다.
- 목록에서는 실행 버튼과 상세 진입만 제공한다.

#### shared user

- auto-run pill은 disabled 상태로 보인다.
- 변경 권한이 없음을 시각적으로 드러낸다.

### 4.4 시각적 차이

- `자동 실행 켜짐`: 채워진 강조 스타일
- `자동 실행 꺼짐`: muted 또는 outline 스타일

`실행/중지` 버튼과는 역할이 달라 보이도록 구분한다.

---

## 5. 상태 계산 규칙

목록 helper는 아래 정보를 계산한다.

- workflow가 manual인지 schedule인지
- auto-run pill 문구
- auto-run pill을 누를 수 있는지
- 토글 시 다음 `active` 값

예시:

```ts
type WorkflowAutoRunState =
  | { kind: "manual"; label: "수동 실행"; canToggle: false }
  | { kind: "enabled"; label: "자동 실행 켜짐"; canToggle: true; nextActive: false }
  | { kind: "disabled"; label: "자동 실행 꺼짐"; canToggle: true; nextActive: true };
```

---

## 6. FE 구현 방향

### 6.1 목록 action hook 확장

`useWorkflowListActions()`에 아래를 추가한다.

- 현재 로그인 사용자 id 확인
- `useToggleWorkflowActiveMutation()` 연결
- owner 여부 계산
- auto-run toggle handler

### 6.2 row props 확장

`WorkflowRow`에 아래 props를 추가한다.

- `autoRunLabel`
- `isAutoRunToggleable`
- `isAutoRunPending`
- `onAutoRunToggle`

### 6.3 row item wiring

`WorkflowRowItem`은 workflow trigger를 해석해 execution 액션과 auto-run 액션을 각각 계산해 row에 전달한다.

### 6.4 cache 동기화

`useToggleWorkflowActiveMutation()`의 cache sync를 그대로 사용한다.

- 목록 캐시
- 상세 workflow 캐시

두 화면 모두 같은 응답으로 즉시 갱신되는지 확인한다.

---

## 7. 이번 범위에서 하지 않는 것

- 목록에서 `manual -> schedule` 타입 전환
- 목록에서 interval/daily/weekly 상세 설정 변경
- workflow filter 탭 의미 변경
- dashboard 카드 액션 확장

이번 범위는 schedule workflow의 `active` on/off를 목록에서 바로 제어하는 데 집중한다.

### 7.1 향후 보완점

- 현재 목록의 `실행/중지됨` 필터는 `workflow.active`를 기준으로 동작한다.
- 즉, 이 필터는 `현재 실행 중인 execution이 있는지`를 직접 뜻하지 않는다.
- `manual` workflow는 일반적으로 `active=true`로 정규화되므로 `실행` 탭에 포함된다.
- 따라서 사용자 입장에서는 `실행/중지됨`이라는 문구가 `활성/비활성`과 혼동될 수 있다.
- 향후 목표 상태는 아래처럼 정리한다.
  - `실행중`: 자동 실행이 켜진 schedule workflow이거나, 현재 execution이 `pending/running`인 workflow
  - `중지됨`: 자동 실행이 꺼져 있고, 현재 execution도 없는 workflow
- 즉, 자동화가 돌아가고 있는 workflow와 단일 수동 실행 중인 workflow가 모두 `실행중`으로 보여야 한다.
- 이를 위해서는 목록 API 또는 목록 모델에 현재 execution 상태 요약값을 함께 제공하는 방향이 필요하다.

---

## 8. 검증 전략

### 8.1 단위 테스트

- manual workflow는 `manual` 상태로 계산되지만 버튼은 노출되지 않는지
- schedule active=true는 `자동 실행 켜짐`으로 계산되는지
- schedule active=false는 `자동 실행 꺼짐`으로 계산되는지
- shared workflow는 토글 불가 상태로 계산되는지
- 기존 `실행/중지됨` 필터 결과가 이전과 동일한지

### 8.2 컴포넌트 검증

- schedule row에만 auto-run pill과 execution 버튼이 함께 보이는지
- auto-run pill 클릭이 row open을 트리거하지 않는지
- execution 버튼과 auto-run pill이 서로 다른 pending 상태를 가지는지

### 8.3 수동 회귀

- schedule workflow를 목록에서 끄면 즉시 `자동 실행 꺼짐`으로 보이는지
- 목록에서 다시 켜면 에디터 summary도 같은 상태를 반영하는지
- manual workflow는 목록에서 auto-run 버튼이 보이지 않는지
- shared workflow는 목록에서 상태만 보이고 변경되지는 않는지
- 기존 `실행/중지됨` 필터 결과가 이전과 동일한지

---

## 9. 한 줄 요약

이번 FE 작업의 핵심은 목록 row에서 `현재 실행 제어`와 `앞으로의 자동 실행 제어`를 분리하고, schedule workflow에만 자동 실행 토글을 추가하되 기존 목록 상태 의미는 바꾸지 않는 것이다.
