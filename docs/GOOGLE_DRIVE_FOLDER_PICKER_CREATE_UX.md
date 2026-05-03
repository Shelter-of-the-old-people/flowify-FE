# Google Drive 폴더 선택 및 생성 UX 문서

> **작성일:** 2026-05-03
> **대상 기능:** Google Drive 도착 노드 설정 패널
> **목적:** 사용자가 `folder_id`를 직접 입력하지 않고도 Google Drive 저장 폴더를 선택하거나 새로 만들 수 있도록 UX를 개선한 내용을 정리한다.

---

## 목차

1. [개요](#1-개요)
2. [개선 배경](#2-개선-배경)
3. [주요 변경 사항](#3-주요-변경-사항)
4. [관련 파일](#4-관련-파일)
5. [API 연동](#5-api-연동)
6. [후속 수정](#6-후속-수정)
7. [검증 결과](#7-검증-결과)

---

## 1. 개요

기존 Google Drive 도착 노드 설정은 사용자가 Google Drive URL에서 `folder_id`를 직접 복사해 입력해야 했다.

이 방식은 다음 문제를 만들었다.

- 앱 밖으로 나가 폴더 URL을 확인해야 한다.
- 입력한 값이 실제 원하는 폴더인지 화면에서 바로 검증하기 어렵다.
- 원하는 폴더가 없으면 Google Drive에서 먼저 수동으로 폴더를 만든 뒤 다시 돌아와야 한다.

이번 개선에서는 도착 노드 패널 안에서 폴더를 바로 선택하고, 필요하면 같은 화면에서 새 폴더도 만들 수 있도록 흐름을 정리했다.

---

## 2. 개선 배경

기존 입력 방식은 백엔드 실행에는 필요한 값을 전달할 수 있었지만, 사용자 경험 측면에서는 불편함이 컸다.

- `folder_id`는 사람이 읽기 어려운 식별자라 실수 입력 가능성이 높다.
- 현재 선택한 저장 위치를 폴더 이름 기준으로 확인하기 어렵다.
- 폴더 생성과 폴더 선택이 분리되어 있어 설정 흐름이 끊긴다.
- Google Drive 연결이 끊어진 상태에서는 다시 연결하는 진입 흐름도 자연스럽지 않았다.

따라서 이번 작업에서는 "직접 ID 입력" 대신 "원격 옵션 선택" 흐름으로 전환하고, 폴더 생성까지 같은 패널에서 처리할 수 있도록 했다.

---

## 3. 주요 변경 사항

### 3.1 원격 폴더 선택기 도입

Google Drive 도착 노드는 일반 문자열 입력 대신 원격 `folder_picker`를 사용한다.

- 사용자는 폴더 이름 기준으로 목록을 탐색할 수 있다.
- 현재 선택 값은 실행용 `folder_id`와 화면 표시용 `folder_id_label`을 함께 저장한다.
- 목록이 길어질 경우 패널 전체가 밀리지 않도록 리스트 영역 내부만 스크롤되게 조정했다.

### 3.2 패널 내 새 폴더 생성 지원

같은 패널 안에서 새 폴더를 만들 수 있도록 했다.

- 현재 위치 기준으로 새 폴더 생성 요청을 보낸다.
- 생성 성공 시 새 폴더를 목록 맨 앞에 반영한다.
- 생성 직후 해당 폴더를 선택 상태로 바꿔 사용자가 다시 찾지 않아도 되게 했다.

### 3.3 OAuth 재연결 흐름 보완

Google Drive 연결이 끊어진 경우에도 도착 노드 패널에서 다시 연결을 시작할 수 있도록 보완했다.

- 지원되지 않는 상태로 패널이 비활성화된 채 멈추지 않도록 했다.
- OAuth 연결 완료 후에는 원래 작업하던 화면으로 복귀하도록 흐름을 맞췄다.
- 사용자가 저장 폴더 설정을 하다 흐름이 끊기지 않도록 복귀 경로를 유지한다.

---

## 4. 관련 파일

- `src/features/configure-node/ui/panels/SinkNodePanel.tsx`
- `src/shared/ui/RemoteOptionPicker.tsx`
- `src/entities/workflow/api/create-google-drive-folder.api.ts`
- `src/entities/workflow/model/useCreateGoogleDriveFolderMutation.ts`
- `src/entities/workflow/model/useTargetOptionsQuery.ts`
- `src/entities/workflow/model/query-keys.ts`

---

## 5. API 연동

### 5.1 폴더 목록 조회

도착 노드 패널의 폴더 선택기는 아래 API를 사용한다.

```text
GET /api/editor-catalog/sources/google_drive/target-options?mode=folder_all_files
```

### 5.2 폴더 생성

새 폴더 생성은 아래 API를 사용한다.

```text
POST /api/editor-catalog/sinks/google_drive/folders
```

요청 본문 예시는 다음과 같다.

```json
{
  "name": "새 폴더",
  "parentId": "optional-parent-folder-id"
}
```

---

## 6. 후속 수정

초기 적용 이후 Google Drive 도착 노드 패널이 열리지 않는 회귀 이슈가 있었다.

- 원인: `SinkNodePanel.tsx`에서 `useEffect` import가 빠져 있었다.
- 증상: 도착 노드 설정 패널을 열면 `Panel could not be displayed.`가 출력됐다.
- 조치: 누락된 `useEffect` import를 복구해 패널이 정상적으로 렌더링되도록 수정했다.

---

## 7. 검증 결과

다음 명령으로 수정 내용을 확인했다.

- `pnpm exec tsc --noEmit`
- `pnpm exec eslint src/features/configure-node/ui/panels/SinkNodePanel.tsx src/shared/ui/RemoteOptionPicker.tsx src/entities/workflow/api/create-google-drive-folder.api.ts src/entities/workflow/model/useCreateGoogleDriveFolderMutation.ts src/entities/workflow/model/useTargetOptionsQuery.ts`
- `pnpm test`

현재 테스트 메모:

- 이 저장소에는 테스트 파일이 없어 `pnpm test`가 `No test files found, exiting with code 0`으로 종료된다.
