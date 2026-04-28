# Canvas LMS / Direct Connect Sync Design

> 작성일: 2026-04-28
> 대상 브랜치: `feat#108-canvas-lms-direct-connect-sync`
> 목적: backend 최신 상태에 맞춰 `canvas_lms` source 노출, direct-connect OAuth UX, service key 기반 restore/presentation 정합을 FE에서 어떻게 수용할지 설계한다.

---

## 1. 배경

source/sink editor 1차 전환은 이미 완료되었다.

- 시작 노드: source service picker
- 중간 처리: `mapping_rules` 기반 wizard
- 도착 노드: sink service picker
- lifecycle: backend `nodeStatuses` 기준 반영

이번 이슈는 이 구조를 다시 바꾸는 작업이 아니다.

대신 backend 최신 구현에서 새로 드러난 아래 세 가지를 FE가 수용하도록 정렬하는 작업이다.

1. Spring source catalog에 `canvas_lms`가 추가되었다.
2. OAuth connect 응답이 `redirect`만 있는 것이 아니라 `directly connected`도 존재한다.
3. FastAPI runtime에서 `canvas_lms` source가 실제로 실행되지만, payload 의미는 기존 `google_drive`/`slack`와 다르다.

즉 이번 이슈의 본질은 `source/sink editor 2차 리디자인`이 아니라
`새 source + 새 connect 방식 + service presentation 정합`이다.

---

## 2. Backend 기준 사실

## 2.1 Spring public contract

### 2.1.1 `canvas_lms` source catalog

Spring `source_catalog.json` 기준 `canvas_lms`는 이미 public catalog에 포함되어 있다.

- service key: `canvas_lms`
- `auth_required: true`
- source modes:
  - `course_files` -> `FILE_LIST`
  - `course_new_file` -> `SINGLE_FILE`
  - `term_all_files` -> `FILE_LIST`
- target schema:
  - 전부 `text_input`
  - 예시 placeholder:
    - 과목 ID
    - 학기명

정리하면 FE는 `canvas_lms`를 위해 새 picker control을 만들 필요가 없다.
기존 `text_input` target step을 그대로 재사용하면 된다.

### 2.1.2 OAuth connect 결과가 2종류다

`POST /api/oauth-tokens/{service}/connect`는 connector에 따라 서로 다른 결과를 돌려준다.

- redirect required:
  - 예: Slack, Google Drive
  - 응답 shape: `{ "authUrl": "..." }`
- directly connected:
  - 예: Notion, GitHub, Canvas LMS
  - 응답 shape: `{ "connected": "true", "service": "<serviceKey>" }`

중요한 점:

- backend 응답에는 `kind` 같은 판별자가 없다.
- FE가 응답 shape를 보고 분기해야 한다.

### 2.1.3 backend connector 지원 범위

현재 FE가 connectable로 볼 수 있는 서비스는 backend connector 기준으로 다음과 같다.

- `slack`
- `google_drive`
- `notion`
- `github`
- `canvas_lms`

반대로 아래 서비스들은 catalog에 보여도 현재 이 이슈 범위에서는 connectable로 간주하지 않는다.

- `gmail`
- `google_sheets`
- `google_calendar`

즉 FE는 `auth_required === true`만으로 "연결 시작 가능"을 판단하면 안 된다.

## 2.2 FastAPI runtime semantics

### 2.2.1 `canvas_lms` source 실행은 이미 존재한다

FastAPI `InputNodeStrategy` 기준 `canvas_lms`는 실제 실행 대상이다.

- `course_files` -> `FILE_LIST`
- `course_new_file` -> `SINGLE_FILE`
- `term_all_files` -> `FILE_LIST`

### 2.2.2 payload 의미

`canvas_lms` source가 내려주는 payload는 대체로 `url` 중심이다.

- `course_files` / `term_all_files`
  - `items[*].filename`
  - `items[*].mime_type`
  - `items[*].size`
  - `items[*].url`
- `course_new_file`
  - `filename`
  - `mime_type`
  - `url`
  - `content: null`

즉 FE가 기대할 것은 다음이다.

- source/sink editor 단계에서 canonical type은 맞게 연결됨
- runtime에서 실제 파일 바이너리 handoff 여부는 FE가 보장하지 않음

### 2.2.3 이번 FE 이슈의 비책임 범위

현재 backend runtime에는 아래 의미 차이가 남아 있다.

- `FILE_LIST` + `url only` item
- `SINGLE_FILE` + `content: null`

이것이 Google Drive sink에서 실제 파일 다운로드/업로드로 완전히 이어지는지는 backend runtime 책임이다.

FE는 이번 이슈에서 이 동작을 추론하거나 보정하지 않는다.

---

## 3. 현재 FE 갭

현재 프론트 구조에서 실제로 비어 있는 지점은 다음이다.

## 3.1 source rollout

`source-rollout.ts`에 `canvas_lms`가 없다.

결과:

- catalog에 있어도 시작 노드 picker에 노출되지 않는다.

## 3.2 connect response model

현재 connect 응답 타입은 `authUrl`만 가정한다.

- `OAuthConnectResponse = { authUrl: string }`
- `window.location.assign(result.authUrl)`를 전제로 함

결과:

- `DirectlyConnected` 응답을 FE가 처리할 수 없다.

## 3.3 connect support matrix

현재 connectable service allowlist는 사실상 `slack`만 지원한다.

결과:

- `canvas_lms`
- `google_drive`
- `notion`
- `github`

모두 backend는 connect 가능해도 FE는 unsupported처럼 동작한다.

## 3.4 service key -> visual node mapping

현재 `workflow-node-adapter`는 `canvas_lms`를 모른다.

결과:

- start node 생성 시 visual node type을 찾지 못한다.
- backend에서 저장된 `type = canvas_lms` node를 hydrate할 때도 presentation이 안정적이지 않다.

## 3.5 presentation / badge / icon layer

현재 FE는 `canvas_lms` 전용 label/icon/badge가 없다.

결과:

- picker, account, workflow list, dashboard, node title에서 일관된 서비스 표현이 어렵다.

## 3.6 `web-scraping` node config 의미

현재 `web-scraping` config는 사실상 URL scraping 전제다.

- `targetUrl`
- `selector`
- `outputFields`

그런데 `canvas_lms`는 같은 visual node carrier를 쓰더라도
실제 config 의미는 `service/source_mode/target`에 가깝다.

즉 FE는 "visual node type"과 "persisted service semantics"를 더 명확히 분리해야 한다.

---

## 4. 설계 원칙

## 4.1 새 editor를 만들지 않는다

`canvas_lms`는 source/sink editor 1차 구조 위에 얹는다.

- 시작 노드 flow 재사용
- auth step 재사용
- source mode step 재사용
- target step 재사용

## 4.2 새 visual node type은 이번 이슈 범위가 아니다

이번 이슈에서는 `canvas_lms` 전용 `NodeType`을 만들지 않는다.

이유:

- 현재 editor는 generic domain node type 위에 service key를 얹는 구조다.
- `canvas_lms` 추가만으로 taxonomy를 다시 나누기 시작하면 범위가 커진다.
- backend persisted contract는 service key가 본체이고, visual type은 FE 표현 레이어다.

따라서 이번 이슈에서 `canvas_lms`는 기존 `web-scraping` visual node를 carrier로 사용한다.

## 4.3 connectability는 catalog가 아니라 verified support matrix로 판단한다

`auth_required`는 "인증이 필요하다"를 뜻할 뿐,
"지금 FE에서 연결 시작이 가능하다"를 뜻하지 않는다.

FE는 별도 support matrix를 유지한다.

- connectable:
  - `slack`
  - `google_drive`
  - `notion`
  - `github`
  - `canvas_lms`
- not yet connectable:
  - `gmail`
  - `google_sheets`
  - `google_calendar`

이 allowlist는 backend가 capability endpoint를 내려주기 전까지 유지하는
임시 FE 정책이다.

## 4.4 direct connect는 redirect flow의 예외가 아니라 같은 connect flow의 한 종류다

FE는 connect를 다음 두 가지 중 하나로 처리한다.

- `redirect`
- `direct`

직접 연결은 별도 임시 UX가 아니라 동일한 service auth step 안에서 처리한다.

## 4.5 FE는 runtime payload 의미를 과대추론하지 않는다

`canvas_lms -> google_drive`가 editor에서 연결 가능하다는 사실과
"실제 파일이 바이트 단위로 업로드된다"는 사실은 다르다.

이번 이슈에서 FE는 다음까지만 책임진다.

- source 선택 가능
- connect 가능
- mode/target 설정 가능
- node 저장/복원 가능
- canonical data type 흐름 연결 가능

---

## 5. 상세 설계

## 5.1 Source rollout 설계

`canvas_lms`를 source rollout allowlist에 추가한다.

추가 mode:

- `course_files`
- `course_new_file`
- `term_all_files`

### UX 동작

- 시작 노드 service picker에서 `Canvas LMS` 노출
- auth state 표시
- mode 선택 진입
- target step에서 기존 `text_input` 사용

### target 입력 규칙

- `course_files`
  - 과목 ID 문자열
- `course_new_file`
  - 과목 ID 문자열
- `term_all_files`
  - 학기명 문자열

이 입력값은 FE가 의미를 해석하지 않고 backend contract string으로 저장한다.

## 5.2 OAuth connect domain model 설계

### 5.2.1 Raw response

backend raw response는 다음 union이다.

```ts
type RawOAuthConnectResponse =
  | { authUrl: string }
  | { connected: "true"; service: string };
```

### 5.2.2 FE normalized response

FE 내부에서는 판별 가능한 union으로 정규화한다.

```ts
type OAuthConnectResult =
  | { kind: "redirect"; authUrl: string }
  | { kind: "direct"; service: string; connected: true };
```

정규화 책임은 API layer 또는 entity adapter에 둔다.
UI는 raw map을 직접 해석하지 않는다.

### 5.2.3 connect action 처리

#### redirect result

- 기존대로 `window.location.assign(authUrl)`

#### direct result

- 현재 화면에 남아 있음
- `useOAuthTokensQuery` refetch
- connected state 반영
- 현재 wizard step을 다음 단계로 진행

즉 direct connect는 callback 페이지를 거치지 않는다.

## 5.3 Auth step UX 설계

## 5.3.1 ServiceSelectionPanel

start/end auth step에서 `연결 시작` 클릭 시:

- `redirect`면 외부로 이동
- `direct`면 같은 panel 안에서 연결 완료 처리

### direct connect 성공 시 next step

- start node
  - `auth -> mode`
- end node
  - `auth -> confirm`

즉 사용자는 `Canvas LMS`를 선택하고 연결 시작을 누른 뒤
브라우저 이동 없이 바로 다음 단계로 간다.

## 5.3.2 Account page

Account page의 connect 버튼도 동일한 normalized result를 사용한다.

- `redirect`면 외부 이동
- `direct`면 토큰 refetch 후 badge 상태를 `CONNECTED`로 전환

## 5.4 connect support matrix 설계

현재 FE support matrix는 backend verified connector 범위에 맞춰 확장한다.

```ts
const OAUTH_CONNECT_SUPPORTED_SERVICES = [
  "slack",
  "google_drive",
  "notion",
  "github",
  "canvas_lms",
] as const;
```

이 값은 "OAuth only"가 아니라 "FE connect action supported" 의미로 해석한다.
이름이 오해를 만든다면 후속 리팩터링에서 `CONNECT_SUPPORTED_SERVICES`로 일반화한다.
또한 backend가 connect capability metadata를 별도로 제공하기 전까지는
FE가 직접 유지하는 임시 allowlist로 둔다.

## 5.5 workflow node mapping 설계

## 5.5.1 persisted service key -> visual node type

`workflow-node-adapter`에 다음 mapping을 추가한다.

```ts
canvas_lms -> web-scraping
```

의도:

- backend persisted type은 계속 `canvas_lms`
- FE visual node는 기존 `web-scraping` node shell 재사용

## 5.5.2 persisted start/end node 저장 규칙

현재 구조와 동일하게:

- persisted `type`은 service key
- visual node는 FE가 hydrate 시 mapping

즉 `canvas_lms`도 다른 source/sink service와 동일 규칙을 따른다.

## 5.5.3 config shape 보강

`web-scraping` visual node가 `canvas_lms`를 담을 수 있도록
service-backed source config 필드를 허용한다.

최소 필요 필드:

- `service`
- `source_mode`
- `target`
- `canonical_input_type`

구체적으로는 `entities/node/model/types.ts`의 `WebScrapingNodeConfig`에
아래 optional 필드를 추가하는 방식으로 확장한다.

```ts
service?: "canvas_lms" | "coupang" | "github" | "naver_news" | "youtube" | null;
source_mode?: string | null;
target?: string | null;
canonical_input_type?: string | null;
```

즉 이번 변경은 `web-scraping`을 새 node taxonomy로 바꾸는 것이 아니라,
기존 visual carrier가 service-backed source도 담을 수 있게 typed config를 보강하는 작업이다.

기존 `targetUrl` 전용 가정은 presentation layer에서 fallback으로만 남긴다.

## 5.5.4 hydrate 시 service backfill 규칙

현재 FE는 일부 start/end service node만 hydrate 시 `config.service = node.type`을 보정한다.

이번 이슈에서는 `web-scraping` carrier에도 같은 규칙을 확장한다.

- 조건:
  - `node.role`이 `start` 또는 `end`
  - frontend visual node type이 `web-scraping`
  - `config.service`가 비어 있음
- 동작:
  - `config.service = node.type`

이 규칙이 있어야 backend persisted `type = canvas_lms` node를 reload한 뒤에도
title / badge / summary가 안정적으로 복원된다.

## 5.6 node presentation 설계

## 5.6.1 제목

`web-scraping` node presentation에서:

1. `config.service`가 `canvas_lms`면 `Canvas LMS`
2. 그 외 service-backed source면 service label
3. 둘 다 없으면 기존 `targetUrl`

순서로 제목을 정한다.

## 5.6.2 helper text / summary

`canvas_lms` node는 URL scraping helper를 쓰지 않는다.

대신 다음 우선순위로 summary를 보여준다.

1. source mode label
2. target 값
3. 기존 generic helper

예:

- `특정 과목 강의자료 전체`
- `과목 ID: 12345`

## 5.6.3 custom node surface

`WebScrapingNode`가 `targetUrl ?? "URL 미설정"`만 보여주지 않도록 수정 방향을 잡는다.

`config.service`가 있는 경우:

- service label
- source mode / target 중심 summary

를 우선 렌더한다.

## 5.7 badge / icon 설계

## 5.7.1 service picker / account icon

`canvas_lms` 전용 아이콘을 추가한다.

이번 이슈에서는 새 asset 제작보다 기존 icon set의 학교/학습 계열 아이콘을 우선 사용한다.

## 5.7.2 service badge surfaces

workflow list / dashboard / template icon surfaces는 service badge key를 사용한다.

여기에는 `canvas-lms` 전용 badge key를 추가하는 쪽을 우선한다.

이유:

- visual node type은 `web-scraping` carrier일 수 있어도
- 서비스 배지는 `Canvas LMS`라는 실제 integration identity를 보여줘야 하기 때문이다.

즉:

- node shell: `web-scraping`
- backend service key: `canvas_lms`
- FE badge key: `canvas-lms`

로 역할을 분리한다.

`getServiceBadgeKeyFromService()`는 backend service key `canvas_lms`를 받아
FE 표현 키 `canvas-lms`로 변환한다.

## 5.8 sink 및 runtime guard 설계

이번 이슈에서 FE는 `canvas_lms -> google_drive` 경로를 editor 수준에서 막지 않는다.

단, 아래를 분명히 유지한다.

- sink accepted input type 기준 filtering
- backend `nodeStatuses` / save / execute guard 기준 동작
- runtime file handoff 의미는 FE가 보정하지 않음

즉 FE는 "연결 가능한 graph를 만들 수 있는가"까지만 책임진다.

---

## 6. 구현 단계 제안

구현은 아래 4단계로 끊는다.
각 단계는 **작게 머지 가능한 단위**로 유지하고, 단계 종료 시 커밋을 남긴다.

커밋 스타일은 현재 브랜치 히스토리에 맞춰 다음 prefix를 사용한다.

- 기능 추가/지원 범위 확장: `feat:`
- 동작 보정/회귀 수정: `fix:`
- 구조 정리/의미 정리: `refactor:`
- 문서: `docs:`

## 단계 1. OAuth connect contract 정규화

### 목표

- backend raw connect 응답을 FE domain model로 안전하게 정규화한다.
- direct-connect와 redirect-connect를 같은 action 흐름 안에서 다룰 준비를 끝낸다.

### 권장 커밋 스타일

- `feat: OAuth connect 응답 정규화 및 지원 범위 확장`

### 체크리스트

- [ ] `entities/oauth-token/api/types.ts`에 raw connect 응답 union 추가
- [ ] FE 내부에서 사용할 normalized `OAuthConnectResult` union 정의
- [ ] API layer 또는 entity adapter에서 raw -> normalized 변환 구현
- [ ] `authUrl`만 가정한 호출부가 새 normalized 결과를 받도록 API surface 정리
- [ ] connect support matrix를 `slack`, `google_drive`, `notion`, `github`, `canvas_lms`로 확장
- [ ] `gmail`, `google_sheets`, `google_calendar`는 계속 unsupported로 남는다는 점 유지
- [ ] barrel export가 깨지지 않도록 `index.ts` 공개 API 정리

### 빠지면 안 되는 확인 포인트

- [ ] backend raw 응답에 `kind` discriminator가 없다는 전제를 코드에 반영했는가
- [ ] direct-connect 응답의 `connected: "true"`를 boolean `true`로 정규화했는가
- [ ] UI layer가 raw map shape를 직접 해석하지 않게 막았는가

## 단계 2. Canvas LMS source rollout + direct-connect UX

### 목표

- 시작 노드 picker에서 `canvas_lms`를 실제 선택 가능하게 연다.
- direct-connect 서비스를 브라우저 이동 없이 처리한다.

### 권장 커밋 스타일

- `feat: canvas_lms source rollout 및 direct-connect UX 반영`

### 체크리스트

- [ ] `source-rollout.ts`에 `canvas_lms` 3개 mode 추가
- [ ] source picker icon map에 `canvas_lms` 추가
- [ ] ServiceSelectionPanel이 direct/redirect 결과를 분기 처리하도록 수정
- [ ] start node auth step에서 direct-connect 성공 시 `auth -> mode`로 진행
- [ ] end node auth step에서 direct-connect 성공 시 `auth -> confirm`로 진행
- [ ] Account page connect 버튼도 같은 normalized connect 결과 사용
- [ ] direct-connect 성공 후 `useOAuthTokensQuery` refetch로 connected 상태 재동기화
- [ ] auth error UX가 redirect/direct 두 경우 모두 유지되는지 확인

### 빠지면 안 되는 확인 포인트

- [ ] `canvas_lms` target step은 기존 `text_input`을 그대로 재사용하는가
- [ ] direct-connect 성공 시 `window.location.assign()`가 호출되지 않는가
- [ ] redirect-connect 서비스(`slack`, `google_drive`) 회귀가 없는가

## 단계 3. Node mapping / restore / presentation 정합

### 목표

- persisted `type = canvas_lms`와 FE visual `web-scraping` carrier를 정렬한다.
- reload 이후에도 service identity가 title/badge/summary에 안정적으로 남게 한다.

### 권장 커밋 스타일

- `feat: canvas_lms node mapping 및 presentation 정렬`

### 체크리스트

- [ ] `workflow-node-adapter`에 `canvas_lms -> web-scraping` mapping 추가
- [ ] `WebScrapingNodeConfig`에 service-backed source optional 필드 추가
- [ ] hydrate 시 `web-scraping` carrier에도 `config.service = node.type` backfill 규칙 추가
- [ ] start node 생성 시 persisted `type = canvas_lms` 저장 확인
- [ ] `nodePresentation`에서 `canvas_lms` title / helper / summary 규칙 반영
- [ ] `WebScrapingNode`가 `targetUrl` 전용 UI에 묶이지 않도록 보강
- [ ] picker / account / workflow list / dashboard용 서비스 아이콘 반영
- [ ] `ServiceBadgeKey`에 `canvas-lms` 추가
- [ ] `getServiceBadgeKeyFromService()`가 `canvas_lms -> canvas-lms` 변환하도록 보강

### 빠지면 안 되는 확인 포인트

- [ ] 새 `NodeType`를 만들지 않고 기존 `web-scraping` shell만 재사용하는가
- [ ] reload 시 `canvas_lms` node가 fallback title이나 generic web label로 무너지지 않는가
- [ ] service badge key와 backend service key를 혼동하지 않도록 분리했는가

## 단계 4. Smoke test 및 회귀 보정

### 목표

- editor 기준 주요 흐름을 실제로 통과시키고, 발견된 회귀를 작은 수정으로 닫는다.

### 권장 커밋 스타일

- 회귀/보정 발생 시 `fix:` prefix 사용
- 코드 변경이 없다면 빈 커밋은 만들지 않는다

### 체크리스트

- [ ] `Canvas LMS`가 시작 노드 picker에 노출되는지 확인
- [ ] `Canvas LMS` direct-connect 성공 여부 확인
- [ ] start node 생성 후 persisted `type = canvas_lms` 저장 확인
- [ ] reload 후 `canvas_lms` node title / badge / summary 복원 확인
- [ ] `google_drive` sink와 연결 가능한 graph 구성 확인
- [ ] save 후 `nodeStatuses` 재동기화 확인
- [ ] execute guard가 기존 규칙대로 동작하는지 확인
- [ ] `slack`, `google_drive` redirect-connect 회귀 확인
- [ ] `pnpm build` 통과 확인

### 최소 확인 경로

1. `Canvas LMS` source picker 노출
2. direct connect 성공
3. start node 생성 / 저장
4. reload 후 `canvas_lms` node 복원
5. `google_drive` sink 연결
6. save / execute guard 동작 확인

---

## 7. 범위 제외

- `canvas_lms` 전용 새 visual node type 설계
- runtime에서 Canvas URL을 실제 바이너리 파일로 변환하는 로직
- Gmail / Google Sheets / Google Calendar connector 추가
- capability endpoint 기반 동적 connectability 계산

---

## 8. 완료 조건

- FE source picker에서 `canvas_lms`가 노출된다
- `canvas_lms`는 direct-connect 서비스로 FE에서 정상 연결된다
- start node 생성 시 `type = canvas_lms`로 저장된다
- reload 후 `canvas_lms` node가 의도한 visual node와 title로 복원된다
- account / workflow list / dashboard에서 `canvas_lms` service identity가 일관되게 보인다
- FE가 direct-connect와 redirect-connect를 모두 지원한다
- runtime file handoff 의미는 FE에서 과대추론하지 않는다

---

## 9. 한 줄 요약

이번 이슈의 FE 설계는
`canvas_lms`를 새 editor 구조로 다시 만드는 것이 아니라,
**기존 source/sink editor 위에 `canvas_lms` source와 direct-connect contract를 정확히 얹고, service key 기반 restore/presentation까지 정렬하는 작업**이다.
