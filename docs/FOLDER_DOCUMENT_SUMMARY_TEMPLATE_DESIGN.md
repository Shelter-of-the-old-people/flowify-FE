# 폴더 문서 자동 요약 템플릿 구체화 및 FE 표시 설계 문서

> **작성일:** 2026-05-04  
> **이슈:** #127  
> **브랜치:** `feat#127-folder-document-summary-templates`  
> **대상 화면:** `/templates`, `/templates/:id`  
> **관련 문서:** `docs/CONVENTION.md`, `docs/TEMPLATE_LIST_PAGE_DESIGN.md`, `docs/FRONTEND_DESIGN_DOCUMENT.md`, `docs/backend/BACKEND_INTEGRATION_DESIGN.md`

---

## 1. 개요

이번 작업에서는 `폴더 문서 자동 요약` 카테고리를 시스템 템플릿 후보군으로 정리하고, 템플릿 목록/상세 화면에서 해당 템플릿이 실제 동작과 어긋나지 않게 보이도록 FE 표시 기준을 정리한다.

문서의 목적은 다음과 같다.

- `폴더 문서 자동 요약` 카테고리 정의
- 대표 템플릿 3종의 이름, 설명, requiredServices 기준 정리
- 템플릿 목록/상세 화면에서 보여줄 카피와 메타 정보 기준 정리
- 현재 런타임 기준에서 사용자에게 어떤 기대치를 보여줘야 하는지 기록
- 이후 Drive 기반 다른 템플릿군과 구분되는 FE 표시 원칙 정리

---

## 2. 카테고리 정의

### 2.1 카테고리 키

```text
folder_document_summary
```

### 2.2 사용자 표시명

```text
폴더 문서 자동 요약
```

### 2.3 카테고리 설명

Google Drive 폴더 안의 문서나 파일 목록을 불러와 내용을 요약하고, 정리된 결과를 Slack, Gmail, Google Sheets 같은 다른 서비스로 전달하거나 저장하는 템플릿 묶음이다.

---

## 3. 대표 템플릿

### 3.1 1차 대표 템플릿

1. 신규 문서 요약 후 Slack 공유
2. 신규 문서 요약 후 Gmail 전달
3. 문서 요약 결과를 Google Sheets에 저장

### 3.2 각 템플릿 정의

#### 1. 신규 문서 요약 후 Slack 공유

- 설명: 지정한 Google Drive 폴더의 문서를 읽어 핵심 내용을 요약하고 Slack 채널에 공유한다.
- requiredServices: `google_drive`, `slack`
- 기본 흐름: `Google Drive -> LLM -> Slack`

#### 2. 신규 문서 요약 후 Gmail 전달

- 설명: 지정한 Google Drive 폴더의 문서를 읽어 핵심 내용을 요약하고 지정한 이메일로 전달한다.
- requiredServices: `google_drive`, `gmail`
- 기본 흐름: `Google Drive -> LLM -> Gmail`

#### 3. 문서 요약 결과를 Google Sheets에 저장

- 설명: 지정한 Google Drive 폴더의 문서를 읽어 요약한 뒤 결과를 Google Sheets에 기록한다.
- requiredServices: `google_drive`, `google_sheets`
- 기본 흐름: `Google Drive -> LLM -> Google Sheets`
- 1차 기대 결과: 문서명, 핵심 요약, 주요 포인트, 원문 링크를 컬럼형으로 기록

---

## 4. 현재 런타임 기준 FE 표시 원칙

### 4.1 사용자 기대와 실제 런타임을 맞춰야 하는 이유

Drive 기반 템플릿은 이름만 보면 `폴더 안의 문서를 하나씩 정교하게 요약`할 것처럼 보일 수 있지만, 실제 런타임에서는 source mode와 canonical payload 기준으로 동작한다. 따라서 FE는 템플릿이 무엇을 대상으로 하고 어떤 형태의 결과를 만드는지 과장 없이 보여줘야 한다.

### 4.2 FE 문구 기준

목록/상세 화면에서는 아래 방향으로 카피를 맞춘다.

- `문서를 하나씩 완벽히 정리` 같은 과장 표현은 피한다.
- `폴더 안 문서를 읽어 요약하고 전달/저장`처럼 결과 중심으로 설명한다.
- 결과가 Slack 메시지 1건인지, 이메일 1건인지, 시트 기록인지 드러나도록 표현한다.

예시:

- 신규 문서 요약 후 Slack 공유  
  `지정한 Google Drive 폴더의 문서를 읽어 핵심 내용을 요약하고 Slack 채널에 공유합니다.`
- 신규 문서 요약 후 Gmail 전달  
  `지정한 Google Drive 폴더의 문서를 읽어 핵심 내용을 요약하고 이메일로 전달합니다.`
- 문서 요약 결과를 Google Sheets에 저장  
  `지정한 Google Drive 폴더의 문서를 읽어 요약한 뒤 Google Sheets에 기록합니다.`

### 4.3 상세 화면 안내 포인트

상세 화면에서는 다음 성격을 사용자에게 명확히 보여줄 필요가 있다.

- source는 `Google Drive 폴더/파일` 축이다.
- 결과는 `전달` 또는 `기록`이다.
- 필요한 서비스는 Google Drive 외에 Slack, Gmail, Google Sheets 등 sink 서비스에 따라 달라진다.
- 1차 구현 기준 source mode는 `folder_new_file`로 가정한다.
- 현재는 source mode와 파일 유형에 따라 문서 본문 대신 신규 파일 1건 또는 파일 메타데이터 중심으로 동작할 수 있음을 안내한다.
- `folder_all_files` 기반 폴더 전체 요약은 2차 확장 대상으로 본다.

---

## 5. FE 표시 규칙

### 5.1 카테고리 배지

템플릿 목록과 상세 상단에서 `폴더 문서 자동 요약` 카테고리 배지를 노출한다.

### 5.2 서비스 표시

requiredServices는 raw key 대신 사람이 읽기 쉬운 이름으로 보여준다.

- `google_drive` -> `Google Drive`
- `slack` -> `Slack`
- `gmail` -> `Gmail`
- `google_sheets` -> `Google Sheets`

### 5.3 런타임 안내 문구

템플릿 상세에서는 현재 runtime 특성을 아래 수준으로 안내한다.

- `현재 Drive 기반 템플릿은 1차 구현 기준으로 folder_new_file 모드를 중심으로 동작합니다.`
- `파일 유형에 따라 문서 본문 대신 신규 파일 1건 또는 파일 메타데이터를 중심으로 동작할 수 있습니다.`
- `folder_all_files 기반 폴더 전체 요약은 이후 확장 대상입니다.`

### 5.4 빈 상태 / 안내 문구

해당 카테고리 템플릿이 없을 때는 `문서/파일을 요약해 공유하거나 기록하는 템플릿이 여기에 표시됩니다.` 수준의 안내가 적절하다.

---

## 6. FE 반영 메모

현재 FE에서는 아래 범위를 먼저 반영한다.

- `folder_document_summary` 카테고리 라벨 추가
- 대표 템플릿 3종 description override 추가
- 템플릿 상세의 runtime note 추가

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
- Google Drive source mode와 실제 runtime semantics
- 1차 source mode를 `folder_new_file`로 유지하는지 여부
- Slack/Gmail/Google Sheets sink 기본 config
- Google Sheets 결과가 실제로 `document_name`, `summary`, `highlights`, `source_url` 같은 컬럼형 구조로 저장되는지
- 결과물이 실제로 단일 메시지/단일 기록 형태인지에 대한 설명 정합성

---

## 8. 후속 작업

1. 대표 템플릿 3종의 목록/상세 카피를 실제 시드 데이터와 최종 맞춤
2. 필요 시 `파일 업로드 자동 공유` 카테고리와의 차이를 FE 문구로 분리
3. 백엔드 시드 데이터 반영 후 목록/상세/가져오기 흐름 재검증

---

## 9. 검증 기준

- 템플릿 목록에서 카테고리와 requiredServices가 사람이 읽기 쉬운 형태로 보일 것
- 템플릿 상세에서 설명이 실제 runtime 기대와 크게 어긋나지 않을 것
- Drive 기반 다른 템플릿군과 혼동되지 않도록 이름/설명이 분리될 것

