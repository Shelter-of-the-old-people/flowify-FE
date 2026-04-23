# Workflow Source/Sink Backend Final Alignment Request

> 작성일 2026-04-20
> 대상 프로젝트:
> - `flowify-BE-spring`
> - `flowify-BE`
> 관련 문서:
> - `docs/WORKFLOW_SOURCE_SINK_FLOW_DESIGN.md`
> - `docs/WORKFLOW_SOURCE_SINK_BACKEND_ISSUES.md`
> - `docs/WORKFLOW_SOURCE_SINK_BACKEND_FOLLOWUP_REQUEST.md`
> - `docs/BACKEND_2ND_UPDATE_PLAN.md`

---

## 1. 목적

이 문서는 source/sink 기반 workflow editor와 관련해
**현재 FE가 확인한 backend 상태를 다시 정리하고,
아직 최종 합의가 필요한 계약을 backend와 명확히 맞추기 위한 최종 정렬 요청서**다.

이번 요청의 목적은 두 가지다.

1. FE가 파악한 현재 backend 구현/계획이 맞는지 최종 확인
2. 아직 해석 차이가 남아 있는 항목을 backend 기준으로 못 박기

즉 이 문서는 새로운 요구를 추가하기 위한 문서라기보다,
**이미 공유된 목표 상태와 2차 업데이트 계획 사이에서 아직 열려 있는 판단을 닫기 위한 문서**다.

---

## 2. 중요한 전제

이 문서는 FE가 현재 코드와 문서를 기반으로 정리한 판단이다.

따라서 backend에는 아래 전제를 먼저 요청드린다.

- FE가 모르는 backend 내부 계획, 분리된 브랜치, 배포 제약, FastAPI 측 선행 작업이 있을 수 있다
- FE가 아래에서 기술한 "현재 상태"나 "남은 간극" 중 일부를 잘못 이해했을 수 있다
- **그 경우 backend가 먼저 사실관계를 정정한 뒤, 그 기준으로 다시 범위와 우선순위를 맞춰주길 요청한다**

즉 이 문서는 FE의 단정문이 아니라,
**backend가 최종 authoritative 판단을 내려주기를 요청하는 정렬 문서**다.

---

## 3. FE가 현재 확인한 backend 상태

아래 내용은 FE가 현재 코드와 계획서를 함께 보고 확인한 상태다.

## 3.1 이미 들어온 것

### A. source/sink catalog public API

Spring에는 아래 public API가 이미 들어와 있다고 FE는 이해하고 있다.

- `GET /api/editor-catalog/sources`
- `GET /api/editor-catalog/sinks`
- `GET /api/editor-catalog/sinks/{serviceKey}/schema`

즉 source/sink catalog가 "전혀 없음" 상태는 이미 벗어났다.

### B. static catalog public contract bootstrap

Spring은 현재 정적 catalog JSON을 로드해 public contract처럼 노출하고 있다고 FE는 이해하고 있다.

- `catalog/source_catalog.json`
- `catalog/sink_catalog.json`
- `catalog/schema_types.json`

다만 FE는 이것을
**장기 authoritative source가 확정된 상태**로 보지는 않고,
**현재 Spring이 노출하는 1차 public contract bootstrap**으로 이해하고 있다.

### C. schema preview 1차 구현

Spring에는 현재 아래 API가 들어와 있다고 FE는 이해하고 있다.

- `GET /api/workflows/{id}/schema-preview`

즉 schema preview 자체는 없는 상태가 아니다.

### D. translator 초안

Spring에는 `WorkflowTranslator`가 있고,
`ExecutionService`가 실행 직전에 translator를 거쳐 FastAPI로 runtime payload를 넘기는 구조라고 FE는 이해하고 있다.

즉 방향상 `옵션 B`

- Spring: editor/public contract
- FastAPI: runtime/execution contract
- translator: 둘 사이 변환

은 코드 수준에서 시작된 상태로 본다.

---

## 3.2 FE가 보기엔 아직 열려 있는 핵심 간극

아래는 FE가 현재까지도 "완전히 닫히지 않았다"고 보는 항목들이다.

### A. lifecycle 계약

현재 backend 2차 계획은 lifecycle을 명시적으로 다루려 하지만,
FE 기준으로는 아직 start/end의 완료 기준이 요구사항보다 느슨해 보인다.

특히 FE 목표 상태 기준으로는:

- start는 `service -> auth -> source mode -> target -> canonical type`
- end는 `service/auth 선택 -> 임시 end node -> 마지막 sink 상세 설정 완료`

까지 가야 한다.

그런데 2차 계획서의 lifecycle 표는 이 기준을 충분히 반영하지 않는 것으로 보인다.

### B. nodeStatuses 응답 범위

2차 계획서는 `GET /api/workflows/{id}`에 `nodeStatuses`를 추가하는 방향을 제안한다.

다만 FE가 현재 코드 기준으로 확인한 바로는,
Spring은 `WorkflowResponse`를 상세 조회 외에도 여러 API에서 공통으로 사용한다.

그래서 이 변경이 정말 상세 조회에만 한정되는지,
아니면 더 넓은 응답 shape 변경으로 이어지는지 확인이 필요하다.

### C. taxonomy / OAuth 정렬

2차 계획서는 service key 정렬을 다루지만,
FE가 계속 우려하는 핵심은 단순 key 문자열 일치가 아니다.

FE가 확인이 필요한 것은 아래 세 축이 같은 분류 체계를 쓰는지다.

- catalog service key
- OAuth token collection
- runtime execution service classification

특히 현재 실행 경로가 `category == "service"` 전제를 계속 갖고 있다면,
catalog 중심 source/sink editor와 완전히 정렬됐다고 보기 어렵다.

### D. translator 완료 기준

FE는 translator가 존재한다는 사실과
"translator가 runtime mismatch를 실질적으로 해소했다"는 판단을 구분해서 보고 있다.

FE가 현재 보기에는 아직 아래가 열려 있다.

- `runtime_type`가 최종 contract인지
- `runtime_source`, `runtime_sink`, `runtime_config`가 intermediate인지 최종인지
- FastAPI가 이 payload를 실제로 언제 수용할지
- 기존 `type`와 `runtime_type`를 함께 둘지, 최종적으로 runtime 기준으로 정리할지

### E. schema preview depth

`POST /api/workflows/schema-preview` 방향은 FE 요구와 잘 맞는다.

다만 FE가 확인이 필요한 건 transport가 아니라 결과 깊이다.

즉 backend가 최종적으로 제공할 preview가:

- 단순 canonical type 기반 정적 schema preview인지
- branch / follow-up / transform / draft config를 반영한 richer inference인지

를 명확히 알고 싶다.

### F. mapping_rules public contract

FE는 `mapping_rules`와 동등한 규칙 데이터 또는 버전 공유 계약이 필요하다고 봤다.

다만 2차 계획서가 제안한
`mapping_rules.json` 원본 전체 공개가 최종안인지는 다시 확인이 필요하다.

FE는 아래 두 방향 중 무엇이 backend에 더 적절한지 최종 판단을 요청한다.

- raw file 전체 공개
- FE public consumption에 맞춘 가공 contract 제공

### G. sink schema scope

2차 계획서가 `config_schema_scope: "per_service"`를 먼저 두고,
1차 범위에선 service 단위 단일 schema를 유지하는 방향은 이해한다.

다만 FE는 이게 정말 1차 범위에서 충분한지,
그리고 어떤 서비스들에 대해선 이후 반드시 `per_input_type`로 갈 가능성이 큰지
backend 판단을 다시 확인하고 싶다.

### H. wire contract 최종 shape

catalog 계열은 snake_case 방향이 맞는 것으로 보이지만,
workflow 응답까지 포함해 전체 wire contract를 어떻게 가져갈지는 아직 완전히 닫히지 않았다고 FE는 본다.

특히 아래를 다시 확인하고 싶다.

- catalog API naming convention
- workflow API naming convention
- `nodeStatuses`가 붙는 응답 shape
- preview request/response shape

---

## 4. backend에 최종 확인 요청하는 항목

아래는 FE가 이번 요청에서 backend에 최종 판단을 받고 싶은 항목들이다.

## 4.1 lifecycle 계약을 최종적으로 어떻게 정의할 것인가

질문:

1. start node의 `configured` 기준에 아래가 모두 포함되는가?
   - service 선택
   - auth 충족 여부
   - source mode 선택
   - target 선택
   - canonical type 확정

2. end node의 `configured` 기준에 아래가 포함되는가?
   - sink service 선택
   - auth 충족 여부
   - 마지막 sink detailed config 완료 여부

3. `saveable`, `choiceable`, `executable`은 각각 어떤 조건으로 판단할 것인가?

4. source catalog에서 `auth_required: false`인 서비스는
   start node `executable` 판단에서 OAuth를 예외 처리하는가?

5. `isConfigured` 같은 명시 상태를 실제 model/response에 둘 것인가,
   아니면 `nodeStatuses` 계산 결과만 둘 것인가?

FE가 필요한 건
**start/end/middle 각각에 대해 어떤 상태를 completion으로 볼지에 대한 최종 contract**다.

---

## 4.2 nodeStatuses를 어디에 어떻게 실을 것인가

질문:

1. `nodeStatuses`는 정말 `GET /api/workflows/{id}` 응답에 포함하는 것이 최종안인가?
2. 그렇다면 `WorkflowResponse` 공용 DTO 변경으로 갈 것인가?
3. 아니면 아래 같은 별도 분리안이 더 적절한가?
   - `GET /api/workflows/{id}/status`
   - `GET /api/workflows/{id}/detail`
   - 별도 response DTO

4. create/update/addNode/updateNode 같은 API도 같은 응답 shape를 따라갈 계획인가?

FE가 필요한 건
**lifecycle 정보를 어느 응답에서 authoritative 하게 소비하면 되는지**다.

---

## 4.3 service taxonomy / OAuth 정렬을 최종적으로 어떻게 가져갈 것인가

질문:

1. runtime token collection은 계속 `category == "service"` 기준으로 갈 것인가?
2. 아니면 catalog service key 기준으로 일반화할 계획인가?
3. source/sink editor 도입 이후에도 `category`는 runtime/OAuth 판단의 핵심 축으로 남는가?
4. 아래 세 축을 동일 체계로 맞출 계획인가?
   - source/sink catalog service key
   - OAuth token 저장/조회 key
   - runtime execution service classification

FE가 필요한 건
**service taxonomy가 실제 실행 계약까지 정렬되는지 여부**다.

---

## 4.4 translator의 최종 완료 기준은 무엇인가

질문:

1. translator의 최종 출력 shape는 무엇인가?
   - `runtime_type`
   - `runtime_source`
   - `runtime_sink`
   - `runtime_config`
   - 기존 `type`

2. `runtime_type`는 Spring이 authoritative 하게 결정하는가?
3. FastAPI는 최종적으로 어떤 필드를 기준으로 실행할 것인가?
4. translator 완료 기준은
   - Spring payload shape 정의 완료
   - FastAPI 수용 완료
   중 어디까지 포함하는가?

5. FastAPI `InputNodeStrategy` / `OutputNodeStrategy`가 placeholder를 벗어나는 일정과 연동 계획은 어떻게 되는가?

FE가 필요한 건
**translator가 “초안 존재” 수준인지, “실행 계약 완성” 수준인지의 경계**다.

---

## 4.5 schema preview는 어디까지 authoritative 하게 만들 것인가

질문:

1. `POST /api/workflows/schema-preview`는 최종적으로 추가되는가?
2. 이 API는 unsaved draft를 공식 지원하는가?
3. preview는 아래 중 어느 수준까지 반영하는가?
   - 마지막 canonical type만 반영
   - node config 반영
   - follow-up / branch 반영
   - transform 이후 field inference 반영

4. FE가 sink 마지막 단계에서 믿고 쓸 수 있는 수준의 preview를 줄 것인가?
5. preview response shape는 현재 canonical schema definition 기반을 유지하는가,
   아니면 더 풍부한 field metadata를 줄 계획이 있는가?

FE가 필요한 건
**schema preview의 transport뿐 아니라 inference depth의 최종 범위**다.

---

## 4.6 mapping_rules public contract는 어떤 수준으로 열 것인가

질문:

1. `GET /api/editor-catalog/mapping-rules`는 실제로 열 계획인가?
2. 연다면 아래 중 어느 방향이 최종안인가?
   - raw `mapping_rules.json` 전체 공개
   - FE consumption용 가공 contract 공개
   - 파일 전체 공개는 하지 않고 버전/동등 규칙만 공유

3. 현재 Spring 내부 typed model이 바뀌어도 FE public contract는 안정적으로 유지할 계획인가?

FE가 필요한 건
**middle rules를 public contract로 어느 수준까지 노출할지에 대한 최종 합의**다.

---

## 4.7 sink schema scope를 1차에 어디까지 가져갈 것인가

질문:

1. 1차 범위에서 `config_schema_scope: "per_service"`를 유지하는 것이 backend 최종 판단인가?
2. 그렇다면 아래 서비스들도 1차에는 단일 schema로 충분하다고 보는가?
   - Gmail
   - Google Drive
   - Google Sheets
   - Google Calendar
   - Notion

3. `per_input_type`로 반드시 확장될 가능성이 큰 서비스는 무엇인가?
4. FE는 1차에 `per_service`만 지원한다고 가정해도 되는가?

---

## 4.8 wire contract 최종 합의

질문:

1. catalog API는 snake_case를 최종 규칙으로 확정하는가?
2. workflow API 응답도 같은 규칙으로 가져갈 것인가, 아니면 별도 규칙을 유지하는가?
3. preview request/response, nodeStatuses, sink schema scope 필드 naming도 이번에 함께 확정 가능한가?

FE가 필요한 건
**실제 wire contract naming과 field shape를 더 이상 흔들리지 않게 고정하는 것**이다.

---

## 5. backend가 답변할 때 요청하는 형식

가능하면 아래 형식으로 답변을 부탁드린다.

### A. FE가 이해한 현재 상태 중 맞는 것 / 틀린 것
- 맞는 것
- 정정이 필요한 것

### B. 이번 2차 업데이트 계획에서 최종 확정할 것
- lifecycle
- nodeStatuses placement
- taxonomy/OAuth
- translator final shape
- schema preview depth
- mapping_rules public contract
- sink schema scope
- wire contract

### C. 이번 스프린트에 실제로 들어가는 것
- 항목
- API / model / validator / translator / FastAPI 중 어디 변경인지
- 완료 조건

### D. 다음 단계로 넘기는 것
- 항목
- 왜 이번 범위 밖인지
- FE가 그 전까지 무엇을 가정하면 되는지

---

## 6. 한 줄 요약

FE 판단으로는 backend가 이미 많은 것을 반영했다.

하지만 source/sink editor를 실제로 안정적으로 붙이려면,
아직 아래 계약은 backend가 최종 authoritative 판단으로 못 박아야 한다.

- lifecycle completion 기준
- nodeStatuses 응답 placement
- taxonomy/OAuth 정렬
- translator 최종 payload shape
- schema preview 깊이
- mapping_rules public contract 범위
- sink schema scope
- wire contract naming

즉 이번 요청은
**“무엇을 더 구현해 달라”는 요청이라기보다, 이미 진행 중인 2차 계획을 FE와 backend가 같은 해석으로 잠그기 위한 최종 정렬 요청**이다.
