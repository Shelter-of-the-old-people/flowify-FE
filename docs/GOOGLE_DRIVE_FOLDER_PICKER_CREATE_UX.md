# Google Drive Folder Picker/Create UX

## 배경

기존 도착 노드 설정에서 `Google Drive`는 `folder_id`를 직접 입력해야 했다.  
이 방식은 다음 문제가 있었다.

- 사용자가 Google Drive URL에서 폴더 ID를 따로 복사해야 했다.
- 어느 폴더를 선택했는지 이름으로 확인하기 어려웠다.
- 원하는 폴더가 없으면 사전에 Drive에서 직접 폴더를 만든 뒤 다시 돌아와야 했다.

## 이번 변경

`Google Drive` 도착 노드의 `folder_picker`를 원격 폴더 선택 UI로 바꾸고, 같은 화면에서 새 폴더를 만들 수 있게 했다.

- 폴더 목록을 검색하고 탐색해서 선택할 수 있다.
- 현재 보고 있는 위치를 기준으로 새 폴더를 생성할 수 있다.
- 새로 만든 폴더는 즉시 선택된다.
- 실제 저장값은 `folder_id`, 표시용 이름은 `folder_id_label`로 분리 저장한다.

## 적용 파일

프론트엔드:

- `src/features/configure-node/ui/panels/SinkNodePanel.tsx`
- `src/shared/ui/RemoteOptionPicker.tsx`
- `src/entities/workflow/api/create-google-drive-folder.api.ts`
- `src/entities/workflow/model/useCreateGoogleDriveFolderMutation.ts`
- `src/entities/workflow/model/useTargetOptionsQuery.ts`
- `src/entities/workflow/model/query-keys.ts`

## 동작 방식

폴더 조회는 기존 target option API를 재사용한다.

- `GET /api/editor-catalog/sources/google_drive/target-options?mode=folder_all_files`

폴더 생성은 새 API를 사용한다.

- `POST /api/editor-catalog/sinks/google_drive/folders`

요청 본문:

```json
{
  "name": "새 폴더 이름",
  "parentId": "상위 폴더 ID 또는 null"
}
```

성공하면 생성된 폴더의 `id`, `label`, `type`을 반환하고, FE가 그 폴더를 즉시 선택 상태로 반영한다.

## UX 개선 포인트

- 폴더 ID를 직접 복사하지 않아도 된다.
- 폴더명으로 선택 결과를 확인할 수 있다.
- 설정 화면을 벗어나지 않고 원하는 위치에 새 폴더를 만들 수 있다.

## 현재 제약

- 현재 구현은 `My Drive` 기준 흐름이다.
- Shared Drive 업로드/탐색 호환은 이번 변경 범위에 포함하지 않았다.
- Google Drive는 동일 이름 폴더 생성을 허용하므로, 같은 위치에 중복 이름 폴더가 생길 수 있다.
- 백엔드 API 구현 상세는 Spring repo 문서에서 별도로 관리한다.

## 검증

프론트엔드:

- `pnpm exec tsc --noEmit`
- `pnpm exec eslint src/features/configure-node/ui/panels/SinkNodePanel.tsx src/shared/ui/RemoteOptionPicker.tsx src/entities/workflow/api/create-google-drive-folder.api.ts src/entities/workflow/model/useCreateGoogleDriveFolderMutation.ts src/entities/workflow/model/useTargetOptionsQuery.ts`
- `pnpm test`
  현재 테스트 파일이 없어 `No test files found, exiting with code 0`로 종료
