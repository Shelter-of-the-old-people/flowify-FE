# Backend 2차 업데이트 계획서

> 작성일: 2026-04-20
> 대상: 기획자/프론트엔드 팀 검토용
> 배경: 프론트엔드 재요청서(9개 갭 A~I) 기반

---

## 1. 현재 상황 요약

### 1차 구현 완료 항목

| 항목 | API | 상태 |
|------|-----|------|
| Source 카탈로그 | `GET /api/editor-catalog/sources` | 완료 (10개 서비스) |
| Sink 카탈로그 | `GET /api/editor-catalog/sinks` | 완료 (6개 서비스) |
| Sink 상세 스키마 | `GET /api/editor-catalog/sinks/{key}/schema?inputType=...` | 완료 |
| Schema Preview | `GET /api/workflows/{id}/schema-preview` | 완료 (저장된 워크플로우만) |
| Translation Layer | `WorkflowTranslator` | 완료 (최소 변환) |

### 프론트엔드가 식별한 9개 갭

| 갭 | 요약 | 책임 |
|----|------|------|
| A | Translator가 FastAPI 5대 런타임 타입으로 변환하지 않음 | Spring + FastAPI |
| B | FastAPI InputNode/OutputNode 전략이 플레이스홀더 | FastAPI 전담 |
| C | 런타임 전략 준비 상태 미검증 | Spring + FastAPI |
| D | isConfigured / lifecycle 상태 모델 부재 | Spring |
| E | Schema Preview가 드래프트 미지원 | Spring |
| F | Sink configSchema가 inputType별 미분화 | Spring |
| G | 카탈로그 service key와 OAuth 토큰 key 정렬 미확정 | Spring |
| H | mapping_rules.json FE 직접 접근 불가 | Spring |
| I | Wire contract (camelCase vs snake_case) 미확정 | Spring |

---

## 2. 수정 방향

### 2.1 Spring 단독 즉시 수행 (6개: D, E, F, G, H, I)

### 2.2 Spring 선행 구현 + FastAPI 요구서 작성 (3개: A, B, C)

Spring에서 할 수 있는 부분을 먼저 구현하고, FastAPI 팀에 맞춰야 할 스펙을 문서로 전달.

---

## 3. 갭별 수정 내용 및 결과

### 갭 D: 노드 Lifecycle 상태 모델 도입

**문제:** 현재 노드가 "완성되었는지", "선택지 조회가 가능한지", "실행 가능한지" 판단할 공식 계약이 없음. FE가 이를 임의로 추론해야 함.

**수정 방향:**
- 워크플로우 조회 응답에 노드별 lifecycle 상태를 포함
- 서버에서 동적으로 계산 (DB 스키마 변경 없음)

**수정 결과 — API 응답 변경:**

기존 `GET /api/workflows/{id}` 응답:
```json
{
  "nodes": [
    { "id": "node-1", "category": "service", "type": "google_drive", "role": "start", "config": {...} }
  ]
}
```

변경 후 응답 (nodeStatuses 추가):
```json
{
  "nodes": [...],
  "nodeStatuses": [
    {
      "nodeId": "node-1",
      "configured": true,
      "saveable": true,
      "choiceable": true,
      "executable": false,
      "missingFields": ["oauth_token"]
    }
  ]
}
```

**lifecycle 판정 기준:**

| 상태 | start 노드 | middle 노드 | end 노드 |
|------|-----------|------------|---------|
| configured | type + source_mode 존재 | category + type + outputDataType 존재 | type 존재 |
| saveable | 항상 true | 항상 true | 항상 true |
| choiceable | outputDataType 존재 | outputDataType 존재 | N/A |
| executable | configured + OAuth 토큰 | configured | configured + OAuth 토큰 |

---

### 갭 E: Schema Preview 드래프트 지원

**문제:** 현재 `GET /api/workflows/{id}/schema-preview`는 저장된 워크플로우만 대상. FE가 저장하지 않은 상태에서 미리보기 불가.

**수정 방향:**
- POST 엔드포인트 추가 — 노드/엣지를 body로 보내면 저장 없이 preview 반환

**수정 결과 — 새 API:**

```
POST /api/workflows/schema-preview
```

요청:
```json
{
  "nodes": [
    { "id": "n1", "role": "start", "type": "google_drive", "outputDataType": "SINGLE_FILE" },
    { "id": "n2", "category": "ai", "type": "summarize", "outputDataType": "TEXT" },
    { "id": "n3", "role": "end", "type": "slack" }
  ],
  "edges": [
    { "source": "n1", "target": "n2" },
    { "source": "n2", "target": "n3" }
  ]
}
```

응답 (기존과 동일 형식):
```json
{
  "schema_type": "TEXT",
  "is_list": false,
  "fields": [
    { "key": "content", "label": "텍스트 내용", "value_type": "string", "required": true }
  ],
  "display_hints": { "preferred_view": "document" }
}
```

---

### 갭 H: mapping_rules.json 공개 API

**문제:** FE가 UI 사전 렌더링을 위해 mapping_rules 원본 데이터가 필요하지만, 현재 서버 내부에서만 사용.

**수정 방향:**
- CatalogController에 새 엔드포인트 추가

**수정 결과 — 새 API:**

```
GET /api/editor-catalog/mapping-rules
```

응답: `mapping_rules.json` 전체 (data_types, node_types, service_fields 포함)

```json
{
  "_meta": { "version": "1.0.0", ... },
  "data_types": {
    "SINGLE_FILE": {
      "label": "단일 파일",
      "requires_processing_method": false,
      "actions": [
        { "id": "summarize", "label": "AI 요약", "node_type": "AI", "output_data_type": "TEXT", ... },
        ...
      ]
    },
    ...
  },
  "node_types": { "LOOP": {...}, "AI": {...}, ... },
  "service_fields": { "coupang": ["product_name", ...], ... }
}
```

---

### 갭 G: Service Key 정렬 확정

**문제:** 카탈로그의 service key(`google_drive`, `gmail` 등)와 OAuth 토큰 저장 시 사용하는 key가 동일한지 공식 보장 없음.

**수정 방향:**
- **현재 이미 일치함** — OAuth 토큰은 `node.getType()` 기준, 카탈로그도 같은 key 체계 사용
- 이를 공식 계약으로 명시 + 실행 시 카탈로그 key 기준 검증 추가

**수정 결과:**

공식 service key 목록 (source + sink 통합):

| Key | 서비스 | Source | Sink | OAuth 필요 |
|-----|--------|--------|------|-----------|
| `google_drive` | Google Drive | O | O | O |
| `gmail` | Gmail | O | O | O |
| `google_sheets` | Google Sheets | O | O | O |
| `google_calendar` | Google Calendar | O | O | O |
| `youtube` | YouTube | O | - | O |
| `naver_news` | 네이버 뉴스 | O | - | X |
| `coupang` | 쿠팡 | O | - | X |
| `github` | GitHub | O | - | O |
| `slack` | Slack | O | O | O |
| `notion` | Notion | O | O | O |

- OAuth 토큰 저장/조회 시 이 key를 사용
- 카탈로그 API에서 반환하는 key와 동일
- 실행 시 Validator가 카탈로그에 없는 key를 사용하면 에러 반환

---

### 갭 I: Wire Contract 확정

**문제:** API 응답의 필드명이 camelCase인지 snake_case인지 공식 합의 없음.

**수정 방향:**
- **현재 snake_case로 통일되어 있음** (DTO에 `@JsonProperty("snake_case")` 적용)
- 이를 공식 계약으로 확정

**수정 결과:**

모든 catalog API 응답은 **snake_case** 사용:

```
auth_required    (X authRequired)
source_modes     (X sourceModes)
config_schema    (X configSchema)
schema_type      (X schemaType)
is_list          (X isList)
display_hints    (X displayHints)
value_type       (X valueType)
output_data_type (X outputDataType)
```

---

### 갭 F: Sink configSchema inputType별 분화

**문제:** FE가 inputType별로 다른 sink 설정 스키마를 기대하지만, 현재 서비스별 단일 스키마.

**수정 방향:**
- **1차 범위에서는 서비스별 단일 스키마 유지**
- 이유: 현실적으로 Slack에 TEXT를 보내든 FILE_LIST를 보내든 필요한 설정(채널 선택)은 동일
- inputType별 분기가 실제로 필요한 케이스가 발견되면 추후 확장

**수정 결과:**

현행 유지. 다만 API 응답에 명시적 표시 추가:

```json
{
  "key": "gmail",
  "accepted_input_types": ["TEXT", "SINGLE_FILE", "FILE_LIST"],
  "config_schema_scope": "per_service",
  "config_schema": {
    "fields": [
      { "key": "to", "label": "수신자", "type": "email_input", "required": true },
      ...
    ]
  }
}
```

`config_schema_scope: "per_service"` → 현재 inputType 무관 단일 스키마임을 명시.
추후 `"per_input_type"`으로 전환 시 FE가 분기 로직 추가 가능.

---

### 갭 A: WorkflowTranslator 런타임 타입 변환

**문제:** Translator가 editor 모델을 거의 그대로 전달. FastAPI가 기대하는 5대 런타임 타입(`input`, `llm`, `if_else`, `loop`, `output`)으로 변환하지 않음.

**수정 방향:**
- 각 노드에 `runtime_type` 필드 추가
- Spring이 매핑 규칙을 선제 정의, FastAPI가 이를 기준으로 전략 구현

**수정 결과 — 변환 후 payload 예시:**

```json
{
  "id": "workflow-123",
  "nodes": [
    {
      "id": "n1",
      "runtime_type": "input",
      "runtime_source": { "service": "google_drive", "mode": "single_file", "target": "file-abc" },
      "config": {...}
    },
    {
      "id": "n2",
      "runtime_type": "llm",
      "runtime_config": { "action": "summarize", "node_type": "AI", "output_data_type": "TEXT" },
      "config": {...}
    },
    {
      "id": "n3",
      "runtime_type": "output",
      "runtime_sink": { "service": "slack", "config": { "channel": "#general" } },
      "config": {...}
    }
  ],
  "edges": [...],
  "service_tokens": { "google_drive": "...", "slack": "..." }
}
```

**런타임 타입 매핑 규칙:**

| 조건 | runtime_type |
|------|-------------|
| role = "start" | `input` |
| role = "end" | `output` |
| node_type = "LOOP" | `loop` |
| node_type = "CONDITION_BRANCH" | `if_else` |
| node_type = AI / DATA_FILTER / AI_FILTER / PASSTHROUGH | `llm` |

---

### 갭 C: Preflight Validation 강화

**문제:** 실행 전 검증이 구조 검사(cycle, isolation)에 한정. 카탈로그 기반 config 완성도 검증 없음.

**수정 방향:**
- `validateForExecution()` 메서드 추가
- 카탈로그 service key 존재 검증, OAuth 토큰 검증

**수정 결과 — 에러 응답 예시:**

```json
{
  "status": 400,
  "code": "PREFLIGHT_VALIDATION_FAILED",
  "message": "실행 전 검증에 실패했습니다.",
  "details": [
    "노드 'n1': source 서비스 'unknown_service'가 카탈로그에 존재하지 않습니다",
    "노드 'n3': sink 서비스 'slack'에 OAuth 토큰이 연결되지 않았습니다"
  ]
}
```

---

### 갭 B: FastAPI 전략 구현 (Spring 범위 밖)

**문제:** FastAPI의 InputNodeStrategy/OutputNodeStrategy가 플레이스홀더 상태.

**수정 방향:**
- Spring에서는 직접 수정 불가
- Spring 측 translation 완료 후 FastAPI 팀에 요구서 전달

---

## 4. 전체 API 변경 요약

### 새로 추가되는 API

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/editor-catalog/mapping-rules` | mapping_rules.json 전체 조회 |
| POST | `/api/workflows/schema-preview` | 드래프트 노드/엣지 기반 schema preview |

### 응답이 변경되는 기존 API

| API | 변경 사항 |
|-----|----------|
| `GET /api/workflows/{id}` | `nodeStatuses` 필드 추가 |
| `GET /api/editor-catalog/sinks` | `config_schema_scope` 필드 추가 |

### 내부 동작이 변경되는 기존 API

| API | 변경 사항 |
|-----|----------|
| 워크플로우 실행 | translator가 runtime_type 매핑 수행 |
| 워크플로우 실행 | preflight validation 강화 (카탈로그 + OAuth 검증) |

---

## 5. FE 영향도

### 즉시 사용 가능 (API 추가)

1. **mapping-rules API** → FE가 UI 사전 렌더링에 mapping_rules 원본 활용 가능
2. **POST schema-preview** → 저장 전 드래프트 상태에서 결과 스키마 미리보기 가능

### 기존 연동 수정 필요

3. **nodeStatuses** → 워크플로우 조회 응답에 lifecycle 상태 추가됨. FE가 이를 활용하여 "실행 불가" 등 UI 가드 구현 가능 (기존 필드는 변경 없으므로 하위 호환)
4. **config_schema_scope** → sink 카탈로그에 scope 필드 추가됨 (무시 가능, 하위 호환)

### FE 수정 불필요 (내부 변경)

5. translator 런타임 타입 매핑 — FE가 직접 사용하지 않는 실행 내부 로직
6. preflight validation 강화 — 기존 에러 응답 형식 유지, 상세 메시지만 개선

---

## 6. FastAPI 팀에 별도 전달할 항목

Spring 2차 업데이트 완료 후 아래 내용을 별도 요구서로 작성:

1. **Runtime payload 형식 확정** — Spring translator가 생성하는 `runtime_type`, `runtime_source`, `runtime_sink`, `runtime_config` 필드를 FastAPI가 수용할 수 있는지 확인
2. **InputNodeStrategy 구현** — source service별 데이터 수집 전략
3. **OutputNodeStrategy 구현** — sink service별 데이터 전송 전략
4. **(선택) Capability API** — FastAPI가 현재 지원하는 runtime_type 목록을 반환하는 엔드포인트

---

## 7. 일정 및 우선순위

| 순서 | 작업 | 예상 영향도 |
|------|------|-----------|
| 1 | mapping-rules API (갭 H) | FE 즉시 활용 |
| 2 | schema-preview POST (갭 E) | FE 드래프트 지원 |
| 3 | lifecycle 상태 모델 (갭 D) | FE 실행 가드 UI |
| 4 | preflight validation (갭 C) | 실행 안정성 |
| 5 | translator 강화 (갭 A) | FastAPI 연동 |
| 6 | service key 정렬 + wire contract (갭 G, I, F) | 계약 명확화 |
| 7 | FastAPI 요구서 (갭 B) | 팀간 협의 |

---

## 8. 기획자 확인 요청 사항

아래 항목에 대해 기획자의 판단이 필요합니다:

1. **nodeStatuses 포함 방식**: 워크플로우 조회 시 항상 포함 vs 별도 API(`GET /api/workflows/{id}/status`)로 분리?
2. **lifecycle 판정 기준**: 위 3절의 판정 기준표가 기획 의도와 일치하는지?
3. **sink configSchema 단일 유지**: inputType별 분화 없이 1차 출시가 괜찮은지?
4. **mapping-rules 공개 범위**: 전체 원본 공개 vs 필요한 부분만 가공 후 공개?
5. **FastAPI 요구서 전달 시점**: Spring 작업 완료 후 즉시 vs 기획 검토 완료 후?
