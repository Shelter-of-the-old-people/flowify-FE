# Account Service Token Management Frontend Design

> 작성일: 2026-05-13
> 대상 화면: `/account`
> 범위: flowify-FE service token 입력/관리 UX
> 관련 저장소: `flowify-BE-spring`, `flowify-BE`

---

## 1. 목적

이 문서는 사용자가 직접 입력하는 service token 기능을 프론트엔드에서 어떻게 노출하고 관리할지 정리한다.

이번 이슈는 단순히 input 하나를 추가하는 작업이 아니다.

프론트엔드는 아래를 한 번에 풀어야 한다.

- 어떤 서비스가 token 직접 입력 대상인지 이해시킨다.
- 어디서 입력해야 하는지 일관된 구조를 제공한다.
- 저장된 token을 안전하게 확인할 수 있게 한다.
- token을 어디서 발급하는지 모르는 사용자를 도움창으로 안내한다.

---

## 2. 제품 결정

### 2.1 canonical 화면

이번 이슈의 canonical 화면은 `/account`다.

판단 이유는 아래와 같다.

- token 입력은 운영 요약보다 계정/자격증명 관리 성격이 강하다.
- 현재 `account` 화면이 이미 서비스 연결 owner에 더 가깝다.
- `dashboard`는 상태 요약과 빠른 점검 역할을 유지하는 편이 구조가 깔끔하다.

### 2.2 이번 이슈 대상 서비스

manual token 입력 대상으로 보는 서비스는 아래 셋이다.

- `notion`
- `github`
- `canvas_lms`

기존 OAuth redirect 서비스는 유지한다.

- `slack`
- `gmail`
- `google_drive`

`google_sheets`는 계속 `google_drive` alias를 사용하므로 별도 token 입력 UI를 만들지 않는다.

### 2.3 도움창 범위 판단

토큰 발급 도움창은 이번 이슈에 포함하는 것이 맞다.

manual token 입력 기능만 먼저 열면 아래 문제가 바로 생긴다.

- 사용자가 어디서 token을 발급하는지 모른다.
- 잘못된 권한의 token을 넣고 실패한다.
- 실패 이유를 이해하지 못한 채 이탈한다.

따라서 v1부터 아래는 같이 들어가는 편이 맞다.

- 서비스별 token 발급 도움창
- 필요한 권한(scope) 또는 준비사항 안내
- 외부 발급 페이지로 이동할 링크

---

## 3. 화면 구조

### 3.1 account 화면이 owner가 된다

`/account` 화면의 서비스 연결 섹션을 아래 두 그룹으로 분리한다.

- OAuth 연결 서비스
- token 직접 입력 서비스

사용자 입장에서는 둘 다 "외부 서비스 연결"이지만, 실제 연결 방식이 다르므로 카드와 액션 문구를 분리해야 한다.

### 3.2 dashboard는 이번 이슈 범위 밖이다

`/dashboard`는 이번 이슈에서 token 입력 경로로 확장하지 않는다.

이유는 아래와 같다.

- 요약 화면에 복잡한 자격증명 입력 책임까지 얹히면 화면 역할이 무거워진다.
- 먼저 account 구조를 안정화하는 편이 구현과 테스트가 단순하다.
- 이번 이슈는 token 관리 기능을 account 화면 안에서만 완결하는 편이 범위 관리에 유리하다.

즉 이번 이슈에서 dashboard에 아래를 넣지 않는다.

- token 입력 다이얼로그
- token 갱신 액션
- 발급 도움창 진입점

`dashboard`는 기존 연결 상태 요약 역할만 유지한다.

---

## 4. 주요 사용자 흐름

### 4.1 최초 연결

- 사용자가 `/account`에서 `GitHub`, `Notion`, `Canvas LMS` 카드 중 하나를 본다.
- 카드에서 `토큰 입력`을 누른다.
- 입력 다이얼로그가 열린다.
- 사용자가 token을 붙여넣는다.
- 필요하면 `발급 링크 / 가이드 보기`를 눌러 도움창을 연다.
- 저장 성공 후 카드가 `연결됨` 상태로 바뀐다.

### 4.2 갱신

- 이미 연결된 manual token 서비스 카드에서 `토큰 갱신`을 누른다.
- 기존 token 원문은 보여주지 않는다.
- 사용자가 새 token을 입력한다.
- 저장 성공 후 `최근 갱신 시각`과 상태가 갱신된다.

### 4.3 해제

- 사용자가 `연결 해제`를 누른다.
- 해제 확인 후 카드가 `미연결` 상태로 돌아간다.

### 4.4 validation 실패

- 저장 실패 시 서비스별 에러 문구를 보여준다.
- 같은 다이얼로그 안에서 `발급 링크 / 가이드 보기`를 다시 열 수 있게 한다.
- 사용자는 화면 이동 없이 token을 수정해 다시 저장할 수 있어야 한다.

---

## 5. 카드 상태 설계

manual token 서비스 카드는 아래 상태를 가져야 한다.

- `미연결`
- `검증 중`
- `연결됨`
- `검증 실패`
- `권한 부족`
- `갱신 필요`

카드에 최소한 보여줘야 하는 정보는 아래다.

- 서비스 이름
- 연결 방식: `토큰 직접 입력`
- 상태 라벨
- `maskedHint`
- 최근 갱신 시각
- `accountEmail` 또는 `accountLabel`

예시 문구:

- `토큰 직접 입력`
- `최근 갱신 2026-05-13 18:40`
- `연결 계정 octocat`
- `저장된 토큰 ••••9k2m`

---

## 6. 입력 다이얼로그 설계

### 6.1 기본 구성

공용 다이얼로그 컴포넌트를 둔다.

권장 이름 예시:

- `ServiceTokenDialog`

필수 구성 요소:

- 서비스 이름 헤더
- token 입력 textarea 또는 input
- 입력 주의 문구
- `발급 링크 / 가이드 보기` 보조 액션
- `취소`
- `저장`

### 6.2 저장 UX 원칙

- 저장 전에는 raw token을 화면 메모리 안에서만 유지한다.
- 저장 성공 후 input은 즉시 비운다.
- 저장 실패 후에는 사용자가 재시도할 수 있게 그대로 둔다.
- 저장 완료 후 raw token을 다시 표시하지 않는다.

### 6.3 검증 메시지

다이얼로그는 아래 종류의 메시지를 구분해 보여줘야 한다.

- token 누락
- 형식 오류
- 권한 부족
- 만료 또는 무효 token
- 현재 Canvas 인스턴스 접근 실패
- 서버 저장 실패

---

## 7. 토큰 발급 도움창 설계

### 7.1 이번 이슈에 포함한다

도움창은 별도 후속이 아니라 이번 이슈에 포함한다.

이유는 아래와 같다.

- manual token 입력 UX의 완료율에 직접 영향을 준다.
- backend 추가 부담 없이 FE 중심으로 해결 가능하다.
- 서비스별 요구 권한을 입력 직전 맥락에서 보여줄 수 있다.

### 7.2 도움창 형태

권장 형태는 공용 다이얼로그 또는 drawer다.

권장 이름 예시:

- `ServiceTokenHelpDialog`

도움창은 최소 아래를 포함해야 한다.

- token을 어디서 발급하는지
- 어떤 권한이 필요한지
- 발급 후 어디에 붙여넣는지
- token을 공유하지 말라는 보안 경고
- 외부 발급 페이지 링크

### 7.3 초보자 친화 원칙

도움창은 단순 설명보다 `바로 행동할 수 있는 구조`가 더 중요하다.

따라서 서비스별로 아래를 같이 제공하는 편이 좋다.

- `바로 발급하러 가기` 1차 링크
- 토큰 관리 화면 또는 발급 화면으로 이동하는 보조 링크
- 공식 문서나 권한 설명으로 이어지는 상세 가이드 링크

즉 사용자는 도움창 안에서 아래 순서로 움직일 수 있어야 한다.

1. 첫 번째 버튼으로 발급 화면을 연다.
2. 토큰을 만든다.
3. 필요하면 상세 가이드에서 권한을 다시 확인한다.
4. 다시 돌아와 토큰을 붙여 넣는다.

### 7.4 서비스별 도움말 범위

`notion`

- integration token 발급 위치
- workspace 연결 개념
- 필요한 권한 체크
- page / database 공유 필요성

`github`

- personal access token 발급 위치
- 현재 제품에서 무난한 권한 시작점
- 조직 정책이나 승인 절차 가능성

`canvas_lms`

- 현재 Flowify가 연결하는 Canvas 인스턴스 기준이라는 점
- personal access token 발급 위치
- 필요한 course / file 접근 전제

---

## 8. 프론트엔드 구조 제안

### 8.1 entity

`entities/oauth-token`

- summary 타입 확장
- `connectionMethod`, `maskedHint`, `updatedAt`, `validationStatus`, `accountLabel` 반영
- manual token 저장 API 추가

### 8.2 feature

신규 feature 계층을 두는 편이 좋다.

권장 예시:

- `features/service-token/model`
- `features/service-token/ui/ServiceTokenDialog.tsx`
- `features/service-token/ui/ServiceTokenHelpDialog.tsx`
- `features/service-token/model/help-content.ts`

### 8.3 page

`pages/account`

- manual token 서비스 섹션 추가
- OAuth 서비스 섹션과 시각적으로 구분
- 공용 dialog state owner 역할 수행

### 8.4 권장 컴포넌트 트리

권장 구성 예시:

- `AccountPage`
- `AccountServiceConnectionSection`
- `ManualTokenServiceGrid`
- `ManualTokenServiceCard`
- `ServiceTokenDialog`
- `ServiceTokenHelpDialog`