# 메일 요약 후 전달 템플릿 구체화 및 FE 표시 보정 문서

> **작성일:** 2026-05-03  
> **이슈:** #121  
> **브랜치:** `feat#121-mail-summary-template-seed`  
> **대상 화면:** `/templates`, `/templates/:id`  
> **관련 문서:** `docs/CONVENTION.md`, `docs/TEMPLATE_LIST_PAGE_DESIGN.md`, `docs/FRONTEND_DESIGN_DOCUMENT.md`, `docs/backend/BACKEND_INTEGRATION_DESIGN.md`

---

## 1. 개요

이번 작업에서는 `메일 요약 후 전달` 카테고리를 1차 시스템 템플릿군으로 정리하고, 템플릿 목록/상세 화면에서 해당 템플릿이 실제 동작과 어긋나지 않게 보이도록 FE 표시를 보정한다.

이번 문서의 목적은 다음과 같다.

- `메일 요약 후 전달` 카테고리 정의 정리
- 대표 템플릿 3종의 FE 표시 기준 정리
- 목록/상세 화면에서 사용할 설명, 메타 문구, 서비스 표기 규칙 정리
- 현재 백엔드 런타임과 템플릿 설명 사이 차이를 FE에서 어떻게 완화했는지 기록

---

## 2. 카테고리 정의

### 2.1 카테고리 키

```text
mail_summary_forward
```

### 2.2 사용자 표시명

```text
메일 요약 후 전달
```

### 2.3 카테고리 설명

Gmail 메일 목록을 정리해 Slack, Notion, Gmail 같은 다른 서비스로 전달하는 자동화 템플릿 묶음이다.

---

## 3. 대표 템플릿

### 3.1 1차 대상 템플릿

1. 읽지 않은 메일 요약 후 Slack 공유
2. 중요 메일 요약 후 Notion 저장
3. 중요 메일 할 일 추출 후 Notion 저장

### 3.2 FE 표시용 설명 보정

현재 백엔드 템플릿 설명은 `메일을 하나씩 요약`하는 표현이 들어가 있지만, 실제 런타임은 읽어온 메일 목록을 한 번에 정리해 전달하는 흐름에 더 가깝다.  
그래서 FE에서는 아래 문구로 표시를 보정한다.

- 읽지 않은 메일 요약 후 Slack 공유  
  `읽지 않은 메일 목록을 정해진 형식으로 요약해 Slack 채널에 공유합니다.`
- 중요 메일 요약 후 Notion 저장  
  `중요 메일 목록을 정해진 형식으로 요약해 Notion 페이지에 저장합니다.`
- 중요 메일 할 일 추출 후 Notion 저장  
  `중요 메일 목록에서 할 일을 추출해 Notion 페이지에 정리합니다.`

---

## 4. 현재 런타임 기준 안내

### 4.1 FE에서 안내해야 하는 이유

현재 메일 템플릿은 이름만 보면 `메일을 하나씩 처리`할 것처럼 읽히지만, 실제 실행은 읽어온 메일 목록을 한 번에 요약해 전달하는 흐름이다.

이 차이를 그대로 두면:

- 템플릿 상세 설명과 실제 결과가 다르게 느껴지고
- 사용자 입장에서 실행 결과를 오류처럼 오해할 수 있다

### 4.2 FE 보정 방식

템플릿 상세 화면에 아래 안내 문구를 노출한다.

`현재 메일 템플릿은 메일을 하나씩 개별 전송하기보다, 읽어온 메일 목록을 정리해 한 번에 요약한 뒤 전달하는 흐름을 기준으로 동작합니다.`

이 문구는 `mail_summary_forward` 카테고리 템플릿에만 노출한다.

---

## 5. FE 구현 범위

### 5.1 공통 helper

다음 helper를 추가/보정한다.

- 카테고리 키 -> 표시명 매핑
- 서비스 키 -> 표시명 매핑
- 메일 템플릿 3종 설명 override
- `mail_summary_forward` 카테고리용 런타임 안내 문구

### 5.2 템플릿 목록

- 카테고리 배지를 표시한다.
- 메타 문구를 `카테고리 · 필요 서비스 n개` 형식으로 정리한다.
- 템플릿 설명은 raw description 대신 FE 보정 문구를 우선 사용한다.

### 5.3 템플릿 상세

- 카테고리 배지를 표시한다.
- 설명은 FE 보정 문구를 우선 사용한다.
- `mail_summary_forward` 카테고리에는 현재 런타임 기준 안내 박스를 추가한다.
- 필요한 서비스는 raw key 대신 읽기 쉬운 표시명으로 보여준다.

### 5.4 문구/인코딩 정리

이번 범위에서 템플릿 목록/상세 관련 깨진 한글 문구도 함께 복구한다.

### 5.5 sink picker UX 연결

메일 템플릿 3종의 sink 설정 UX는 Google Drive 폴더 picker와 같은 공용 `RemoteOptionPicker` 흐름으로 연결한다.

- Slack `channel_picker`
  - 공개 채널 목록을 검색하고 선택
  - 선택된 채널 이름을 우선 노출하고 ID는 내부 값으로 유지
- Notion `page_picker`
  - 현재 통합이 접근 가능한 페이지 목록을 검색하고 선택
  - 선택된 페이지 제목을 우선 노출하고 ID는 내부 값으로 유지

1차 구현에서는 경로 탐색형 브라우저를 만들지 않고, 검색 + 목록 선택 UX로 정리한다.

생성 지원 범위는 아래처럼 구분한다.

- Slack
  - 1차: 기존 채널 선택만 지원
  - 2차: 새 채널 생성 검토
- Notion
  - 1차: 기존 부모 페이지 선택만 지원
  - 2차: 새 부모 페이지 생성 검토
  - 비고: 결과 페이지를 선택한 부모 페이지 아래에 새로 만드는 실행 동작과, 설정 패널에서 부모 페이지 자체를 새로 만드는 UX는 구분한다.

---

## 6. 반영 파일

### 6.1 FE 코드

- `src/entities/template/model/template-presentation.ts`
- `src/pages/templates/model/template-list.ts`
- `src/pages/templates/ui/TemplateRow.tsx`
- `src/pages/templates/ui/TemplateListEmptyState.tsx`
- `src/pages/templates/ui/section/TemplateListSection.tsx`
- `src/pages/template-detail/model/template-detail.ts`
- `src/pages/template-detail/ui/TemplateInfoPanel.tsx`
- `src/pages/template-detail/ui/TemplateRequiredServices.tsx`

### 6.2 문서

- `docs/MAIL_SUMMARY_TEMPLATE_SEED_DESIGN.md`

---

## 7. 검증 기준

- 템플릿 목록에서 카테고리 배지가 정상 표시되는지 확인
- 템플릿 목록 설명이 FE 보정 문구로 보이는지 확인
- 템플릿 상세에서 `현재 동작 기준` 안내가 메일 템플릿에만 보이는지 확인
- 필요한 서비스가 `gmail`, `slack`, `notion` 같은 표시명으로 노출되는지 확인
- Slack 채널과 Notion 페이지가 ID 직접 입력이 아니라 목록 선택 UI로 보이는지 확인
- 템플릿 목록/상세 관련 깨진 한글이 남아 있지 않은지 확인

---

## 8. 후속 작업

### 8.1 Spring 시드 설명 정리

FE에서 임시로 설명을 보정했지만, 장기적으로는 Spring 시드 데이터 자체도 실제 런타임 기준에 맞게 정리하는 것이 좋다.

### 8.2 FastAPI 런타임 개선

장기적으로는 아래 둘 중 하나로 정리해야 한다.

- 템플릿 설명을 `메일 목록 요약형`으로 확정
- 또는 실제 런타임을 `메일별 처리 -> 묶음 전달` 구조로 개선

### 8.3 템플릿 추가 확장

같은 방식으로 다음 카테고리도 확장할 수 있다.

- 폴더 문서 자동 요약
- 파일 업로드 자동 공유
- 오늘 일정 자동 정리
