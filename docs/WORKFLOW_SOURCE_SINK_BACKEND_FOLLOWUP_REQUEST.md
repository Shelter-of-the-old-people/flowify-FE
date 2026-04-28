# Workflow Source/Sink 백엔드 재요청서

> 작성일: 2026-04-20
> 대상 프로젝트:
> - `flowify-BE-spring`
> - `flowify-BE`
> 관련 문서:
> - `docs/WORKFLOW_SOURCE_SINK_FLOW_DESIGN.md`
> - `docs/WORKFLOW_SOURCE_SINK_BACKEND_REQUEST.md`
> - `docs/WORKFLOW_SOURCE_SINK_BACKEND_ISSUES.md`

---

## 1. 목적

이 문서는 source/sink 기반 workflow editor와 관련해
**1차 요청 이후 backend에 실제로 반영된 내용과 아직 남아 있는 간극**을 정리한 뒤,
backend의 추가 판단과 보완 계획을 다시 요청하는 문서다.

즉 이번 요청은
- “아직 아무것도 없는 상태”에서의 최초 요청이 아니라
- **일부 구현이 들어온 현재 상태를 상세히 공유하고, 남은 핵심 계약을 다시 확인하는 follow-up 요청**
이다.

---

## 2. 중요한 전제

이번 재요청서도 여전히 아래 전제를 갖는다.

- FE는 현재 backend 실행 코드와 문서를 기준으로 상태를 파악했다
- 하지만 FE가 모르는 backend 내부 계획이 있을 수 있다
- 특히 아래 항목은 FE가 완전히 알기 어렵다

예:

- 아직 머지되지 않은 backend 브랜치 계획
- Spring/FastAPI 역할 분리의 내부 합의
- translation layer 고도화 계획
- provider별 OAuth / trigger / 실행 제약
- 운영/배포/성능/보안 상의 숨은 제약

따라서 backend는 이 문서를 검토할 때,
**필요하면 먼저 사실관계를 정정하고 그 뒤에 범위와 우선순위를 다시 합의하는 방식**으로 봐주어야 한다.

---

## 3. 현재 FE가 확인한 backend 반영 상태

## 3.1 이미 반영된 것

현재 FE가 확인한 구현 반영 사항은 아래와 같다.

### A. source/sink catalog public API

Spring에는 아래 엔드포인트가 실제로 생겼다.

- `GET /api/editor-catalog/sources`
- `GET /api/editor-catalog/sinks`
- `GET /api/editor-catalog/sinks/{serviceKey}/schema`

즉 source/sink catalog 자체는 더 이상 “완전 부재” 상태가 아니다.

### B. 정적 catalog public contract 초안

Spring은 아래 정적 JSON을 로드해 catalog를 제공한다.

- `catalog/source_catalog.json`
- `catalog/sink_catalog.json`
- `catalog/schema_types.json`

즉 source mode, canonical input type, target schema, sink schema, canonical schema type의
**1차 public contract 초안**은 생긴 상태로 보인다.

다만 FE는 이것을
- 장기 authoritative source
가 아니라
- 현재 Spring이 외부로 노출하는 정적 bootstrap catalog
수준으로 이해하고 있다.

### C. schema preview API

Spring에는 아래 엔드포인트가 실제로 생겼다.

- `GET /api/workflows/{id}/schema-preview`

즉 FE 설정 단계용 결과 schema preview가 완전히 없는 상태는 아니다.

### D. translation layer 초안

Spring에는 `WorkflowTranslator`가 추가되었고,
실행 직전에 `ExecutionService`에서 translator를 거쳐 FastAPI로 전달한다.

즉 `옵션 B` 방향은 코드로 일부 반영된 상태다.

### E. catalog / preflight 관련 error code

아래 에러 코드는 추가된 것으로 확인된다.

- `CATALOG_SERVICE_NOT_FOUND`
- `CATALOG_INVALID_INPUT_TYPE`
- `PREFLIGHT_VALIDATION_FAILED`

다만 FE는 이것을
**“preflight 전용 검증 흐름이 이미 완성되었다”는 뜻으로 해석하지는 않는다.**
현재는 관련 error code가 먼저 추가된 상태로 이해하고 있다.

---

## 3.2 아직 남아 있는 핵심 간극

FE가 보기에는 아래 항목이 아직 완전히 닫히지 않았다.

### A. translation layer가 runtime mismatch를 실제로 해소하지 못함

현재 translator는
- `runtime_source`
- `runtime_sink`
를 추가하는 수준이며,
Spring node의 `type` 자체를 FastAPI runtime type으로 실제 변환하지는 않는다.

반면 FastAPI 실행기는 여전히 아래 5개 type 중심이다.

- `input`
- `llm`
- `if_else`
- `loop`
- `output`

즉 translator가 **실행 가능한 runtime shape로 완전히 바꿔준다**고 보기는 어렵다.

### B. FastAPI input/output strategy가 아직 placeholder 수준

FastAPI의
- `InputNodeStrategy`
- `OutputNodeStrategy`

는 source/sink 서비스 실행을 실제로 처리하지 않고,
현재는 TODO/placeholder 수준에 가깝다.

즉 source/sink editor가 열려도,
실제 실행까지 자연스럽게 이어진다고 보기는 어렵다.

### C. runtime strategy readiness가 별도로 확인되지 않음

현재 FE가 보기에는
- translator shape
와
- FastAPI input/output runtime strategy readiness

는 서로 연결되어 있지만 동일한 질문은 아니다.

즉 translator가 더 정교해지더라도,
FastAPI의 source/sink 실행 strategy가 계속 placeholder 수준이면
실행 계약은 여전히 완전히 닫히지 않는다.

### D. incomplete lifecycle 계약 부재

아직 backend 모델에는 아래가 공식적으로 들어오지 않았다.

- `isConfigured`
- `save 가능 / choice 가능 / execute 가능`의 구분 계약
- `validateForExecution()` 같은 preflight 전용 검증 흐름

현재는 저장은 느슨하게 가능하지만,
실행 전 검증은 여전히 일반 validator에 의존하는 것으로 보인다.

### E. schema preview의 범위가 제한적임

현재 schema preview는:

- `GET /api/workflows/{id}/schema-preview`
- 저장된 workflow 기준
- 마지막 `outputDataType` 추론 기반
- canonical schema type 정적 매핑 중심

정도로 보인다.

즉 FE가 상상하는
- unsaved draft 반영
- branch/follow-up/transform까지 반영된 richer preview
와는 아직 차이가 있다.

FE가 보기에는 현재 구현은
**“workflow 결과 구조를 깊게 계산하는 schema inference”라기보다, 마지막 canonical type을 찾아 정적 schema definition을 반환하는 1차 preview**
에 더 가깝다.

### F. sink schema의 inputType별 차별화 부족

현재 sink schema API는 `inputType`을 받지만,
지금 구현은 대부분
- accepted input type 검증
- 동일 `configSchema` 반환

형태에 가까워 보인다.

즉 `inputType`마다 schema가 실질적으로 달라지는 수준까지는 아직 아닌 것으로 보인다.

### G. OAuth / service taxonomy 정렬 미완료

catalog는 service key 중심으로 잘 정리됐지만,
실행 시 토큰 수집은 여전히 `category == "service"` 전제에 기대고 있다.

즉 source/sink service catalog와 runtime token collection 규칙이
완전히 같은 언어를 쓴다고 보긴 어렵다.

### H. mapping rules delivery는 여전히 비어 있음

`mapping_rules.json`은 여전히 middle choice 내부 로직으로만 사용되는 것으로 보이며,
FE가 직접 소비할 public delivery contract는 아직 없다.

FE는 이 항목을 더 이상 필요 없다고 판단한 것이 아니라,
이번 follow-up 문서에서 다시 명시적으로 확인할 필요가 있다고 보고 있다.

### I. catalog wire contract의 최종 shape가 아직 확정되지 않음

현재 FE는 source/sink catalog API가 생긴 것은 확인했지만,
아래는 아직 최종 확정으로 보지 않는다.

- 응답 필드 naming convention
- camelCase vs snake_case
- 정적 JSON catalog가 장기 authoritative source인지 여부
- sink schema endpoint가 inputType별로 실제 분기되는 최종 구조인지 여부

---

## 4. FE 최종 판단

FE가 현재 이해한 결론은 아래와 같다.

### 4.1 좋은 신호

- 방향 자체는 backend가 받아들였다
- source/sink catalog는 실제 코드로 들어왔다
- schema preview도 1차 구현이 들어왔다
- translation layer도 “있다”

즉 **문서 요청이 무시된 상태는 아니다.**

### 4.2 아직 결정이 더 필요한 이유

하지만 FE가 source/sink editor를 실제 구현으로 열기엔 아직 아래가 남아 있다.

1. translator가 실제 runtime mismatch를 닫을 수 있는가
2. incomplete lifecycle을 어떤 상태 모델로 다룰 것인가
3. schema preview를 어디까지 authoritative 하게 만들 것인가
4. sink schema를 inputType별로 얼마나 세분화할 것인가
5. service taxonomy와 OAuth/token collection을 어떻게 정렬할 것인가

즉 지금 상태는:

**1차 구현은 들어왔지만, FE가 실제 source/sink editor를 안정적으로 붙이기엔 핵심 실행 계약이 아직 부분 반영 상태**
라고 판단하고 있다.

---

## 5. backend에 다시 요청하는 핵심 판단

이번 재요청에서 backend에 특히 다시 확인받고 싶은 것은 아래 7가지다.

## 5.1 translation layer 완성 범위

질문:

1. translator는 최종적으로 Spring editor model의 `type`을 FastAPI runtime type으로 실제 변환할 계획인가?
2. 그렇다면 그 mapping은 어디서 authoritative 하게 관리할 계획인가?
3. `runtime_source`, `runtime_sink`는 최종 shape인가, 임시 intermediate shape인가?
4. FastAPI가 이 intermediate shape를 직접 이해하도록 바뀌는지, 아니면 Spring에서 더 바꿔서 보내는지?

핵심:

**translator가 최종적으로 무엇을 입력으로 받고 무엇을 출력으로 낼지**를 확정해달라는 요청이다.

---

## 5.2 runtime strategy readiness

질문:

1. FastAPI의 `InputNodeStrategy` / `OutputNodeStrategy`는 언제 placeholder를 벗어나 실제 source/sink 실행을 담당하게 되는가?
2. translator 고도화와 runtime strategy 구현 중, backend는 어느 쪽을 먼저 닫을 계획인가?
3. 최종적으로 FastAPI는
   - generic runtime type만 이해하고 source/sink는 translator가 모두 풀어주는 구조인지
   - 아니면 `runtime_source`, `runtime_sink` 같은 intermediate shape를 직접 이해하는 구조인지
   를 어떻게 보나?
4. source/sink editor를 실제로 열기 전에 runtime readiness 기준으로 반드시 충족되어야 할 조건은 무엇인가?

핵심:

**translator와 별개로, 실제 source/sink 실행 경로가 언제 placeholder 상태를 벗어나는지**
를 확인하고 싶다.

---

## 5.3 incomplete node lifecycle 계약

질문:

1. `isConfigured` 또는 동등한 상태를 backend 모델에 넣을 계획이 있는가?
2. 아래를 공식 계약으로 분리할 수 있는가?
   - save 가능 조건
   - choice 가능 조건
   - execute 가능 조건
3. preflight validation은 별도 메서드/별도 계층으로 둘 계획이 있는가?
4. start/end 미완료 node를 backend가 어디까지 공식 지원할 것인가?

핵심:

**“저장 가능”과 “실행 가능”을 backend가 어떤 공식 상태 모델로 나눌 것인지**
를 확인하고 싶다.

---

## 5.4 schema preview 최종안

질문:

1. 현재 `GET /api/workflows/{id}/schema-preview`가 최종 public contract인가?
2. 아니면 문서 권장안처럼 draft body를 받는 preview API로 확장할 계획이 있는가?
3. schema preview는 어느 수준까지 반영할 계획인가?
   - 마지막 outputDataType 수준
   - branch/follow-up/transform 반영
   - sink mapping에 바로 쓸 수 있는 richer field inference
4. schema inference 책임 계층은 Spring인지, FastAPI인지, 공용 분석 계층인지 최종적으로 어디인가?

핵심:

**FE가 sink 마지막 단계 UI를 설계할 수 있을 정도로 schema preview를 어디까지 고도화할 것인지**
를 확인하고 싶다.

---

## 5.5 sink schema와 service taxonomy

질문:

1. sink schema는 inputType별로 실제로 달라질 계획인가?
2. 그렇다면 같은 service의 `configSchema`가 inputType에 따라 분기되는 구조를 공식화할 계획이 있는가?
3. source/sink catalog의 service key와 실행시 token collection 규칙을 하나로 맞출 계획이 있는가?
4. `category == "service"` 전제를 유지할 것인지, 더 일반화할 것인지?

핵심:

**catalog contract와 runtime execution/OAuth contract가 같은 분류 체계를 쓰도록 정렬할 것인지**
를 다시 확인하고 싶다.

---

## 5.6 mapping rules delivery

질문:

1. backend는 `mapping_rules.json`과 동등한 규칙 데이터를 FE가 직접 소비할 public contract로 제공할 계획이 있는가?
2. 아니면 계속 backend 내부 middle choice 로직으로만 유지할 계획인가?
3. 후자라면 FE와 backend가 같은 규칙 버전을 공유한다는 보장을 어떤 방식으로 만들 계획인가?

핵심:

**`mapping_rules.json`이 계속 backend 내부 전용 규칙인지, 아니면 FE와 공유하는 계약으로 승격될 여지가 있는지**
를 다시 확인하고 싶다.

---

## 5.7 catalog final wire contract

질문:

1. source/sink catalog의 응답 필드 naming은 최종적으로 camelCase인가, snake_case인가?
2. 현재 정적 JSON catalog는 장기 authoritative source인가, 임시 bootstrap data인가?
3. sink schema endpoint는 최종적으로 inputType별로 실질적으로 다른 schema를 반환하게 되는가?
4. FE가 지금 문서에 적은 예시 shape를 그대로 믿어도 되는지, 아니면 실제 wire contract는 따로 다시 확정해야 하는가?

핵심:

**catalog가 “있다”는 수준을 넘어, FE가 실제로 의존할 최종 응답 shape와 authority 범위를 확정해달라는 요청**이다.

---

## 6. backend에 요청하는 응답 형식

가능하면 아래 형식으로 답변을 부탁드린다.

### A. 이미 구현 완료로 볼 수 있는 것

- 항목
- 근거 파일/라인
- FE가 그대로 믿어도 되는지 여부

### B. 현재는 1차 구현이지만 아직 미완성인 것

- 항목
- 현재 상태
- 최종적으로 어떤 방향으로 갈 예정인지
- FE가 지금 가정하면 안 되는 부분

### C. backend가 추가로 결정해야 하는 것

- 항목
- 선택지
- backend 권장안
- 이유

### D. FE가 당장 구현하면 안 되는 것

- 항목
- 이유
- 선행 조건

---

## 7. backend에 명시적으로 요청하는 점

이번 재요청에서 가장 중요한 요청은 아래다.

1. 지금 들어온 구현을 기준으로,
   **무엇이 이미 확정된 계약인지**
   와
   **무엇이 아직 임시 구현인지**
   를 분리해 달라

2. FE가 아직 모르는 내부 계획이나 제약이 있다면,
   이번에는 그것을 **명시적으로 먼저 정정**해 달라

3. 특히 아래 항목은 반드시 backend 최종 판단을 부탁한다
   - translation layer 최종 shape
   - runtime strategy readiness
   - incomplete lifecycle 상태 모델
   - schema preview 최종 범위
   - service taxonomy / OAuth 정렬 방식
   - mapping rules delivery 여부
   - catalog final wire contract

즉 FE는 이번 재요청을
**“1차 반영은 확인했지만, 실제 구현 착수를 위해 아직 남은 계약을 최종 확정받는 단계”**
로 보고 있다.

---

## 8. 한 줄 요약

현재 backend는 source/sink editor 관련 문서 요청을 **1차로 상당 부분 반영**했지만,
FE가 실제 구현을 열기 전에 아직
**translator 완성, lifecycle 계약, schema preview 고도화, taxonomy 정렬**
이 더 필요하므로, 이번 재요청서는 그 남은 핵심 계약을 최종 판단받기 위한 문서다.
