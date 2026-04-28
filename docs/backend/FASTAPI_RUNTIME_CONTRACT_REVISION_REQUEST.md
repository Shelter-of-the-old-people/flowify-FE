# FASTAPI Runtime Contract 문서 수정 요청서

> 작성일: 2026-04-20
> 발신: Frontend / Editor 설계 검토
> 수신: Spring Backend, FastAPI Team
> 대상 문서: `docs/backend/FASTAPI_RUNTIME_CONTRACT_REQUEST.md`
> 관련 문서:
> - `docs/WORKFLOW_SOURCE_SINK_BACKEND_FINAL_REQUEST.md`
> - `docs/backend/BACKEND_2ND_UPDATE_PLAN.md`
> - `flowify-BE-spring/src/main/resources/docs/FASTAPI_SPRINGBOOT_API_SPEC.md`
> - `flowify-BE-spring/src/main/resources/catalog/source_catalog.json`

---

## 1. 목적

이 문서는 `FASTAPI_RUNTIME_CONTRACT_REQUEST.md`를 바로 실행용 문서로 보내기 전에,
현재 확인된 충돌과 해석 차이를 반영해 **문서 자체를 수정 요청**하기 위한 문서다.

핵심 목적은 아래와 같다.

- Spring이 이미 확정한 source/sink catalog와 FastAPI runtime 요청 문서의 용어를 일치시킨다
- 기존 Spring ↔ FastAPI 실행 명세와 새 runtime contract 문서의 관계를 분명히 한다
- FastAPI가 실제로 구현해야 할 입력/출력 payload shape를 더 구체화한다
- 미지원 service/mode 처리 규칙과 validation migration 범위를 명시한다

---

## 2. 중요한 전제

아래 요청은 FE가 현재 문서와 실행 코드를 함께 대조한 결과를 바탕으로 정리한 것이다.

다만 FE가 모르는 backend 내부 계획이나 미반영 브랜치가 있을 수 있으므로,
사실관계가 다르면 backend에서 먼저 정정해 주는 것을 전제로 한다.

즉 이 문서는 backend를 교정하려는 문서가 아니라,
**FastAPI runtime contract 문서를 더 정확하게 만들기 위한 수정 요청 문서**다.

---

## 3. 현재 FE 판단 요약

`FASTAPI_RUNTIME_CONTRACT_REQUEST.md`의 큰 방향은 맞다.

- Spring = public/editor contract owner
- FastAPI = runtime/execution owner
- translator = boundary
- `runtime_type` 5종으로 전략 선택

이 축은 유지하는 것이 맞다.

다만 현재 문서는 아래 이유로 바로 구현 기준 문서로 쓰기엔 위험하다.

1. Spring source catalog와 `mode` key가 안 맞는 부분이 있다
2. 기존 Spring ↔ FastAPI 실행 명세를 대체하는지, 과도기 문서인지가 모호하다
3. Input/Output 전략이 어떤 normalized payload를 반환해야 하는지가 충분히 구체적이지 않다
4. Spring catalog에는 이미 더 많은 source가 있는데, FastAPI 1차 범위 밖 서비스의 처리 규칙이 없다
5. `runtime_source`/`runtime_sink` 전환 시 validation contract migration도 함께 적혀야 한다

---

## 4. 문서 수정 요청 항목

## 4.1 source mode 이름을 Spring source catalog와 정확히 맞춰달라

현재 요청 문서의 1차 범위 예시는 실제 Spring catalog와 다르다.

현재 문서 예시:

- `google_drive`: `single_file`, `file_changed`, `new_file`, `folder_list`
- `gmail`: `email_received`, `latest_unread`, `search_email`
- `google_sheets`: `sheet_data`, `sheet_updated`
- `slack`: `channel_message`

실제 Spring source catalog:

- `google_drive`: `single_file`, `file_changed`, `new_file`, `folder_new_file`, `folder_all_files`
- `gmail`: `single_email`, `new_email`, `sender_email`, `starred_email`, `label_emails`, `attachment_email`
- `google_sheets`: `sheet_all`, `new_row`, `row_updated`
- `slack`: `channel_messages`

즉 수정 요청은 아래와 같다.

- 문서의 phase 1 source mode 목록을 실제 Spring catalog key 기준으로 수정
- 1차 구현 범위를 줄이더라도, **존재하지 않는 mode key는 절대 예시로 쓰지 않음**
- 가능하면 문서에 “runtime 1차 범위는 Spring source catalog의 부분집합”이라고 명시

---

## 4.2 이 문서가 기존 실행 명세를 어떻게 다루는지 분명히 적어달라

현재 backend에는 기존 명세가 이미 있다.

- `FASTAPI_SPRINGBOOT_API_SPEC.md`
- Spring `FastApiClient`
- FastAPI `WorkflowDefinition` 모델

현 시점 기준으로 실제 실행 바디는 여전히 아래 형태다.

```json
{
  "workflow": { ... },
  "service_tokens": { ... }
}
```

그런데 새 문서는 top-level runtime payload와 `runtime_*` 필드를 사실상 최종 shape처럼 제안하고 있다.

따라서 문서에는 아래 중 무엇인지 명확히 적어야 한다.

1. 기존 명세를 **대체하는 문서**인지
2. 기존 명세 위에 runtime field를 추가하는 **과도기 문서**인지
3. translator 내부 intermediate shape를 설명하는 문서인지

권장 수정:

- 문서 초반에 “이 문서는 기존 `FASTAPI_SPRINGBOOT_API_SPEC.md`의 execute payload를 개정/대체하는 제안”인지 명시
- 과도기라면, transition period 동안 FastAPI가 무엇을 primary로 보고 무엇을 fallback으로 볼지 적기

---

## 4.3 InputNodeStrategy / OutputNodeStrategy의 반환 payload shape를 더 구체화해달라

현재 문서는 InputNodeStrategy가
“결과를 `runtime_source.canonical_input_type` 형식으로 반환”한다고 적는데,
이건 type label일 뿐 실제 payload shape를 뜻하지 않는다.

현재 executor는 노드 간에 `dict`를 그대로 전달한다.

따라서 문서에는 최소한 아래를 추가해야 한다.

### canonical input type별 normalized payload 예시

- `SINGLE_FILE`
- `FILE_LIST`
- `SINGLE_EMAIL`
- `EMAIL_LIST`
- `SPREADSHEET_DATA`
- `SCHEDULE_DATA`
- `TEXT`
- `API_RESPONSE`

예시로 아래 정도는 문서에 들어가야 한다.

```json
{
  "type": "SINGLE_FILE",
  "file": {
    "id": "file-123",
    "name": "report.pdf",
    "mime_type": "application/pdf",
    "content": "..."
  }
}
```

또는

```json
{
  "type": "EMAIL_LIST",
  "emails": [
    {
      "id": "msg-1",
      "subject": "...",
      "from": "...",
      "body": "..."
    }
  ]
}
```

즉 수정 요청은 아래와 같다.

- InputNodeStrategy가 무엇을 반환해야 하는지 type별 normalized payload 예시 추가
- OutputNodeStrategy는 이전 node output에서 어떤 필드를 소비하는지 예시 추가
- “canonical_input_type을 맞춘다”가 아니라 “canonical payload schema를 맞춘다”로 문구 수정

---

## 4.4 FastAPI 1차 범위 밖 source/sink 처리 규칙을 명시해달라

현재 Spring source catalog는 이미 더 넓은 범위를 노출한다.

예:

- `google_calendar`
- `youtube`
- `naver_news`
- `coupang`
- `github`
- `notion`

하지만 현재 요청 문서는 일부만 1차 범위로 두고,
나머지 source/sink가 runtime payload로 들어왔을 때 FastAPI가 어떻게 동작해야 하는지 쓰지 않는다.

문서에는 아래 중 하나를 명시해야 한다.

1. unsupported service/mode는 명시적 에러로 거부
2. capability API로 사전 차단
3. placeholder 실행 허용
4. Spring preflight에서만 차단하고 FastAPI는 들어오지 않는다고 가정

권장 수정:

- `unsupported runtime_source/runtime_sink handling` 섹션 추가
- 최소한 에러 코드와 메시지 규칙 추가

예:

```json
{
  "error_code": "UNSUPPORTED_RUNTIME_SOURCE",
  "detail": "runtime_source.service=github, mode=new_pr is not supported yet"
}
```

---

## 4.5 runtime contract naming policy를 문서에 명시해달라

현재 예시 payload는 camelCase와 snake_case가 혼재한다.

예:

- `userId`
- `dataType`
- `outputDataType`
- `runtime_type`
- `runtime_source`
- `canonical_input_type`

이게 의도된 최종안인지, 과도기 shape인지 문서에 설명이 없다.

문서에는 아래 중 하나를 명시해야 한다.

1. top-level workflow/editor 필드는 camelCase 유지, runtime subfield는 snake_case 유지
2. 최종적으로 전부 snake_case로 전환
3. FastAPI 내부 모델은 snake_case, wire contract는 camelCase alias 허용

권장 수정:

- “wire contract naming policy” 섹션 추가
- FastAPI 모델 validator가 어떤 alias를 받아야 하는지도 함께 적기

---

## 4.6 validation contract migration도 함께 적어달라

현재 FastAPI 전략 validation은 여전히 기존 field를 기대한다.

- InputNodeStrategy: `config["source"]`
- OutputNodeStrategy: `config["target"]`

그런데 새 문서는 `runtime_source` / `runtime_sink` 전환만 적고 있다.

이 상태로는 전략 execute만 바꾸고 validate는 옛 필드를 보는 반쪽 마이그레이션이 될 수 있다.

따라서 문서에는 아래를 명시해야 한다.

- `validate()`도 `runtime_source` / `runtime_sink` 기준으로 바뀜
- transition period 동안 old/new 둘 다 허용하는지 여부
- 언제 old contract를 제거할지

---

## 4.7 `service_tokens` 표기와 기대값을 기존 명세와 맞춰달라

현재 문서 예시는 아래처럼 보인다.

```json
{
  "google_drive": "ya29.encrypted_token..."
}
```

하지만 기존 Spring ↔ FastAPI 명세는
Spring이 FastAPI에 **decrypted OAuth access token**을 넘긴다고 적고 있다.

따라서 문서에는 아래를 분명히 적어야 한다.

- `service_tokens`는 FastAPI가 바로 외부 API 호출에 사용할 수 있는 access token인지
- encrypted-at-rest token과 구분되는지

권장 수정:

- 예시 문자열에서 `encrypted_token` 표현 제거
- “decrypted access token” 또는 “runtime-usable access token”으로 정리

---

## 5. 권장 문서 구조

문서는 아래 구조로 재작성하는 것을 권장한다.

1. 목적
2. 이 문서와 기존 `FASTAPI_SPRINGBOOT_API_SPEC.md`의 관계
3. 역할 분리
   - Spring
   - FastAPI
   - translator
4. execute payload 최종 shape
5. naming policy
6. runtime_type mapping
7. InputNodeStrategy 구현 요구사항
   - supported source service/mode
   - normalized output payload examples
   - validation contract
   - unsupported handling
8. OutputNodeStrategy 구현 요구사항
   - supported sink services
   - expected input payload
   - validation contract
   - unsupported handling
9. capability / preflight contract
10. transition policy
11. 일정 요청

---

## 6. backend에 최종 확인받고 싶은 것

문서 수정 시 아래도 함께 답변해주길 요청한다.

1. 이 문서는 기존 `FASTAPI_SPRINGBOOT_API_SPEC.md`를 대체하는가
2. FastAPI가 실제로 primary로 읽을 필드는 `runtime_type` / `runtime_source` / `runtime_sink`인가
3. normalized canonical payload shape를 FastAPI에서 직접 정의할 것인가, Spring 문서와 공동 정의할 것인가
4. unsupported source/sink는 FastAPI에서 reject할 것인가, Spring preflight에서만 차단할 것인가
5. transition 기간 동안 old `config["source"]` / `config["target"]`를 계속 허용할 것인가

---

## 7. 한 줄 요약

`FASTAPI_RUNTIME_CONTRACT_REQUEST.md`의 큰 방향은 맞지만,
지금 상태로는 FastAPI 구현 문서로 쓰기엔 **mode key 불일치, 기존 명세와의 관계 모호성, normalized payload shape 부족, unsupported handling 부재, validation migration 누락**이 남아 있다.

따라서 위 항목들을 반영해 문서를 한 번 더 수정한 뒤 사용하는 것이 맞다.
