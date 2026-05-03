# Canvas LMS 대상 선택 UX 문서

> **작성일:** 2026-05-03
> **대상 기능:** Canvas LMS 시작 노드 설정 흐름
> **목적:** 사용자가 과목 번호나 학기명을 직접 입력하지 않고도 Canvas LMS 시작 노드를 설정할 수 있도록 개선한 내용을 정리한다.

---

## 목차

1. [개요](#1-개요)
2. [개선 배경](#2-개선-배경)
3. [주요 변경 사항](#3-주요-변경-사항)
4. [관련 파일](#4-관련-파일)
5. [사용자 경험 변화](#5-사용자-경험-변화)
6. [후속 수정](#6-후속-수정)
7. [검증 결과](#7-검증-결과)

---

## 1. 개요

기존 `Canvas LMS` 시작 노드 설정은 사용자가 `course_id`나 학기명을 직접 입력해야 했다.

이 방식은 다음과 같은 문제를 만들었다.

- 사용자가 숫자 형태의 과목 번호를 따로 기억하거나 복사해야 한다.
- 잘못된 값을 입력해도 설정 단계에서 바로 확인하기 어렵다.
- 확인 단계에서 사람이 읽기 쉬운 과목명 대신 식별자만 보여준다.

이번 개선에서는 텍스트 직접 입력을 원격 선택기 기반 흐름으로 전환해, 시작 노드 설정을 더 쉽게 이해하고 검증할 수 있도록 했다.

---

## 2. 개선 배경

Canvas LMS 시작 노드는 실행 시점에는 정확한 `target` 값이 필요하지만, 설정 화면에서는 사람이 이해하기 쉬운 이름이 더 중요하다.

기존 방식은 실행값 전달에는 문제가 없었지만, 실제 설정 경험은 다음 한계가 있었다.

- `course_id`는 사용자 입장에서 의미를 바로 파악하기 어렵다.
- 학기 전체 다운로드처럼 학기명이 중요한 모드도 입력 실수를 막기 어렵다.
- 노드 생성 이후에도 사람이 읽을 수 있는 라벨 정보가 부족했다.

따라서 이번 작업에서는 Spring이 제공하는 원격 옵션 목록을 기반으로, 과목과 학기를 선택형 UX로 노출하도록 바꿨다.

---

## 3. 주요 변경 사항

### 3.1 시작 노드 대상 선택기를 원격 옵션 기반으로 전환

`Canvas LMS` 시작 노드에서 일반 텍스트 입력 대신 원격 선택기를 사용한다.

- `course_files`
- `course_new_file`
- `term_all_files`

각 모드에 따라 아래 선택기를 연결했다.

- `course_files`, `course_new_file` -> `course_picker`
- `term_all_files` -> `term_picker`

### 3.2 실행값과 표시값을 함께 저장

선택기는 실행에 필요한 실제 값과 화면 표시용 라벨을 함께 저장한다.

- `target`: 백엔드 실행에 사용하는 실제 값
- `target_label`: 화면에 보여줄 사람이 읽을 수 있는 값

이 구조를 통해 실행 계약은 유지하면서도 확인 단계와 저장 이후 화면 표시를 더 자연스럽게 만들었다.

### 3.3 긴 목록에 대한 패널 사용성 보완

과목 수가 많아질 때 다음 버튼이 화면 밖으로 밀리는 문제가 있어 선택기 레이아웃도 같이 보완했다.

- 원격 옵션 리스트는 내부 스크롤을 사용한다.
- 선택기 최대 높이를 낮춰 작은 화면에서도 다음 버튼이 잘리지 않도록 했다.

---

## 4. 관련 파일

- `src/features/add-node/ui/ServiceSelectionPanel.tsx`
- `src/shared/ui/RemoteOptionPicker.tsx`
- `src/entities/workflow/api/get-target-options.api.ts`
- `src/entities/workflow/model/useTargetOptionsQuery.ts`
- `src/entities/workflow/api/types.ts`
- `src/features/add-node/model/source-rollout.ts`
- `src/entities/workflow/lib/workflow-node-adapter.ts`

---

## 5. 사용자 경험 변화

이번 변경 이후 사용자는 다음 흐름으로 시작 노드를 설정할 수 있다.

- 과목 번호를 직접 입력하지 않고 과목명 기준으로 검색한다.
- 학기명을 직접 입력하지 않고 목록에서 학기를 선택한다.
- 확인 단계에서 읽기 쉬운 과목명 또는 학기명을 바로 확인한다.
- 저장된 워크플로우는 여전히 백엔드 실행에 필요한 `target` 값을 유지한다.

즉 실행 계약은 유지하면서도 설정 과정은 훨씬 이해하기 쉬운 형태로 바뀌었다.

---

## 6. 후속 수정

초기 선택기 적용 이후 두 가지 회귀 이슈를 함께 수정했다.

### 6.1 시작 노드 목록에서 Canvas LMS가 사라지는 문제

- 원인: FE source rollout allowlist에서 `canvas_lms`가 빠져 있었다.
- 증상: 백엔드 카탈로그에는 서비스가 있어도 시작 노드 목록에서는 보이지 않았다.
- 조치: `src/features/add-node/model/source-rollout.ts`에 `canvas_lms` 모드를 다시 추가했다.

### 6.2 선택 완료 후 시작 노드가 생성되지 않는 문제

- 원인: `canvas_lms`가 시각 노드 타입 매핑에 빠져 있었다.
- 증상: 사용자가 선택을 마치고 시작 노드 만들기를 눌러도 노드가 생성되지 않았다.
- 조치: `src/entities/workflow/lib/workflow-node-adapter.ts`에 `canvas_lms -> storage` 매핑을 추가했다.

### 6.3 생성된 노드 라벨 표시 보정

- 원인: 생성된 Canvas 시작 노드가 범용 `Storage` 라벨로 보였다.
- 조치: storage-node presentation 매핑을 확장해 생성된 노드가 `Canvas LMS`로 표시되도록 보정했다.

### 6.4 모드별 과목 노출 기준 정리

- `term_all_files`는 지난 학기까지 보여주되,
- `course_new_file`은 현재 학기 중심의 활성 과목만 보이도록 정리했다.

---

## 7. 검증 결과

다음 명령으로 수정 내용을 확인했다.

- `pnpm exec eslint src/features/add-node/ui/ServiceSelectionPanel.tsx src/shared/ui/RemoteOptionPicker.tsx src/entities/workflow/api/get-target-options.api.ts src/entities/workflow/model/useTargetOptionsQuery.ts`
- `pnpm exec eslint src/features/add-node/model/source-rollout.ts src/entities/workflow/lib/workflow-node-adapter.ts`
- `pnpm exec tsc --noEmit`
- `pnpm test`

현재 테스트 메모:

- 이 저장소에는 테스트 파일이 없어 `pnpm test`가 `No test files found, exiting with code 0`으로 종료된다.
