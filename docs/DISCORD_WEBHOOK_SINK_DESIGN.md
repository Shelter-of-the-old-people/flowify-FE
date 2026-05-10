# Discord Webhook Sink 설계

## 1. 결론

Discord 연동의 1차 구현은 Bot/OAuth가 아니라 Webhook 기반 sink로 진행한다.

사용자는 워크플로우 또는 Discord 도착 노드에서 Discord Webhook URL을 입력하고, 해당 Webhook이 연결된 Discord 채널로 워크플로우 결과를 전송한다.

이 방식은 다음 요구사항에 가장 잘 맞는다.

- 워크플로우별로 서로 다른 Discord 채널을 연결할 수 있다.
- 뉴스 요약, 파일 요약, 실행 결과처럼 텍스트 결과를 Discord로 보낼 수 있다.
- Discord Bot 설치, 서버 권한, 채널 목록 조회 없이 빠르게 사용할 수 있다.
- 기존 Flowify의 sink catalog, sink node, FastAPI output node 구조와 충돌이 적다.

Bot/OAuth 방식은 1차 범위에서 제외한다. 서버/채널 선택 UI, slash command, 양방향 상호작용이 필요해지는 시점에 후속 단계로 분리한다.

## 2. 레퍼런스 기반 수정점

레퍼런스 프로젝트들도 단순 메시지 전송은 Webhook을 별도 경로로 둔다.

- n8n은 Discord 인증 방식으로 Bot, OAuth2, Webhook을 모두 제공한다. 단순 채널 메시지 전송은 Webhook이 가장 단순한 경로다.
- Activepieces의 Discord Webhook 액션은 별도 인증 없이 `webhook_url`과 메시지 내용을 받아 Discord로 전송한다.

따라서 Flowify도 처음부터 사용자 단위 Discord 계정 연결을 만들기보다, 워크플로우 또는 Discord sink 노드 단위로 Webhook 목적지를 설정하는 방향이 맞다.

참고:

- https://docs.n8n.io/integrations/builtin/credentials/discord/
- https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.discord/
- https://github.com/activepieces/activepieces/blob/main/packages/pieces/community/discord/src/lib/actions/send-message-webhook.ts

## 3. 기능 범위

### 3.1 1차 범위

1차는 Discord를 도착 노드로 추가한다.

```text
Google Drive
-> AI 요약
-> Discord로 전송
```

사용자가 설정하는 값:

- Webhook URL
- 메시지 템플릿
- 표시 이름
- 아바타 URL

전송 대상 채널은 Webhook URL이 결정한다. Flowify가 Discord 서버나 채널 목록을 직접 조회하지 않는다.

### 3.2 후속 범위

워크플로우 실행 시작, 성공, 실패 알림은 sink 노드와 별도 기능으로 분리한다.

```text
워크플로우 설정
-> 실행 알림 채널: Discord Webhook
-> 알림 시점: 시작 / 성공 / 실패
```

이 기능은 실행 이벤트 lifecycle과 연결되어야 하므로, Discord sink 노드 구현 이후 별도 이슈로 진행한다.

## 4. 사용자 경험

### 4.1 Discord 도착 노드 추가

사용자는 도착 노드에서 Discord를 선택한다.

오른쪽 설정 패널에는 다음 항목이 표시된다.

- Webhook URL
- 메시지 내용
- 표시 이름
- 아바타 URL

Webhook URL은 민감한 값이므로 입력 UI에서는 가려서 표시한다.

### 4.2 실행 결과 전송

이전 노드가 `TEXT` 결과를 만들면 Discord sink가 해당 내용을 메시지로 전송한다.

예:

```text
오늘의 기사 요약

1. ...
2. ...
3. ...
```

Discord 메시지 길이 제한을 넘는 경우 FastAPI에서 안전하게 잘라 전송한다.

## 5. Spring 설계

### 5.1 sink catalog 추가

`sink_catalog.json`에 `discord` 서비스를 추가한다.

```json
{
  "key": "discord",
  "label": "Discord",
  "auth_required": false,
  "accepted_input_types": ["TEXT"],
  "config_schema_scope": "per_service",
  "config_schema": {
    "fields": [
      {
        "key": "webhook_url",
        "label": "Webhook URL",
        "type": "secret_text",
        "required": true
      },
      {
        "key": "message_template",
        "label": "메시지 내용",
        "type": "textarea",
        "required": false
      },
      {
        "key": "username",
        "label": "표시 이름",
        "type": "text",
        "required": false
      },
      {
        "key": "avatar_url",
        "label": "아바타 URL",
        "type": "text",
        "required": false
      }
    ]
  }
}
```

`auth_required`는 `false`로 둔다. Discord Webhook은 OAuth token이 아니라 URL 자체가 credential이므로 `OAuthTokenService`에 연결하지 않는다.

### 5.2 실행 번역

기존 `WorkflowTranslator`는 end node의 `runtime_sink.service`와 `runtime_sink.config`를 FastAPI로 전달한다. Discord도 이 흐름을 그대로 사용한다.

예상 runtime payload:

```json
{
  "runtime_type": "output",
  "runtime_sink": {
    "service": "discord",
    "config": {
      "webhook_url": "https://discord.com/api/webhooks/...",
      "message_template": "{{content}}",
      "username": "Flowify"
    }
  }
}
```

### 5.3 보안 메모

Webhook URL은 사실상 비밀번호와 같다.

1차 구현에서는 기존 node config 저장 구조를 사용할 수 있다. 다만 운영 안정화 전에는 다음 중 하나를 후속 보강해야 한다.

- node config 저장 전 Webhook URL 암호화
- 별도 workflow secret 저장소 추가
- UI 조회 시 Webhook URL 전체값 미노출

## 6. FastAPI 설계

### 6.1 OutputNode 지원 sink 추가

`OutputNodeStrategy`에 `discord`를 추가한다.

- `SUPPORTED_SINKS`에 `discord` 추가
- `ACCEPTED_INPUT_TYPES["discord"] = {"TEXT"}`
- `REQUIRED_CONFIG["discord"] = ["webhook_url"]`

Discord는 `service_tokens`를 요구하지 않는다. 기존 token 필수 검증은 OAuth 기반 sink에만 적용하고, Discord는 config의 `webhook_url`을 사용한다.

### 6.2 Discord Webhook 전송

FastAPI는 Discord Webhook URL로 `POST` 요청을 보낸다.

요청 body:

```json
{
  "content": "전송할 메시지",
  "username": "Flowify",
  "avatar_url": "https://..."
}
```

처리 규칙:

- 입력 데이터의 `content`를 기본 메시지로 사용한다.
- `message_template`이 있으면 템플릿에 `content`를 주입한다.
- Discord `content`는 2000자 제한을 넘지 않도록 자른다.
- Webhook 응답이 실패하면 output node 실행 실패로 처리한다.

## 7. Frontend 설계

### 7.1 서비스 노출

다음 위치에 `discord`를 추가한다.

- sink allowlist
- service badge key
- service icon map
- backend service key to node type map
- communication service title map

Discord는 OAuth 연결 버튼을 노출하지 않는다.

### 7.2 SinkNodePanel 필드 지원

기존 schema 기반 렌더링에 다음 필드 타입을 추가한다.

- `secret_text`: 비밀번호 형태 입력
- `textarea`: 긴 메시지 템플릿 입력

지원하지 않는 필드 타입이 내려와도 패널이 깨지지 않도록 fallback text input을 유지한다.

### 7.3 설정 요약

Discord sink 요약에는 Webhook URL 전체값을 보여주지 않는다.

표시 예:

```text
보낼 곳: Discord
Webhook: 설정됨
메시지: AI 요약 결과 전송
```

## 8. 완료 기준

- 도착 노드에서 Discord를 선택할 수 있다.
- Discord sink 설정에서 Webhook URL과 메시지를 입력할 수 있다.
- Discord sink는 OAuth 연결을 요구하지 않는다.
- Spring은 Discord sink config를 FastAPI runtime payload로 전달한다.
- FastAPI는 Discord Webhook으로 TEXT 결과를 전송한다.
- Webhook URL 미입력 시 실행 전 설정 부족 상태로 표시된다.
- Webhook URL은 UI 요약에서 전체값이 노출되지 않는다.

## 9. 후속 작업

- 워크플로우 실행 시작, 성공, 실패 알림 설정 추가
- Discord embed 메시지 지원
- Discord OAuth `webhook.incoming` 기반 채널 선택 UX
- Bot 기반 slash command, interactive button 지원

## 10. 연결 및 데이터 계약 보강

### 10.1 Discord는 1차에서 terminal sink다

1차 구현의 Discord 노드는 `role=end`인 도착 노드로만 다룬다.

따라서 Discord 노드 뒤에는 다음 노드 placeholder를 만들지 않는다. Discord로 메시지를 보낸 뒤에도 워크플로우를 계속 이어가야 한다면, 그것은 도착 노드가 아니라 별도의 side-effect middle node 기능이다.

이번 범위에서는 다음 두 흐름을 구분한다.

```text
1차 범위
AI 요약 -> Discord 전송
```

```text
후속 범위
AI 요약 -> Discord 알림 전송 -> Google Drive 저장
```

후속 범위는 output node가 아니라 중간 action node 또는 fan-out 실행 모델이 필요하므로 이번 Discord Webhook sink 구현에 섞지 않는다.

### 10.2 이전 노드 출력 타입 계약

현재 프론트의 도착 노드 선택은 이전 노드의 `outputTypes[0]`를 backend data type으로 변환한 뒤, Spring sink catalog의 `accepted_input_types`에 포함되는 서비스만 보여준다.

즉 Discord를 catalog에 추가하는 것만으로도 다음 계약이 생긴다.

```json
{
  "key": "discord",
  "accepted_input_types": ["TEXT"]
}
```

이 경우 Discord는 이전 노드 출력이 `TEXT`일 때만 선택 가능하다.

예상 UX:

```text
Google Drive 파일 목록 -> 하나씩 처리 -> AI 요약(TEXT) -> Discord 전송
```

다음 흐름에서는 Discord가 바로 노출되지 않는다.

```text
Google Drive 파일 목록(FILE_LIST) -> Discord 전송
```

이 흐름은 사용자가 중간에 AI 요약, 텍스트 변환, 파일 목록 요약 같은 노드를 추가해야 한다.

### 10.3 FastAPI 입력 검증 계약

FastAPI `OutputNodeStrategy`도 Spring catalog와 같은 입력 타입 계약을 가져야 한다.

```python
ACCEPTED_INPUT_TYPES["discord"] = {"TEXT"}
REQUIRED_CONFIG["discord"] = ["webhook_url"]
```

실행 시 입력 payload가 다음 형태라고 가정한다.

```json
{
  "type": "TEXT",
  "content": "Discord로 보낼 요약 내용"
}
```

Discord sink는 `input_data.content`를 기본 메시지로 사용한다. `content`가 비어 있으면 성공으로 처리하지 않고 설정 또는 입력 데이터 오류로 실패시킨다.

### 10.3.1 하나씩 처리 결과 계약

현재 FastAPI loop executor는 body node 결과가 `TEXT`이고 다음 output node가 `FILE_LIST`를 받지 않으면 여러 반복 결과를 하나의 `TEXT` payload로 합친다.

따라서 다음 흐름에서 Discord는 파일마다 개별 메시지를 보내지 않고, 하나로 합쳐진 요약 메시지를 한 번 전송한다.

```text
Google Drive 폴더
-> 하나씩 처리
-> AI 요약(TEXT)
-> Discord 전송(TEXT)
```

예상 입력:

```json
{
  "type": "TEXT",
  "content": "1. 첫 번째 파일 요약\n\n---\n\n2. 두 번째 파일 요약"
}
```

파일마다 Discord 메시지를 따로 보내는 기능은 1차 범위가 아니다. 그 요구가 필요해지면 Discord sink가 `loop_results`를 직접 순회하거나, 별도 반복 실행 sink 기능을 추가해야 한다.

### 10.4 메시지 템플릿 계약

`message_template`은 선택값이다.

비어 있으면 `input_data.content`를 그대로 전송한다.

값이 있으면 최소한 다음 변수만 1차에서 지원한다.

- `{{content}}`

예:

```text
새 요약 결과입니다.

{{content}}
```

파일명, 워크플로우명, 실행 ID 같은 변수는 현재 output node 입력 계약에 안정적으로 포함되어 있지 않으므로 1차 범위에서 제외한다.

Discord 메시지 길이 제한은 2000자다. 1차 구현에서는 메시지를 안전하게 자르되, 사용자 경험을 위해 잘림 표시를 붙인다.

```text
... (Discord 메시지 길이 제한으로 일부 내용이 생략되었습니다)
```

긴 요약을 여러 Discord 메시지로 나누어 전송하는 기능은 rate limit과 실패 처리 정책이 필요하므로 후속 범위로 둔다.

### 10.5 분기와의 연결 계약

분기 노드 뒤에서는 각 branch leaf마다 Discord 도착 노드를 따로 붙일 수 있다.

예:

```text
분기: PDF / 이미지 / 기타
PDF -> AI 요약 -> Discord 전송
이미지 -> AI 설명 생성 -> Discord 전송
기타 -> Google Drive 저장
```

Discord sink 자체는 branch routing을 직접 알 필요가 없다. Spring과 FastAPI가 이미 edge의 `label`, `sourceHandle`, `targetHandle`을 보존하므로, Discord는 최종적으로 전달된 `TEXT` payload만 처리한다.

### 10.6 프론트 연결 표시 계약

프론트에서 Discord 도착 노드를 추가할 때 지켜야 할 규칙은 다음과 같다.

- Discord는 sink placeholder에서만 선택된다.
- 이전 노드 출력 타입이 `TEXT`가 아니면 Discord를 목록에 표시하지 않는다.
- Discord 노드 생성 후 다음 단계 placeholder를 표시하지 않는다.
- Discord 노드의 왼쪽 패널에는 이전 노드에서 들어오는 `TEXT` 데이터 요약을 보여준다.
- Discord 노드의 오른쪽 패널에는 Webhook 설정 요약과 수정 폼을 보여준다.

### 10.7 완료 기준 보강

- `TEXT` 출력 노드 뒤에서 Discord 도착 노드를 선택할 수 있다.
- `FILE_LIST`, `SINGLE_FILE`, `SPREADSHEET_DATA` 출력 노드 뒤에서는 Discord 도착 노드가 바로 노출되지 않는다.
- Discord 도착 노드 뒤에는 다음 placeholder가 생기지 않는다.
- 분기별 leaf 뒤에 Discord 도착 노드를 각각 추가할 수 있다.
- FastAPI는 Discord sink 입력으로 `TEXT`만 허용한다.
- Discord 메시지 내용이 비어 있으면 실행 성공으로 처리하지 않는다.

## 11. 구현 상세 설계

### 11.1 Spring 구현

수정 대상:

- `src/main/resources/catalog/sink_catalog.json`
- 필요 시 `src/test/java/org/github/flowify/catalog/NodeLifecycleServiceTest.java`
- 필요 시 `src/test/java/org/github/flowify/workflow/WorkflowValidatorTest.java`

구현 순서:

1. `sink_catalog.json`의 `services` 배열에 Discord 서비스를 추가한다.
2. `auth_required`는 반드시 `false`로 둔다.
3. `accepted_input_types`는 1차에서 `["TEXT"]`만 둔다.
4. `config_schema.fields`에 `webhook_url`, `message_template`, `username`, `avatar_url`을 추가한다.
5. `webhook_url`만 `required: true`로 둔다.

추가할 catalog entry:

```json
{
  "key": "discord",
  "label": "Discord",
  "auth_required": false,
  "accepted_input_types": ["TEXT"],
  "config_schema_scope": "per_service",
  "config_schema": {
    "fields": [
      { "key": "webhook_url", "label": "Webhook URL", "type": "secret_text", "required": true },
      { "key": "message_template", "label": "메시지 내용", "type": "textarea", "required": false },
      { "key": "username", "label": "표시 이름", "type": "text", "required": false },
      { "key": "avatar_url", "label": "아바타 URL", "type": "text", "required": false }
    ]
  }
}
```

Spring에서 별도 OAuth connector는 만들지 않는다.

근거:

- `ExecutionService.collectServiceTokens()`는 `catalogService.isAuthRequired(node.getType())`가 true인 노드만 token을 수집한다.
- Discord는 `auth_required=false`이므로 `service_tokens.discord`가 없어야 정상이다.
- `NodeLifecycleService.evaluateEndNode()`는 `catalogService.getSinkRequiredFields(node.getType())`로 필수 config를 검증한다. 따라서 Discord는 `config.webhook_url`이 없으면 미설정 상태가 된다.
- `WorkflowTranslator`는 `role=end` 노드의 `type`과 `config`를 `runtime_sink.service/config`로 그대로 전달하므로 별도 번역 로직이 필요 없다.

Spring 검증 항목:

- `/api/catalog/sinks` 응답에 `discord`가 포함된다.
- `/api/catalog/sinks/discord/schema?inputType=TEXT`가 schema를 반환한다.
- `/api/catalog/sinks/discord/schema?inputType=FILE_LIST`는 허용되지 않는다.
- Discord end node에 `webhook_url`이 없으면 node status의 `missingFields`에 `config.webhook_url`이 포함된다.
- Discord end node는 OAuth 미연결이어도 `oauth_token` missing field가 생기지 않는다.

### 11.2 FastAPI 구현

수정 대상:

- `app/core/nodes/output_node.py`
- `tests/test_output_node.py`

상수 추가:

```python
DISCORD_MESSAGE_LIMIT = 2000
DISCORD_TRUNCATION_SUFFIX = "\n\n... (Discord 메시지 길이 제한으로 일부 내용이 생략되었습니다)"
TOKENLESS_SINKS = {"discord"}
```

기존 상수 변경:

```python
SUPPORTED_SINKS = {
    "slack",
    "gmail",
    "notion",
    "google_drive",
    "google_sheets",
    "google_calendar",
    "discord",
}

ACCEPTED_INPUT_TYPES["discord"] = {"TEXT"}
REQUIRED_CONFIG["discord"] = ["webhook_url"]
```

`execute()` 변경:

1. service 지원 여부를 확인한다.
2. input data type을 검증한다.
3. `service not in TOKENLESS_SINKS`인 경우에만 OAuth token을 요구한다.
4. `service == "discord"`이면 `_send_discord(sink_config, input_data or {})`를 호출한다.

의사 코드:

```python
token = ""
if service not in TOKENLESS_SINKS:
    token = service_tokens.get(service, "")
    if not token:
        raise FlowifyException(...)

if service == "discord":
    result = await self._send_discord(sink_config, input_data or {})
```

`_send_discord()` 추가:

```python
async def _send_discord(self, config: dict, input_data: dict) -> dict:
    webhook_url = str(config.get("webhook_url") or "").strip()
    if not webhook_url:
        raise FlowifyException(ErrorCode.INVALID_REQUEST, detail="Discord webhook_url is required.")

    content = self._resolve_discord_message(config, input_data)
    if not content:
        raise FlowifyException(ErrorCode.INVALID_REQUEST, detail="Discord message content is empty.")

    payload = {"content": content}
    username = str(config.get("username") or "").strip()
    avatar_url = str(config.get("avatar_url") or "").strip()
    if username:
        payload["username"] = username
    if avatar_url:
        payload["avatar_url"] = avatar_url

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(webhook_url, json=payload)

    if response.status_code < 200 or response.status_code >= 300:
        raise FlowifyException(
            ErrorCode.EXTERNAL_API_ERROR,
            detail="Discord Webhook 전송에 실패했습니다.",
            context={"status_code": response.status_code},
        )

    return {"status_code": response.status_code}
```

메시지 생성 규칙:

```python
def _resolve_discord_message(self, config: dict, input_data: dict) -> str:
    content = str(input_data.get("content") or "").strip()
    template = str(config.get("message_template") or "").strip()

    if template:
        if "{{content}}" in template:
            message = template.replace("{{content}}", content)
        else:
            message = f"{template}\n\n{content}" if content else template
    else:
        message = content

    return self._truncate_discord_message(message.strip())
```

길이 제한 규칙:

```python
def _truncate_discord_message(self, message: str) -> str:
    if len(message) <= DISCORD_MESSAGE_LIMIT:
        return message
    limit = DISCORD_MESSAGE_LIMIT - len(DISCORD_TRUNCATION_SUFFIX)
    return message[:limit].rstrip() + DISCORD_TRUNCATION_SUFFIX
```

FastAPI 테스트:

- Discord는 `service_tokens`가 없어도 전송된다.
- Discord는 `TEXT` 입력을 Webhook payload `content`로 보낸다.
- `message_template`의 `{{content}}`가 치환된다.
- `message_template`에 `{{content}}`가 없으면 템플릿 뒤에 content를 붙인다.
- `webhook_url`이 없으면 `INVALID_REQUEST`.
- `content`가 비어 있으면 `INVALID_REQUEST`.
- `FILE_LIST` 입력이면 `INVALID_REQUEST`.
- Discord Webhook 응답이 4xx/5xx이면 `EXTERNAL_API_ERROR`.

### 11.3 Frontend 구현

수정 대상:

- `src/features/add-node/model/sink-rollout.ts`
- `src/features/add-node/ui/ServiceSelectionPanel.tsx`
- `src/features/configure-node/ui/panels/SinkNodePanel.tsx`
- `src/entities/workflow/lib/workflow-node-adapter.ts`
- `src/entities/node/model/types.ts`
- `src/entities/node/model/nodePresentation.ts`
- `src/entities/node/ui/custom-nodes/CommunicationNode.tsx`
- `src/shared/utils/service-badge.ts`
- `src/shared/ui/ServiceBadge.tsx`
- 필요 시 `src/pages/dashboard/model/dashboard.ts`
- 필요 시 `src/entities/template/model/template-presentation.ts`

서비스 노출:

1. `sink-rollout.ts` allowlist에 `discord`를 추가한다.
2. `ServiceSelectionPanel.tsx`의 `CATALOG_SERVICE_ICON_MAP`에 `discord: SiDiscord`를 추가한다.
3. `workflow-node-adapter.ts`의 `SERVICE_KEY_TO_NODE_TYPE`에 `discord: "communication"`을 추가한다.
4. `service-badge.ts`의 `ServiceBadgeKey`에 `discord`를 추가하고 `getServiceBadgeKeyFromService()`에서 `discord`를 반환한다.
5. `ServiceBadge.tsx`에서 Discord badge를 렌더링한다. 1차는 `SiDiscord` 또는 fallback icon을 사용해도 된다.

타입 보강:

```ts
export interface CommunicationNodeConfig extends BaseNodeConfig {
  service: "gmail" | "slack" | "discord" | null;
}
```

표시 보강:

- `nodePresentation.ts`의 communication service title에 `discord: "Discord"` 추가
- `CommunicationNode.tsx`의 label map에 `discord: "Discord"` 추가

OAuth 연결 버튼:

- `src/entities/oauth-token/model/oauth-connect-support.ts`에는 `discord`를 추가하지 않는다.
- Discord는 Webhook URL 입력 기반이므로 OAuth 연결 상태 UI를 노출하지 않는다.

SinkNodePanel 필드 타입:

1. `FIELD_LABELS`에 `secret_text`, `textarea`를 추가한다.
2. `getFieldInputType("secret_text")`는 `"password"`를 반환한다.
3. `field.type === "textarea"`이면 Chakra `Textarea`로 렌더링한다.
4. `secret_text` 값은 일반 저장 흐름을 그대로 사용한다.
5. 요약 화면에서는 `webhook_url` 값을 그대로 표시하지 않고 `설정됨` 또는 `미설정`으로 표시한다.

렌더링 분기 의사 코드:

```tsx
if (field.type === "textarea") {
  return <Textarea ... />;
}

return (
  <Input
    type={getFieldInputType(field.type)}
    ...
  />
);
```

Discord 선택 조건:

- 별도 프론트 if문으로 막지 않는다.
- Spring catalog의 `accepted_input_types: ["TEXT"]`와 기존 `sinkServices` 필터가 Discord 노출 여부를 결정한다.
- 따라서 이전 노드가 `TEXT`를 출력하면 Discord가 보이고, `FILE_LIST`면 보이지 않는다.

Frontend 검증 항목:

- TEXT 출력 노드 뒤 sink placeholder에서 Discord가 보인다.
- FILE_LIST 출력 노드 뒤 sink placeholder에서 Discord가 보이지 않는다.
- Discord 선택 시 communication 노드로 생성된다.
- 생성 body는 `role: "end"`, `config.service: "discord"`, `outputTypes: []`를 가진다.
- Discord 노드 뒤에는 다음 단계 placeholder가 생기지 않는다.
- Discord 설정 패널에서 Webhook URL은 password input으로 표시된다.
- 메시지 템플릿은 textarea로 입력된다.
- Discord는 OAuth 연결 버튼을 표시하지 않는다.

### 11.4 프로젝트 간 최종 계약

Spring catalog:

```json
{
  "key": "discord",
  "auth_required": false,
  "accepted_input_types": ["TEXT"],
  "config_schema": {
    "fields": [
      { "key": "webhook_url", "type": "secret_text", "required": true },
      { "key": "message_template", "type": "textarea", "required": false },
      { "key": "username", "type": "text", "required": false },
      { "key": "avatar_url", "type": "text", "required": false }
    ]
  }
}
```

Frontend node add request:

```json
{
  "role": "end",
  "type": "communication",
  "config": {
    "service": "discord"
  },
  "inputDataType": "TEXT",
  "outputDataType": null
}
```

Spring runtime model:

```json
{
  "runtime_type": "output",
  "runtime_sink": {
    "service": "discord",
    "config": {
      "service": "discord",
      "webhook_url": "https://discord.com/api/webhooks/...",
      "message_template": "{{content}}",
      "username": "Flowify"
    }
  }
}
```

FastAPI input:

```json
{
  "type": "TEXT",
  "content": "Discord로 보낼 메시지"
}
```

Discord request:

```json
{
  "content": "Discord로 보낼 메시지",
  "username": "Flowify"
}
```

### 11.5 구현 순서

1. Spring catalog에 Discord sink를 추가하고 schema/status 계약을 확인한다.
2. FastAPI output node에 Discord Webhook 전송을 추가하고 단위 테스트를 통과시킨다.
3. Frontend에 Discord 서비스 노출, badge, node type mapping을 추가한다.
4. Frontend `SinkNodePanel`에 `secret_text`, `textarea` 렌더링을 추가한다.
5. 세 프로젝트를 함께 띄워 `AI 요약(TEXT) -> Discord` 플로우를 수동 검증한다.

각 단계는 서로 독립 커밋으로 나눈다.
