# Canvas LMS Target Picker UX

## 배경

기존 시작 노드 설정에서는 `Canvas LMS`의 과목 ID나 학기명을 사용자가 직접 입력해야 했다.  
이 방식은 다음 문제가 있었다.

- 사용자가 `course_id`를 외워서 입력해야 했다.
- 숫자 ID를 잘못 넣어도 설정 단계에서 바로 드러나지 않았다.
- 확인 화면에서도 사람이 읽기 좋은 과목명이 아니라 실제 ID만 남았다.

## 이번 변경

`Canvas LMS` 시작 노드의 `course_picker`, `term_picker`를 텍스트 입력이 아닌 원격 옵션 선택 UI로 바꿨다.

- 시작 노드 wizard에서 `Canvas LMS` source mode를 고르면 과목/학기 목록을 바로 조회한다.
- 사용자는 검색으로 과목명 또는 학기명을 찾아 선택할 수 있다.
- 실제 저장값은 기존과 동일하게 `target`에 유지한다.
- 화면 표시용으로는 `target_label`을 함께 저장해서 확인 단계와 이후 편집 화면에서 사람이 읽을 수 있는 이름을 보여준다.

## 적용 파일

- `src/features/add-node/ui/ServiceSelectionPanel.tsx`
- `src/shared/ui/RemoteOptionPicker.tsx`
- `src/entities/workflow/api/get-target-options.api.ts`
- `src/entities/workflow/model/useTargetOptionsQuery.ts`
- `src/entities/workflow/api/types.ts`

## 동작 방식

`Canvas LMS`는 기존 Spring API를 그대로 사용한다.

- `GET /api/editor-catalog/sources/canvas_lms/target-options`

mode별 동작은 아래와 같다.

- `course_files`, `course_new_file` -> 과목 목록 조회
- `term_all_files` -> 학기 목록 조회

프론트에서는 원격 picker가 항목 `id`와 `label`을 함께 받아서:

- `target`에는 실제 실행에 필요한 값 저장
- `target_label`에는 과목명/학기명 저장

## UX 개선 포인트

- 숫자 과목번호를 외울 필요가 없다.
- 검색 기반이라 강의명이 길어도 찾기 쉽다.
- 확인 화면에서 ID 대신 과목명이 보여서 실수 확인이 쉬워진다.

## 현재 제약

- Canvas 목록은 계정에 연결된 현재 활성 과목 기준이다.
- 과목/학기 picker는 계층형 브라우저가 아니라 평면 검색 목록이다.
- Canvas 토큰이 없거나 Spring 쪽 `CANVAS_TOKEN` 설정이 비어 있으면 목록을 불러올 수 없다.

## 검증

- `pnpm exec tsc --noEmit`
- `pnpm exec eslint src/features/add-node/ui/ServiceSelectionPanel.tsx src/shared/ui/RemoteOptionPicker.tsx src/entities/workflow/api/get-target-options.api.ts src/entities/workflow/model/useTargetOptionsQuery.ts`
- `pnpm test`
  현재 테스트 파일이 없어 `No test files found, exiting with code 0`로 종료
