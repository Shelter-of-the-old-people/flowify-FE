# Service Icon Unification Design

> **작성일:** 2026-05-14
> **대상 화면:** 대시보드, 워크플로우 목록, 템플릿 목록/상세, 워크플로우 편집 화면, 노드 설정 패널, 계정 서비스 연결 영역
> **범위:** 외부 서비스 식별 아이콘 공통화
> **대상 저장소:** `flowify-FE`
> **관련 이슈:** 아이콘 정리
> **최종 검토:** 3회 코드/설계/자산 검토 반영 완료

---

## 0. 3회 검토 요약

### 0.1 1차 검토: 작업 범위 재확정

확인 파일:

- `src/shared/ui/ServiceIcon.tsx`
- `src/shared/ui/ServiceBadge.tsx`
- `src/shared/utils/service-badge.ts`
- `src/shared/ui/icons/DiscordIcon.tsx`
- `src/shared/ui/icons/NaverIcon.tsx`
- `src/shared/ui/icons/SeBoardIcon.tsx`
- `src/shared/ui/icons/index.ts`
- `src/entities/node/model/nodeRegistry.ts`
- `src/entities/node/ui/BaseNode.tsx`
- `src/features/add-node/ui/ServiceSelectionPanel.tsx`
- `src/features/add-node/ui/SourceTargetPicker.tsx`
- `src/widgets/input-panel/ui/InputPanel.tsx`
- `src/widgets/output-panel/ui/OutputPanel.tsx`
- `src/pages/dashboard/**`
- `src/pages/workflows/**`
- `src/pages/templates/**`
- `src/pages/account/AccountPage.tsx`

결론:

- 이번 작업은 **서비스 식별 아이콘만 공통화**한다.
- Gmail, Google Drive, Google Sheets, Slack, Discord, Naver, SE Board, Notion, Canvas LMS, GitHub 같은 외부 서비스 정체성 아이콘을 한 곳에서 결정한다.
- `nodeRegistry.iconComponent`는 노드 타입 fallback이므로 건드리지 않는다.
- `SourceTargetPicker`의 `folder`, `file`, `label`, `sheet`, `course`, `term` 아이콘은 remote option type 아이콘이므로 건드리지 않는다.
- 실행, 중지, 삭제, 더보기, 저장, 에러, 경고 같은 action/status 아이콘은 건드리지 않는다.
- Spring/FastAPI/API/DB/OAuth/workflow 실행 흐름은 변경하지 않는다.

### 0.2 2차 검토: Discord 아이콘 방식과 신규 SVG 자산 적용성

기준 레퍼런스:

- `src/shared/ui/icons/DiscordIcon.tsx`
- `src/shared/ui/icons/NaverIcon.tsx`
- `src/shared/ui/icons/SeBoardIcon.tsx`

확정한 아이콘 컴포넌트 표준:

- 브랜드 SVG는 `src/shared/ui/icons/*Icon.tsx`에 React 컴포넌트로 둔다.
- 공통 prop은 `size?: number | string`을 가진다.
- `SVGProps<SVGSVGElement>`를 확장하되 `height`, `width`는 제외한다.
- 원본 `viewBox`는 유지한다.
- SVG element에는 `aria-hidden="true"`, `focusable="false"`를 둔다.
- 크기는 `style={{ height: "auto", width: size, ...style }}` 방식으로 제어한다.
- 브랜드 SVG의 path/fill 값은 제공 SVG를 기준으로 유지한다.
- wrapper, border, background, box shadow, slot size는 `ServiceIcon`, `ServiceBadge` 같은 사용하는 surface가 담당한다.

보완한 점:

- 기존 문서의 “Google/Gmail/Slack inline SVG 시각 결과 유지”는 **시각 결과 유지**로 해석한다.
- 즉, ServiceBadge 안에 inline으로 계속 둘 필요는 없고, 제공 SVG 기준 컴포넌트로 승격하되 색상/비율/viewBox를 임의로 바꾸지 않는다.
- Google/Gmail/Slack을 컴포넌트화하더라도 action/status icon이나 노드 타입 fallback까지 건드리는 전면 리팩토링으로 확장하지 않는다.

### 0.3 3차 검토: 최신 main 구조와 충돌 가능성

최근 main 반영으로 추가된 구조:

- `src/pages/account/AccountPage.tsx`
- `src/features/service-token/**`
- `src/entities/oauth-token/model/oauth-connect-support.ts`

확인한 영향:

- 계정 페이지는 `notion`, `github`, `canvas_lms` manual token 서비스를 다룬다.
- 따라서 GitHub 아이콘은 현재 서비스 연결 영역 기준으로 실제 사용 가능성이 있다.
- YouTube, Coupang SVG는 제공되었지만 현재 FE catalog/API/service key 구조에서 직접 쓰이는 서비스는 아니다.

최종 정리:

- `github`은 현재 manual token 관리 서비스이므로 registry에 포함 가능한 실서비스 후보로 둔다.
- `youtube`, `coupang`은 제공 SVG 자산 후보로 문서화하되, 실제 catalog/API/service key가 들어오기 전에는 `ServiceBadgeKey`에 무리하게 추가하지 않는다.
- `ServiceBadgeKey` 이름은 유지한다. 단, 실제 서비스가 추가되는 경우 union 확장은 가능하다.
- 제공 SVG 중 Canvas LMS와 Google Sheets 부분은 원문이 이어 붙어 있으므로 구현 시 각각 독립 SVG로 분리하고 XML validity를 확인해야 한다.

---

## 1. 목적

서비스 전반에서 같은 외부 서비스가 화면마다 다른 아이콘 의미로 보이는 문제를 줄인다.

이번 작업은 모든 아이콘을 정리하는 작업이 아니다. 외부 서비스 정체성을 나타내는 브랜드/도메인 아이콘만 공통화한다.

목표:

- 서비스 key를 canonical icon key로 정규화한다.
- 서비스별 label, fallback icon, brand icon component를 한 registry에서 결정한다.
- `ServiceIcon`과 `ServiceBadge`가 같은 서비스 아이콘 의미를 공유한다.
- `ServiceSelectionPanel`이 직접 `SiGmail`, `SiSlack`, `SiGoogledrive` 같은 개별 아이콘 import를 알 필요 없게 한다.
- 노드 타입 fallback, picker option icon, action/status icon은 기존 책임을 유지한다.

---

## 2. 현재 구조

### 2.1 서비스 key 정규화

현재 서비스 key 정규화는 `src/shared/utils/service-badge.ts`가 담당한다.

대표 구조:

```ts
export type ServiceBadgeKey =
  | "calendar"
  | "canvas-lms"
  | "discord"
  | "gmail"
  | "google-drive"
  | "google-sheets"
  | "naver-news"
  | "notion"
  | "seboard"
  | "slack"
  | "communication"
  | "storage"
  | "spreadsheet"
  | "web-scraping"
  | "notification"
  | "llm"
  | "trigger"
  | "processing"
  | "unknown";
```

유지할 것:

- `ServiceBadgeKey` 이름은 유지한다.
- `ServiceIconKey`로 rename하지 않는다.
- 필요하면 alias는 추가할 수 있다.
- 실제 신규 서비스가 들어오면 union 확장은 가능하다.

### 2.2 `ServiceIcon`

현재 `ServiceIcon`은 일부 서비스만 직접 처리한다.

- `discord`
- `naver_news`
- `web_news + seboard_posts`
- `web_news + seboard_new_posts`

나머지는 caller가 넘긴 `fallbackIcon`에 의존한다.

문제:

- Gmail, Google Drive, Google Sheets, Slack, Calendar, Notion, Canvas LMS 같은 서비스가 화면에 따라 generic fallback으로 보일 수 있다.
- `ServiceSelectionPanel`이 별도 local icon map을 가져야 한다.

### 2.3 `ServiceBadge`

현재 `ServiceBadge`는 자체 `FALLBACK_NODE_ICONS`와 switch 문으로 아이콘을 결정한다.

문제:

- 서비스별 fallback icon 의미가 `ServiceIcon`과 공유되지 않는다.
- Google Drive, Gmail, Google Sheets, Slack inline SVG가 badge 내부에 묶여 있다.
- 신규 서비스 추가 시 `service-badge.ts`, `ServiceBadge.tsx`, `ServiceSelectionPanel.tsx`를 모두 같이 봐야 한다.

### 2.4 `nodeRegistry`

`nodeRegistry.iconComponent`는 노드 타입 fallback이다.

예:

- `communication` -> `MdEmail`
- `storage` -> `MdFolder`
- `spreadsheet` -> `MdTableChart`
- `web-scraping` -> `MdLanguage`
- `trigger` -> `MdBolt`
- `llm` -> `MdAutoAwesome`

이 값은 서비스 브랜드 아이콘으로 바꾸면 안 된다.

### 2.5 `SourceTargetPicker`

`SourceTargetPicker`의 option icon map은 서비스 정체성이 아니라 선택지 타입을 나타낸다.

예:

- `folder`
- `file`
- `label`
- `sheet`
- `spreadsheet`
- `course`
- `term`
- `category`

이번 작업 범위에서 제외한다.

---

## 3. 최종 설계 원칙

1. 서비스 식별 아이콘만 공통화한다.
2. 브랜드 SVG는 `src/shared/ui/icons/*Icon.tsx`에 컴포넌트화한다.
3. 서비스 의미 결정은 `src/shared/ui/service-icon-registry.ts`가 담당한다.
4. 노드/패널 아이콘 표시는 `ServiceIcon`이 담당한다.
5. 목록/대시보드/템플릿 배지 표시는 `ServiceBadge`가 담당한다.
6. 노드 타입 fallback은 `nodeRegistry`에 남긴다.
7. picker option icon은 picker 내부 map에 남긴다.
8. action/status icon은 각 컴포넌트에 남긴다.
9. Spring/FastAPI/API/DB/OAuth/workflow 실행 로직은 변경하지 않는다.

---

## 4. 브랜드 SVG 컴포넌트 표준

현재 기준은 `DiscordIcon` 방식이다.

표준 타입:

```ts
import { type SVGProps } from "react";

type Props = Omit<SVGProps<SVGSVGElement>, "height" | "width"> & {
  size?: number | string;
};
```

표준 구현 형태:

```tsx
export const GmailIcon = ({ size = 24, style, ...props }: Props) => {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      style={{ height: "auto", width: size, ...style }}
      viewBox="0 0 60 45"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* 제공 SVG path를 그대로 이식 */}
    </svg>
  );
};
```

주의:

- 원본 `width`, `height`는 컴포넌트 props로 고정하지 않는다.
- 원본 `viewBox`는 유지한다.
- 색상은 제공 SVG의 `fill` 값을 유지한다.
- surface별 border/background/shadow는 아이콘 컴포넌트에 넣지 않는다.

---

## 5. 제공 SVG 자산 적용 계획

| 서비스 | canonical key | 컴포넌트 후보 | 제공 SVG viewBox | V1 적용 판단 |
| --- | --- | --- | --- | --- |
| Gmail | `gmail` | `GmailIcon` | `0 0 60 45` | 적용 |
| Google Drive | `google-drive` | `GoogleDriveIcon` | `0 0 60 54` | 적용 |
| Google Sheets | `google-sheets` | `GoogleSheetsIcon` | `0 0 64 88` | 적용 |
| Google Calendar | `calendar` | `GoogleCalendarIcon` | `0 0 60 60` | 적용 |
| Slack | `slack` | `SlackIcon` | `0 0 60 60` | 적용 |
| Discord | `discord` | 기존 `DiscordIcon` | `0 0 60 47` | 유지 |
| Naver | `naver-news` | 기존 `NaverIcon` | `0 0 120 120` | 유지 |
| SE Board | `seboard` | 기존 `SeBoardIcon` | `0 0 300 300` | 유지 |
| Notion | `notion` | `NotionIcon` | `0 0 58 60` | 적용 |
| GitHub | `github` | `GitHubIcon` | `0 0 60 58` | 적용 후보 |
| Canvas LMS | `canvas-lms` | `CanvasLmsIcon` | `0 0 60 45` | 적용 |
| YouTube | future `youtube` | `YouTubeIcon` | `0 0 60 42` | 자산 후보 |
| Coupang | future `coupang` | `CoupangIcon` | `0 0 60 60` | 자산 후보 |

V1 판단:

- 현재 서비스로 쓰이는 항목은 registry에 포함한다.
- YouTube, Coupang은 SVG 자산 후보로 보관할 수 있지만, 실제 catalog/API/service key가 들어오기 전에는 `ServiceBadgeKey`에 추가하지 않는다.
- GitHub는 최신 main에서 manual token 관리 서비스로 들어왔으므로 `github` key 추가를 검토할 수 있다.
- `ServiceBadgeKey` rename은 하지 않고, 필요한 경우 union에 `github`만 추가한다.

제공 SVG 주의사항:

- Canvas LMS와 Google Sheets SVG는 제공 원문에서 서로 이어 붙어 있으므로 구현 시 별도 SVG로 분리한다.
- 각 SVG는 컴포넌트 작성 후 JSX validity를 확인한다.
- path data와 fill 값은 임의 최적화하지 않는다.

---

## 6. 공용 Registry 설계

추가 파일:

```text
src/shared/ui/service-icon-registry.ts
```

역할:

- service key를 canonical icon key로 정규화한다.
- 서비스별 label, kind, fallback icon, BrandIcon component를 제공한다.
- 화면별 wrapper/style은 갖지 않는다.

예상 타입:

```ts
import { type ComponentType, type SVGProps } from "react";
import { type IconType } from "react-icons";

import { type ServiceBadgeKey } from "../utils";

export type ServiceIconKind = "brand" | "domain" | "category" | "unknown";

export type ServiceBrandIconProps = Omit<
  SVGProps<SVGSVGElement>,
  "height" | "width"
> & {
  size?: number | string;
};

export type ServiceBrandIconComponent =
  ComponentType<ServiceBrandIconProps>;

export type ServiceIconMeta = {
  key: ServiceBadgeKey;
  label: string;
  kind: ServiceIconKind;
  fallbackIcon: IconType;
  BrandIcon?: ServiceBrandIconComponent;
};
```

제공 helper:

```ts
getServiceIconMeta(type: ServiceBadgeKey): ServiceIconMeta;

getServiceIconMetaFromService(
  serviceKey?: string | null,
  sourceMode?: string | null,
): ServiceIconMeta;
```

정규화 규칙:

```text
google_drive -> google-drive
google_sheets -> google-sheets
google_calendar -> calendar
canvas_lms -> canvas-lms
naver_news -> naver-news
discord -> discord
notion -> notion
slack -> slack
github -> github
web_news + seboard_posts -> seboard
web_news + seboard_new_posts -> seboard
web_news + website_feed/null -> web-scraping
unknown -> unknown
```

주의:

- `getServiceBadgeKeyFromService`와 `getServiceBadgeKeyFromNodeConfig`의 기존 의미를 깨지 않는다.
- registry helper는 기존 helper를 재사용하거나 같은 규칙을 공유해야 한다.
- 정규화 규칙이 두 곳으로 갈라지면 안 된다.

---

## 7. `ServiceIcon` 변경 설계

수정 파일:

```text
src/shared/ui/ServiceIcon.tsx
```

현재 props API는 유지한다.

```tsx
<ServiceIcon
  serviceKey={serviceKey}
  sourceMode={sourceMode}
  fallbackIcon={fallbackIcon}
  size={56}
  color="text.primary"
/>
```

렌더링 우선순위:

```text
1. serviceKey + sourceMode로 확정되는 BrandIcon
2. serviceKey로 확정되는 registry fallbackIcon
3. caller가 넘긴 fallbackIcon
4. null
```

구체 규칙:

- `serviceKey`가 없으면 caller fallback을 사용한다.
- `serviceKey`가 있고 registry에서 `BrandIcon`이 있으면 `BrandIcon`을 렌더링한다.
- `serviceKey`가 있고 canonical key가 `unknown`이 아니면 registry fallback icon을 사용한다.
- canonical key가 `unknown`이면 caller fallback을 우선 사용한다.
- caller fallback도 없으면 `unknown` fallback 또는 `null` 중 기존 화면에 더 안전한 쪽을 선택한다.

보장해야 할 동작:

- service가 설정된 Google Drive는 generic folder가 아니라 Google Drive 의미로 표시된다.
- service가 없는 storage node는 여전히 `nodeRegistry.iconComponent` fallback을 사용한다.
- SE Board는 `serviceKey`만으로 판단하지 않고 `sourceMode`까지 확인한다.
- `web_news` 단독 또는 `website_feed`는 SE Board가 아니라 web-scraping fallback을 사용한다.

---

## 8. `ServiceSelectionPanel` 변경 설계

수정 파일:

```text
src/features/add-node/ui/ServiceSelectionPanel.tsx
```

제거 대상:

```ts
CATALOG_SERVICE_ICON_MAP
getCatalogServiceIcon
```

변경 후:

```tsx
<ServiceIcon serviceKey={service.key} size={64} />
```

또는 fallback을 명시해야 하면 registry helper를 사용한다.

```tsx
const meta = getServiceIconMetaFromService(service.key);

<ServiceIcon
  fallbackIcon={meta.fallbackIcon}
  serviceKey={service.key}
  size={64}
/>
```

목표:

- `ServiceSelectionPanel`에서 `SiGmail`, `SiSlack`, `SiGoogledrive`, `SiGooglesheets`, `SiGooglecalendar`를 직접 알지 않게 한다.
- 서비스 선택 화면의 아이콘 의미도 registry와 동일하게 유지한다.
- `web_news` 카드에서는 source mode가 아직 없으므로 SE Board가 아니라 범용 web/news 아이콘을 유지한다.

---

## 9. `ServiceBadge` 변경 설계

수정 파일:

```text
src/shared/ui/ServiceBadge.tsx
```

현재 local fallback map:

```ts
const FALLBACK_NODE_ICONS: Record<ServiceBadgeKey, IconType> = { ... };
```

변경 후:

```ts
const meta = getServiceIconMeta(type);
const fallbackIcon = meta.fallbackIcon;
```

역할 분리:

- registry: 이 key가 어떤 fallback icon과 BrandIcon을 쓰는지 결정
- `ServiceBadge`: 38px badge slot, 30px visual, border/background/shadow 등 surface 렌더링 담당

유지할 것:

- badge outer slot `38px`
- badge visual `30px`
- category fallback badge 스타일
- 기존 Google/Gmail/Slack/Drive/Sheets의 시각 결과
- Discord/Naver/SE Board custom icon 사용

변경할 것:

- fallback icon 의미를 local map이 아니라 registry에서 가져온다.
- BrandIcon이 있는 서비스는 badge surface 안에서 해당 component를 렌더링한다.
- SVG path/fill을 임의로 바꾸지 않는다.

---

## 10. Export 설계

수정 파일:

```text
src/shared/ui/index.ts
src/shared/ui/icons/index.ts
```

추가:

```ts
export * from "./service-icon-registry";
```

신규 아이콘 컴포넌트를 추가한다면 `src/shared/ui/icons/index.ts`에도 export한다.

예:

```ts
export * from "./GmailIcon";
export * from "./GoogleDriveIcon";
export * from "./GoogleSheetsIcon";
export * from "./GoogleCalendarIcon";
export * from "./SlackIcon";
export * from "./NotionIcon";
export * from "./GitHubIcon";
export * from "./CanvasLmsIcon";
```

`src/shared/index.ts`는 이미 `shared/ui`를 export하고 있으므로 별도 수정이 필요 없는지 확인한다.

---

## 11. 건드리지 않을 것

이번 작업에서 제외한다.

- `nodeRegistry.iconComponent`
- `SourceTargetPicker`의 folder/file/label/course/sheet/term/category icon
- 실행/중지/삭제/더보기/action/status icon
- Spring/FastAPI/API/DB
- OAuth connect/disconnect 흐름
- workflow 실행/저장/삭제 로직
- Google Sheets alias token 정책
- service token manual 저장/검증 로직

특히 `nodeRegistry.iconComponent`는 노드 타입 fallback이다. 서비스 브랜드 아이콘으로 바꾸면 안 된다.

---

## 12. 테스트 설계

우선 mapping 테스트를 작게 추가한다.

후보 파일:

```text
src/shared/ui/service-icon-registry.test.ts
```

또는 기존 helper 위치를 유지하려면:

```text
src/shared/utils/service-badge.test.ts
```

검증 케이스:

```text
google_drive -> google-drive
google_sheets -> google-sheets
google_calendar -> calendar
canvas_lms -> canvas-lms
naver_news -> naver-news
discord -> discord
notion -> notion
slack -> slack
github -> github
web_news + seboard_posts -> seboard
web_news + seboard_new_posts -> seboard
web_news + website_feed -> web-scraping
web_news + null -> web-scraping
unknown -> unknown
```

GitHub 주의:

- `github`을 `ServiceBadgeKey`에 추가하는 경우 registry test에 포함한다.
- `github`을 아직 badge key에 추가하지 않는다면 별도 future case로 문서화만 한다.

검증 명령어:

```bash
pnpm tsc
pnpm test
pnpm build
```

---

## 13. 구현 순서

1. 제공 SVG 기준으로 필요한 brand icon component를 `src/shared/ui/icons`에 추가한다.
2. `src/shared/ui/icons/index.ts`에 신규 icon export를 추가한다.
3. `src/shared/ui/service-icon-registry.ts`를 추가한다.
4. registry helper 테스트를 추가한다.
5. `ServiceIcon`을 registry 기반으로 변경한다.
6. `ServiceSelectionPanel`의 local icon map을 제거한다.
7. `ServiceBadge`의 fallback map을 registry 기반으로 대체한다.
8. 주요 화면을 수동 확인한다.
9. `pnpm tsc`, `pnpm test`, `pnpm build`를 실행한다.

권장 커밋 분리:

```text
feat: add shared service brand icons
feat: add service icon registry
refactor: use service icon registry in ServiceIcon
refactor: reuse shared service icons in service selection
refactor: align service badge icons with shared registry
test: cover service icon registry mapping
```

---

## 14. 수동 검증 체크리스트

- [ ] Gmail 서비스는 Gmail SVG 의미로 보인다.
- [ ] Google Drive 서비스는 generic folder가 아니라 Drive SVG 의미로 보인다.
- [ ] Google Sheets 서비스는 generic spreadsheet fallback과 구분된다.
- [ ] Google Calendar 서비스는 calendar 브랜드 SVG 의미로 보인다.
- [ ] Slack 서비스는 Slack SVG 의미로 보인다.
- [ ] Discord 서비스는 기존 `DiscordIcon`으로 유지된다.
- [ ] Naver News 서비스는 기존 `NaverIcon`으로 유지된다.
- [ ] SE Board 서비스는 기존 `SeBoardIcon`으로 유지된다.
- [ ] `web_news + seboard_posts/new_posts`는 SE Board로 보인다.
- [ ] `web_news + website_feed/null`은 web-scraping fallback으로 보인다.
- [ ] service가 없는 storage node는 `nodeRegistry.iconComponent` fallback을 유지한다.
- [ ] SourceTargetPicker의 folder/file/label/sheet/course 아이콘은 바뀌지 않는다.
- [ ] 실행/중지/삭제/더보기 아이콘은 바뀌지 않는다.
- [ ] Account manual token 구조와 OAuth 흐름은 바뀌지 않는다.

---

## 15. 최종 판단

최종 구현 설계는 아래 구조가 가장 안전하다.

```text
아이콘 SVG 컴포넌트: shared/ui/icons
서비스 의미 결정: shared/ui/service-icon-registry
노드/패널 아이콘 표시: ServiceIcon
목록/대시보드/템플릿 배지 표시: ServiceBadge
노드 타입 fallback: nodeRegistry
선택지 아이콘: picker 내부 map
action/status 아이콘: 각 컴포넌트
```

이 구조는 Discord 아이콘 방식과 맞고, 제공된 SVG 자산을 구현 기준으로 삼을 수 있다. 동시에 노드 타입 fallback, picker option icon, action/status icon, 서버/API 흐름을 건드리지 않으므로 전면 리팩토링으로 커지지 않는다.

---

## 16. 추가 수정 설계 - 외곽선 제거와 사이드바 아이콘 교체

1. 서비스 아이콘 배지는 SVG 자체의 형태와 색상을 우선한다. `ServiceBadge`는 정렬을 위한 30px slot만 유지하고, 브랜드 아이콘 또는 fallback 아이콘 주위에 `border`, `borderColor`, 강조용 `boxShadow`를 추가하지 않는다. 이 방식으로 목록, 대시보드, 템플릿에서 서비스 아이콘 바깥선이 생기지 않게 한다.
2. 사이드바의 시각 순서 기준 첫 번째 아이콘은 접기/펼치기 컨트롤이다. 기존 double-arrow 계열 아이콘 대신 제공된 16x11 패널 형태 SVG를 `SidebarPanelIcon`으로 컴포넌트화해 사용한다. SVG path는 제공 자산을 유지하되 fill은 `currentColor`로 받아 사이드바 item의 active/hover 색상 체계를 따른다.
3. 사이드바의 시각 순서 기준 네 번째 아이콘은 워크플로우 route item이다. 기존 `MdOutlineWorkspaces` 대신 제공된 14x16 연결/공유 형태 SVG를 `SidebarWorkflowIcon`으로 컴포넌트화해 사용한다. 사이드바 아이콘 타입은 `ElementType`으로 넓혀 react-icons와 로컬 SVG 컴포넌트를 같은 렌더링 경로에서 처리한다.
