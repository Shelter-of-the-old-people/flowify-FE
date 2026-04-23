# FastAPI Runtime Contract 요구서

> 작성일: 2026-04-20
> 발신: Spring Backend (flowify-BE-spring)
> 수신: FastAPI Team (flowify-BE)
> 관련 문서:
> - `docs/WORKFLOW_SOURCE_SINK_BACKEND_FINAL_REQUEST.md`
> - `docs/FASTAPI_SPRINGBOOT_API_SPEC.md`

---

## 1. 목적

Spring이 source/sink catalog 2차 업데이트를 완료하면서
**WorkflowTranslator의 runtime payload shape을 확정**했다.

이 문서는 FastAPI가 이 payload를 수용하기 위해
**구현하거나 확인해야 할 항목**을 정리한 요구서다.

---

## 2. 아키텍처 확정 사항

- **Spring** = editor/public contract owner
- **FastAPI** = runtime/execution owner
- **WorkflowTranslator** = Spring → FastAPI 변환 계층
- `runtime_type`은 **Spring이 authoritative하게 결정**한다

---

## 3. Runtime Payload 형식

Spring의 WorkflowTranslator가 생성하는 최종 payload:

```json
{
  "id": "workflow-123",
  "name": "워크플로우 이름",
  "userId": "user-abc",
  "nodes": [
    {
      "id": "n1",
      "category": "service",
      "type": "google_drive",
      "label": "Google Drive 파일",
      "config": { "source_mode": "single_file", "target": "file-xyz" },
      "dataType": null,
      "outputDataType": "SINGLE_FILE",
      "role": "start",
      "runtime_type": "input",
      "runtime_source": {
        "service": "google_drive",
        "mode": "single_file",
        "target": "file-xyz",
        "canonical_input_type": "SINGLE_FILE"
      }
    },
    {
      "id": "n2",
      "category": "ai",
      "type": "summarize",
      "label": "AI 요약",
      "config": { "action": "summarize", "style": "concise" },
      "dataType": "SINGLE_FILE",
      "outputDataType": "TEXT",
      "role": null,
      "runtime_type": "llm",
      "runtime_config": {
        "node_type": "summarize",
        "output_data_type": "TEXT",
        "action": "summarize",
        "style": "concise"
      }
    },
    {
      "id": "n3",
      "category": "service",
      "type": "slack",
      "label": "Slack 전송",
      "config": { "channel": "#general", "message_format": "markdown" },
      "dataType": "TEXT",
      "outputDataType": null,
      "role": "end",
      "runtime_type": "output",
      "runtime_sink": {
        "service": "slack",
        "config": { "channel": "#general", "message_format": "markdown" }
      }
    }
  ],
  "edges": [
    { "id": "e1", "source": "n1", "target": "n2" },
    { "id": "e2", "source": "n2", "target": "n3" }
  ],
  "trigger": {
    "type": "manual",
    "config": {}
  }
}
```

service_tokens는 별도 파라미터로 전달:
```json
{
  "google_drive": "ya29.encrypted_token...",
  "slack": "xoxb-encrypted_token..."
}
```

---

## 4. runtime_type 5종 매핑 규칙

| runtime_type | 조건 | FastAPI 전략 |
|-------------|------|-------------|
| `input` | role = "start" | InputNodeStrategy |
| `output` | role = "end" | OutputNodeStrategy |
| `llm` | AI, DATA_FILTER, AI_FILTER, PASSTHROUGH | LLMNodeStrategy |
| `if_else` | CONDITION_BRANCH | IfElseNodeStrategy |
| `loop` | LOOP | LoopNodeStrategy |

---

## 5. FastAPI에 요청하는 항목

### 5.1 InputNodeStrategy 구현

현재 상태: placeholder

요청:
- `runtime_source.service`로 서비스 식별
- `runtime_source.mode`로 데이터 수집 방식 결정
- `runtime_source.target`으로 수집 대상 지정
- `service_tokens[service]`로 OAuth 토큰 사용
- 결과를 `runtime_source.canonical_input_type` 형식으로 반환

1차 범위 서비스:
- google_drive (single_file, file_changed, new_file, folder_list)
- gmail (email_received, latest_unread, search_email)
- google_sheets (sheet_data, sheet_updated)
- slack (channel_message)

### 5.2 OutputNodeStrategy 구현

현재 상태: placeholder

요청:
- `runtime_sink.service`로 서비스 식별
- `runtime_sink.config`로 전송 설정 사용
- `service_tokens[service]`로 OAuth 토큰 사용
- 이전 노드의 출력 데이터를 sink 서비스에 전달

1차 범위 서비스:
- slack (채널 메시지 전송)
- gmail (메일 발송/임시저장)
- notion (페이지/데이터베이스 항목 생성)
- google_drive (파일 업로드)
- google_sheets (행 추가/덮어쓰기)
- google_calendar (일정 생성/수정)

### 5.3 runtime_type 필드 수용

요청:
- FastAPI 실행 엔진이 `runtime_type` 필드를 기준으로 전략을 선택하도록 수정
- 기존 `type` 기반 전략 선택에서 `runtime_type` 기반으로 전환

### 5.4 (선택) Capability API

요청:
- `GET /api/runtime/capabilities` — 현재 지원하는 runtime_type 목록과 서비스 목록 반환
- Spring이 preflight validation에서 FastAPI의 실행 가능 여부를 검증하는 데 활용 가능
- 이 항목은 선택사항이며, 없더라도 Spring은 자체 매핑 규칙으로 검증 수행

---

## 6. 하위 호환

- Spring은 기존 editor 필드(`type`, `category`, `config` 등)를 runtime payload에 함께 전달
- FastAPI는 전환 기간 동안 기존 필드와 새 `runtime_*` 필드를 모두 참조 가능
- 최종적으로 `runtime_type` + `runtime_source`/`runtime_sink`/`runtime_config`가 primary가 되어야 함

---

## 7. 일정 요청

- InputNodeStrategy/OutputNodeStrategy 구현 일정을 공유해 주시면
  Spring 측에서 preflight validation의 실행 가능 여부 검증 범위를 맞출 수 있습니다
- 최소 1개 서비스(예: Slack)로 end-to-end 검증이 가능한 시점을 알려주시면
  FE와 통합 테스트 일정을 잡을 수 있습니다

---

## 8. 한 줄 요약

Spring이 runtime payload shape과 runtime_type 5종 매핑을 확정했으며,
**FastAPI는 이 payload를 기준으로 InputNodeStrategy/OutputNodeStrategy를 구현하고
runtime_type 기반 전략 선택으로 전환해야 한다.**
