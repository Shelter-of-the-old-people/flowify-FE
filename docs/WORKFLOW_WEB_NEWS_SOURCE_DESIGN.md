# 인터넷 글/공지 소스 노드 설계

## 1. 배경

사용자는 인터넷 기사, 학과 공지, 게시판 글 같은 공개 글을 가져와 AI 요약, 분류, Discord/Gmail/Notion 전송 등에 연결하고 싶다.

초기 논의에서는 `web_news`, `naver_news`, RSS, 일반 게시판 크롤링이 함께 언급되었지만, 현재 Flowify의 목표는 비개발자도 쉽게 쓰는 워크플로우다. 따라서 임의 URL 크롤러를 바로 노출하기보다, 검증된 제공자별 adapter를 먼저 제공하고 결과를 공통 `ARTICLE_LIST` 데이터 타입으로 표준화한다.

## 2. 객관적 근거

### 2.1 n8n

- n8n은 RSS Read 노드에서 RSS URL을 입력받아 feed item을 읽는다.
- 동시에 n8n은 HTTP 요청이 사용자 제어 대상에 나갈 수 있는 노드에 대해 SSRF 보호 환경변수를 별도로 제공한다.
- 즉, 레퍼런스상 RSS URL 입력 자체는 일반적인 기능이지만, 임의 URL 요청은 별도 보안 경계가 필요하다.

참고:

- https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.rssfeedread/
- https://docs.n8n.io/hosting/configuration/environment-variables/ssrf-protection/
- https://raw.githubusercontent.com/n8n-io/n8n/master/packages/nodes-base/nodes/RssFeedRead/RssFeedRead.node.ts

### 2.2 RSSHub

- RSSHub는 route가 콘텐츠 추출 규칙을 가진 접근 경로다.
- 수천 개의 사이트를 하나의 범용 입력창으로 처리하기보다, source별 route/rule을 통해 표준 RSS 결과로 변환하는 모델에 가깝다.
- Flowify의 `provider adapter -> ARTICLE_LIST` 설계와 유사하다.

참고:

- https://rsshub.netlify.app/routes

### 2.3 Huginn

- Huginn WebsiteAgent는 HTML/XML/JSON/text를 가져오고 CSS, XPath, JSONPath, 정규식으로 값을 추출한다.
- 이 방식은 강력하지만 사용자가 selector나 path를 알아야 하므로 비개발자 UX에는 맞지 않는다.
- Flowify에서는 내부 구현 패턴으로만 참고하고, 사용자에게 CSS/XPath 입력을 직접 노출하지 않는다.

참고:

- https://raw.githubusercontent.com/huginn/huginn/master/app/models/agents/website_agent.rb

### 2.4 OWASP SSRF Cheat Sheet

- OWASP는 신뢰 가능한 대상이 정해져 있으면 allowlist 방식을 권장한다.
- 완전한 URL을 사용자에게 받아 서버가 호출하는 방식은 검증이 어렵고 parser 우회, 내부망 접근, DNS pinning, redirect 문제가 생길 수 있다.
- URL이 꼭 필요하면 protocol 제한, public IP 검증, DNS resolution 검증, redirect 비활성화 또는 redirect 대상 재검증이 필요하다.

참고:

- https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html

## 3. 설계 원칙

1. MVP는 임의 URL 크롤러가 아니라 allowlist provider adapter로 시작한다.
2. 기사/공지/게시글 목록은 `API_RESPONSE`가 아니라 `ARTICLE_LIST`로 표준화한다.
3. 사용자에게는 "API 응답", "selector", "raw JSON"이 아니라 "인터넷 글/공지", "게시판", "글 목록"으로 표현한다.
4. Spring은 catalog와 선택지 제공을 담당하고, FastAPI는 실제 수집과 canonical 변환을 담당한다.
5. Frontend는 provider 선택, 대상 선택, 결과 미리보기를 비개발자 언어로 제공한다.
6. 임의 RSS URL, 임의 웹페이지 수집은 후속 이슈로 분리하고 `SafeHttpClient` 보안 경계가 준비된 뒤 연다.

## 4. 범위

### 4.1 이번 범위

- `web_news` source service 추가
- `seboard_posts` source mode 추가
- `ARTICLE_LIST` canonical type 추가
- SE Board 카테고리 선택
- SE Board 게시글 목록 수집
- 선택적으로 상세 본문 일부 수집
- AI 노드에서 `ARTICLE_LIST`를 읽어 요약/분류 가능
- 하나씩 처리 시 article item 단위로 loop 처리 가능
- 프론트 미리보기에서 글 제목, 출처, 작성일, 링크, 요약 표시

### 4.2 이번 범위 제외

- 임의 URL 웹 크롤러
- 사용자가 CSS selector, XPath, JSONPath를 직접 입력하는 고급 모드
- RSS URL 직접 입력
- Naver Open API 연동
- robots.txt 자동 판정 UI
- 수집 결과 영구 저장
- 중복 기사 deduplication 저장소

## 5. Canonical 계약

### 5.1 데이터 타입

Spring, FastAPI, Frontend 모두 같은 개념을 공유한다.

- Backend canonical type: `ARTICLE_LIST`
- Frontend data type: `article-list`

### 5.2 Payload

```json
{
  "type": "ARTICLE_LIST",
  "items": [
    {
      "id": "47571",
      "title": "게시글 제목",
      "url": "https://seboard.site/posts/47571",
      "source": "SE Board",
      "author": "작성자",
      "published_at": "2026-05-10T10:00:00Z",
      "summary": "목록 또는 본문에서 만든 짧은 설명",
      "content": "본문 텍스트. include_content=false이면 null",
      "metadata": {
        "category_id": "2",
        "category_name": "공지사항"
      }
    }
  ],
  "metadata": {
    "provider": "seboard",
    "count": 10,
    "truncated": false,
    "include_content": false
  }
}
```

### 5.3 필드 정책

| 필드 | 정책 |
| --- | --- |
| `title` | 사용자에게 보이는 기본 제목 |
| `url` | 원문 이동 링크 |
| `source` | 서비스 또는 사이트명 |
| `published_at` | 정렬과 표시용 날짜 |
| `summary` | 목록 설명 또는 본문 일부 |
| `content` | AI 본문 처리용. 기본은 선택 옵션 |
| `metadata` | provider별 보조 정보. UI 기본 노출 금지 |

## 6. Spring 설계

### 6.1 Catalog

`source_catalog.json`에 `web_news`를 추가한다.

```json
{
  "key": "web_news",
  "label": "인터넷 글/공지",
  "auth_required": false,
  "source_modes": [
    {
      "key": "seboard_posts",
      "label": "SE Board 게시글 가져오기",
      "canonical_input_type": "ARTICLE_LIST",
      "trigger_kind": "manual",
      "target_schema": {
        "type": "category_picker",
        "multiple": false,
        "picker_supported": true
      }
    }
  ]
}
```

### 6.2 Schema

`schema_types.json`에 `ARTICLE_LIST`를 추가한다.

```json
{
  "ARTICLE_LIST": {
    "schema_type": "ARTICLE_LIST",
    "is_list": true,
    "fields": [
      { "key": "title", "label": "제목", "value_type": "string", "required": true },
      { "key": "url", "label": "원문 링크", "value_type": "string", "required": false },
      { "key": "source", "label": "출처", "value_type": "string", "required": false },
      { "key": "published_at", "label": "작성일", "value_type": "datetime", "required": false },
      { "key": "summary", "label": "요약", "value_type": "string", "required": false },
      { "key": "content", "label": "본문", "value_type": "string", "required": false }
    ],
    "display_hints": { "preferred_view": "article_list" }
  }
}
```

### 6.3 Mapping Rules

`mapping_rules.json`에 `ARTICLE_LIST`를 추가한다.

```json
{
  "ARTICLE_LIST": {
    "label": "글 목록",
    "description": "여러 기사, 공지, 게시글이 들어오는 경우",
    "requires_processing_method": true,
    "processing_method": {
      "question": "글들을 어떻게 처리할까요?",
      "options": [
        {
          "id": "one_by_one",
          "label": "글 하나씩 처리",
          "node_type": "LOOP",
          "output_data_type": "TEXT",
          "priority": 1
        },
        {
          "id": "all_at_once",
          "label": "전체를 하나로 묶어 처리",
          "node_type": null,
          "output_data_type": "ARTICLE_LIST",
          "priority": 2
        }
      ]
    },
    "actions": [
      {
        "id": "ai_summarize",
        "label": "AI로 요약",
        "node_type": "AI",
        "output_data_type": "TEXT",
        "priority": 1
      },
      {
        "id": "filter_fields",
        "label": "필요한 정보만 사용",
        "node_type": "DATA_FILTER",
        "output_data_type": "TEXT",
        "priority": 2
      },
      {
        "id": "passthrough",
        "label": "그대로 전달",
        "node_type": "PASSTHROUGH",
        "output_data_type": "ARTICLE_LIST",
        "priority": 99
      }
    ]
  }
}
```

`one_by_one`의 출력 타입을 `TEXT`로 잡는 이유는 기존 FastAPI loop 구조에서 `SINGLE_ARTICLE`을 새로 만들지 않고도 각 글을 AI 노드에 바로 넣을 수 있기 때문이다. 필요하면 후속 이슈에서 `SINGLE_ARTICLE`을 분리한다.

### 6.4 Target Option Provider

`WebNewsTargetOptionProvider`를 추가한다.

책임:

- `getServiceKey()`는 `web_news` 반환
- `sourceMode == seboard_posts`만 처리
- SE Board 카테고리 목록을 고정 API에서 조회
- `TargetOptionItem`으로 변환
- token은 사용하지 않음
- query가 있으면 label 기반으로 필터링

Provider는 고정 base URL만 사용한다.

- `https://seboard.site/v1/menu`

Spring에서는 실제 게시글 본문을 가져오지 않는다. Spring은 선택지를 만드는 역할까지만 맡는다.

## 7. FastAPI 설계

### 7.1 Canonical 모델

`app/models/canonical.py`에 다음을 추가한다.

- `CanonicalType.ARTICLE_LIST`
- `ArticleItem`
- `ArticleListPayload`

Pydantic 모델은 runtime 검증과 테스트 기준으로 사용한다.

### 7.2 Input Node

`input_node.py`에서 `SUPPORTED_SOURCES`에 다음을 추가한다.

```python
"web_news": {"seboard_posts"}
```

토큰이 필요 없는 source는 tuple hardcode 대신 상수로 분리한다.

```python
TOKENLESS_SOURCES = {"web_news"}
```

`service == "web_news"`이면 `WebNewsService`로 위임한다.

### 7.3 WebNewsService

새 파일:

- `app/services/integrations/web_news.py`

책임:

- provider별 adapter를 호출한다.
- 현재 MVP는 `seboard`만 지원한다.
- 결과를 `ARTICLE_LIST` payload로 변환한다.

주요 메서드:

```python
async def fetch_articles(
    self,
    mode: str,
    target: str,
    *,
    limit: int = 10,
    include_content: bool = False,
) -> dict[str, Any]:
    ...
```

### 7.4 Safe HTTP

새 파일:

- `app/services/integrations/safe_http.py`

MVP에서는 SE Board 고정 host만 호출하지만, 후속 RSS 확장을 위해 공통 안전 요청 계층을 먼저 둔다.

필수 정책:

- 허용 scheme: `https`
- 허용 host: `seboard.site`
- localhost, private, link-local, loopback IP 차단
- A/AAAA DNS 결과가 public IP인지 검증
- redirect는 기본 비활성화
- timeout 설정
- 응답 크기 제한
- JSON content-type 검증
- User-Agent 명시

주의:

기존 `web_crawler.py`는 범용 HTML 수집기로 남겨두되 이번 기능에서는 사용하지 않는다. 현재 구현은 redirect를 따라가고 SSRF 방어가 없으므로 새 기능의 보안 요구를 만족하지 않는다.

### 7.5 SE Board Adapter

새 파일:

- `app/services/integrations/seboard.py`

호출:

- `GET https://seboard.site/v1/posts?categoryId={target}&page=0&perPage={limit}`
- `include_content=true`일 때만 상세 API 호출

본문 처리:

- HTML은 BeautifulSoup로 text 변환
- script/style 제거
- 공백 normalize
- 글당 content 길이 제한
- 전체 payload 길이 제한

### 7.6 LLM 입력 변환

`llm_node.py`의 `_extract_text_from_canonical()`에 `ARTICLE_LIST`를 추가한다.

형식:

```text
[Article 1]
Title: ...
Source: ...
Published At: ...
URL: ...
Summary:
...
Content:
...
```

content가 없으면 summary와 metadata만 사용한다.

### 7.7 Loop 변환

`executor.py`의 `_to_loop_item_payload()`에 다음 변환을 추가한다.

- `ARTICLE_LIST -> TEXT`

각 item은 `TEXT` payload로 변환한다.

```json
{
  "type": "TEXT",
  "content": "Title: ...\nURL: ...\n\n...",
  "article": { "...": "original item" }
}
```

이 설계는 `SINGLE_ARTICLE` 없이 기존 AI 노드와 호환된다.

### 7.8 Preview

`preview_executor.py`에서 `web_news` source preview를 지원한다.

정책:

- 기본 `limit=5`
- 기본 `include_content=false`
- preview는 write나 execution log를 만들지 않음
- content는 사용자가 요청한 경우에만 포함

## 8. Frontend 설계

### 8.1 DataType

`src/entities/node/model/dataType.ts`

```ts
| "article-list"
```

### 8.2 Adapter

`workflow-node-adapter.ts`

```ts
ARTICLE_LIST: "article-list"
```

`SERVICE_KEY_TO_NODE_TYPE`

```ts
web_news: "web-scraping"
```

### 8.3 Source Rollout

`source-rollout.ts`

```ts
web_news: ["seboard_posts"]
```

### 8.4 Node Config

`WebScrapingNodeConfig["service"]`에 `web_news`를 추가한다.

`nodePresentation.ts`의 web scraping service title에도 추가한다.

```ts
web_news: "인터넷 글/공지"
```

### 8.5 Preview UI

`DataPreviewBlock.tsx`에 `ARTICLE_LIST` 전용 preview를 추가한다.

표시:

- 전체 글 수
- 제목
- 출처
- 작성일
- 짧은 요약
- 원문 링크

비노출:

- raw JSON
- metadata 전체
- provider 내부 id

### 8.6 선택 UX

사용자 흐름:

1. 시작 노드에서 "인터넷 글/공지" 선택
2. "SE Board 게시글 가져오기" 선택
3. 카테고리 선택
4. "글 목록"이 다음 노드로 전달됨
5. 사용자가 "글 하나씩 처리" 또는 "전체를 하나로 묶어 처리" 선택

비개발자 표현:

- `ARTICLE_LIST` 대신 "글 목록"
- `provider` 대신 "가져올 곳"
- `target` 대신 "게시판"
- `include_content` 대신 "본문도 함께 가져오기"

## 9. 보안 설계

### 9.1 MVP 보안 경계

- 사용자에게 임의 URL 입력을 받지 않는다.
- FastAPI는 allowlist host만 호출한다.
- Spring provider도 고정 host만 호출한다.
- Web crawler 기존 구현은 사용하지 않는다.
- 상세 본문 수집은 옵션으로 두고 기본은 목록 메타데이터만 가져온다.

### 9.2 후속 RSS 확장 조건

RSS URL 직접 입력을 열려면 다음이 먼저 필요하다.

- URL parser 검증
- `http`, `https` 중 허용 scheme 결정
- private IP, loopback, link-local, metadata endpoint 차단
- DNS A/AAAA 결과 검증
- redirect 대상 재검증
- 응답 크기 제한
- content-type 제한
- robots.txt 또는 사이트 정책 고지
- 요청 빈도 제한

## 10. 영향 분석

### 10.1 기존 기능 영향

| 영역 | 영향 |
| --- | --- |
| Google Drive/Gmail/Canvas source | 없음. 별도 service key 추가 |
| Choice Wizard | `ARTICLE_LIST` mapping 추가 필요. 누락 시 다음 단계 선택 불가 |
| AI 노드 | `ARTICLE_LIST` text 변환 추가 필요 |
| Loop | `ARTICLE_LIST -> TEXT` 변환 추가 필요 |
| DataPreview | 전용 UI 없으면 GenericPreview로 떨어짐 |
| Sink | `ARTICLE_LIST` 직접 저장은 이번 범위 제외. AI나 filter 후 `TEXT`로 보내는 흐름 우선 |

### 10.2 위험 요소

| 위험 | 대응 |
| --- | --- |
| 임의 URL SSRF | MVP에서 임의 URL 미노출 |
| 본문 과다 수집으로 LLM token 초과 | content 기본 제외, 글당/전체 길이 제한 |
| 사이트 구조 변경 | provider adapter 테스트와 fallback summary |
| SE Board API 정책 변경 | 실패 메시지를 사용자 친화적으로 표시 |
| robots.txt/이용 정책 이슈 | 공식 허용 여부 확인 후 provider 추가 |

## 11. 구현 순서

### 11.1 Spring

1. `ARTICLE_LIST` schema 추가
2. `web_news` source catalog 추가
3. `ARTICLE_LIST` mapping rule 추가
4. `ai_prompt_rules.json`에 article list 지침 추가
5. `WebNewsTargetOptionProvider` 추가
6. provider 단위 테스트 추가

### 11.2 FastAPI

1. canonical model 추가
2. `SafeHttpClient` 추가
3. SE Board adapter 추가
4. `WebNewsService` 추가
5. `InputNodeStrategy`에 `web_news` 추가
6. preview executor 추가
7. LLM text extraction 추가
8. loop item conversion 추가
9. 단위 테스트 추가

### 11.3 Frontend

1. `article-list` data type 추가
2. workflow adapter mapping 추가
3. `web_news` service mapping 추가
4. source rollout allowlist 추가
5. node presentation title 추가
6. `ARTICLE_LIST` preview UI 추가
7. 선택/미리보기 수동 테스트

## 12. 완료 기준

- 시작 노드에서 "인터넷 글/공지"가 보인다.
- SE Board 카테고리를 선택할 수 있다.
- 워크플로우 저장 후 runtime source가 `web_news`, `seboard_posts`, `ARTICLE_LIST`로 전달된다.
- FastAPI가 `ARTICLE_LIST` payload를 반환한다.
- 미리보기에서 글 목록이 비개발자 친화적으로 보인다.
- AI 노드가 글 목록 전체를 요약할 수 있다.
- "글 하나씩 처리"를 선택하면 각 글이 loop body에 개별 `TEXT`로 들어간다.
- 임의 URL 입력 없이 MVP가 동작한다.

## 13. 상세 구현 계약

이 섹션은 바로 코딩 가능한 수준의 파일별 계약이다.

### 13.1 Spring 파일별 변경

#### `src/main/resources/catalog/source_catalog.json`

`services` 배열에 `web_news`를 추가한다.

주의:

- `auth_required`는 `false`
- `target_schema.type`은 `category_picker`
- `picker_supported`는 `true`
- `canonical_input_type`은 반드시 `ARTICLE_LIST`

#### `src/main/resources/catalog/schema_types.json`

`ARTICLE_LIST`를 추가한다.

주의:

- `is_list`는 `true`
- `display_hints.preferred_view`는 `article_list`
- `metadata`는 schema field에 넣지 않는다. UI 기본 노출 대상이 아니다.

#### `src/main/resources/docs/mapping_rules.json`

`data_types.ARTICLE_LIST`를 추가한다.

구현 기준:

- `requires_processing_method: true`
- `one_by_one.output_data_type: TEXT`
- `all_at_once.output_data_type: ARTICLE_LIST`
- `actions.ai_summarize.output_data_type: TEXT`
- `actions.passthrough.output_data_type: ARTICLE_LIST`

#### `src/main/resources/docs/ai_prompt_rules.json`

`ARTICLE_LIST` 입력 지침을 추가한다.

예시:

```json
"ARTICLE_LIST": "입력은 여러 기사/공지/게시글 목록이다. 제목, 출처, 작성일, 링크, 요약, 본문을 근거로 처리하고, 본문이 없으면 제목과 요약만 근거로 삼는다."
```

#### `catalog/service/picker/WebNewsTargetOptionProvider.java`

신규 provider를 추가한다.

클래스 형태:

```java
@Component
@RequiredArgsConstructor
public class WebNewsTargetOptionProvider implements TargetOptionProvider {

    private static final String SERVICE_KEY = "web_news";
    private static final String SEBOARD_POSTS_MODE = "seboard_posts";

    private final WebClient.Builder webClientBuilder;

    @Override
    public String getServiceKey() {
        return SERVICE_KEY;
    }

    @Override
    public TargetOptionResponse getOptions(
            String sourceMode,
            String token,
            String parentId,
            String query,
            String cursor
    ) {
        if (!SEBOARD_POSTS_MODE.equals(sourceMode)) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, ...);
        }

        List<TargetOptionItem> items = fetchSeBoardCategories(query);
        return TargetOptionResponse.builder()
                .items(items)
                .nextCursor(null)
                .build();
    }
}
```

변환 규칙:

| SE Board 값 | TargetOptionItem |
| --- | --- |
| category id | `id` |
| category label/name | `label` |
| parent menu label | `description` |
| `"category"` | `type` |
| provider/category metadata | `metadata` |

`TargetOptionService`는 이미 `auth_required=false`면 token을 조회하지 않으므로 별도 분기 추가가 필요 없다. 단, provider bean이 등록되어 있어야 한다.

### 13.2 Spring 테스트

추가 테스트:

- `WebNewsTargetOptionProviderTest`
  - `seboard_posts`에서 category option을 반환한다.
  - query가 있으면 label 기준으로 필터링한다.
  - 지원하지 않는 mode는 `INVALID_REQUEST`를 던진다.
- `CatalogServiceTest` 또는 catalog JSON smoke test
  - `web_news` service가 catalog에 포함된다.
  - `seboard_posts.canonical_input_type == ARTICLE_LIST`
- `ChoiceMappingServiceTest`
  - `ARTICLE_LIST` 선택지가 `one_by_one`, `all_at_once`를 반환한다.

## 14. FastAPI 상세 구현 계약

### 14.1 신규/수정 파일

| 파일 | 작업 |
| --- | --- |
| `app/models/canonical.py` | `ARTICLE_LIST`, `ArticleItem`, `ArticleListPayload` 추가 |
| `app/services/integrations/safe_http.py` | allowlist 기반 HTTP client 추가 |
| `app/services/integrations/seboard.py` | SE Board API adapter 추가 |
| `app/services/integrations/web_news.py` | provider routing service 추가 |
| `app/core/nodes/input_node.py` | `web_news` source 실행 추가 |
| `app/core/engine/preview_executor.py` | `web_news` preview 추가 |
| `app/core/nodes/llm_node.py` | `ARTICLE_LIST` text extraction 추가 |
| `app/core/engine/executor.py` | `ARTICLE_LIST -> TEXT` loop 변환 추가 |

### 14.2 `canonical.py`

추가 모델:

```python
class ArticleItem(BaseModel):
    id: str | None = None
    title: str
    url: str | None = None
    source: str | None = None
    author: str | None = None
    published_at: str | None = None
    summary: str | None = None
    content: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class ArticleListPayload(BaseModel):
    type: str = CanonicalType.ARTICLE_LIST
    items: list[ArticleItem] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
```

`CanonicalType`에 다음을 추가한다.

```python
ARTICLE_LIST = "ARTICLE_LIST"
```

### 14.3 `safe_http.py`

MVP 구현 범위:

```python
class SafeHttpClient:
    ALLOWED_HOSTS = {"seboard.site"}
    ALLOWED_SCHEMES = {"https"}
    MAX_RESPONSE_BYTES = 1_000_000

    async def get_json(
        self,
        url: str,
        *,
        params: dict[str, Any] | None = None,
        timeout: float = 10.0,
    ) -> dict[str, Any] | list[Any]:
        ...
```

필수 검증 순서:

1. URL parse
2. scheme이 `https`인지 확인
3. hostname이 allowlist에 있는지 확인
4. DNS resolve 후 모든 IP가 public인지 확인
5. `follow_redirects=False`
6. response size limit 확인
7. JSON content-type 또는 JSON parse 가능 여부 확인

오류 매핑:

| 상황 | ErrorCode |
| --- | --- |
| 허용되지 않은 host/scheme | `INVALID_REQUEST` |
| private/loopback/link-local IP | `INVALID_REQUEST` |
| timeout/connect/read 실패 | `EXTERNAL_API_ERROR` |
| 429 | `EXTERNAL_RATE_LIMITED` |
| 5xx | `EXTERNAL_API_ERROR` |
| JSON 파싱 실패 | `EXTERNAL_API_ERROR` |

### 14.4 `seboard.py`

상수:

```python
SEBOARD_BASE_URL = "https://seboard.site"
SEBOARD_API_BASE_URL = "https://seboard.site/v1"
DEFAULT_LIMIT = 10
MAX_LIMIT = 20
ARTICLE_CONTENT_LIMIT = 4000
```

메서드:

```python
class SeBoardService:
    async def list_posts(
        self,
        category_id: str,
        *,
        limit: int = DEFAULT_LIMIT,
        include_content: bool = False,
    ) -> list[dict[str, Any]]:
        ...

    async def get_post_detail(self, post_id: str) -> dict[str, Any]:
        ...
```

목록 API:

```text
GET /v1/posts?categoryId={category_id}&page=0&perPage={limit}
```

상세 API:

```text
GET /v1/posts/{post_id}
```

정규화:

```python
{
    "id": str(post_id),
    "title": title,
    "url": f"https://seboard.site/posts/{post_id}",
    "source": "SE Board",
    "author": author,
    "published_at": created_at,
    "summary": summary,
    "content": normalized_content if include_content else None,
    "metadata": {
        "category_id": category_id,
        "category_name": category_name,
        "views": views,
    },
}
```

HTML 본문 정리:

- BeautifulSoup 사용
- `script`, `style` 제거
- `get_text(separator="\n", strip=True)`
- 공백 3개 이상은 줄임
- `ARTICLE_CONTENT_LIMIT` 초과 시 자름

### 14.5 `web_news.py`

```python
class WebNewsService:
    async def fetch_articles(
        self,
        mode: str,
        target: str,
        *,
        limit: int = 10,
        include_content: bool = False,
    ) -> dict[str, Any]:
        if mode == "seboard_posts":
            items = await self._seboard.list_posts(...)
            return {
                "type": "ARTICLE_LIST",
                "items": items,
                "metadata": {
                    "provider": "seboard",
                    "count": len(items),
                    "truncated": len(items) >= limit,
                    "include_content": include_content,
                },
            }
        raise FlowifyException(ErrorCode.UNSUPPORTED_RUNTIME_SOURCE, ...)
```

### 14.6 `input_node.py`

추가:

```python
TOKENLESS_SOURCES = {"web_news"}

SUPPORTED_SOURCES["web_news"] = {"seboard_posts"}
```

실행 분기:

```python
if service == "web_news":
    return await self._fetch_web_news(mode, target, config)
```

config 처리:

- `max_results` 또는 `limit`가 있으면 사용
- 없으면 10
- `include_content`는 기본 `False`

### 14.7 `preview_executor.py`

토큰 예외:

```python
TOKENLESS_SOURCES = {"web_news"}
```

preview 분기:

```python
if service == "web_news":
    return await self._preview_web_news(
        runtime_source.mode,
        runtime_source.target,
        limit,
        include_content,
    )
```

preview에서는 기본 `include_content=false`를 유지한다.

### 14.8 `llm_node.py`

추가 helper:

```python
@staticmethod
def _format_article_item(item: dict[str, Any], index: int) -> str:
    ...
```

`_extract_text_from_canonical()`에 추가:

```python
if data_type == "ARTICLE_LIST":
    items = input_data.get("items", [])
    return "\n\n---\n\n".join(
        LLMNodeStrategy._format_article_item(item, index)
        for index, item in enumerate(items, start=1)
    )
```

### 14.9 `executor.py`

`_to_loop_item_payload()`에 추가:

```python
if source_type == "ARTICLE_LIST" and item_type == "TEXT":
    article = item if isinstance(item, dict) else {}
    return {
        "type": "TEXT",
        "content": WorkflowExecutor._format_article_loop_text(article),
        "article": article,
    }
```

`_format_article_loop_text()`는 private static helper로 둔다.

### 14.10 FastAPI 테스트

추가 테스트:

- `tests/test_web_news.py`
  - SE Board 목록 응답을 `ARTICLE_LIST`로 변환한다.
  - `include_content=false`이면 상세 API를 호출하지 않는다.
  - `include_content=true`이면 상세 API를 호출하고 HTML을 text로 바꾼다.
  - unsupported mode는 `UNSUPPORTED_RUNTIME_SOURCE`를 던진다.
- `tests/test_safe_http.py`
  - `http://` 차단
  - `localhost` 차단
  - private IP DNS resolve 차단
  - allowlist host 성공
- `tests/test_input_node.py`
  - `web_news`는 token 없이 실행된다.
  - `web_news/seboard_posts`가 `ARTICLE_LIST`를 반환한다.
- `tests/test_preview_executor.py`
  - source preview가 `ARTICLE_LIST`를 반환한다.
- `tests/test_llm_node.py`
  - `ARTICLE_LIST`가 제목/링크/본문 텍스트로 변환된다.
- `tests/test_executor.py`
  - `ARTICLE_LIST -> TEXT` loop item 변환이 동작한다.

## 15. Frontend 상세 구현 계약

### 15.1 변경 파일

| 파일 | 작업 |
| --- | --- |
| `src/entities/node/model/dataType.ts` | `article-list` 추가 |
| `src/entities/workflow/lib/workflow-node-adapter.ts` | `ARTICLE_LIST`, `web_news` mapping 추가 |
| `src/entities/workflow/lib/workflow-display.ts` | label/description 추가 |
| `src/entities/node/model/types.ts` | `WebScrapingNodeConfig.service`에 `web_news` 추가 |
| `src/entities/node/model/nodePresentation.ts` | `web_news` 제목 추가 |
| `src/features/add-node/model/source-rollout.ts` | `web_news: ["seboard_posts"]` 추가 |
| `src/features/add-node/model/source-target-picker.ts` | `category_picker` label/remote 추가 |
| `src/features/configure-node/model/source-target-schema.ts` | `category_picker` label/remote 추가 |
| `src/widgets/node-data-panel/ui/DataPreviewBlock.tsx` | `ARTICLE_LIST` preview 추가 |
| `src/features/choice-panel/model/dataTypeKeyMap.ts` | `article-list <-> ARTICLE_LIST` 추가 |
| `src/features/choice-panel/model/wizardSummary.ts` | "글 목록" label 추가 |

### 15.2 Picker 계약

현재 프론트 remote picker 허용 목록에는 `category_picker`가 없다. 따라서 Spring이 `picker_supported=true`를 내려도 일반 입력처럼 보일 수 있다.

반드시 두 군데 모두 추가한다.

```ts
category_picker: "게시판"
```

```ts
const REMOTE_TARGET_SCHEMA_TYPES = new Set([
  "category_picker",
  ...
]);
```

```ts
const REMOTE_SOURCE_TARGET_SCHEMA_TYPES = new Set([
  "category_picker",
  ...
]);
```

### 15.3 DataPreviewBlock 계약

`ARTICLE_LIST` 전용 컴포넌트를 추가한다.

```tsx
const ArticleListPreview = ({ data }: { data: DataRecord }) => {
  const items = getFirstRecordItems(data, ["items"]);
  ...
};
```

표시 카드:

- 상단 summary: `N개 글`
- 각 글:
  - 제목
  - 출처
  - 작성일
  - summary 또는 content 일부
  - 원문 링크

숨김:

- `metadata`
- `id`
- raw object 전체

### 15.4 사용자 문구

| 내부 값 | 사용자 표시 |
| --- | --- |
| `web_news` | 인터넷 글/공지 |
| `seboard_posts` | SE Board 게시글 가져오기 |
| `ARTICLE_LIST` | 글 목록 |
| `category_picker` | 게시판 |
| `include_content` | 본문도 함께 가져오기 |

### 15.5 Frontend 테스트/검증

필수 검증:

- `pnpm run build`
- 시작 노드 추가 패널에서 "인터넷 글/공지"가 보이는지 확인
- "SE Board 게시글 가져오기" 선택 시 게시판 picker가 뜨는지 확인
- 게시판 선택 후 노드가 `article-list` output type으로 저장되는지 확인
- 미리보기 modal에서 raw JSON이 아니라 글 목록 카드가 보이는지 확인
- "글 하나씩 처리" 선택 시 다음 단계가 `TEXT` 기반으로 이어지는지 확인

## 16. 단계별 커밋 제안

### 16.1 Spring

1. `feat: 인터넷 글 소스 카탈로그 추가`
2. `feat: 글 목록 선택 규칙 추가`
3. `feat: 인터넷 글 게시판 선택지 제공`
4. `test: 인터넷 글 카탈로그 테스트 추가`

### 16.2 FastAPI

1. `feat: 글 목록 canonical 추가`
2. `feat: 안전한 외부 요청 클라이언트 추가`
3. `feat: SE Board 글 수집 추가`
4. `feat: 인터넷 글 소스 실행 추가`
5. `feat: 글 목록 AI와 루프 처리 추가`
6. `test: 인터넷 글 소스 테스트 추가`

### 16.3 Frontend

1. `feat: 글 목록 데이터 타입 추가`
2. `feat: 인터넷 글 소스 선택 추가`
3. `feat: 게시판 선택 picker 추가`
4. `feat: 글 목록 미리보기 추가`

## 17. 최종 구현 우선순위

1. Spring catalog/schema/mapping을 먼저 반영한다.
2. FastAPI가 `ARTICLE_LIST`를 실제로 반환하게 만든다.
3. Frontend에서 `web_news`를 노출한다.
4. 전체 수동 테스트를 진행한다.
5. RSS/Naver/임의 URL은 별도 이슈로 분리한다.

이 순서를 지켜야 프론트가 존재하지 않는 catalog를 먼저 소비하거나, FastAPI가 모르는 canonical type을 받는 상황을 피할 수 있다.

## 18. 웹사이트/RSS 자동 탐색 확장 설계

### 18.1 배경

SE Board provider는 정상 동작하지만, 현재 사용자가 선택할 수 있는 인터넷 글/공지 출처가 SE Board 하나뿐이다. 다음 확장으로 RSS를 검토했으나, 비전공자 사용자가 RSS 주소를 직접 찾아 입력하는 UX는 Flowify의 목표와 맞지 않는다.

따라서 사용자에게는 RSS라는 용어를 기본 노출하지 않고, "웹사이트 최신 글 가져오기"로 제공한다. 사용자는 사이트 주소를 입력하고, FastAPI가 내부에서 RSS/Atom feed를 자동 탐색한다. RSS 주소를 이미 알고 있는 사용자가 같은 입력칸에 RSS 주소를 넣는 것도 허용하지만, UI의 기본 설명은 "사이트 주소" 기준으로 유지한다.

중요한 제한은 명확히 둔다. 이 확장은 임의 웹페이지를 크롤링해서 게시글 목록을 추론하는 기능이 아니다. 사이트가 RSS/Atom feed를 제공하거나, HTML에 feed discovery link를 선언한 경우에만 글 목록을 가져온다. feed를 찾지 못하면 실패 안내를 보여주고, CSS selector/XPath 기반 크롤링은 별도 고급 기능으로 분리한다.

### 18.2 레퍼런스 기준

| 레퍼런스 | 관찰 내용 | Flowify 적용 |
| --- | --- | --- |
| n8n RSS Read / RSS Trigger | 자동화 도구는 RSS Feed URL을 직접 받는다. | 내부 처리 모델은 참고하되, 메인 UX로 쓰지 않는다. |
| Zapier RSS by Zapier | Feed URL을 직접 입력하는 자동화형 UX다. | 고급 사용자 fallback 정도로만 참고한다. |
| Activepieces RSS | RSS URL 또는 여러 URL을 직접 받는다. | provider 결과를 표준 item 목록으로 변환하는 구조만 참고한다. |
| Feedly | 사이트명, 주제, 웹사이트 주소를 통해 구독 대상을 찾는다. | 비전공자 UX의 기준으로 삼는다. |
| FreshRSS | RSS/Atom URL 입력뿐 아니라 웹사이트의 feed 자동 탐색을 지원한다. | `link rel="alternate"` 기반 자동 탐색을 적용한다. |
| OWASP SSRF Cheat Sheet | 서버가 사용자 URL을 호출할 때 allowlist, URL 검증, private IP 차단 등이 필요하다. | SafeHttpClient를 확장해 public HTTPS, 크기 제한, redirect 제한을 강제한다. |

참고:

- https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.rssfeedread/
- https://help.zapier.com/hc/en-us/articles/8496279482125-Trigger-Zaps-from-new-RSS-feed-items
- https://www.activepieces.com/pieces/rss
- https://docs.feedly.com/article/768-follow-sources-in-feedly
- https://freshrss.github.io/FreshRSS/en/users/04_Subscriptions.html
- https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html

### 18.3 사용자 UX

사용자에게 보이는 흐름:

1. 시작 노드에서 "인터넷 글/공지"를 선택한다.
2. 가져오기 방식에서 "웹사이트 최신 글 가져오기"를 선택한다.
3. "사이트 주소"에 웹사이트 주소를 입력한다.
   - 예: `https://example.com`
   - RSS 주소를 알고 있다면 RSS 주소를 그대로 넣어도 된다.
4. 실행 전 미리보기에서 가져올 글 목록을 확인한다.
5. 이후 "글 하나씩 처리" 또는 "전체를 하나로 묶어 처리"를 선택한다.

사용자 문구:

| 내부 개념 | 사용자 표시 |
| --- | --- |
| `website_feed` | 웹사이트 최신 글 가져오기 |
| RSS/Atom | 기본 UI에서는 직접 노출하지 않음 |
| feed discovery 실패 | 이 사이트에서 자동으로 가져올 글 목록을 찾지 못했습니다. |
| feed URL 직접 입력 | 사이트 주소 또는 RSS 주소 |

### 18.4 Source Mode 계약

Spring catalog에는 `web_news` 서비스 아래 source mode를 추가한다.

```json
{
  "key": "website_feed",
  "label": "웹사이트 최신 글 가져오기",
  "canonical_input_type": "ARTICLE_LIST",
  "trigger_kind": "manual",
  "target_schema": {
    "type": "text_input",
    "placeholder": "예: https://example.com",
    "label": "사이트 주소",
    "helper_text": "사이트 주소를 입력하면 최신 글 목록을 자동으로 찾습니다.",
    "validation": "url"
  }
}
```

원칙:

- `rss_feed` 별도 mode는 MVP에서 만들지 않는다.
- `website_feed`가 일반 웹사이트 URL과 RSS/Atom URL을 모두 처리한다.
- `website_feed`는 RSS/Atom 자동 탐색 기반 mode다. 임의 HTML 게시판 크롤링으로 확장 해석하지 않는다.
- 결과 타입은 기존 `ARTICLE_LIST`를 그대로 사용한다.
- `TargetOptionProvider`는 추가하지 않는다. 사용자가 직접 입력하는 source mode이기 때문이다.
- `mapping_rules.json`, `schema_types.json`, `ai_prompt_rules.json`는 기존 `ARTICLE_LIST` 계약을 재사용한다.

### 18.5 Spring 설계

수정 대상:

| 파일 | 변경 |
| --- | --- |
| `src/main/resources/catalog/source_catalog.json` | `web_news.source_modes`에 `website_feed` 추가 |
| Spring catalog 관련 테스트 | `website_feed`가 catalog에 포함되고 `ARTICLE_LIST`를 반환하는지 검증 |

Spring은 RSS 탐색을 하지 않는다. 역할은 "이런 source mode가 있고, 사용자는 사이트 주소를 입력해야 한다"는 계약을 프론트에 내려주는 것이다.

검증 기준:

- `web_news` service에 `seboard_posts`, `website_feed`가 함께 존재한다.
- `website_feed.canonical_input_type == ARTICLE_LIST`
- `website_feed.target_schema.type == text_input`
- `website_feed.target_schema.label/helper_text`는 프론트가 무시해도 기존 동작이 깨지지 않는다.

### 18.6 FastAPI 설계

FastAPI는 실제 외부 URL 호출, feed 자동 탐색, RSS/Atom 파싱, `ARTICLE_LIST` 변환을 담당한다.

수정/추가 대상:

| 파일 | 변경 |
| --- | --- |
| `app/services/integrations/safe_http.py` | HTML/XML/text 응답을 받을 수 있는 `get_text()` 추가 |
| `app/services/integrations/feed_discovery.py` | 사이트 URL에서 RSS/Atom feed URL 탐색 |
| `app/services/integrations/rss_feed.py` | RSS/Atom feed를 `ArticleItem` dict 목록으로 변환 |
| `app/services/integrations/web_news.py` | `website_feed` mode 라우팅 추가 |
| `app/core/nodes/input_node.py` | `SUPPORTED_SOURCES["web_news"]`에 `website_feed` 추가 |
| `app/core/engine/preview_executor.py` | `website_feed` preview가 기존 web_news preview 경로를 타게 유지 |
| `pyproject.toml`, `requirements.txt` | `feedparser` 의존성 추가 |

#### 18.6.1 SafeHttpClient 확장

`get_text()`를 추가한다.

```python
async def get_text(
    self,
    url: str,
    *,
    params: dict[str, Any] | None = None,
    timeout: float = 10.0,
    allowed_content_types: set[str] | None = None,
) -> str:
    ...
```

보안 규칙:

- `https`만 허용한다.
- 사용자 정보가 포함된 URL은 거부한다. 예: `https://user:pass@example.com`
- fragment는 요청에 사용하지 않는다.
- hostname이 없으면 거부한다.
- IP literal URL은 public IP인 경우만 허용한다.
- DNS로 해석된 모든 IP가 public인지 확인한다.
- redirect는 기본 거부한다.
- 응답 크기는 기존 `MAX_RESPONSE_BYTES`를 따른다.
- content-type은 HTML, XML, RSS, Atom, text 계열만 허용한다.
- timeout을 강제한다.

초기 arbitrary website mode에서는 allowlist만으로 제한할 수 없으므로, public HTTPS 검증과 private network 차단이 핵심 방어선이다.

기존 SE Board adapter와 `website_feed`는 같은 `SafeHttpClient`를 공유하되, host 정책은 분리한다.

```python
class SafeHttpClient:
    def __init__(
        self,
        *,
        allowed_hosts: set[str] | None = None,
        allow_any_public_host: bool = False,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        ...
```

정책:

- 기본값은 `allow_any_public_host=False`다.
- `allowed_hosts`가 있으면 기존처럼 allowlist host만 허용한다.
- `allow_any_public_host=True`는 `website_feed` 전용으로만 사용한다.
- `allow_any_public_host=True`여도 scheme, DNS, public IP, redirect, response size 검증은 동일하게 적용한다.
- SE Board adapter는 기존처럼 `allowed_hosts={"seboard.site"}` 또는 기본 allowlist를 사용한다.
- 테스트에서 public host 모드와 allowlist 모드를 분리 검증한다.

#### 18.6.2 FeedDiscoveryService

새 파일:

- `app/services/integrations/feed_discovery.py`

책임:

1. 입력 URL을 정규화한다.
2. URL 응답이 RSS/Atom이면 그대로 feed URL로 사용한다.
3. HTML이면 `<link rel="alternate">` 중 RSS/Atom 타입을 찾는다.
4. 상대 경로 feed href는 입력 URL 기준 absolute URL로 변환한다.
5. link tag가 없으면 제한된 common path를 순서대로 시도한다.
   - `/feed`
   - `/rss`
   - `/rss.xml`
   - `/atom.xml`
   - `/feed.xml`
6. 찾지 못하면 `INVALID_REQUEST`로 사용자 친화적인 실패 메시지를 반환한다.

common path 시도는 최대 5회로 제한한다. 한 사이트 입력이 과도한 외부 요청으로 번지지 않도록 하기 위해서다.

비범위:

- HTML 본문에서 게시글 카드/목록을 추론하지 않는다.
- CSS selector, XPath, JSONPath 입력을 받지 않는다.
- 페이지 내 모든 링크를 순회하지 않는다.
- sitemap.xml을 따라가지 않는다.

#### 18.6.3 RssFeedService

새 파일:

- `app/services/integrations/rss_feed.py`

의존성:

- `feedparser>=6.0.11`

이유:

- RSS/Atom은 사이트별 변형이 많다.
- 표준 XML 파서와 수동 key 접근으로 처리하면 RSS 2.0, Atom, content namespace 차이에서 쉽게 깨진다.
- 검증된 parser를 사용해야 provider adapter가 얇게 유지된다.

주요 메서드:

```python
async def list_articles(
    self,
    source_url: str,
    *,
    limit: int = 10,
    include_content: bool = False,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    ...
```

변환 규칙:

| Feed entry | ArticleItem |
| --- | --- |
| `id` 또는 `guid` 또는 `link` | `id` |
| `title` | `title` |
| `link` | `url` |
| `feed.title` | `source` |
| `author` | `author` |
| `published` 또는 `updated` | `published_at` |
| `summary` | `summary` |
| `content[0].value` | `content` |

HTML이 섞인 summary/content는 BeautifulSoup로 text만 추출한다. 각 글의 content는 최대 4000자로 제한한다.

#### 18.6.4 WebNewsService 라우팅

`web_news.py`에 mode를 추가한다.

```python
if mode == "website_feed":
    normalized_limit = self._normalize_limit(limit)
    items, feed_metadata = await self._rss_feed.list_articles(
        target,
        limit=normalized_limit,
        include_content=include_content,
    )
    return {
        "type": "ARTICLE_LIST",
        "items": items,
        "metadata": {
            "provider": "rss",
            "count": len(items),
            "truncated": len(items) >= normalized_limit,
            "include_content": include_content,
            **feed_metadata,
        },
    }
```

`target`은 사용자가 입력한 사이트 주소다. RSS 직접 주소가 들어와도 같은 경로에서 처리한다.

### 18.7 Frontend 설계

수정 대상:

| 파일 | 변경 |
| --- | --- |
| `src/features/add-node/model/source-rollout.ts` | `web_news: ["seboard_posts", "website_feed"]` |
| `src/features/add-node/ui/ServiceSelectionPanel.tsx` | `target_schema.label/helper_text/validation` 표시 지원 |
| `src/features/configure-node/ui/panels/SourceTargetForm.tsx` | 수정 화면에서도 동일한 helper text 표시 |
| `src/features/add-node/model/source-target-picker.ts` | text input 기본 label/placeholder 보정 |
| `src/features/configure-node/model/source-target-schema.ts` | text input 기본 label/placeholder 보정 |

기존 `text_input`은 동작하지만 사용자 설명이 부족하다. 따라서 `target_schema`의 optional field를 프론트가 읽도록 확장한다.

프론트 helper:

```ts
export const getTargetSchemaHelperText = (
  targetSchema: Record<string, unknown>,
) =>
  typeof targetSchema.helper_text === "string"
    ? targetSchema.helper_text
    : null;
```

`validation: "url"`은 즉시 blocking validation보다는 1차 UX 안내로 사용한다.

- 입력값이 비어 있으면 기존처럼 다음 단계 비활성화
- 입력값이 URL처럼 보이지 않으면 "https://로 시작하는 사이트 주소를 입력해주세요." 표시
- 최종 실패 판단은 FastAPI 응답 메시지를 따른다.
- `validation`이 `url`인 경우에만 URL 안내를 적용한다.
- 기존 `text_input` source mode에는 URL 검증을 적용하지 않는다.

`ARTICLE_LIST` preview UI는 기존 구현을 그대로 재사용한다.

### 18.8 에러 UX

FastAPI error detail은 프론트에서 그대로 노출되어도 이해 가능한 문장이어야 한다.

| 상황 | 사용자 메시지 |
| --- | --- |
| URL 형식 아님 | 사이트 주소 형식이 올바르지 않습니다. |
| HTTP URL | 보안을 위해 https 주소만 사용할 수 있습니다. |
| feed 탐색 실패 | 이 사이트에서 자동으로 가져올 글 목록을 찾지 못했습니다. |
| 응답 과대 | 사이트 응답이 너무 커서 가져올 수 없습니다. |
| 외부 요청 실패 | 사이트에 연결할 수 없습니다. 잠시 후 다시 시도해주세요. |
| feed 파싱 실패 | 이 사이트의 글 목록 형식을 읽을 수 없습니다. |

### 18.9 영향 범위

| 영역 | 영향 |
| --- | --- |
| SE Board | 기존 `seboard_posts` mode를 유지하므로 영향 없음 |
| Choice Wizard | `ARTICLE_LIST`를 재사용하므로 추가 변경 없음 |
| AI Node | 기존 `ARTICLE_LIST` text extraction 재사용 |
| Loop | 기존 `ARTICLE_LIST -> TEXT` 변환 재사용 |
| Sink | RSS 결과도 `ARTICLE_LIST`이므로 기존 제한과 동일 |
| Security | arbitrary public URL 호출이 추가되므로 `SafeHttpClient` public host 모드와 allowlist 모드를 분리해야 함 |

### 18.10 완료 기준

- 시작 노드에서 "인터넷 글/공지" 아래 "웹사이트 최신 글 가져오기"가 보인다.
- 사용자가 `https://...` 사이트 주소를 입력할 수 있다.
- RSS 주소가 아닌 일반 사이트 주소에서도 feed link가 있으면 글 목록을 찾는다.
- RSS/Atom 주소를 직접 넣어도 같은 mode에서 동작한다.
- RSS/Atom feed가 없는 일반 HTML 사이트는 "글 목록을 찾지 못했습니다"로 실패한다.
- FastAPI는 `ARTICLE_LIST` payload를 반환한다.
- 미리보기에서 raw JSON이 아니라 글 목록 카드가 보인다.
- feed를 찾지 못한 경우 사용자 친화적인 실패 메시지를 반환한다.
- private/local network URL은 차단된다.
- SE Board의 기존 allowlist 기반 요청은 public host 모드 변경의 영향을 받지 않는다.

### 18.11 단계별 구현 제안

#### Spring

1. `feat: 웹사이트 글 소스 카탈로그 추가`
2. `test: 웹사이트 글 소스 카탈로그 검증 추가`

#### FastAPI

1. `feat(글목록): 안전한 텍스트 응답 요청 추가`
2. `feat(글목록): feed 자동 탐색 추가`
3. `feat(글목록): RSS 글 목록 변환 추가`
4. `feat(글목록): 웹사이트 feed 실행 연결`
5. `test(글목록): 웹사이트 feed 테스트 추가`

#### Frontend

1. `feat: 웹사이트 글 소스 선택 추가`
2. `feat: 소스 대상 입력 안내 추가`
3. `feat: 웹사이트 주소 입력 검증 추가`
