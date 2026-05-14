# 사이드바 계정 메뉴와 설정 화면 재배치 설계

## 1. 배경

현재 사이드바 하단의 사용자 아바타를 누르면 계정 메뉴가 열리고, 이 메뉴 안에 `계정 정보`와 `로그아웃`이 함께 노출된다.

변경 목표는 아래와 같다.

1. 사용자 아바타 메뉴에서는 `계정 정보` 진입을 제거한다.
2. 사용자 아바타 메뉴에는 `로그아웃`만 남긴다.
3. 기존 `계정 정보`에서 하던 계정/서비스 연결 관리는 사이드바 맨 아래 `설정` 진입점에서 접근하게 한다.

이 변경은 인증, OAuth token 저장, 서비스 연결 API 계약을 바꾸는 작업이 아니다. 사용자가 어디에서 계정 관리 화면으로 들어가는지만 정리한다.

## 2. 현재 구조 검토

### 2.1 사이드바 사용자 메뉴

대상 파일:

```text
src/widgets/app-shell/ui/SidebarUserMenu.tsx
```

현재 역할:

- 사용자 이름/이메일 요약 표시
- `계정 정보` 메뉴 클릭 시 `ROUTE_PATHS.ACCOUNT`로 이동
- `로그아웃` 메뉴 클릭 시 `useLogout()` 실행

변경 후 역할:

- 사용자 이름/이메일 요약 표시는 유지한다.
- `계정 정보` 메뉴 item은 제거한다.
- 메뉴 action은 `로그아웃` 하나만 유지한다.
- `useNavigate`, `ROUTE_PATHS` 의존성은 제거한다.

### 2.2 계정 화면

대상 파일:

```text
src/pages/account/AccountPage.tsx
```

현재 역할:

- 로그인 사용자 프로필 정보 표시
- 빠른 링크 표시
- OAuth redirect 서비스 연결 관리
- manual token 서비스 연결 관리

주의점:

- `ServiceSelectionPanel`은 manual token 서비스가 필요할 때 `ROUTE_PATHS.ACCOUNT`로 이동한다.
- OAuth 연결 후 복귀 경로도 계정 화면을 사용할 수 있다.
- 따라서 `/account` route를 즉시 제거하면 기존 연결 흐름이 깨질 수 있다.

### 2.3 설정 화면

대상 파일:

```text
src/pages/settings/SettingsPage.tsx
```

현재 역할:

- 앱 환경 정보 표시
- 세션 점검 표시
- 향후 확장 roadmap 표시

변경 후 역할:

- 설정 화면이 계정 정보 진입점이 된다.
- 사용자 프로필과 서비스 연결 관리가 설정 화면 안에서 접근 가능해야 한다.
- 기존 환경/세션 점검 정보는 설정 화면의 보조 섹션으로 유지한다.

## 3. 1차 검토 - 사용자 흐름

목표 흐름:

```text
사이드바 사용자 아바타 클릭
→ 로그아웃만 표시
→ 로그아웃 실행
```

```text
사이드바 설정 클릭
→ 설정 화면 진입
→ 사용자 프로필 / 서비스 연결 / 환경 점검 확인
```

사용자 관점에서 `계정 정보`라는 별도 메뉴 item이 사라지므로, 계정 관련 관리는 `설정` 화면의 명확한 섹션 제목으로 보완해야 한다.

권장 섹션 구조:

1. `PROFILE` - 로그인 사용자 이름, 이메일, 사용자 ID, 가입 시각, 세션 상태
2. `EXTERNAL SERVICES` - OAuth redirect / manual token 서비스 연결 관리
3. `ENVIRONMENT` - API Base URL, callback path, polling interval
4. `ROADMAP` 또는 `SYSTEM` - 운영/확장 안내

## 4. 2차 검토 - 라우팅과 기존 기능 보존

안전한 1차 구현은 `/settings`에 계정 관리 기능을 통합하되, `/account` route는 당장 제거하지 않는 방식이다.

이유:

- 기존 OAuth/manual token 연결 흐름이 `ROUTE_PATHS.ACCOUNT`를 참조한다.
- 북마크나 OAuth return path에 `/account`가 남아 있을 수 있다.
- 라우트 제거는 기능 이동보다 영향 범위가 크다.

권장 단계:

1. `SettingsPage`에 계정 정보와 서비스 연결 관리 UI를 옮긴다.
2. `SidebarUserMenu`의 `계정 정보` item을 제거한다.
3. `sidebarSecondaryItems`의 `settings` item은 그대로 `/settings`를 유지한다.
4. `/account` route는 남기되, 후속 작업에서 `/settings` redirect 또는 legacy route로 정리한다.
5. `ServiceSelectionPanel`의 manual token 이동 경로는 후속 단계에서 `/settings`로 바꾼다.

이번 변경에서 바로 바꿔도 되는 경로:

```text
SidebarUserMenu: 계정 정보 제거
SettingsPage: 계정 정보 기능 흡수
```

후속 검토가 필요한 경로:

```text
ROUTE_PATHS.ACCOUNT
Router의 /account route
ServiceSelectionPanel의 manual token 이동
oauth-connect return path
```

## 5. 3차 검토 - 구현 범위와 위험

### 5.1 중복 코드 위험

`AccountPage`의 서비스 연결 UI를 그대로 `SettingsPage`에 복사하면 중복이 커진다.

권장 구현:

- 계정 프로필 카드와 서비스 연결 섹션을 재사용 가능한 컴포넌트로 분리한다.
- 예시 분리 단위:

```text
src/pages/account/ui/AccountProfileSection.tsx
src/pages/account/ui/ExternalServiceConnectionsSection.tsx
```

또는 settings owner로 옮긴다면:

```text
src/pages/settings/ui/AccountProfileSection.tsx
src/pages/settings/ui/ExternalServiceConnectionsSection.tsx
```

1차에서는 기존 `AccountPage`의 로직을 큰 리팩토링 없이 옮길 수 있지만, 장기적으로는 서비스 연결 섹션을 page 내부에 묶지 않는 편이 안전하다.

### 5.2 메뉴 UX 위험

사용자 메뉴에 `로그아웃`만 남으면 메뉴가 너무 작아질 수 있다.

보완 기준:

- 메뉴 상단의 avatar/name/email 요약은 유지한다.
- separator 아래 action은 `로그아웃`만 둔다.
- disabled/loading 문구는 기존 `로그아웃 중...`을 유지한다.

### 5.3 계정 화면 legacy 위험

`/account`를 즉시 삭제하면 기존 문서, OAuth return path, manual token 안내 문구와 충돌할 수 있다.

따라서 1차 구현에서는 `/account`를 유지하고, 사용자의 주요 진입점만 `/settings`로 바꾼다. 이후 `/account → /settings` redirect 여부를 별도 커밋에서 결정한다.

## 6. 구현 순서

1. `SidebarUserMenu.tsx`에서 `계정 정보` 메뉴 item 제거
2. `SidebarUserMenu.tsx`에서 `useNavigate`, `ROUTE_PATHS` import 제거
3. `SettingsPage.tsx`에 계정 프로필 정보 섹션 추가 또는 기존 SESSION 섹션 확장
4. `AccountPage.tsx`의 외부 서비스 연결 섹션을 `SettingsPage`에서 접근 가능하게 이동 또는 컴포넌트 분리
5. `/account` route는 1차에서 유지
6. manual token 안내 문구와 이동 경로를 `/settings` 기준으로 바꾸는 후속 작업 검토

## 7. 검증 항목

- 사용자 아바타 메뉴를 열면 `계정 정보`가 보이지 않는다.
- 사용자 아바타 메뉴에서 `로그아웃`만 실행 가능하다.
- 로그아웃 pending 중에는 기존처럼 `로그아웃 중...`이 표시된다.
- 사이드바 맨 아래 `설정` 클릭 시 계정 프로필 정보를 확인할 수 있다.
- 설정 화면에서 외부 서비스 연결 상태를 확인하고 연결/해제할 수 있다.
- Canvas LMS, Notion, GitHub manual token 저장 흐름이 유지된다.
- Gmail, Google Drive, Slack OAuth redirect 흐름이 유지된다.
- 기존 `/account` 직접 접근이 1차 변경 후에도 깨지지 않는다.

## 8. 권장 커밋 분리

```text
docs: design sidebar account menu settings consolidation
refactor: show only logout in sidebar user menu
refactor: move account management entry into settings page
chore: keep account route as legacy entry
```

1차 PR에서는 `docs`, `SidebarUserMenu`, `SettingsPage` 중심으로 제한한다. `/account` 제거와 return path 전환은 별도 후속 커밋에서 처리하는 편이 안전하다.

## 9. 구현 반영 결정

실제 구현에서는 사용자 진입점이 `/settings`로 이동한 뒤에도 manual token 안내가 `/account`로 남아 있으면 같은 기능 안에서 서로 다른 목적지를 가리키게 된다.

따라서 1차 구현 범위에 다음 항목을 포함한다.

- `SidebarUserMenu`의 `계정 정보` item 제거
- `SettingsPage`에서 기존 계정 프로필과 외부 서비스 연결 UI 표시
- `AccountPage`는 props 기반으로 설정 화면에서도 재사용하고, `/account` legacy route는 유지
- manual token 서비스의 이동 경로는 `ROUTE_PATHS.SETTINGS`로 변경
- manual token 안내 문구는 `설정 화면` 기준으로 변경
- OAuth return path fallback은 잘못된 값이 들어왔을 때 `ROUTE_PATHS.SETTINGS`를 사용

이 방식은 `/account`를 삭제하지 않으면서도 사용자가 실제로 보는 진입점과 안내 문구를 일치시킨다.
