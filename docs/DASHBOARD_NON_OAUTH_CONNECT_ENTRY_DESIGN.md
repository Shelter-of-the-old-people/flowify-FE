# Dashboard Non-OAuth Connect Entry Design

> 작성일: 2026-05-15
> 이슈: #187
> 브랜치: `fix#187-dashboard-non-oauth-connect-entry`
> 대상 화면: `/dashboard`, `/account`
> 범위: `flowify-FE` 대시보드 추천 서비스 카드의 연결 진입 UX 보강
> 관련 문서: `docs/DASHBOARD_PAGE_DESIGN.md`, `docs/ACCOUNT_SERVICE_TOKEN_MANAGEMENT_FRONTEND_DESIGN.md`

---

## 1. 목적

현재 대시보드의 `연결 추천 서비스` 섹션은 OAuth redirect 서비스만 연결 진입이 가능하다.

하지만 제품 전체 기준으로는 외부 서비스 연결 방식이 아래 두 종류로 나뉜다.

- OAuth redirect 연결
- manual token 입력 연결

즉, 사용자는 대시보드에서 추천된 서비스 카드를 보고 연결을 시작하려고 해도, `manual token` 방식 서비스는 추천 목록에 나타나지 않거나 클릭해도 연결 흐름으로 진입할 수 없다.

이번 이슈의 목적은 다음과 같다.

- 대시보드 추천 서비스 카드가 `OAuth redirect` 서비스뿐 아니라 `manual token` 서비스도 연결 진입 대상으로 포함하도록 한다.
- 단, manual token 입력 UI를 대시보드에 새로 복제하지 않고, 기존 `/account` 화면의 token 입력 흐름을 재사용한다.
- 백엔드 연결 방식과 충돌하지 않도록 FE에서 연결 방식별 분기를 명확히 한다.

---

## 2. 현재 문제

## 2.1 대시보드 추천 서비스 필터가 OAuth 서비스만 허용한다

현재 [dashboard.ts](/C:/Users/김민호/CD2/flowify-FE/src/pages/dashboard/model/dashboard.ts)에서 추천 서비스 카드는 `RECOMMENDED_DASHBOARD_SERVICES` 정적 목록과 `isOAuthConnectSupported(serviceKey)` 조건을 함께 사용한다.

이 구조의 문제는 다음과 같다.

- `manual token` 서비스인 `notion`, `github`, `canvas_lms`를 추천 서비스에 포함할 수 없다.
- 추천 카드에 연결 방식 차이를 표현할 수 없다.
- 대시보드 추천 서비스가 실제 제품 연결 방식보다 더 좁은 집합만 보여주게 된다.

## 2.2 대시보드 connect 액션이 OAuth redirect만 처리한다

현재 [useDashboardData.ts](/C:/Users/김민호/CD2/flowify-FE/src/pages/dashboard/model/useDashboardData.ts)의 `handleConnectService()`는 `isOAuthConnectSupported(serviceKey)`가 아니면 즉시 return 한다.

즉:

- OAuth redirect 서비스는 `/oauth-tokens/{service}/connect` 호출 가능
- manual token 서비스는 대시보드에서 클릭해도 진입 불가

## 2.3 계정 페이지에는 이미 manual token 입력 흐름이 있다

[AccountPage.tsx](/C:/Users/김민호/CD2/flowify-FE/src/pages/account/AccountPage.tsx)에는 아래 요소가 이미 존재한다.

- `ServiceTokenDialog`
- `ServiceTokenHelpDialog`
- `useUpsertManualTokenMutation`
- manual token 지원 서비스별 상태 카드

즉 manual token 입력 자체는 이미 구현되어 있으며, 이번 이슈의 핵심은 **대시보드에서 그 흐름으로 사용자를 자연스럽게 연결하는 것**이다.

---

## 3. 현재 구조 정리

## 3.1 연결 방식 모델

[oauth-connect-support.ts](/C:/Users/김민호/CD2/flowify-FE/src/entities/oauth-token/model/oauth-connect-support.ts) 기준 FE 공용 모델은 이미 아래 연결 방식을 구분한다.

- `oauth_redirect`
- `manual_token`
- `unsupported`

지원 서비스도 아래처럼 이미 분리되어 있다.

- OAuth redirect:
  - `slack`
  - `gmail`
  - `google_drive`
- manual token:
  - `notion`
  - `github`
  - `canvas_lms`

즉 이슈의 본질은 공용 연결 모델 부재가 아니라, **대시보드가 그 모델을 활용하지 못하는 것**이다.

## 3.2 백엔드 계약

Spring의 [OAuthTokenController.java](/C:/Users/김민호/CD2/flowify-BE-spring/src/main/java/org/github/flowify/oauth/controller/OAuthTokenController.java)는 `/api/oauth-tokens/{service}/connect`를 제공한다.

다만 service별 connector 구현은 다르다.

- OAuth redirect 서비스는 `authUrl`을 반환하거나 callback을 지원한다.
- manual token 서비스는 `/connect` 진입 시 예외를 던지고, 계정 페이지에서 직접 token을 입력하라는 메시지를 반환한다.

예:

- [CanvasLmsConnector.java](/C:/Users/김민호/CD2/flowify-BE-spring/src/main/java/org/github/flowify/oauth/service/CanvasLmsConnector.java)
- [GitHubTokenService.java](/C:/Users/김민호/CD2/flowify-BE-spring/src/main/java/org/github/flowify/oauth/service/GitHubTokenService.java)
- [NotionTokenService.java](/C:/Users/김민호/CD2/flowify-BE-spring/src/main/java/org/github/flowify/oauth/service/NotionTokenService.java)

따라서 이번 이슈는 백엔드 `/connect`를 manual token 서비스에 맞게 바꾸는 문제가 아니라, **대시보드 FE가 해당 서비스들을 계정 페이지 manual token flow로 안내해야 하는 문제**다.

---

## 4. 범위

## 4.1 포함 범위

- 대시보드 추천 서비스 카드에 manual token 서비스 포함
- 추천 서비스 카드 클릭 시 연결 방식별 진입 분기
- manual token 서비스 클릭 시 `/account` 화면의 기존 token 입력 흐름으로 이동
- account 페이지가 특정 service를 들고 진입했을 때 해당 manual token dialog를 자동 오픈하도록 보강
- 연결 완료 후 대시보드/계정 화면 상태가 자연스럽게 갱신되도록 FE 흐름 정리

## 4.2 제외 범위

- 백엔드 `/connect` 엔드포인트 동작 변경
- 대시보드 내부에 manual token 입력 dialog를 새로 구현
- account 페이지 전체 리디자인
- dashboard summary API 구조 개편
- manual token 발급 가이드 본문 개편

---

## 5. UX 목표

이번 이슈에서 사용자에게 보여야 하는 핵심 경험은 아래와 같다.

1. 대시보드의 `연결 추천 서비스`에서 OAuth 서비스와 manual token 서비스가 모두 보인다.
2. 사용자는 서비스별 연결 방식 차이를 몰라도 추천 카드에서 바로 다음 행동으로 이동할 수 있다.
3. OAuth 서비스는 기존처럼 즉시 인증 플로우로 간다.
4. manual token 서비스는 계정 페이지 token 입력 다이얼로그로 자연스럽게 이동한다.
5. 이미 존재하는 account 관리 UX와 충돌하지 않는다.

---

## 6. UX 제안

## 6.1 추천 서비스 카드의 연결 방식 표현

추천 서비스 카드는 단순히 `인증 필요` 하나로 통일하지 않고, 연결 방식에 따라 상태 문구를 달리 보여주는 편이 좋다.

권장 예시:

- OAuth redirect 서비스:
  - 상태: `인증 필요`
  - 액션: `연결 시작`
- manual token 서비스:
  - 상태: `토큰 입력 필요`
  - 액션: `토큰 입력`

이렇게 하면 사용자가 카드 클릭 전부터 어떤 종류의 연결인지 감을 잡을 수 있다.

## 6.2 manual token 서비스 진입 방식

manual token 서비스는 대시보드에서 직접 입력받지 않는다.

권장 방식:

- 대시보드 카드 클릭
- `/account`로 이동
- `serviceKey`를 함께 전달
- AccountPage가 해당 service의 `ServiceTokenDialog`를 자동 오픈

이 방식의 장점:

- 기존 token 입력 UX를 재사용한다.
- validation, help dialog, masked hint 표시를 중복 구현하지 않는다.
- account 화면이 manual token 관리의 canonical owner 역할을 유지한다.

## 6.3 account 페이지 자동 진입 UX

권장 진입 형태 예시:

- `/account?connectService=notion`
- `/account?connectService=github`
- `/account?connectService=canvas_lms`

AccountPage는 진입 시 아래를 수행한다.

1. query param 읽기
2. manual token 지원 서비스인지 확인
3. 해당 서비스 label 찾기
4. `selectedManualServiceKey` 설정
5. `ServiceTokenDialog` 자동 오픈
6. 필요하면 query param 제거

query param 제거는 아래 둘 중 하나를 선택할 수 있다.

- 다이얼로그를 연 직후 `replace` navigate
- 닫힐 때 유지

권장:

- 자동 오픈 직후 `replace` navigate로 query 제거

이유:

- 새로고침 반복 시 다이얼로그가 계속 뜨는 혼란을 줄인다.

---

## 7. 구현 방향

## 7.1 dashboard 모델 변경

파일:

- [dashboard.ts](/C:/Users/김민호/CD2/flowify-FE/src/pages/dashboard/model/dashboard.ts)
- [types.ts](/C:/Users/김민호/CD2/flowify-FE/src/pages/dashboard/model/types.ts)

변경 방향:

1. 추천 서비스 목록이 OAuth 서비스만 필터링하지 않도록 수정
2. 카드 모델이 연결 방식(`oauth_redirect` / `manual_token`)을 알 수 있게 확장
3. 상태 라벨과 액션 라벨을 연결 방식에 따라 다르게 생성

권장 모델 확장 예시:

```ts
type DashboardServiceCard = {
  id: string;
  label: string;
  badgeKey: ServiceBadgeKey;
  serviceKey: string;
  statusLabel: string;
  actionKind: "connect" | "disconnect";
  actionLabel: string;
  connectionKind?: "oauth_redirect" | "manual_token";
  actionDisabled?: boolean;
  disabledReason?: string;
};
```

## 7.2 dashboard action 분기

파일:

- [useDashboardData.ts](/C:/Users/김민호/CD2/flowify-FE/src/pages/dashboard/model/useDashboardData.ts)

변경 방향:

- `isOAuthConnectSupported()`만으로 early return 하지 않는다.
- `getServiceConnectionKind(serviceKey)` 기준으로 분기한다.

권장 동작:

- `oauth_redirect`
  - 기존처럼 `connectToken(serviceKey)` 호출
  - redirect면 이동
- `manual_token`
  - `navigate("/account?connectService=...")`
- `unsupported`
  - no-op 또는 방어적 return

## 7.3 account 페이지 자동 dialog 오픈

파일:

- [AccountPage.tsx](/C:/Users/김민호/CD2/flowify-FE/src/pages/account/AccountPage.tsx)

변경 방향:

- query param 또는 location state를 읽어 manual token dialog를 자동 오픈
- 기존 `openManualTokenDialog()` 흐름을 재사용

권장 구현 포인트:

- `useSearchParams` 또는 `useLocation`
- `toManualTokenServiceKey()`
- `DEFAULT_SERVICE_LABELS` 또는 managedServices 목록에서 label 조회
- `setSelectedManualServiceKey`
- `setSelectedManualServiceLabel`
- `setManualDialogErrorMessage(null)`
- `setIsTokenDialogOpen(true)`

권장 방식:

- `query param + replace navigate`

이유:

- deep-link가 단순하다.
- 대시보드에서 구현이 쉽다.
- account 화면에서 디버깅/수동 진입도 쉽다.

---

## 8. 설계 대안 비교

## 대안 A. 대시보드에서 manual token 입력 dialog 직접 띄우기

장점:

- 사용자가 화면 이동 없이 연결 가능

단점:

- account 페이지의 token 입력 UX를 중복 구현하게 된다.
- help dialog, validation, masked hint, 갱신 흐름까지 중복될 수 있다.
- 이번 이슈 범위를 불필요하게 키운다.

판단:

- 비추천

## 대안 B. 대시보드에서 account 페이지로 이동하되, 사용자가 직접 카드를 다시 누르게 하기

장점:

- 구현이 단순하다.

단점:

- 추천 서비스에서 클릭했는데 account 페이지에 도착한 후 다시 같은 서비스를 찾아야 한다.
- 연결 진입 경험이 끊긴다.

판단:

- 비추천

## 대안 C. 대시보드에서 account 페이지로 이동 + manual token dialog 자동 오픈

장점:

- 기존 UX 재사용
- 구현 범위가 작음
- 사용자의 클릭 흐름이 자연스럽다.

단점:

- account 페이지가 외부 진입 context를 처리해야 한다.

판단:

- 추천

---

## 9. 테스트 포인트

최소 확인 범위:

1. 대시보드 추천 서비스 카드에 `notion`, `github`, `canvas_lms`가 연결 안 된 상태에서 노출되는가
2. OAuth 서비스(`gmail`, `google_drive`, `slack`)는 기존처럼 redirect connect 흐름을 타는가
3. manual token 서비스 클릭 시 `/account`로 이동하는가
4. `/account?connectService=notion` 진입 시 `ServiceTokenDialog`가 자동 오픈되는가
5. dialog에서 token 저장 성공 후 서비스 상태가 갱신되는가
6. 이미 연결된 서비스는 추천 목록에서 빠지는가
7. unsupported 서비스가 추천 목록에 섞이지 않는가

테스트 파일 후보:

- [dashboard.test.ts](/C:/Users/김민호/CD2/flowify-FE/src/pages/dashboard/model/dashboard.test.ts)
- [oauth-connect-support.test.ts](/C:/Users/김민호/CD2/flowify-FE/src/entities/oauth-token/model/oauth-connect-support.test.ts)
- account page 관련 진입 테스트 추가 가능

---

## 10. 최종 제안

이번 이슈는 FE 단독으로 해결하는 것이 맞다.

핵심은 아래 세 가지다.

1. 대시보드 추천 서비스가 `OAuth 전용`이 아니라 `지원되는 연결 방식 전체`를 기준으로 추천되어야 한다.
2. 대시보드 connect 액션은 `oauth_redirect`와 `manual_token`을 구분해서 분기해야 한다.
3. manual token 서비스는 대시보드에서 직접 입력받지 않고, account 페이지의 기존 token 입력 UX로 연결해야 한다.

즉 구현 기준 한 줄 요약은 다음과 같다.

> `연결 추천 서비스` 카드가 non-OAuth 서비스도 보여주되, manual token 서비스는 `/account`의 기존 `ServiceTokenDialog` 흐름으로 진입시킨다.

