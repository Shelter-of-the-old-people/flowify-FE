# 파일 업로드 자동 공유 템플릿 구체화 및 FE 표시 설계 문서

> **작성일:** 2026-05-04  
> **이슈:** #128  
> **브랜치:** `feat#128-file-upload-auto-share-templates`  
> **대상 화면:** `/templates`, `/templates/:id`  
> **관련 문서:** `docs/CONVENTION.md`, `docs/TEMPLATE_LIST_PAGE_DESIGN.md`, `docs/FRONTEND_DESIGN_DOCUMENT.md`, `docs/backend/BACKEND_INTEGRATION_DESIGN.md`

---

## 1. 개요

이번 작업에서는 `파일 업로드 자동 공유` 카테고리를 시스템 템플릿 후보군으로 정리하고, 템플릿 목록/상세 화면에서 해당 템플릿이 실제 런타임보다 과장되지 않게 보이도록 FE 표시 기준을 정리한다.

문서의 목적은 다음과 같다.

- `파일 업로드 자동 공유` 카테고리 정의
- 대표 템플릿 3종의 이름, 설명, requiredServices 기준 정리
- 템플릿 목록/상세 화면에서 보여줄 카피와 메타 정보 기준 정리
- 현재 런타임 기준에서 사용자에게 어떤 기대치를 보여줘야 하는지 기록
- 이후 Drive 기반 다른 템플릿군과 구분되는 FE 표시 원칙 정리

---

## 2. 카테고리 정의

### 2.1 카테고리 키

```text
file_upload_auto_share
```

### 2.2 사용자 표시명

```text
파일 업로드 자동 공유
```

### 2.3 카테고리 설명

Google Drive 폴더의 새 파일을 확인해 내용을 요약하거나 핵심 정보를 정리한 뒤, Slack, Gmail, Notion 같은 다른 서비스로 공유하거나 기록하는 템플릿 묶음이다.

---

## 3. 대표 템플릿

### 3.1 1차 대표 템플릿

1. 업로드 문서 요약 후 Slack 공유
2. 새 파일 업로드 알림 메일 발송
3. 새 파일 업로드 후 Notion 기록

### 3.2 각 템플릿 정의

#### 1. 업로드 문서 요약 후 Slack 공유

- 설명: 지정한 Google Drive 폴더의 새 파일을 확인해 핵심 내용을 요약하고 Slack 채널에 공유한다.
- requiredServices: `google_drive`, `slack`
- 기본 흐름: `Google Drive -> LLM -> Slack`
- 1차 기대 결과: 파일 요약 메시지 1건을 Slack 채널에 전송
- 1차 채널 범위: 공개 채널 기준

#### 2. 새 파일 업로드 알림 메일 발송

- 설명: 지정한 Google Drive 폴더의 새 파일 정보를 정리해 이메일 알림을 발송한다.
- requiredServices: `google_drive`, `gmail`
- 기본 흐름: `Google Drive -> LLM -> Gmail`
- 1차 기대 결과: 파일명, 핵심 요약, 원문 링크를 담은 알림 메일 1건 발송
- 1차 발송 기준: `send` 액션 기준

#### 3. 새 파일 업로드 후 Notion 기록

- 설명: 지정한 Google Drive 폴더의 새 파일 정보를 정리해 Notion 페이지에 기록한다.
- requiredServices: `google_drive`, `notion`
- 기본 흐름: `Google Drive -> LLM -> Notion`
- 1차 기대 결과: 지정한 부모 페이지 아래에 파일 요약 페이지 1건 생성
- 1차 선택 범위: 공유된 부모 페이지 / 접근 가능한 페이지 기준

---

## 4. 현재 런타임 기준 FE 표시 원칙

### 4.1 사용자 기대와 실제 런타임을 맞춰야 하는 이유

이 카테고리는 이름만 보면 `새 파일 업로드를 실시간으로 정확히 감지해 즉시 공유`할 것처럼 보일 수 있지만, 현재 Drive runtime은 source mode와 canonical payload 기준으로 동작한다. 특히 `folder_new_file`는 현재 구조상 `선택한 폴더의 최신 파일 1건을 기준으로 동작하는 poll형 처리`에 가까울 수 있으므로, FE는 이를 과장 없이 보여줘야 한다.

### 4.2 FE 문구 기준

목록/상세 화면에서는 아래 방향으로 카피를 맞춘다.

- `파일이 올라오면 즉시 완벽하게 전송` 같은 과장 표현은 피한다.
- `선택한 폴더의 새 파일을 확인해 요약하고 공유/기록`처럼 결과 중심으로 설명한다.
- 결과가 Slack 메시지 1건인지, 이메일 1건인지, Notion 기록 1건인지 드러나도록 표현한다.
- Gmail 템플릿은 1차 기준으로 `알림 메일 발송` 흐름임을 드러낸다.
- Slack picker가 들어오면 1차는 `공개 채널` 기준이라는 점을 함께 안내한다.
- Notion picker가 들어오면 `공유된 페이지 / 접근 가능한 페이지만 선택 가능`이라는 점을 안내한다.

예시:

- 업로드 문서 요약 후 Slack 공유  
  `지정한 Google Drive 폴더의 새 파일을 확인해 핵심 내용을 요약하고 Slack 채널에 공유합니다.`
- 새 파일 업로드 알림 메일 발송  
  `지정한 Google Drive 폴더의 새 파일 정보를 정리해 이메일 알림을 발송합니다.`
- 새 파일 업로드 후 Notion 기록  
  `지정한 Google Drive 폴더의 새 파일 정보를 정리해 Notion 페이지에 기록합니다.`

### 4.3 상세 화면 안내 포인트

상세 화면에서는 다음 성격을 사용자에게 명확히 보여줄 필요가 있다.

- source는 `Google Drive 폴더/파일` 축이다.
- 결과는 `공유` 또는 `기록`이다.
- 필요한 서비스는 Google Drive 외에 Slack, Gmail, Notion 등 sink 서비스에 따라 달라진다.
- 1차 구현 기준 source mode는 `folder_new_file`로 가정한다.
- 현재는 `새 파일 감지`가 엄밀한 event trigger보다는 최신 파일 1건 기준 처리에 가까울 수 있음을 안내한다.
- 파일 유형에 따라 문서 본문 대신 신규 파일 1건 또는 파일 메타데이터 중심으로 동작할 수 있음을 안내한다.
- `new_file`과 `folder_new_file` 중에서는 폴더 지정 UX와 정합성이 높은 `folder_new_file`를 1차 기준으로 본다.
- Slack 템플릿은 1차 기준으로 공개 채널 공유 흐름으로 설명한다.
- Gmail 템플릿은 1차 기준으로 알림 메일 발송(`send`) 흐름으로 설명한다.
- Notion 템플릿은 1차 기준으로 `부모 페이지 아래 새 페이지 생성` 흐름으로 설명한다.
- Notion 대상은 현재 integration token이 접근 가능한 페이지 범위 안에서 선택된다고 안내한다.

---

## 5. FE 표시 규칙

### 5.1 카테고리 배지

템플릿 목록과 상세 상단에서 `파일 업로드 자동 공유` 카테고리 배지를 노출한다.

### 5.2 서비스 표시

requiredServices는 raw key 대신 사람이 읽기 쉬운 이름으로 보여준다.

- `google_drive` -> `Google Drive`
- `slack` -> `Slack`
- `gmail` -> `Gmail`
- `notion` -> `Notion`

### 5.3 런타임 안내 문구

템플릿 상세에서는 현재 runtime 특성을 아래 수준으로 안내한다.

- `현재 Drive 기반 업로드 템플릿은 1차 구현 기준으로 folder_new_file 모드를 중심으로 동작합니다.`
- `현재는 선택한 폴더의 최신 파일 1건을 기준으로 공유/기록하는 흐름에 가깝습니다.`
- `파일 유형에 따라 문서 본문 대신 신규 파일 1건 또는 파일 메타데이터를 중심으로 동작할 수 있습니다.`
- `Slack 공유 템플릿은 1차 기준으로 공개 채널을 대상으로 합니다.`
- `Gmail 알림 템플릿은 1차 기준으로 send 액션을 사용하는 발송 흐름입니다.`
- `Notion 기록 템플릿은 1차 기준으로 부모 페이지 아래에 새 페이지를 생성하며, 공유된 페이지 / 접근 가능한 페이지만 선택할 수 있습니다.`

### 5.4 빈 상태 / 안내 문구

해당 카테고리 템플릿이 없을 때는 `새로 업로드된 파일을 요약해 공유하거나 기록하는 템플릿이 여기에 표시됩니다.` 수준의 안내가 적절하다.

---

## 6. FE 반영 메모

현재 FE에서는 아래 범위를 먼저 반영한다.

- `file_upload_auto_share` 카테고리 라벨 추가
- 대표 템플릿 3종 description override 추가
- 템플릿 상세의 runtime note 추가
- 이후 Slack channel picker / Notion page picker가 들어와도 갈아끼우기 쉬운 설명 구조 유지

실제 시스템 템플릿 시드와 runtime semantics는 백엔드 반영 후 다시 최종 검증한다.

---

## 7. 백엔드 연계 포인트

### 7.1 FE만으로 가능한 범위

현재 FE에서 먼저 정리 가능한 범위는 다음과 같다.

- 카테고리 이름/설명 정리
- 목록/상세 화면 카피 정리
- requiredServices 표시 보정
- 템플릿 대표군 분류 기준 정리

### 7.2 백엔드와 함께 맞춰야 하는 범위

아래 항목은 백엔드 응답 품질과 함께 봐야 한다.

- 템플릿 시드 데이터(category, requiredServices, nodes, edges)
- `folder_new_file`의 실제 런타임 semantics와 중복 실행 방지 방식
- `new_file` / `folder_new_file` 중 1차 공개 기준
- Slack / Gmail / Notion sink 기본 config와 `isConfigured` 상태
- Gmail 템플릿이 원본 파일 전달이 아니라 알림/요약 메일 1건을 기본으로 하는지 여부
- Gmail scope가 `send` 기준으로 맞춰졌는지 여부
- Notion 템플릿이 `page` 기준 parent-child 기록인지 여부
- Slack channel picker / Notion page picker 목록 API 반영 여부
- Slack picker가 공개 채널 기준인지 여부
- Notion picker가 공유된 페이지 / 접근 가능한 페이지 기준인지 여부

---

## 8. 후속 작업

1. 대표 템플릿 3종의 목록/상세 카피를 실제 시드 데이터와 최종 맞춤
2. 필요 시 `폴더 문서 자동 요약` 카테고리와의 차이를 FE 문구로 분리
3. 백엔드 시드 데이터 반영 후 목록/상세/가져오기 흐름 재검증
4. Slack / Notion picker가 들어오면 입력 안내 문구를 목록 선택 UX 기준으로 재정리

---

## 9. 검증 기준

- 템플릿 목록에서 카테고리와 requiredServices가 사람이 읽기 쉬운 형태로 보일 것
- 템플릿 상세에서 설명이 실제 runtime 기대와 크게 어긋나지 않을 것
- `폴더 문서 자동 요약`과 혼동되지 않도록 이름/설명이 분리될 것
- 업로드 감지의 현재 한계를 상세/runtime note에서 명확히 알 수 있을 것
- 공개 채널 / 알림 메일 발송 / 공유된 Notion 페이지 기준이 안내 문구에 드러날 것
