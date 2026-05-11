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

## 19. 출처 선택형 UX 보정 설계

### 19.1 보정 배경

`website_feed`는 기술적으로 RSS/Atom 자동 탐색 기능이지만, 사용자는 자신이 입력한 사이트가 RSS를 제공하는지 알기 어렵다. `https://news.naver.com/`처럼 사용자가 자연스럽게 입력할 수 있는 주소가 실패하면, 실패 원인이 사이트 구조인지 사용자 입력 문제인지 이해하기 어렵다.

따라서 `website_feed`를 기본 뉴스 수집 방식처럼 노출하지 않고, 사용자가 이해할 수 있는 출처 선택형 구조로 보정한다.

핵심 방향:

- 사용자는 먼저 "어디에서 가져올지"를 선택한다.
- 네이버 뉴스처럼 기대 사용 빈도가 높은 출처는 전용 provider로 제공한다.
- RSS/Atom 기반 자동 탐색은 "RSS 지원 사이트 직접 입력" 또는 "기타 사이트" 성격으로 낮춘다.
- 사용자가 RSS라는 개념을 몰라도 기본 기능을 사용할 수 있어야 한다.
- 실패 가능성이 있는 범용 URL 입력은 실패 조건을 UI와 에러 메시지에서 미리 설명한다.

### 19.2 사용자 UX 재정렬

시작 노드에서 사용자가 보는 선택지는 다음처럼 정리한다.

| 사용자 선택 | 내부 service/mode | 입력 방식 | 결과 타입 | 비고 |
| --- | --- | --- | --- | --- |
| SE Board 게시글 | `web_news/seboard_posts` | 게시판 선택 | `ARTICLE_LIST` | 현재 구현 유지 |
| 네이버 뉴스 검색 | `naver_news/article_search` | 검색어 입력 | `ARTICLE_LIST` | 네이버 공식 검색 API 기반 |
| RSS 지원 사이트 | `web_news/website_feed` | 사이트 주소 또는 RSS 주소 입력 | `ARTICLE_LIST` | 고급/기타 옵션 |

사용자에게는 `RSS`, `Atom`, `feed discovery` 같은 용어를 기본 흐름에서 노출하지 않는다. 다만 `website_feed` 설명에는 "일부 사이트만 지원"된다는 점을 명확히 적는다.

추천 문구:

| 항목 | 문구 |
| --- | --- |
| `web_news` service label | 웹 글/공지 |
| `seboard_posts` label | SE Board 게시글 |
| `naver_news` service label | 네이버 뉴스 |
| `article_search` label | 네이버 뉴스 검색 |
| `website_feed` label | RSS 지원 사이트 |
| `website_feed` helper | RSS를 제공하는 사이트에서만 최신 글을 찾을 수 있습니다. 네이버 뉴스는 "네이버 뉴스 검색"을 선택해 주세요. |

### 19.3 Spring 설계 보정

현재 Spring catalog에는 이미 `naver_news` service가 존재한다.

```json
{
  "key": "naver_news",
  "label": "네이버 뉴스",
  "auth_required": false,
  "source_modes": [
    {
      "key": "keyword_search",
      "label": "키워드 검색 결과 조회",
      "canonical_input_type": "API_RESPONSE",
      "trigger_kind": "manual",
      "target_schema": { "type": "text_input", "placeholder": "검색 키워드" }
    }
  ]
}
```

보정 방향:

- 기존 `keyword_search`는 `API_RESPONSE` 계약을 유지한다.
- 네이버 뉴스 검색을 사용자 친화적인 글 목록으로 쓰기 위해 신규 mode `article_search`를 추가한다.
- `article_search`는 `ARTICLE_LIST`를 반환한다.
- `periodic_collect`는 schedule UX와 별도 실행 주기가 필요하므로 이번 노출 범위에서 제외한다.
- `target_schema`에 `label`, `helper_text`를 추가해 프론트가 검색어 입력 의도를 설명할 수 있게 한다.

이 선택은 기존 `keyword_search`를 직접 수정하는 것보다 안전하다. Spring 문서와 mapping rule에는 아직 `API_RESPONSE` 기반 외부 API 응답 흐름이 남아 있고, 저장된 워크플로우 또는 템플릿이 `keyword_search`의 기존 계약에 의존할 가능성이 있기 때문이다.

권장 1차 catalog 추가:

```json
{
  "key": "article_search",
  "label": "네이버 뉴스 검색",
  "canonical_input_type": "ARTICLE_LIST",
  "trigger_kind": "manual",
  "target_schema": {
    "type": "text_input",
    "placeholder": "예: 인공지능, 취업, 학과 공지",
    "label": "검색어",
    "helper_text": "입력한 검색어와 관련된 최신 네이버 뉴스 목록을 가져옵니다."
  }
}
```

`website_feed` catalog는 유지하되 label/helper를 아래처럼 보정한다.

```json
{
  "key": "website_feed",
  "label": "RSS 지원 사이트",
  "canonical_input_type": "ARTICLE_LIST",
  "trigger_kind": "manual",
  "target_schema": {
    "type": "text_input",
    "placeholder": "예: https://example.com/rss.xml",
    "label": "사이트 주소",
    "helper_text": "RSS를 제공하는 사이트에서만 최신 글을 찾을 수 있습니다. 네이버 뉴스는 네이버 뉴스 검색을 선택해 주세요.",
    "validation": "url"
  }
}
```

### 19.4 FastAPI 설계 보정

FastAPI는 `naver_news/article_search`를 새 runtime source로 지원한다.

수정 대상:

| 파일 | 변경 |
| --- | --- |
| `app/core/nodes/input_node.py` | `SUPPORTED_SOURCES["naver_news"] = {"article_search"}` 추가, tokenless source에 `naver_news` 추가 |
| `app/core/engine/preview_executor.py` | `naver_news` preview 지원 |
| `app/services/integrations/naver_news.py` | 네이버 뉴스 검색 API adapter 추가 |
| `app/config.py` | `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` 설정 추가 |
| `tests/test_naver_news.py` | 응답 변환/에러 테스트 추가 |
| `tests/test_input_node.py` | `naver_news/article_search` 실행 테스트 추가 |
| `tests/test_preview_executor.py` | preview 테스트 추가 |

네이버 공식 API 계약:

- 요청 URL: `https://openapi.naver.com/v1/search/news.json`
- 필수 파라미터: `query`
- 선택 파라미터: `display`, `start`, `sort`
- 인증 헤더: `X-Naver-Client-Id`, `X-Naver-Client-Secret`

Flowify 기본값:

| 옵션 | 값 |
| --- | --- |
| `display` | 10 |
| `sort` | `date` |
| `start` | 1 |
| max display | 20 |

결과 변환:

| Naver field | ArticleItem |
| --- | --- |
| `title` | `title` |
| `originallink` | `url` 우선값 |
| `link` | `metadata.naver_link` |
| `description` | `summary` |
| `pubDate` | `published_at` |
| fixed | `source = "Naver News"` |
| fixed | `metadata.provider = "naver_news"` |

HTML 태그가 포함된 `title`, `description`은 기존 RSS 변환과 동일하게 text만 남긴다.

에러 정책:

| 상황 | 사용자 메시지 |
| --- | --- |
| 검색어 없음 | 검색어를 입력해 주세요. |
| Naver API 키 미설정 | 네이버 뉴스 연결 설정이 필요합니다. 관리자에게 문의해 주세요. |
| 401/403 | 네이버 뉴스 API 인증에 실패했습니다. |
| 429 | 네이버 뉴스 API 호출 한도를 초과했습니다. 잠시 후 다시 시도해 주세요. |
| 빈 결과 | 검색 결과가 없습니다. 다른 검색어를 입력해 주세요. |

### 19.5 Frontend 설계 보정

수정 대상:

| 파일 | 변경 |
| --- | --- |
| `src/features/add-node/model/source-rollout.ts` | `naver_news: ["article_search"]` 추가 |
| `src/entities/node/ui/custom-nodes/WebScrapingNode.tsx` | `naver_news/article_search`, `web_news/website_feed` 사용자 표시 문구 추가 |
| `src/entities/node/model/nodePresentation.ts` | `naver_news` 표시명을 "네이버 뉴스"로 유지 |
| `src/features/add-node/model/source-target-picker.ts` | `text_input` label/helper 문구 사용 유지 |
| `src/features/configure-node/model/source-target-schema.ts` | 수정 화면에서도 helper 문구 사용 유지 |

프론트는 네이버 API 키를 다루지 않는다. 사용자는 검색어만 입력한다.

`source-rollout.ts` 기준 노출:

```ts
export const SOURCE_SERVICE_ROLLOUT_ALLOWLIST = {
  ...
  naver_news: ["article_search"],
  web_news: ["seboard_posts", "website_feed"],
} as const;
```

단, `website_feed`가 기본적으로 너무 앞에 보이면 사용자가 다시 URL 입력부터 시도할 수 있으므로 UI 정렬은 다음 우선순위를 권장한다.

1. SE Board 게시글
2. 네이버 뉴스 검색
3. RSS 지원 사이트

현재 서비스 단위 카드 정렬만 가능하다면 `web_news`와 `naver_news`는 둘 다 노출하되, `website_feed` label/helper에서 실패 가능성을 분명히 한다.

### 19.6 기존 `website_feed` 처리 원칙

`website_feed`는 삭제하지 않는다. 이미 구현한 SafeHttpClient, feed discovery, RSS parser는 다음 경우에 가치가 있다.

- 사용자가 RSS 주소를 알고 있는 경우
- 사이트가 `<link rel="alternate" type="application/rss+xml">`를 제공하는 경우
- 블로그/기술 문서 사이트처럼 RSS가 일반적인 출처인 경우

하지만 `website_feed`는 "모든 웹사이트 최신 글 가져오기"가 아니다. 다음은 명시적 비범위로 둔다.

- 네이버 뉴스 메인 페이지 HTML 파싱
- 임의 게시판 DOM 구조 추론
- CSS selector/XPath 직접 입력
- sitemap 순회
- 페이지 내 링크 전체 크롤링

### 19.7 완료 기준 보정

- 시작 노드에서 "네이버 뉴스"를 선택할 수 있다.
- 네이버 뉴스에서는 URL이 아니라 검색어를 입력한다.
- 네이버 뉴스 검색 결과는 `ARTICLE_LIST`로 반환된다.
- 기존 `naver_news/keyword_search`의 `API_RESPONSE` 계약은 변경하지 않는다.
- 네이버 뉴스 결과를 AI 요약/분류/Discord 전송으로 연결할 수 있다.
- `https://news.naver.com/`를 `RSS 지원 사이트`에 입력했을 때 실패하더라도, 메시지가 "네이버 뉴스는 네이버 뉴스 검색을 선택"하도록 안내한다.
- `RSS 지원 사이트`는 RSS/Atom이 있는 사이트에서만 성공한다.
- SE Board 기존 흐름은 깨지지 않는다.
- 프론트는 Naver API credential을 저장하거나 노출하지 않는다.

### 19.8 구현 순서 보정

1. Spring catalog에 `naver_news.article_search`를 `ARTICLE_LIST` 계약으로 추가한다.
2. FastAPI에 `NaverNewsService`와 runtime source 연결을 추가한다.
3. Frontend rollout에 `naver_news.article_search`를 노출한다.
4. `website_feed` label/helper를 "RSS 지원 사이트"로 낮춘다.
5. 통합 테스트로 `네이버 뉴스 검색 -> AI 요약 -> Discord 전송` 흐름을 확인한다.

## 20. 프로젝트별 구현 상세 설계

### 20.1 공통 계약

이번 보정의 기준 계약은 다음과 같다.

| 항목 | 값 |
| --- | --- |
| 사용자 선택 서비스 | `naver_news` |
| 사용자 선택 모드 | `article_search` |
| 사용자 입력 | 검색어 |
| Spring catalog 출력 타입 | `ARTICLE_LIST` |
| FastAPI runtime 출력 타입 | `ARTICLE_LIST` |
| 프론트 표시명 | 네이버 뉴스 / 네이버 뉴스 검색 |
| credential 위치 | FastAPI 서버 환경변수 |

기존 `naver_news/keyword_search`는 `API_RESPONSE` 계약을 유지한다. 이 모드는 기존 API 응답형 노드나 템플릿이 참조할 수 있으므로, 사용자 친화형 기사 목록 수집은 새 모드 `article_search`로 분리한다.

`web_news/website_feed`는 유지하되 기본 추천 출처가 아니라 "RSS 지원 사이트"로 의미를 좁힌다. 사용자가 `https://news.naver.com/` 같은 일반 웹페이지를 넣었을 때 실패하는 것은 허용하되, 실패 메시지는 네이버 뉴스 검색 모드로 유도해야 한다.

### 20.2 Spring 설계

Spring은 "노드 설정 카탈로그와 타입 계약"을 책임진다. 실제 네이버 API 호출이나 API 키 관리는 Spring에서 하지 않는다.

수정 대상:

| 파일 | 변경 |
| --- | --- |
| `src/main/resources/catalog/source_catalog.json` | `naver_news.article_search` 추가, `website_feed` 문구 보정 |
| `src/test/java/.../CatalogServiceTest.java` | catalog 계약 테스트 추가 |

`source_catalog.json` 보정안:

```json
{
  "key": "article_search",
  "label": "네이버 뉴스 검색",
  "canonical_input_type": "ARTICLE_LIST",
  "trigger_kind": "manual",
  "target_schema": {
    "type": "text_input",
    "label": "검색어",
    "placeholder": "예: 인공지능, 취업, 학과 공지",
    "helper_text": "검색어와 관련된 최신 네이버 뉴스 목록을 가져옵니다."
  }
}
```

`website_feed`는 다음처럼 의미를 좁힌다.

```json
{
  "key": "website_feed",
  "label": "RSS 지원 사이트",
  "canonical_input_type": "ARTICLE_LIST",
  "trigger_kind": "manual",
  "target_schema": {
    "type": "text_input",
    "label": "사이트 주소",
    "placeholder": "예: https://example.com/rss.xml",
    "helper_text": "RSS를 제공하는 사이트에서만 최신 글을 찾을 수 있습니다. 네이버 뉴스는 네이버 뉴스 검색을 선택해 주세요.",
    "validation": "url"
  }
}
```

테스트 기준:

- `naver_news/keyword_search`가 계속 `API_RESPONSE`인지 확인한다.
- `naver_news/article_search`가 `ARTICLE_LIST`인지 확인한다.
- `naver_news/article_search`의 `target_schema.type`이 `text_input`인지 확인한다.
- `web_news/website_feed`의 label/helper가 RSS 지원 범위로 표현되는지 확인한다.
- `web_news/seboard_posts` 계약은 변경하지 않는다.

Spring에서 하지 않는 일:

- 네이버 API 호출
- 네이버 credential 저장
- 네이버 검색 결과 변환
- RSS URL 자동 보정

### 20.3 FastAPI 설계

FastAPI는 "실행 시 검색어로 네이버 뉴스를 호출하고, Flowify 표준 `ARTICLE_LIST`로 변환"하는 책임을 가진다.

수정 대상:

| 파일 | 변경 |
| --- | --- |
| `app/config.py` | `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` 설정 추가 |
| `app/core/nodes/input_node.py` | `naver_news/article_search` source 실행 연결 |
| `app/core/engine/preview_executor.py` | `naver_news/article_search` preview 연결 |
| `app/services/integrations/naver_news.py` | 네이버 뉴스 API adapter 추가 |
| `.env.example` 또는 환경변수 문서 | 네이버 API 키 설정 안내 추가 |
| `tests/...` | service/input/preview 테스트 추가 |

설정 필드:

```py
NAVER_CLIENT_ID: str | None = None
NAVER_CLIENT_SECRET: str | None = None
```

`InputNodeStrategy` 보정:

```py
SUPPORTED_SOURCES = {
    ...
    "naver_news": {"article_search"},
    "web_news": {"seboard_posts", "website_feed"},
}

TOKENLESS_SOURCES = frozenset({"web_crawl", "web_news", "naver_news"})
```

실행 분기:

```py
if service == "naver_news":
    return await self._fetch_naver_news(mode, target, config)
```

`_fetch_naver_news` 정책:

- `mode != "article_search"`면 `UNSUPPORTED_RUNTIME_SOURCE`
- `target`은 검색어로 해석한다.
- 검색어가 비어 있으면 `INVALID_REQUEST`
- 결과 개수는 기존 article limit 해석 함수를 재사용하되 최대 20개로 제한한다.
- 본문 크롤링은 하지 않는다.
- `include_content`가 있더라도 1차 범위에서는 무시하거나 false로 고정한다.

`NaverNewsService` 반환 형태:

```py
{
    "type": "ARTICLE_LIST",
    "items": [
        {
            "title": "기사 제목",
            "summary": "기사 요약",
            "url": "https://...",
            "source": "Naver News",
            "published_at": "Mon, 01 Jan 2026 09:00:00 +0900",
            "metadata": {
                "provider": "naver_news",
                "naver_link": "https://news.naver.com/...",
                "query": "검색어"
            }
        }
    ],
    "metadata": {
        "provider": "naver_news",
        "query": "검색어",
        "count": 10,
        "sort": "date"
    }
}
```

네이버 API 호출 정책:

- URL은 `https://openapi.naver.com/v1/search/news.json`로 고정한다.
- 사용자 입력은 URL이 아니라 `query` 파라미터에만 넣는다.
- 기본 `display`는 10, 최대 20으로 제한한다.
- 기본 `sort`는 `date`로 둔다.
- `title`, `description`의 HTML 태그는 제거한다.
- `originallink`가 있으면 기사 URL로 우선 사용하고, 없으면 `link`를 사용한다.

에러 매핑:

| 조건 | ErrorCode | 사용자 메시지 |
| --- | --- | --- |
| 검색어 없음 | `INVALID_REQUEST` | 검색어를 입력해 주세요. |
| API 키 없음 | `EXTERNAL_API_ERROR` | 네이버 뉴스 연결 설정이 필요합니다. 관리자에게 문의해 주세요. |
| 401/403 | `EXTERNAL_API_ERROR` | 네이버 뉴스 API 인증에 실패했습니다. |
| 429 | `EXTERNAL_RATE_LIMITED` | 네이버 뉴스 API 호출 한도를 초과했습니다. 잠시 후 다시 시도해 주세요. |
| 결과 없음 | `INVALID_REQUEST` | 검색 결과가 없습니다. 다른 검색어를 입력해 주세요. |

테스트 기준:

- `MockTransport`로 네이버 API 성공 응답을 넣었을 때 `ARTICLE_LIST`가 반환된다.
- HTML 태그가 제거된다.
- `originallink` 우선순위가 적용된다.
- API 키가 없으면 사용자 메시지가 명확하다.
- 401/403/429가 각각 정책대로 변환된다.
- `InputNodeStrategy`에서 `naver_news/article_search`가 token 없이 실행된다.
- preview executor에서도 같은 결과 형식이 나온다.

FastAPI에서 하지 않는 일:

- 임의 웹사이트 HTML 파싱
- 네이버 뉴스 메인 페이지 DOM 분석
- 사용자가 입력한 URL을 직접 fetch
- 기사 본문 전체 크롤링

### 20.4 Frontend 설계

프론트는 "사용자가 이해 가능한 선택지와 설정 화면"을 책임진다. 네이버 API 키와 서버 내부 오류 세부 정보는 노출하지 않는다.

수정 대상:

| 파일 | 변경 |
| --- | --- |
| `src/features/add-node/model/source-rollout.ts` | `naver_news: ["article_search"]` 노출 |
| `src/entities/node/ui/custom-nodes/WebScrapingNode.tsx` | mode 표시 문구 추가 |
| `src/entities/node/model/nodePresentation.ts` | `naver_news` 표시명 확인 |
| `src/features/add-node/ui/ServiceSelectionPanel.tsx` | 기존 `helper_text` 표시 흐름 유지 확인 |
| `src/features/configure-node/ui/panels/SourceTargetForm.tsx` | 기존 `helper_text` 표시 흐름 유지 확인 |

노출 정책:

```ts
export const SOURCE_SERVICE_ROLLOUT_ALLOWLIST = {
  ...
  naver_news: ["article_search"],
  web_news: ["seboard_posts", "website_feed"],
} as const;
```

사용자 문구:

| 위치 | 문구 |
| --- | --- |
| 서비스 카드 | 네이버 뉴스 |
| 모드명 | 네이버 뉴스 검색 |
| 입력 label | 검색어 |
| placeholder | 예: 인공지능, 취업, 학과 공지 |
| helper | 검색어와 관련된 최신 네이버 뉴스 목록을 가져옵니다. |
| RSS 모드명 | RSS 지원 사이트 |
| RSS helper | RSS를 제공하는 사이트에서만 최신 글을 찾을 수 있습니다. 네이버 뉴스는 네이버 뉴스 검색을 선택해 주세요. |

노드 표시:

- `naver_news/article_search` 노드는 "네이버 뉴스 검색" 또는 입력한 검색어를 요약 문구로 보여준다.
- `web_news/website_feed` 노드는 "RSS 지원 사이트"로 보여준다.
- 기존 `web_news/seboard_posts`는 "SE Board 게시글"을 유지한다.

프론트 테스트 기준:

- 시작 노드 추가에서 네이버 뉴스를 선택할 수 있다.
- 네이버 뉴스 선택 후 URL 입력창이 아니라 검색어 입력창이 나온다.
- 검색어 저장 후 노드 요약에서 검색어 또는 네이버 뉴스 검색 맥락을 확인할 수 있다.
- RSS 지원 사이트 선택 시 helper에서 네이버 뉴스 검색으로 유도한다.
- `pnpm run build`가 통과한다.

프론트에서 하지 않는 일:

- 네이버 API 키 입력/저장
- RSS 여부 자동 판별
- `https://news.naver.com/`를 내부적으로 네이버 API 검색으로 변환
- 임의 사이트 크롤링 UI 제공

### 20.5 프로젝트별 구현 순서

1. Spring catalog 계약 추가
   - 커밋 예: `feat: 네이버 뉴스 기사 검색 계약 추가`
   - `keyword_search` 기존 계약 유지 확인

2. FastAPI 네이버 뉴스 runtime 추가
   - 커밋 예: `feat: 네이버 뉴스 기사 검색 실행 추가`
   - service, input node, preview를 같은 계약으로 연결

3. Frontend 네이버 뉴스 검색 노출
   - 커밋 예: `feat: 네이버 뉴스 검색 출처 노출`
   - 사용자는 검색어만 입력하도록 UX 보정

4. RSS 지원 사이트 문구 보정
   - 커밋 예: `fix: RSS 지원 사이트 안내 문구 보정`
   - 실패 가능성을 미리 설명하고 네이버 뉴스 검색으로 유도

5. 통합 검증
   - `네이버 뉴스 검색 -> AI 요약 -> Discord 전송`
   - `RSS 지원 사이트`에 일반 뉴스 URL 입력 시 안내 메시지 확인
   - `SE Board -> AI 요약 -> Discord 전송` 기존 흐름 확인

### 20.6 리스크와 방어선

| 리스크 | 방어선 |
| --- | --- |
| 기존 `keyword_search` 사용처 깨짐 | 새 모드 `article_search` 추가로 분리 |
| RSS 모드를 모든 웹사이트 수집으로 오해 | label/helper를 "RSS 지원 사이트"로 축소 |
| 네이버 API 키 프론트 노출 | FastAPI 환경변수로만 관리 |
| 네이버 API 호출 실패가 사용자에게 난해함 | 에러 메시지를 사용자 행동 기준으로 변환 |
| 기사 본문까지 기대하는 오해 | 1차 범위는 기사 목록/요약 metadata만 명시 |
| 검색 결과가 너무 많아 LLM 길이 초과 | 기본 10개, 최대 20개 제한 |
| SSRF 위험 | 사용자 입력을 URL fetch가 아니라 고정 API의 query로만 사용 |

## 21. 인터넷 계열 표시명과 서비스 아이콘 보완 설계

### 21.1 보완 배경

`naver_news`와 `web_news`는 백엔드 계약상 서로 다른 source service다. 하지만 사용자의 mental model에서는 둘 다 "인터넷에서 글을 가져오는 기능"에 속한다. 따라서 내부 계약을 합치기보다는, 프론트 표시 계층에서 인터넷 계열로 자연스럽게 보이도록 보정한다.

이번 보완의 핵심은 다음과 같다.

- 백엔드 service key는 유지한다.
- `naver_news`를 `web_news` 안으로 합치지 않는다.
- 사용자에게 보이는 `web_news` 이름은 `인터넷 글/공지`가 아니라 `인터넷`으로 줄인다.
- 노드와 설정 패널의 아이콘은 범용 노드 타입 아이콘보다 실제 선택된 서비스 아이콘을 우선한다.
- `web_news`는 mode에 따라 아이콘을 다르게 보여준다.

### 21.2 표시명 정책

| 내부 key | 현재 문구 | 보정 문구 | 비고 |
| --- | --- | --- | --- |
| `web_news` | 인터넷 글/공지 | 인터넷 | 사용자에게 더 넓고 쉬운 카테고리로 표현 |
| `web_news/seboard_posts` | SE Board 게시글 | SE Board 게시글 | 유지 |
| `web_news/website_feed` | RSS 지원 사이트 | RSS 지원 사이트 | 유지 |
| `naver_news` | 네이버 뉴스 | 네이버 뉴스 | 유지 |
| `naver_news/article_search` | 네이버 뉴스 검색 | 네이버 뉴스 검색 | 유지 |

`인터넷`은 UX label일 뿐이며, Spring/FastAPI의 service key를 의미하지 않는다.

### 21.3 아이콘 컴포넌트 정책

Discord 아이콘과 동일한 방식으로 SVG를 React 컴포넌트화한다.

추가 대상:

| 파일 | 역할 |
| --- | --- |
| `src/shared/ui/icons/NaverIcon.tsx` | 네이버 전용 아이콘 |
| `src/shared/ui/icons/SeBoardIcon.tsx` | SE Board 전용 아이콘 |
| `src/shared/ui/icons/index.ts` | 신규 아이콘 export |

공통 props:

```tsx
type Props = Omit<SVGProps<SVGSVGElement>, "height" | "width"> & {
  size?: number | string;
};
```

공통 렌더링 규칙:

- `width` attribute와 `height="auto"` attribute를 직접 넣지 않는다.
- `style={{ width: size, height: "auto", ...style }}`를 사용한다.
- `aria-hidden="true"`와 `focusable="false"`를 적용한다.
- `size` 기본값은 `24`다.
- 노드 본문에서는 `size={56}`, 서비스 선택 카드에서는 `size={64}`, 패널 헤더에서는 `size={24}`를 사용한다.

네이버 아이콘:

- 사용자가 제공한 SVG path를 그대로 사용한다.
- `viewBox="0 0 120 120"`을 유지한다.
- 초록 배경과 흰색 `N`을 유지한다.

SE Board 아이콘:

- 첨부 이미지의 visual intent를 SVG로 재현한다.
- 짙은 남색 배경, 파란 테두리, `SE` 텍스트를 사용한다.
- 이미지 파일을 추가하지 않고 inline SVG 컴포넌트로 만든다.
- 서비스 공식 로고가 아니라 프로젝트 내 서비스 식별용 아이콘으로 사용한다.

### 21.4 서비스 아이콘 해석 규칙

아이콘은 `serviceKey`만으로 충분하지 않은 경우가 있다. 특히 `web_news`는 `seboard_posts`와 `website_feed`가 같은 service key를 공유한다. 따라서 공통 helper는 `serviceKey`와 `sourceMode`를 함께 받는다.

권장 helper:

```tsx
type ServiceIconProps = {
  fallbackIcon?: IconType;
  serviceKey: string | null;
  size?: number | string;
  sourceMode?: string | null;
};
```

해석 순서:

1. `serviceKey === "discord"` → `DiscordIcon`
2. `serviceKey === "naver_news"` → `NaverIcon`
3. `serviceKey === "web_news" && sourceMode === "seboard_posts"` → `SeBoardIcon`
4. `serviceKey === "web_news" && sourceMode === "website_feed"` → fallback 인터넷/RSS 아이콘
5. 그 외 service는 기존 `react-icons`/registry fallback 사용

`web_news` service 카드 자체에는 SE Board 아이콘을 쓰지 않는다. service 선택 전에는 사용자가 아직 `seboard_posts`를 고른 것이 아니기 때문이다. service 카드에는 범용 인터넷 아이콘을 유지하고, 설정 완료 후 mode가 `seboard_posts`로 확정되면 SE Board 아이콘을 보여준다.

### 21.5 적용 위치

| 위치 | 현재 상태 | 보정 방향 |
| --- | --- | --- |
| `BaseNode.tsx` | Discord만 예외 처리 | 공통 service icon helper 사용 |
| `OutputPanel.tsx` | Discord만 예외 처리 | 설정 패널 헤더에 서비스별 아이콘 표시 |
| `InputPanel.tsx` | registry icon 사용 | source service/mode가 있으면 서비스별 아이콘 우선 |
| `ServiceSelectionPanel.tsx` | service key별 icon map | `naver_news`는 네이버 아이콘, `web_news`는 범용 인터넷 아이콘 |
| `ServiceBadge.tsx` | Discord 일부 예외 처리 | 필요 시 네이버/SE Board 아이콘도 같은 helper 사용 |
| `nodePresentation.ts` | `web_news` label이 인터넷 글/공지 | `인터넷`으로 보정 |

### 21.6 구현 순서

1. `NaverIcon`, `SeBoardIcon` 컴포넌트를 추가한다.
2. `shared/ui/icons/index.ts`에 신규 아이콘을 export한다.
3. 서비스 아이콘 helper 또는 `ServiceIcon` 컴포넌트를 추가한다.
4. `BaseNode`의 Discord 전용 분기를 공통 helper로 교체한다.
5. `OutputPanel`, `InputPanel` 헤더 아이콘도 같은 helper를 사용하도록 보정한다.
6. `ServiceSelectionPanel`에서 `naver_news` 카드에는 `NaverIcon`, `web_news` 카드에는 범용 인터넷 아이콘을 사용한다.
7. `nodePresentation.ts`에서 `web_news` 표시명을 `인터넷`으로 변경한다.

### 21.7 완료 기준

- 네이버 뉴스로 설정된 노드는 네이버 아이콘을 보여준다.
- SE Board 게시글로 설정된 노드는 SE Board 아이콘을 보여준다.
- RSS 지원 사이트는 SE Board 아이콘을 사용하지 않는다.
- 설정 패널 왼쪽 상단 아이콘도 실제 선택된 서비스에 맞게 보인다.
- 서비스 선택 단계의 `web_news` 카드는 특정 mode를 암시하지 않는다.
- `인터넷 글/공지` 문구가 사용자 화면에서 `인터넷`으로 보인다.
- Discord 아이콘 기존 동작은 깨지지 않는다.
- SVG `height="auto"` attribute 에러가 다시 발생하지 않는다.

### 21.8 비범위

- `naver_news`를 `web_news` service 하위로 합치는 계약 변경
- Spring catalog의 service group 구조 추가
- FastAPI runtime source key 변경
- 네이버 뉴스와 RSS 지원 사이트를 하나의 mode로 병합
- 모든 기존 서비스 아이콘을 한 번에 마이그레이션

## 22. ServiceBadge 아이콘 일관화 보완 설계

### 22.1 보완 배경

노드 본문과 설정 패널은 `serviceKey`와 `sourceMode`를 함께 볼 수 있으므로 네이버 뉴스와 SE Board 아이콘을 정확히 표시할 수 있다. 하지만 대시보드, 템플릿, 워크플로우 리스트에서 쓰는 작은 `ServiceBadge`는 현재 `type`만 받는다.

따라서 `ServiceBadge` 자체에 모든 판별 책임을 넣으면 안 된다. `ServiceBadge`는 badge key를 렌더링하는 작은 presentational component로 유지하고, `source_mode`가 필요한 판별은 node config를 볼 수 있는 호출부에서 처리한다.

### 22.2 현재 호출 구조

현재 작은 배지는 다음 흐름으로 렌더링된다.

```tsx
<ServiceBadge type={badgeKey} />
```

주요 호출부:

| 위치 | 현재 알 수 있는 정보 |
| --- | --- |
| 워크플로우 리스트 | node 전체, `node.config.service`, `node.config.source_mode` |
| 대시보드 이슈/요약 | node 전체, `node.config.service`, `node.config.source_mode` |
| 템플릿 카드 | `icon`, `requiredServices` 문자열 |
| 템플릿 상세 필요 서비스 | service 문자열 |

워크플로우 리스트와 대시보드는 node config를 볼 수 있으므로 SE Board 판별이 가능하다. 반면 템플릿 카드/상세는 보통 service 문자열만 있으므로 `web_news`가 SE Board인지 RSS인지 알 수 없다.

### 22.3 Badge key 확장

`ServiceBadgeKey`에 다음 값을 추가한다.

```ts
type ServiceBadgeKey =
  | ...
  | "naver-news"
  | "seboard";
```

매핑 규칙:

| 입력 | 결과 |
| --- | --- |
| `naver_news` | `naver-news` |
| `naver-news` | `naver-news` |
| `seboard` | `seboard` |
| `seboard_posts` | `seboard` |
| `web_news` | `web-scraping` |
| `website_feed` | `web-scraping` |

중요한 점은 `web_news` 자체를 `seboard`로 매핑하지 않는 것이다. `web_news`에는 `seboard_posts`와 `website_feed`가 함께 있기 때문이다.

### 22.4 node config 기반 판별 helper

워크플로우 리스트와 대시보드처럼 node 전체를 볼 수 있는 곳은 공통 helper를 추가하거나 기존 helper를 보강한다.

권장 helper:

```ts
export const getServiceBadgeKeyFromNodeConfig = (
  service: unknown,
  sourceMode: unknown,
): ServiceBadgeKey => {
  if (service === "web_news" && sourceMode === "seboard_posts") {
    return "seboard";
  }

  return getServiceBadgeKeyFromService(
    typeof service === "string" ? service : null,
  );
};
```

적용 대상:

| 파일 | 보정 |
| --- | --- |
| `src/pages/workflows/model/workflow-list.ts` | `node.config.service`와 `node.config.source_mode`를 함께 봄 |
| `src/pages/dashboard/model/dashboard.ts` | 동일 helper 사용 |

이렇게 하면 실제 워크플로우 노드가 SE Board source로 설정된 경우에만 SE Board 배지가 나온다.

### 22.5 ServiceBadge 렌더링 보정

`ServiceBadge.tsx`는 새 key만 렌더링한다.

| type | 아이콘 |
| --- | --- |
| `naver-news` | `NaverIcon` |
| `seboard` | `SeBoardIcon` |
| `web-scraping` | 기존 범용 인터넷 아이콘 |

`ServiceBadge`에 `sourceMode` prop을 추가하지 않는다. 이 컴포넌트는 이미 여러 곳에서 단순 badge key로 쓰이고 있으므로, prop을 확장하기보다 badge key 계산 책임을 호출부에 두는 편이 영향 범위가 작다.

### 22.6 템플릿 화면 정책

템플릿 화면은 `requiredServices` 문자열만 받는 경우가 많다.

따라서 다음 정책을 사용한다.

- `requiredServices: ["naver_news"]` → 네이버 배지
- `requiredServices: ["web_news"]` → 인터넷 fallback 배지
- `requiredServices: ["seboard_posts"]` 또는 `icon: "seboard_posts"` → SE Board 배지
- mode 정보가 없는 `web_news`는 SE Board로 추정하지 않는다.

이 정책은 틀린 아이콘을 보여주지 않는 것을 우선한다.

### 22.7 완료 기준

- 워크플로우 리스트에서 네이버 뉴스 시작 노드는 네이버 배지로 보인다.
- 워크플로우 리스트에서 `web_news/seboard_posts` 시작 노드는 SE Board 배지로 보인다.
- 워크플로우 리스트에서 `web_news/website_feed` 시작 노드는 범용 인터넷 배지로 보인다.
- 대시보드에서도 같은 규칙이 적용된다.
- 템플릿 required service가 `web_news`만 가진 경우에는 SE Board로 오인하지 않는다.
- 기존 Gmail, Google Drive, Discord, Notion 배지는 깨지지 않는다.
