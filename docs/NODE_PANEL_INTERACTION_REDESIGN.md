# 노드 클릭 패널 UX 보정 설계

> 목적: 시작/중간/도착 노드를 클릭했을 때 좌우 패널 경험을 통일하고, 설정 수정 진입점을 오른쪽 패널로 일원화한다.  
> 이 문서는 `NODE_SETUP_WIZARD_DESIGN.md`의 14.9~14.13 설정 수정 진입점 설계를 최신 기준으로 보정한다.

## 1. 문제 상황

현재 구현은 노드 역할별 패널 동작이 다르게 보인다.

1. 시작 노드를 클릭하면 왼쪽 `InputPanel`만 열리고 오른쪽 `OutputPanel`이 열리지 않는다.
2. 시작 노드의 설정 수정 UI가 왼쪽 `InputPanel` 내부에서 열린다.
3. 도착 노드는 오른쪽 패널이 열리지만, 수정 전 view 상태에서 목적지 설정 요약이 부족하다.
4. `한 파일씩 / 전체를 하나로 합쳐서` 처리 방식 노드는 수정 버튼을 눌러도 수정 wizard로 복원되지 않는다.
5. 일부 분기에서 `NODE_REGISTRY` metadata가 없으면 오른쪽 패널이 비어 보일 수 있다.

## 2. 핵심 목표

실제 노드를 클릭하면 시작/중간/도착 노드 모두 같은 사용 경험을 가져야 한다.

- 왼쪽 패널: 해당 노드로 들어오는 데이터
- 오른쪽 패널: 해당 노드의 설정 요약, 설정 수정, 나가는 데이터
- 설정 수정은 항상 오른쪽 패널에서 처리
- view 상태에서도 빈 패널처럼 보이지 않게 현재 설정 요약 제공

공통 클릭 상태는 유지한다.

```ts
setActiveNextStep(null);
setActivePlaceholder(null);
openPanel(node.id, { mode: "view" });
```

즉 실제 노드 클릭 후 store 상태는 아래처럼 정렬된다.

```ts
activePanelNodeId = clickedNodeId;
activePanelMode = "view";
activePlaceholder = null;
```

## 3. 패널 책임

### 3.1 InputPanel

`InputPanel`은 들어오는 데이터만 담당한다.

- 현재 노드로 들어오는 데이터
- 이전 노드 출력 타입
- 실행 결과 기반 입력 데이터
- schema preview 기반 예상 입력 구조
- 시작 노드 source preview 버튼

`InputPanel`은 더 이상 설정 수정 UI를 직접 렌더링하지 않는다.

따라서 아래 책임은 `InputPanel`에서 제거한다.

- 시작 노드 `설정 수정` 버튼
- 시작 노드 edit mode 분기
- `SourceNodePanel` 렌더링

### 3.2 OutputPanel

`OutputPanel`은 설정과 나가는 데이터를 담당한다.

- 시작 노드 source 설정 요약
- 시작 노드 source 설정 수정
- 중간 노드 choice wizard
- 중간 노드 출력 데이터/설정 요약
- 도착 노드 sink 설정 요약
- 도착 노드 sink 설정 수정
- fallback summary

## 4. OutputPanel 열림 조건

현재 `OutputPanel`은 시작 노드를 제외한다.

```ts
const isOpen =
  Boolean(activePanelNodeId) && activePlaceholder === null && !isStartNode;
```

보정 후에는 실제 노드 클릭 시 시작 노드도 오른쪽 패널이 열린다.

```ts
const isOpen = Boolean(activePanelNodeId) && activePlaceholder === null;
```

플레이스홀더 클릭은 노드 추가 플로우이므로 기존처럼 `activePlaceholder !== null` 상태에서 패널을 닫는다.

## 5. OutputPanel 분기 순서

`OutputPanel`은 아래 순서로 렌더링 분기를 판단한다.

```text
1. choice wizard 진행 중
2. 시작 노드 edit
3. 시작 노드 view
4. 도착 노드 edit
5. 도착 노드 view
6. processing-method 전용 중간 노드 view
7. 일반 중간 노드 detail/edit
8. fallback summary
```

분기 helper는 역할을 명시적으로 드러내는 이름으로 둔다.

```ts
const isMiddleNode = Boolean(activeNode) && !isStartNode && !isEndNode;
const isEditMode = activePanelMode === "edit" && canEditNodes;

const isStartEditMode = isEditMode && isStartNode;
const isStartViewMode = !isEditMode && isStartNode;

const isEndEditMode = isEditMode && isEndNode;
const isEndViewMode = !isEditMode && isEndNode;
```

## 6. 시작 노드

### 6.1 view mode

시작 노드 view 모드의 오른쪽 패널은 현재 source 설정을 사용자 언어로 요약한다.

- 가져올 곳: Google Drive, Gmail, Canvas LMS 등
- 가져오는 방식: 폴더 전체 파일, 단일 파일, 라벨 메일 등
- 선택한 대상: 폴더명, 과목명, 라벨명 등
- 예상 출력: 파일 목록, 단일 파일, 메일 목록 등
- 설정 상태
- `설정 수정` 버튼

`schemaPreview.source`와 현재 node config를 우선 사용한다.

source summary는 빈 화면을 만들면 안 된다. 기존 `SourceSummaryBlock`은 표시할 row가 없으면 `null`을 반환하므로, 오른쪽 패널에서는 아래 fallback을 반드시 둔다.

```text
source summary row 있음
→ SourceSummaryBlock 표시

source summary row 없음
→ "가져올 곳 설정을 확인해 주세요." 안내
→ 현재 설정 상태 표시
→ canEditNodes이면 설정 수정 버튼 표시
```

즉 source 정보가 부족한 템플릿/미설정 시작 노드도 오른쪽 패널에서 다음 행동을 알 수 있어야 한다.

### 6.2 edit mode

`설정 수정` 클릭 시 오른쪽 `OutputPanel` 안에서 `SourceNodePanel`을 렌더링한다.

```tsx
<SourceNodePanel
  data={activeNode.data}
  nodeId={activeNode.id}
  onCancel={() => setActivePanelMode("view")}
  onComplete={() => setActivePanelMode("view")}
/>
```

새 창, 별도 overlay, 왼쪽 `InputPanel` 내부 edit 전환은 사용하지 않는다.

## 7. 도착 노드

### 7.1 view mode

도착 노드 view 모드의 오른쪽 패널은 현재 sink 설정을 사용자 언어로 요약한다.

- 보낼 곳: Google Drive, Gmail, Notion 등
- 저장/전송 대상: 폴더명, 이메일 주소, 페이지명 등
- 저장 방식: 파일 업로드, 문서 생성, 메일 발송 등
- 입력 데이터 타입
- 설정 완료 여부
- `설정 수정` 버튼

sink summary는 서비스마다 config key가 다르므로 특정 필드명에만 의존하지 않는다. `sinkSchema.fields`와 config의 보조 label 필드를 함께 사용한다.

추출 기준은 아래 순서를 따른다.

```text
1. service
   - sink catalog의 service label 우선
   - 없으면 config.service

2. target fields
   - sinkSchema.fields 중 remote picker field를 우선 표시
   - field key의 값이 있으면 해당 값을 사용
   - `${field.key}_label`이 있으면 label을 우선 표시
   - `${field.key}_meta`는 필요 시 보조 설명에만 사용

3. required fields
   - 필수 field가 비어 있으면 "설정 확인 필요"로 표시
   - 비어 있어도 저장/수정 진입 자체는 가능해야 함

4. input data type
   - activeNode.data.inputTypes[0] 기반으로 표시
```

예시는 아래와 같다.

```text
Google Drive
→ 보낼 곳: Google Drive
→ 저장 대상: 빅데이터-01
→ 저장 방식: 파일 업로드 또는 문서 생성

Slack
→ 보낼 곳: Slack
→ 전송 대상: #과제알림

Notion
→ 보낼 곳: Notion
→ 저장 대상: 강의자료 요약 페이지
```

### 7.2 edit mode

`설정 수정` 클릭 시 기존처럼 `PanelRenderer -> SinkNodePanel`을 사용한다.

```tsx
<PanelRenderer
  readOnly={!canEditNodes}
  onCancel={() => setActivePanelMode("view")}
  onComplete={() => setActivePanelMode("view")}
/>
```

저장 또는 취소 후에는 `activePanelMode = "view"`로 돌아간다.

## 8. processing-method 전용 중간 노드

`한 파일씩 / 전체를 하나로 합쳐서`처럼 데이터 처리 방식을 결정하는 노드는 수정 버튼을 노출하지 않는다.

이 선택은 단순 config 변경이 아니라 node type, output data type, 후속 그래프 구조에 영향을 준다. 현재 저장 계약도 `one_by_one`, `all_at_once` 같은 processing method option id를 안정적으로 보존하지 않는다.

따라서 이번 범위에서는 읽기 전용 요약만 제공한다.

판별 기준은 아래처럼 둔다.

```ts
const isProcessingMethodOnlyNode =
  isMiddleNode &&
  activeNode.data.config.isConfigured === true &&
  Boolean(activeNode.data.config.choiceNodeType) &&
  !activeNode.data.config.choiceActionId;
```

오른쪽 패널에는 아래 내용을 표시한다.

- 처리 방식: 한 파일씩 / 전체를 하나로 합쳐서
- 예상 출력: 단일 파일 / 파일 목록
- 안내: 이 처리 방식은 이후 노드 구조에 영향을 주므로 변경하려면 이후 노드를 삭제하고 다시 설정해야 한다.

처리 방식 label은 저장 계약의 한계 때문에 항상 정확히 복원할 수 없다. 현재 config에는 `one_by_one`, `all_at_once` 같은 processing method option id가 안정적으로 저장되지 않는다.

따라서 label 추론은 아래 순서를 따른다.

```text
1. choiceNodeType === "LOOP"
   → "한 파일씩"

2. choiceNodeType === "PASSTHROUGH" && outputTypes[0] === "file-list"
   → "전체를 하나로 합쳐서" 또는 "전체 사용"

3. 그 외
   → "처리 방식 선택 완료"
```

라벨을 확정할 수 없는 경우 잘못된 값을 단정하지 않는다. 이 경우 사용자가 이해할 수 있도록 선택 결과의 의미를 함께 표시한다.

```text
처리 방식 선택 완료
예상 출력: 파일 목록
이 단계는 이후 노드 구조에 영향을 주는 처리 방식 단계입니다.
```

수정 버튼 노출 기준은 아래와 같다.

| 대상 | 수정 버튼 |
|---|---|
| 시작 노드 | 노출 |
| 도착 노드 | 노출 |
| `choiceActionId`가 있는 중간 작업 노드 | 노출 |
| processing-method 전용 중간 노드 | 미노출 |
| 읽기 전용 워크플로우 | 미노출 또는 비활성화 |

## 9. 중간 작업 노드

중간 노드는 아래 두 흐름을 구분한다.

1. 아직 설정 전인 중간 노드
   - 기존 choice wizard를 유지한다.
   - `wizardController.isWizardMode = true`
   - `processing-method`, `action`, `follow-up` 단계 표시

2. `choiceActionId`가 있는 설정 완료 중간 노드
   - view mode에서는 현재 작업 설정 요약과 출력 데이터를 표시한다.
   - edit mode에서는 기존 choice wizard edit 흐름을 유지한다.

processing-method 전용 노드는 8장의 읽기 전용 정책을 따른다.

## 10. OutputPanel 데이터 로딩 기준

기존 출력 데이터 모델은 detail mode에서만 node data query를 활성화했다.

```ts
nodeId: isDetailMode ? activePanelNodeId : null
```

보정 후에는 시작 노드 view와 processing-method 전용 요약에서도 필요한 schema/source summary를 사용할 수 있도록 로딩 기준을 명시한다.

```ts
const shouldLoadOutputPanelData =
  isStartViewMode || isDetailMode || isProcessingMethodOnlyNode;

const nodeDataPanel = useNodeDataPanelModel({
  panelKind: "output",
  workflowId: workflowId || undefined,
  nodeId: shouldLoadOutputPanelData ? activePanelNodeId : null,
  canViewExecutionData,
  isWorkflowDirty: isDirty,
});
```

시작 노드의 실제 source preview 실행 버튼은 왼쪽 `InputPanel`에 유지하고, 오른쪽은 source 설정 요약과 예상 출력 중심으로 표시한다.

## 11. fallback summary

`NODE_REGISTRY`에 없는 node type이거나 예상 분기에 걸리지 않는 경우에도 오른쪽 패널은 비어 있으면 안 된다.

fallback은 아래 정보를 표시한다.

- 노드 이름
- 노드 타입
- 설정 상태
- 표시 정보를 불러오지 못했다는 안내
- 수정 버튼 없음

## 12. 구현 단계

1. `InputPanel`에서 시작 노드 설정 폼과 수정 버튼 제거
2. `OutputPanel` 열림 조건에서 `!isStartNode` 제거
3. `OutputPanel`에 시작 노드 view/edit 분기 추가
4. 시작 노드 source summary UI를 오른쪽 패널로 이동
5. 도착 노드 sink summary UI 추가
6. processing-method 전용 노드 판별 helper 추가
7. 중간 노드 수정 버튼 노출 조건 보정
8. fallback summary 추가
9. 시작/도착/중간 노드 클릭 UX 회귀 테스트

## 13. 완료 기준

- 시작 노드 클릭 시 왼쪽/오른쪽 패널이 모두 열린다.
- 시작 노드 오른쪽 패널에서 현재 source 설정 요약이 보인다.
- 시작 노드 `설정 수정` 시 오른쪽 패널 안에서 `SourceNodePanel`이 열린다.
- 시작 노드 edit UI는 왼쪽 `InputPanel`에서 더 이상 열리지 않는다.
- 도착 노드 오른쪽 패널에서 현재 sink 설정 요약이 보인다.
- 도착 노드 `설정 수정` 시 오른쪽 패널 안에서 `SinkNodePanel`이 열린다.
- `한 파일씩` 처리 노드는 요약만 보이고 수정 버튼이 보이지 않는다.
- AI, 분류, 필터처럼 `choiceActionId`가 있는 중간 노드는 기존처럼 수정 가능하다.
- registry에 없는 노드 타입도 빈 패널이 아니라 fallback summary를 보여준다.
- 템플릿으로 생성된 워크플로우에서도 시작/도착 노드 재설정이 가능하다.
