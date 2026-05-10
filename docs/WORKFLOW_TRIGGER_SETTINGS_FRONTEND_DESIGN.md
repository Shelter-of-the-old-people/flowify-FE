# Workflow Trigger Settings Frontend Design

> **작성일:** 2026-05-10
> **대상 화면:** `/workflows/:id`
> **범위:** flowify-FE 단독 설계 문서
> **관련 저장소:** `flowify-BE-spring`, `flowify-BE`

---

## 1. 목적

이 문서는 워크플로우 편집기에서 `몇 시간마다 확인`, `매일 특정 시간 실행`, `매주 특정 요일 실행` 같은 workflow-level trigger 설정 UI를 새로 설계한다.

이번 작업의 기준은 다음과 같다.

- 시작 노드 source mode의 `trigger_kind`와 워크플로우 전체 실행 trigger를 분리한다.
- 기존 `trigger` 노드를 확장하는 방식이 아니라, persisted workflow editor 기준의 새 설정 흐름으로 설계한다.
- 사용자가 이해하기 쉬운 주기 설정 UI를 제공하되, 저장 시점에는 Spring이 바로 사용할 수 있는 구조로 정리한다.

---

## 2. 현재 상태 요약

### 2.1 이미 존재하는 것

- `Workflow` 모델에는 `trigger` 필드가 있다.
- 시작 노드 source mode 선택 시 `trigger_kind`를 config에 저장한다.
- 에디터 상단 바에는 저장/실행/중지 UI가 이미 있다.
- workflow 응답에는 `active` 필드가 이미 내려온다.

### 2.2 아직 부족한 것

- FE `TriggerConfig` 타입이 Spring의 `type + config` 구조와 맞지 않는다.
- 에디터 저장 어댑터는 현재 `trigger`와 `active`를 payload에 싣지 않는다.
- 에디터 store는 `workflow trigger`와 `workflow active`를 상태로 관리하지 않는다.
- trigger를 수정할 전용 UI가 없다.
- `trigger_kind`가 source 설명인지, workflow 실행 조건인지 사용자 입장에서 구분되지 않는다.
- 과거 `trigger` 노드가 남아 있지만 현재 persisted workflow 실행 흐름과 연결되지 않는다.

### 2.3 이번 설계의 판단

이번 기능의 기준 데이터는 노드가 아니라 워크플로우 전체다.

- 시작 노드의 `trigger_kind`는 source 설명 메타데이터로 유지한다.
- 실제 실행 시점과 주기 설정은 `workflow.trigger`에서만 담당한다.
- 기존 `trigger` 노드는 이번 범위에서 사용자 진입점으로 사용하지 않는다.

---

## 3. 설계 원칙

### 3.1 V1 범위

V1은 아래 두 가지만 정식 지원한다.

- `manual`
- `schedule`

`webhook`은 후속 범위로 둔다.

### 3.2 사용자가 보는 모델과 저장 모델을 분리한다

사용자는 아래처럼 이해한다.

- 수동 실행
- 몇 시간마다 확인
- 매일 특정 시간 실행
- 매주 특정 요일/시간 실행
- 고급 cron

하지만 저장 시에는 Spring이 바로 재등록할 수 있도록 `type + config` 구조로 보낸다.

### 3.3 수동 실행 버튼과 자동 실행 설정을 분리한다

- 상단 `실행` 버튼은 즉시 실행이다.
- trigger settings는 자동 실행 정책이다.
- `active`는 실행 중 여부가 아니라 자동 실행 활성화 여부로 해석한다.

### 3.4 null trigger를 새 기본값으로 두지 않는다

- 새 워크플로우 기본값은 manual이다.
- 기존 데이터에서 `trigger == null`이면 hydrate 시 manual로 취급한다.

### 3.5 source mode의 `trigger_kind`와 workflow trigger를 호환 규칙으로 분리한다

이번 기능에서는 두 값의 역할을 아래처럼 고정한다.

- `source_mode.trigger_kind`: source mode의 성격 설명 메타데이터
- `workflow.trigger`: 실제 자동 실행 정책

V1 호환 규칙:

- `workflow.trigger=manual`이면 모든 source mode는 수동 실행 시점에만 동작한다.
- `workflow.trigger=schedule`이면 source mode의 `trigger_kind`와 무관하게, 스케줄 시점마다 해당 source mode 기준 데이터를 가져온다.
- 기존 event, schedule 성격 source mode도 이번 기능에서는 별도 스케줄 owner가 아니라 실행 시 어떤 데이터를 읽을지 설명하는 mode로 해석한다.

### 3.6 편집 권한과 저장 시점을 명시한다

- trigger 설정은 workflow-level 속성이므로 owner만 수정 가능하다.
- shared user는 값을 볼 수는 있지만 수정할 수는 없다.
- trigger 변경은 즉시 서버에 반영하지 않고, workflow 저장 시점에 다른 노드 변경과 함께 저장한다.
- trigger 변경도 editor dirty 상태를 만든다.

---

## 4. FE 기준 Trigger 데이터 모델

### 4.1 Public 저장 모델

```ts
export type WorkflowTriggerType = "manual" | "schedule";

export interface WorkflowTriggerConfig {
  schedule_mode?: "interval" | "daily" | "weekly" | "cron";
  cron?: string;
  timezone?: string;
  interval_hours?: number;
  time_of_day?: string;
  weekdays?: Array<"MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN">;
  skip_if_running?: boolean;
}

export interface TriggerConfig {
  type: WorkflowTriggerType;
  config: WorkflowTriggerConfig;
}
```

### 4.2 저장 예시

수동 실행:

```json
{
  "trigger": {
    "type": "manual",
    "config": {}
  },
  "active": true
}
```

4시간마다 확인:

```json
{
  "trigger": {
    "type": "schedule",
    "config": {
      "schedule_mode": "interval",
      "cron": "0 */4 * * *",
      "timezone": "Asia/Seoul",
      "interval_hours": 4,
      "skip_if_running": true
    }
  },
  "active": true
}
```

매주 월/수/금 오전 9시:

```json
{
  "trigger": {
    "type": "schedule",
    "config": {
      "schedule_mode": "weekly",
      "cron": "0 9 * * 1,3,5",
      "timezone": "Asia/Seoul",
      "time_of_day": "09:00",
      "weekdays": ["MON", "WED", "FRI"],
      "skip_if_running": true
    }
  },
  "active": true
}
```

### 4.3 FE 내부 규칙

- FE는 사용자가 고른 값을 기반으로 `cron`을 항상 함께 계산해 저장한다.
- `schedule_mode`는 UI 복원용이므로 유지한다.
- `manual`일 때는 `active=true`를 보낸다.
- `schedule`일 때만 `active` 토글을 노출한다.
- `manual`로 전환할 때 schedule 전용 임시 상태는 정리하되, 서버에 보내는 값은 `manual + {}`로 canonicalize한다.

---

## 5. UX 설계

### 5.1 진입 위치

trigger 설정 진입점은 `EditorRemoteBar`에 둔다.

이유:

- node-level 설정이 아니라 workflow-level 설정이다.
- 저장과 실행과 밀접하게 연결된다.
- 사용자가 즉시 실행과 자동 실행을 같은 시야에서 이해할 수 있다.

### 5.2 UI 구성

권장 구조:

- 상단 바에 `자동 실행` 요약 버튼 추가
- 버튼 클릭 시 popover 또는 drawer 오픈
- 내부에서 trigger type, 주기 세부값, active toggle 편집

버튼 기본 문구 예시:

- `수동 실행`
- `4시간마다 확인`
- `매일 09:00 실행`
- `매주 월, 수, 금 09:00`
- `고급 cron`

### 5.3 편집 폼 단계

A. 실행 방식

- 수동 실행
- 자동 실행

B. 자동 실행 세부 방식

- 몇 시간마다 확인
- 매일 특정 시간
- 매주 특정 요일/시간
- 고급 cron 직접 입력

C. 공통 옵션

- 시간대(timezone)
- 이미 실행 중이면 이번 주기 건너뛰기
- 자동 실행 켜기/끄기

### 5.4 문구 원칙

- `trigger_kind`는 시작 노드 패널에서만 source 설명 문구로 유지한다.
- workflow trigger UI에서는 `자동 실행`, `주기`, `예약` 같은 별도 표현을 사용한다.
- `active/inactive`를 그대로 사용자 문구로 쓰지 않고, `자동 실행 켜짐/꺼짐`으로 번역한다.

### 5.5 권한별 화면 동작

- owner: trigger 편집 가능, 저장 가능
- shared user: 값 조회 가능, 편집 UI disabled
- 권한 부족 상태에서는 값을 숨기지 않고 read-only summary와 disabled control만 노출한다.

---

## 6. FE 상태 관리와 API 매핑

### 6.1 store 확장

`WorkflowEditorState`와 저장용 상태에 아래를 추가한다.

```ts
workflowTrigger: TriggerConfig;
workflowActive: boolean;
```

대상 파일:

- `src/entities/workflow/model/types.ts`
- `src/features/workflow-editor/model/workflowStore.ts`
- `src/features/workflow-editor/model/workflow-editor-adapter.ts`

### 6.2 hydrate 규칙

서버 응답 기준:

- `workflow.trigger == null` -> `manual` 기본값으로 hydrate
- `workflow.active == null` 또는 누락 -> `true` 기본값으로 hydrate
- schedule payload는 `schedule_mode`와 보조 필드를 이용해 UI 입력값으로 복원한다.

### 6.3 save 규칙

`toWorkflowUpdateRequest()`는 아래를 포함해야 한다.

- `trigger`
- `active`

이때 schedule이 아닌 경우 FE가 `active = true`를 강제해 불필요한 상태 분기를 줄인다.

### 6.4 create 규칙

신규 워크플로우 기본값:

```json
{
  "trigger": {
    "type": "manual",
    "config": {}
  },
  "active": true
}
```

---

## 7. 유효성 검증과 변환 규칙

### 7.1 interval

- `interval_hours`는 1 이상 정수
- V1에서는 24시간 초과 반복은 허용하지 않는다
- 24시간 이상 주기는 `daily`, `weekly`, `cron`으로 유도한다

### 7.2 daily

- `time_of_day` 필수
- `cron`은 `분 시 * * *` 형태로 계산

### 7.3 weekly

- `time_of_day` 필수
- `weekdays` 최소 1개 필요
- `cron`은 `분 시 * * 요일목록` 형태로 계산

### 7.4 cron

- FE는 기본 형식 검증만 수행한다
- 최종 authoritative validation은 Spring이 담당한다

---

## 8. 이번 범위에서 건드리지 않는 것

- 기존 `trigger` 노드 표시 컴포넌트의 적극적 재사용
- webhook 발급 UI
- workflow list와 dashboard의 전체 상태 문구 재설계

다만 `workflow.active` 의미가 사실상 자동 실행 활성화 여부로 고정되므로, list와 dashboard 문구는 후속 보정이 필요하다.

---

### 8.1 interval UX 보완점

- 현재 구현에서 `몇 시간마다 확인`은 내부적으로 `cron`으로 변환되어 시계 기준 슬롯에 맞춰 동작한다.
- 예를 들어 `4시간마다`는 `0, 4, 8, 12, 16, 20시` 기준으로 실행된다.
- 따라서 사용자가 오후 `1:17`에 자동 실행을 다시 켜면 다음 실행은 `5:17`이 아니라 `16:00`이 된다.
- 하지만 사용자 입장에서는 `몇 시간마다`를 보통 `내가 켠 시점부터 N시간마다`로 이해할 가능성이 높다.
- 향후 UX 목표는 `interval`을 켠 시점 기준 반복으로 바꾸는 것이다.
- 즉 `13:17`에 `4시간마다`를 켜면 `17:17`, `21:17`처럼 반복되는 흐름이 더 자연스럽다.
- 이를 위해서는 FE가 단순 `interval_hours -> cron` 변환만 하는 대신, 기준 시각 metadata를 함께 저장하는 Spring 계약 확장이 필요하다.
- `daily`, `weekly`는 계속 시계 기준으로 유지하고, 이 보완은 `interval`에만 적용하는 방향이 적절하다.

## 9. 검증 전략

이번 기능은 UI가 보이는지만 확인하면 부족하다. 저장, 복원, 권한, 다중 workflow 회귀까지 함께 검증한다.

### 9.1 단위 테스트

- trigger summary formatter가 manual, interval, daily, weekly, cron을 올바르게 요약한다.
- FE trigger -> Spring payload 변환이 올바른 `type + config` 구조를 만든다.
- `manual -> schedule -> manual` 전환 시 schedule 잔재가 저장되지 않는다.
- dirty state가 trigger 변경에도 정확히 반응한다.

### 9.2 컴포넌트 테스트

- `EditorRemoteBar`에서 trigger settings를 열고 저장값을 수정할 수 있다.
- `schedule`에서만 active toggle이 노출된다.
- shared user는 동일한 UI를 보되 수정은 막힌다.
- 새로고침 hydrate 후에도 같은 trigger 값이 폼에 복원된다.

### 9.3 계약 테스트

- `toWorkflowUpdateRequest()`가 `trigger`와 `active`를 함께 보낸다.
- Spring 스타일 schedule payload를 hydrate 후 다시 저장해도 구조가 깨지지 않는다.
- source mode의 `trigger_kind`를 바꿔도 workflow trigger state가 덮어써지지 않는다.

### 9.4 다중 workflow 회귀 테스트

- workflow A의 trigger를 수정한 뒤 workflow B를 열어도 상태가 섞이지 않는다.
- 여러 workflow를 연속 저장해도 각 trigger summary가 올바르게 유지된다.
- list 화면에서 수동 workflow와 schedule workflow가 섞여 있어도 편집기 복원값이 혼동되지 않는다.
- shared workflow와 owner workflow를 번갈아 열어도 권한 상태가 잘못 캐시되지 않는다.

### 9.5 수동 회귀 테스트

- 새 workflow 생성 시 기본 trigger가 manual로 저장된다.
- `4시간마다 확인` 저장 후 새로고침하면 같은 값으로 보인다.
- `자동 실행 끄기` 저장 후 다시 열면 비활성 상태가 유지된다.
- 시작 노드의 `trigger_kind`를 바꿔도 자동 실행 설정은 그대로 유지된다.

### 9.6 실행 커맨드 기준

- `pnpm test`
- `pnpm build`

---

## 10. 한 줄 요약

이번 FE 작업의 핵심은 workflow-level 자동 실행 설정을 `EditorRemoteBar`에서 편집 가능한 persisted state로 승격하고, Spring 계약에 맞는 `trigger + active` 저장 흐름을 완성하는 것이다.
