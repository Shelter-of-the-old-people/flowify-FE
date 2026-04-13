# 템플릿 목록 페이지 설계 문서

> **작성일:** 2026-04-13
> **대상 화면:** `/templates`
> **참조 Figma:** `https://www.figma.com/design/liTdK7QHV5tufaQW8DwV6U/Untitled?node-id=1872-1779&m=dev`
> **관련 문서:** `docs/CONVENTION.md`, `docs/FRONTEND_DESIGN_DOCUMENT.md`, `docs/BACKEND_INTEGRATION_DESIGN.md`, `docs/WORKFLOW_LIST_PAGE_DESIGN.md`
> **목적:** Figma 시안 기준으로 템플릿 목록 페이지를 단일 컬럼 리스트형 UI로 재설계하고, 현재 템플릿 API/상세 페이지 흐름과의 정합성을 정리한다.

---

## 목차

1. [개요](#1-개요)
2. [현행 상태](#2-현행-상태)
3. [Figma 시안 분석](#3-figma-시안-분석)
4. [구현 범위](#4-구현-범위)
5. [UI 설계](#5-ui-설계)
6. [데이터 및 API 정합성](#6-데이터-및-api-정합성)
7. [동작 설계](#7-동작-설계)
8. [주요 구현 파일 제안](#8-주요-구현-파일-제안)
9. [구현 단계 및 커밋 계획](#9-구현-단계-및-커밋-계획)
10. [검증 기준](#10-검증-기준)
11. [후속 작업](#11-후속-작업)

---

## 1. 개요

템플릿 목록 페이지는 사용자가 자주 쓰는 자동화 흐름을 빠르게 탐색하고, 상세 화면으로 진입하는 카탈로그형 진입 화면이다.

이번 작업의 목표는 아래와 같다.

- Figma 시안 기준의 단일 컬럼 row 리스트 UI 적용
- 현재 카드형 그리드 목록을 앱 셸 내부의 템플릿 카탈로그 화면으로 재구성
- 기존 `TemplateDetailPage` 진입 흐름을 유지하면서 리스트 화면을 가볍게 정리
- 현재 API 응답으로 바로 표현 가능한 정보와, 추가 합의가 필요한 정보를 구분
- `docs/CONVENTION.md` 기준에 맞춰 page → section → row 구조로 설계

---

## 2. 현행 상태

### 2.1 현재 구현 상태

현재 `src/pages/templates/TemplatesPage.tsx`는 아래 구조를 가진다.

- `maxW="1200px"` 기준의 카드형 그리드 레이아웃
- 카테고리 필터 버튼 노출
- 템플릿별 `useCount`, `requiredServices`, `isSystem`, `createdAt` 표시
- 각 카드 하단의 `상세 보기` 버튼으로 `/templates/:id` 이동
- 데이터 조회는 `useTemplateListQuery(category?)` 기반

현재 상세 화면은 `src/pages/template-detail/TemplateDetailPage.tsx`에 이미 존재하며, 템플릿 인스턴스화(`POST /templates/:id/instantiate`)는 상세 페이지에서 수행한다.

### 2.2 시안과의 주요 차이

| 항목 | 현재 구현 | Figma 시안 |
|---|---|---|
| 레이아웃 | 1~3열 카드 그리드 | 단일 컬럼 리스트 |
| 상단 구조 | 영문 라벨 + 설명 + 카테고리 필터 | 간단한 제목/부제만 노출 |
| 항목 표현 | 큰 카드 + 여러 메타 정보 | 얇은 row + 핵심 정보만 |
| 액션 방식 | `상세 보기` 텍스트 버튼 | 우측 아이콘 버튼 |
| 메타 정보 | `useCount`, `requiredServices`, `isSystem`, `createdAt` | `n분 전 변경됨 \| 00/00 구축` |
| 폭 기준 | `1200px` | `1180px` |

즉 현재 페이지는 “탐색형 카드 갤러리”에 가깝고, 시안은 “빠른 스캔형 리스트”에 가깝다.

---

## 3. Figma 시안 분석

### 3.1 화면 구조

Figma 노드 `1872:1779`는 앱 셸 내부의 콘텐츠 영역에 배치되는 템플릿 목록 화면이다.

구조는 아래와 같다.

```text
템플릿 목록 페이지
└── 가운데 정렬된 콘텐츠 래퍼 (폭 1180px)
    ├── 제목/설명 영역
    └── 템플릿 row 리스트
        ├── 좌측: 서비스 아이콘
        ├── 중앙: 이름 / 설명 / 메타 정보
        └── 우측: 아이콘 버튼
```

### 3.2 주요 수치

| 항목 | 값 |
|---|---|
| 콘텐츠 최대 폭 | `1180px` |
| 콘텐츠 내부 패딩 | `48px` |
| 제목과 리스트 간 간격 | `24px` |
| 제목 폰트 | `20px`, `semibold` |
| 부제 폰트 | `14px`, `#5c5c5c` |
| 리스트 gap | `12px` |
| row 패딩 | `16px` |
| row radius | `10px` |
| row border | `1px solid #f2f2f2` |
| 좌측 아이콘 래퍼 | `38px x 38px` |
| 아이콘 실제 시각 크기 | 대체로 `24~30px` |
| 제목 텍스트 | `16px`, `semibold` |
| 설명/메타 텍스트 | `12px` |
| 우측 액션 터치 영역 | `38px x 38px` |

### 3.3 시안 의도 해석

시안은 템플릿 목록을 “비교”보다 “빠른 선택”에 맞춘 구조로 보이게 한다.

- 항목 높이를 얇게 유지해 스크롤 부담을 줄인다.
- 아이콘 1개와 이름 1줄만으로 템플릿 성격을 빠르게 파악하게 한다.
- 상세 액션은 row 전체 혹은 우측 아이콘으로 자연스럽게 연결한다.
- 카테고리/배지/버튼보다 템플릿 이름과 설명 읽기에 초점을 둔다.

---

## 4. 구현 범위

### 4.1 포함 범위

- `/templates` 페이지를 단일 컬럼 row 리스트로 재구성
- Figma 헤더 카피 반영
- 템플릿별 선행 아이콘, 이름, 설명, 메타 정보 표시
- row 클릭 및 우측 아이콘 클릭 시 상세 페이지로 이동
- 로딩/에러/빈 상태 정리
- 앱 셸 내부 폭과 패딩을 시안에 맞게 정렬
- 모바일/좁은 폭 대응 규칙 정의

### 4.2 제외 범위

- 템플릿 목록에서의 즉시 인스턴스화 버튼 추가
- 검색, 정렬 드롭다운, 카테고리 탭 재도입
- 컨텍스트 메뉴, 즐겨찾기, 북마크 기능
- 템플릿 상세 페이지 UI 재설계
- 템플릿 생성(`POST /templates`) 플로우 추가

---

## 5. UI 설계

### 5.1 페이지 레이아웃

템플릿 목록 페이지는 `AppShellLayout` 내부 메인 영역을 그대로 사용하고, 페이지 자체는 아래 기준으로 폭만 제한한다.

| 항목 | 설계 기준 |
|---|---|
| 페이지 래퍼 | `w="full"` |
| 최대 폭 | `maxW="1180px"` |
| 정렬 | `mx="auto"` |
| 세로 구성 | 제목 영역 + 리스트 영역 |

`AppShellLayout`이 이미 `px={{ base: 6, md: 10 }}`와 `py={{ base: 6, md: 8 }}`를 제공하므로, 템플릿 페이지는 추가로 과한 바깥 여백을 만들지 않는다.

### 5.2 상단 제목 영역

상단 영역은 시안 카피를 그대로 맞춘다.

| 항목 | 텍스트 |
|---|---|
| 제목 | `자동화 템플릿 목록` |
| 부제 | `가장 기본적인 사용에 관한 템플릿` |

스타일 기준:

- 제목: `fontSize="xl"`, `fontWeight="semibold"`, `color="text.primary"`
- 부제: `fontSize="sm"`, `color="text.secondary"`
- 두 텍스트 간 간격: `4px`

### 5.3 템플릿 row

각 템플릿 row는 아래 3개 영역으로 구성한다.

1. 선행 아이콘
2. 텍스트 정보 묶음
3. 우측 액션 버튼

row 기본 스타일:

| 항목 | 설계 기준 |
|---|---|
| 배경 | `bg="bg.surface"` |
| border | `1px solid`, `borderColor="border.default"` |
| radius | `borderRadius="10px"` |
| padding | `p={4}` |
| 정렬 | `align="center"`, `justify="space-between"` |
| hover | `borderColor`와 `boxShadow`만 약하게 강조, 과한 이동 애니메이션은 사용하지 않음 |
| active | 클릭 시 배경색은 유지하고 pressed feedback만 최소화 |
| focus | `_focusVisible`로 2px outline 제공 |

`10px` radius는 현재 토큰과 정확히 맞지 않으므로, `docs/CONVENTION.md` 기준에 따라 시안 정합이 중요한 예외 값으로 허용한다.

### 5.4 선행 아이콘

시안의 선행 아이콘은 템플릿을 대표하는 서비스 1개만 보여준다.

아이콘 결정 우선순위는 아래와 같이 둔다.

1. `template.icon`이 시각 자산 URL이면 그대로 사용
2. `template.icon`이 서비스 키 문자열이면 해당 키로 렌더링
3. `requiredServices[0]` 기반으로 대표 서비스 아이콘 결정
4. 모두 없으면 generic 템플릿 아이콘 사용

구현 원칙:

- 기존 워크플로우 목록의 `ServiceBadge`에서 쓰는 브랜드 아이콘 어휘를 참고한다.
- 다만 템플릿 목록은 양 끝 서비스가 아니라 “대표 서비스 하나”만 필요하므로, 별도 `TemplateServiceIcon` 컴포넌트로 분리한다.
- 아이콘 터치 영역은 `38px`, 실제 아이콘은 `24~30px` 내에서 렌더링한다.

### 5.5 텍스트 영역

텍스트 영역은 아래 순서를 따른다.

1. 템플릿 이름
2. 템플릿 설명
3. 메타 정보 행

스타일 기준:

| 항목 | 설계 기준 |
|---|---|
| 이름 | `fontSize="md"`, `fontWeight="semibold"` |
| 설명 | `fontSize="xs"`, `color="text.primary"` |
| 메타 | `fontSize="xs"`, `color="text.secondary"` |
| 메타 divider | `w="1px"`, `h="10px"` |

텍스트 overflow 규칙:

- 이름은 항상 1줄 고정
- 설명은 데스크톱에서 1줄, 좁은 폭에서는 최대 2줄 허용
- 메타 행은 데스크톱에서 1줄 유지, 모바일에서만 필요 시 줄바꿈 허용

이 규칙으로 row 높이 차이를 최소화해 Figma의 얇은 리스트 리듬을 유지한다.

### 5.6 우측 액션

시안 우측에는 작은 아이콘 버튼이 있다. 이 버튼은 1차 구현에서 “템플릿 상세 진입” 용도로 사용한다.

설계 기준:

- row 전체 클릭 시 상세 페이지 이동
- 우측 아이콘 버튼 클릭 시에도 동일하게 상세 페이지 이동
- 아이콘 버튼은 접근성용 `aria-label="템플릿 상세 보기"` 제공
- 우측 아이콘 버튼은 row 클릭 이벤트와 분리해 `event.stopPropagation()` 처리
- 현재 정보 구조상 인스턴스화는 상세 페이지에서 유지

즉 리스트 화면은 “탐색”, 상세 화면은 “설명 + 시작” 역할로 분리한다.

### 5.7 상태 화면

Figma는 정상 상태만 제공하므로, 비정상 상태는 기존 프로젝트 패턴에 맞춰 보완한다.

| 상태 | 설계 기준 |
|---|---|
| loading | 중앙 정렬 spinner + 안내 문구 |
| error | 실패 문구 + `다시 시도` 버튼 |
| empty | 제목/설명 톤을 해치지 않는 단순 empty card |

### 5.8 반응형 기준

모바일 전용 시안은 없으므로 아래 원칙으로 축소한다.

- 전체 구조는 계속 1열 리스트 유지
- row 좌측 아이콘과 텍스트 사이 간격은 `24px → 16px`까지 축소 가능
- 설명은 `lineClamp={2}` 허용
- 메타 행은 필요 시 줄바꿈 허용
- 우측 액션 버튼의 최소 터치 영역 `38px` 유지

---

## 6. 데이터 및 API 정합성

### 6.1 현재 목록 응답 타입

현재 `src/shared/api/template.api.ts`의 `TemplateSummary`는 아래 필드를 가진다.

```ts
interface TemplateSummary {
  id: string;
  name: string;
  description: string;
  category: string | null;
  icon?: string | null;
  requiredServices: string[];
  isSystem: boolean;
  authorId?: string | null;
  useCount: number;
  createdAt: string;
}
```

### 6.2 시안 매핑 표

| 시안 요소 | 우선 데이터 소스 | 비고 |
|---|---|---|
| 템플릿 이름 | `name` | 그대로 사용 |
| 템플릿 설명 | `description` | 비어 있으면 기본 문구 사용 |
| 대표 아이콘 | `icon` 또는 `requiredServices[0]` | 의미 규약 명확화 필요 |
| 좌측 메타 | `updatedAt` 필요 | 현재 응답에는 없음 |
| 우측 메타 | `buildProgress` 성격의 값 필요 | 현재 응답에는 없음 |
| 상세 이동 | `id` | `/templates/:id` |

### 6.3 현재 응답만으로 가능한 1차 대응

현재 API만으로도 리스트 화면 자체는 구현 가능하다. 다만 Figma의 메타 정보는 그대로 맞출 수 없다.

1차 구현 권장 fallback:

- 좌측 메타: `createdAt` 기반 `생성 n분 전` 표기
- 우측 메타: `사용 {useCount}회` 또는 `필요 서비스 {requiredServices.length}개`

주의:

- `createdAt`만 있는 상태에서 `변경됨` 문구를 사용하면 의미가 왜곡되므로 금지한다.
- 실제 구축 진행 정보가 없는데 `00/00 구축` 같은 placeholder 문구를 고정 출력하는 것도 금지한다.

이 fallback은 메타 행의 구조는 유지하지만, 시안 문구와 완전히 같지는 않다.

### 6.4 추가 합의가 필요한 항목

Figma 정합도를 높이려면 아래 항목이 추가로 필요하다.

| 항목 | 필요 이유 |
|---|---|
| `updatedAt` | `n분 전 변경됨` 표현용 |
| `buildProgress` 또는 대응 가능한 요약 필드 | `00/00 구축` 표현용 |
| `icon` 필드 의미 규약 | URL인지 서비스 키인지 명확히 해야 아이콘 분기 가능 |

권장 방향:

- `icon`은 “대표 서비스 키” 또는 “직접 렌더 가능한 asset URL” 중 하나로 계약을 고정
- 가능하면 장기적으로는 `iconAssetUrl`과 `representativeService`를 분리해 혼합 의미를 제거
- `updatedAt`이 추가되면 템플릿 목록도 워크플로우 목록과 비슷한 상대 시간 표현 가능
- 구축 진행 정보가 없다면, 메타 우측 값은 기획적으로 다른 값으로 대체하는 별도 합의가 필요
- 백엔드가 이미 `updatedAt`을 반환하고 프론트 타입만 누락된 상태라면, 우선 `TemplateSummary`와 query 계층부터 확장한다.

### 6.5 상세 진입 흐름 유지

현재 상세 페이지는 이미 아래 흐름을 가진다.

- `GET /templates/:id`
- `POST /templates/:id/instantiate`

이번 리스트 설계에서는 이 흐름을 깨지 않는다.

- 리스트: 상세 탐색 진입
- 상세: 템플릿 설명 확인 + 인스턴스화 실행

---

## 7. 동작 설계

### 7.1 페이지 진입

페이지 마운트 시 `useTemplateListQuery()`를 호출해 템플릿 목록을 조회한다.

현재 시안에는 카테고리 필터가 없으므로, 1차 구현에서는 필터 UI를 노출하지 않는다.

정렬/큐레이션 기준:

- 1차 구현에서는 서버 응답 순서를 그대로 사용한다.
- `updatedAt`이나 별도 `sortOrder` 계약이 생기기 전까지 프론트에서 임의 정렬하지 않는다.
- 템플릿 목록은 워크플로우 목록과 달리 “큐레이션된 카탈로그” 성격이 있으므로, 불필요한 프론트 정렬은 지양한다.

### 7.2 row 상호작용

동작 순서는 아래와 같다.

```text
사용자 row 클릭
  → 템플릿 id 확인
  → navigate(buildPath.templateDetail(id))
```

우측 액션 버튼도 같은 동작을 수행한다.

중복 이벤트 방지 규칙:

- row 자체가 클릭 가능한 컨테이너가 된다.
- 우측 액션 버튼은 동일한 라우트로 이동하되 row 클릭 전파는 막는다.
- 구현 시 row와 trailing action이 각각 navigate를 호출하더라도 한 번만 이동이 발생해야 한다.

### 7.3 접근성

- row는 키보드로 포커스 가능해야 한다.
- `Enter`, `Space` 입력 시 상세 페이지로 이동한다.
- 아이콘 버튼은 별도 `aria-label`을 가진다.

### 7.4 필터 UI 처리

현재 코드의 카테고리 필터 로직은 1차 구현에서 UI에서 제거한다.

이유는 아래와 같다.

- Figma 시안에 필터 탭이 존재하지 않는다.
- 현재 템플릿 페이지의 핵심 목적은 “빠른 스캔형 목록”이다.
- 필터를 유지하면 헤더 위계가 시안보다 복잡해진다.

정리 기준:

- `TemplatesPage.tsx`의 `selectedCategory` 상태와 categories 계산 로직은 제거한다.
- `useTemplateListQuery(category?)`의 시그니처와 query key 구조는 유지해도 무방하다.
- 추후 기획에서 필터가 다시 필요해질 때만 UI를 복구한다.

---

## 8. 주요 구현 파일 제안

컨벤션상 page는 래퍼 역할만 맡기고, 실제 조회/상태/UI 연결은 section으로 분리하는 구조를 권장한다.

| 파일 | 역할 |
|---|---|
| `src/pages/templates/TemplatesPage.tsx` | `maxW="1180px"` 래퍼 + section 조합 |
| `src/pages/templates/model/useTemplatesPage.ts` | query를 직접 호출하지 않고 navigation, 메타 fallback, 아이콘 결정 로직만 담당 |
| `src/pages/templates/ui/section/TemplateListSection.tsx` | query 호출, loading/error/empty 처리 |
| `src/pages/templates/ui/TemplateRow.tsx` | Figma row UI 구현 |
| `src/pages/templates/ui/TemplateServiceIcon.tsx` | 대표 서비스 아이콘 렌더링 |
| `src/shared/model/useTemplateQueries.ts` | 기존 목록 query 재사용 |
| `src/shared/api/template.api.ts` | `TemplateSummary` 확장 시 타입 반영 |
| `docs/TEMPLATE_LIST_PAGE_DESIGN.md` | 본 문서 |

권장 컴포넌트 트리는 아래와 같다.

```text
TemplatesPage
└── TemplateListSection
    ├── heading copy
    ├── loading / error / empty state
    └── TemplateRow × N
        ├── TemplateServiceIcon
        ├── template text block
        └── trailing action button
```

---

## 9. 구현 단계 및 커밋 계획

구현 단계는 “구조 정리 → row UI → 아이콘 → 메타/문구 → 인터랙션 마감” 순서로 나누는 것을 권장한다.

이 순서가 좋은 이유는 아래와 같다.

- 초반 커밋에서 페이지 구조와 책임 분리를 먼저 고정할 수 있다.
- 시각 변화가 큰 row UI를 별도 커밋으로 분리해 리뷰하기 쉽다.
- 아이콘/메타처럼 API 계약에 민감한 부분을 뒤로 미뤄 재작업 비용을 줄일 수 있다.
- 마지막 커밋에서 접근성과 상호작용만 모아 안정적으로 다듬을 수 있다.

### 9.1 권장 단계

| 단계 | 구현 범위 | 완료 기준 | 권장 커밋 메시지 |
|---|---|---|---|
| 1 | 페이지 구조 재편 | `TemplatesPage`가 래퍼만 맡고 section/model/ui 구조로 책임이 분리되며, 사용자에게 보이는 UI는 거의 유지됨 | `refactor: 템플릿 목록 페이지를 리스트 섹션 구조로 재구성` |
| 2 | row 리스트 UI 도입 | 카드 그리드가 단일 컬럼 row 리스트로 바뀌고 헤더 카피가 Figma 기준으로 정렬되며 필터 UI가 제거됨 | `feat: 템플릿 목록을 Figma row 리스트 흐름으로 정렬` |
| 3 | 대표 서비스 아이콘 반영 | `TemplateServiceIcon`과 아이콘 결정 규칙이 들어가고 row 선행 아이콘이 정리됨 | `feat: 템플릿 대표 서비스 아이콘 규칙을 반영` |
| 4 | 메타 fallback 정리 | `createdAt`, `useCount`, `requiredServices` 기반 메타 표현이 설계 문서 기준으로 고정됨 | `refactor: 템플릿 목록 메타 표현을 현재 API 기준으로 정리` |
| 5 | 인터랙션/접근성 마감 | row 클릭, trailing action, 키보드 접근, hover/focus/active 상태가 정리되고 검증 명령까지 통과함 | `refactor: 템플릿 목록 인터랙션과 접근성을 다듬음` |

### 9.2 단계별 상세 가이드

#### 1단계

- `TemplatesPage.tsx`를 래퍼 역할만 맡도록 축소한다.
- `TemplateListSection`을 만들어 loading/error/empty/list 책임을 모은다.
- `useTemplatesPage.ts` 같은 페이지 전용 model 훅으로 navigation/로컬 상태를 분리한다.
- 이 단계에서는 Figma row 디테일보다는 구조 정리에만 집중하고, 사용자에게 보이는 UI 변화는 최소화한다.

#### 2단계

- `TemplateRow`를 도입해 단일 컬럼 리스트로 렌더링한다.
- 헤더 카피를 `자동화 템플릿 목록` / `가장 기본적인 사용에 관한 템플릿`으로 교체한다.
- 카테고리 필터 UI를 제거한다.
- row spacing, border, radius, trailing action 배치를 시안 기준으로 맞춘다.

#### 3단계

- `template.icon`과 `requiredServices[0]` 우선순위를 구현한다.
- 워크플로우 목록의 브랜드 아이콘 어휘를 참고해 템플릿 전용 아이콘 컴포넌트를 만든다.
- 이 단계까지 끝나면 시안 인상이 거의 맞아야 한다.

#### 4단계

- `createdAt` 기반 `생성 n분 전` 문구를 정리한다.
- `변경됨`, `00/00 구축` 같은 오해 소지가 있는 placeholder 문구는 넣지 않는다.
- 메타가 한 줄에서 무너지지 않도록 overflow 규칙도 같이 맞춘다.

#### 5단계

- row 전체 클릭과 우측 액션 버튼 클릭의 이벤트 중복을 제거한다.
- `Enter`, `Space`, `_focusVisible` 동작을 정리한다.
- `pnpm run tsc`, `pnpm run lint`, `pnpm test`까지 확인한다.

### 9.3 커밋 운영 원칙

- 설계 문서와 코드가 같이 움직인다면, 각 단계 커밋에 문서 수정도 함께 포함하는 것을 권장한다.
- 문서만 따로 분리한 커밋은 가능한 한 만들지 않는다.
- 한 커밋 안에 “구조 변경 + 아이콘 시스템 + 메타 정책 변경”을 한꺼번에 넣지 않는다.
- 1단계와 2단계는 분리하는 것이 좋고, 4단계와 5단계는 작업량이 작다면 합쳐도 된다.

### 9.4 API 확장 시 추가 커밋

만약 구현 도중 백엔드가 `updatedAt`이나 구축 진행 필드를 추가한다면, 아래 커밋을 별도로 두는 것이 좋다.

- `feat: 템플릿 목록 메타를 최신 API 스펙으로 확장`

이 커밋에서는 아래만 다룬다.

- `TemplateSummary` 타입 확장
- query 계층 응답 매핑 수정
- `생성 n분 전` fallback을 `변경 n분 전`으로 교체
- 구축 진행 메타가 실제 값으로 들어오면 row 메타 문구 교체

---

## 10. 검증 기준

### 10.1 시각 검증

| 항목 | 기대 결과 |
|---|---|
| 페이지 폭 | `1180px` 기준으로 중앙 정렬 |
| 제목 영역 | `자동화 템플릿 목록` / `가장 기본적인 사용에 관한 템플릿` 카피 일치 |
| 리스트 형태 | 단일 컬럼 row 나열 |
| row 스타일 | `16px` padding, `10px` radius, 옅은 border |
| 아이콘 영역 | `38px` 터치 영역 유지 |
| 텍스트 위계 | 이름 > 설명 > 메타 순으로 읽힘 |
| 우측 액션 | 별도 아이콘 버튼으로 정렬됨 |

### 10.2 기능 검증

| 항목 | 기대 결과 |
|---|---|
| 목록 조회 | 페이지 진입 시 템플릿 목록 렌더링 |
| row 클릭 | `/templates/:id` 상세 페이지 이동 |
| 우측 액션 버튼 클릭 | row 클릭과 동일한 경로로 1회만 이동 |
| 키보드 접근 | `Enter`, `Space`로 상세 이동 가능 |
| 로딩/에러 | 안내 문구와 재시도 동작 정상 |
| 빈 상태 | 템플릿이 없을 때 empty state 표시 |
| 메타 문구 | `updatedAt`가 없으면 `변경됨` 문구를 사용하지 않음 |

### 10.3 구현 후 확인 명령

- `pnpm run tsc`
- `pnpm run lint`
- `pnpm test`

---

## 11. 후속 작업

### 11.1 API 보강

- 템플릿 목록 응답에 `updatedAt` 추가
- 메타 우측 값에 대응하는 요약 필드 추가 여부 합의
- `icon` 필드의 의미를 URL/서비스 키 중 하나로 고정

### 11.2 상세 화면 연결 고도화

- 상세 페이지의 상단 정보 톤을 목록 화면과 시각적으로 연결
- 목록에서 보고 들어간 템플릿의 대표 서비스/설명 문맥을 상세에서 이어받기

### 11.3 공용 아이콘 컴포넌트 정리

- 템플릿 목록과 워크플로우 목록이 같은 브랜드 아이콘 어휘를 사용하므로, 후속으로 공용 서비스 아이콘 컴포넌트 추출을 검토할 수 있다.

---

## 결론

이번 템플릿 목록 페이지는 기존 카드형 갤러리보다 더 가볍고 빠르게 읽히는 리스트형 카탈로그로 정리하는 것이 핵심이다.

구현 시 우선순위는 아래와 같다.

1. Figma 기준의 row 레이아웃 정렬
2. 기존 상세 페이지 진입 흐름 유지
3. API로 바로 표현 가능한 메타 정보와 추가 합의가 필요한 메타 정보를 분리

이 문서는 `/templates` 페이지를 실제 구현할 때의 기준 문서로 사용한다.
