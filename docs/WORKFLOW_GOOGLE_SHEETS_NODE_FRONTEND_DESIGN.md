# Workflow Google Sheets Node Frontend Design

> **작성일** 2026-05-11
> **대상 화면** `/workflows/:id`
> **범위** flowify-FE Google Sheets 노드 UX 설계
> **관련 저장소** `flowify-BE-spring`, `flowify-BE`

---

## 1. 목적

이 문서는 Google Sheets를 `시작 노드`, `중간 노드`, `끝 노드`로 모두 사용할 수 있도록 FE에서 필요한 설정 흐름과 데이터 모델을 정의한다.

이번 설계의 목표는 아래와 같다.

- 일반 사용자가 많이 원하는 자동화를 바로 만들 수 있게 한다.
- `시트 전체 읽기`와 `행 단위 자동화`를 모두 1급 기능으로 취급한다.
- `스프레드시트 선택 -> 시트 탭 선택` 흐름을 실제 picker UX로 제공한다.
- 목록에 원하는 대상이 없을 때 `새 스프레드시트`와 `새 시트`를 설정 단계에서 바로 만들 수 있게 한다.
- 생성은 설정 단계에서 명시적으로 수행하고, 런타임 자동 생성은 이번 범위에 넣지 않는다.

---

## 2. 핵심 사용자 시나리오

### 2.1 전체 시트 읽기

- 시트 전체를 읽어 요약을 만든다.
- 특정 range를 읽어 보고서를 만든다.
- 표 전체를 AI에 넘겨 정리 결과를 만든다.

### 2.2 특정 단어 또는 조건 검색

- 특정 단어가 포함된 행만 찾는다.
- 특정 컬럼에서 일치하는 값만 찾는다.
- 검색 결과만 다른 서비스나 다른 시트에 저장한다.

### 2.3 새 행 감지

- 새 신청 행이 추가되면 후속 자동화를 시작한다.
- 새 문의 행이 추가되면 요약과 알림을 보낸다.

### 2.4 수정 행 감지

- 상태 컬럼이 바뀐 행만 잡아 후속 처리를 한다.
- 사람이 시트에서 값을 수정하면 자동화를 다시 이어간다.

### 2.5 기준표 lookup

- 이메일, 상품 코드, 학생 번호 같은 키로 기준표를 조회한다.
- 조회 결과를 다음 노드 조건 판단에 사용한다.

### 2.6 결과 기록

- 결과를 새 행으로 누적한다.
- 결과 범위를 통째로 덮어쓴다.
- 같은 key 행을 update 또는 upsert 한다.

---

## 3. 역할별 UX

### 3.1 시작 노드

지원 모드:

- `sheet_all`
- `new_row`
- `row_updated`

필수 설정:

- 스프레드시트
- 시트 탭
- 선택적 range
- `row_updated`일 때 `key_column`
- `new_row`, `row_updated`일 때 `initial_sync_mode`

### 3.2 중간 노드

지원 액션:

- `read_range`
- `search_text`
- `lookup_row_by_key`

필수 설정:

- 스프레드시트
- 시트 탭
- 액션별 검색값 또는 lookup 값
- `lookup_row_by_key`일 때 `key_column`

### 3.3 끝 노드

지원 쓰기 방식:

- `append_rows`
- `overwrite_range`
- `update_row_by_key`
- `upsert_row_by_key`

필수 설정:

- 스프레드시트
- 시트 탭
- 선택적 range
- `update_row_by_key`, `upsert_row_by_key`일 때 `key_column`

---

## 4. Picker 흐름

### 4.1 기본 흐름

Google Sheets picker는 아래 2단계 흐름을 따른다.

1. 스프레드시트 목록 표시
2. 스프레드시트를 선택하면 시트 탭 목록 표시

### 4.2 생성 흐름

Google Drive 폴더 생성 UX와 같은 결로 아래 흐름을 제공한다.

1. 스프레드시트 목록 단계에서 원하는 파일이 없으면 `새 스프레드시트 만들기`
2. 생성 성공 시 해당 스프레드시트 경로로 바로 진입
3. 시트 탭 목록 단계에서 원하는 탭이 없으면 `새 시트 만들기`
4. 생성 성공 시 해당 시트를 바로 선택

기본 정책:

- 새 스프레드시트는 내 드라이브 루트에 생성한다.
- 새 시트는 현재 선택한 스프레드시트 안에 생성한다.
- 같은 스프레드시트 이름은 Drive 특성상 여러 개가 있을 수 있으므로, FE는 제목이 아니라 생성 응답의 `spreadsheet_id`를 기준으로 선택 상태를 유지한다.
- 같은 시트 이름이 이미 있으면 새로 만드는 대신 기존 시트를 선택하는 방향을 기본 정책으로 둔다.
- 생성은 설정 단계에서만 제공한다.
- 런타임에 `없으면 자동 생성`하는 옵션은 이번 범위에서 제외한다.

### 4.3 표시 규칙

- 루트 단계에서는 `새 스프레드시트 만들기`만 보인다.
- 스프레드시트 내부 단계에서는 `새 시트 만들기`만 보인다.
- 생성 후 목록을 새로고침하고, 사용자가 다시 찾지 않도록 즉시 경로/선택 상태를 갱신한다.

---

## 5. FE 데이터 모델

### 5.1 공통 설정

```ts
type GoogleSheetsCommonConfig = {
  service: "google_sheets";
  spreadsheet_id: string;
  spreadsheet_id_label?: string | null;
  sheet_name: string;
  range_a1?: string | null;
  header_row?: number | null;
  data_start_row?: number | null;
};
```

### 5.2 시작 노드

```ts
type GoogleSheetsSourceConfig = GoogleSheetsCommonConfig & {
  source_mode: "sheet_all" | "new_row" | "row_updated";
  target?: string | null;
  target_label?: string | null;
  target_meta?: Record<string, unknown> | null;
  key_column?: string | null;
  initial_sync_mode?: "skip_existing" | "emit_existing";
};
```

### 5.3 중간 노드

```ts
type GoogleSheetsActionConfig = GoogleSheetsCommonConfig & {
  action: "read_range" | "search_text" | "lookup_row_by_key";
  key_column?: string | null;
  search_source?: "value" | "input_field";
  search_value?: string | null;
  search_field?: string | null;
  search_columns?: string | null;
  match_mode?: "contains" | "exact" | "starts_with";
  result_limit?: string | null;
  lookup_source?: "value" | "input_field";
  lookup_value?: string | null;
  lookup_field?: string | null;
};
```

### 5.4 끝 노드

```ts
type GoogleSheetsSinkConfig = GoogleSheetsCommonConfig & {
  write_mode:
    | "append_rows"
    | "overwrite_range"
    | "update_row_by_key"
    | "upsert_row_by_key";
  key_column?: string | null;
};
```

---

## 6. 구현 포인트

### 6.1 Source picker

- `SourceTargetPicker.tsx`
- `SourceTargetForm.tsx`

해야 할 일:

- `sheet_picker`를 실제 2단계 remote picker로 사용한다.
- 루트 단계에서 새 스프레드시트 생성 UI를 붙인다.
- 시트 단계에서 새 시트 생성 UI를 붙인다.

### 6.2 Middle panel

- `SpreadsheetPanel.tsx`

해야 할 일:

- 기존 조회/검색/lookup 설정을 유지한다.
- 같은 picker 안에서 생성 UX를 지원한다.

### 6.3 Sink panel

- `SinkNodePanel.tsx`

해야 할 일:

- 기존 `sheet_picker` 선택 흐름에 생성 UX를 추가한다.
- `sheet_name`을 생성/선택 결과와 자동 동기화한다.

### 6.4 Workflow API hooks

추가 API:

- `createGoogleSheetsSpreadsheet`
- `createGoogleSheet`

추가 mutation:

- `useCreateGoogleSheetsSpreadsheetMutation`
- `useCreateGoogleSheetMutation`

---

## 7. 검증 계획

- 스프레드시트 목록 조회
- 시트 탭 목록 조회
- 새 스프레드시트 생성 후 즉시 진입
- 새 시트 생성 후 즉시 선택
- 시작 노드에서 생성 후 저장/복원
- 중간 노드에서 생성 후 저장/복원
- 끝 노드에서 생성 후 저장/복원
- 기존 선택 흐름 회귀 확인

---

## 8. V1 범위

이번 V1에 포함:

- `sheet_all`
- `new_row`
- `row_updated`
- `read_range`
- `search_text`
- `lookup_row_by_key`
- `append_rows`
- `overwrite_range`
- `update_row_by_key`
- `upsert_row_by_key`
- 스프레드시트 -> 시트 탭 2단계 picker
- 새 스프레드시트 만들기
- 새 시트 만들기

이번 V1에서 제외:

- row deletion 감지
- regex / fuzzy search
- 여러 시트 동시 병합
- 런타임 자동 생성
- 복잡한 서식/수식 복제

---

## 9. 결정 요약

- Google Sheets는 시작, 중간, 끝 노드로 모두 지원한다.
- 사용자가 많이 원하는 `전체 읽기`, `검색`, `lookup`, `new_row`, `row_updated`, `upsert`를 중심으로 설계한다.
- 생성 UX는 Drive 폴더 생성처럼 설정 단계에 붙인다.
- `스프레드시트 생성 -> 시트 생성 -> 즉시 선택` 흐름을 FE의 기본 picker UX로 삼는다.
