# Dashboard Issue Card Navigation and Detail Toggle Design

> **작성일:** 2026-05-14
> **대상 영역:** Dashboard `오늘 발생한 에러`
> **대상 저장소:** `flowify-FE`
> **범위:** FE UI/interaction 설계

---

## 0. 3회 검토 요약

### 0.1 1차 검토: 현재 Dashboard Issue Card 구조 분석

확인한 파일:

- `src/pages/dashboard/DashboardPage.tsx`
- `src/pages/dashboard/ui/section/DashboardSection.tsx`
- `src/pages/dashboard/ui/DashboardIssueCardItem.tsx`
- `src/pages/dashboard/ui/DashboardErrorCard.tsx`
- `src/pages/dashboard/model/useDashboardData.ts`
- `src/pages/dashboard/model/useDashboardActions.ts`
- `src/pages/dashboard/model/dashboard.ts`
- `src/pages/dashboard/model/types.ts`
- `src/entities/dashboard/api/types.ts`
- `src/entities/dashboard/api/get-dashboard-summary.api.ts`
- `src/features/workflow-execution/model/useWorkflowExecutionAction.ts`
- `src/shared/constants/route-path.ts`
- `src/app/routes/Router.tsx`
- `src/pages/workflows/ui/WorkflowRow.tsx`
- `src/pages/templates/ui/TemplateRow.tsx`
- `src/pages/dashboard/ui/ServiceConnectionCard.tsx`
- `package.json`

현재 issue card 렌더링 구조:

- `DashboardPage`는 `DashboardSection`만 렌더링한다.
- `DashboardSection`의 `오늘 발생한 에러` 영역은 `issues.map`으로 `DashboardIssueCardItem`을 렌더링한다.
- `DashboardIssueCardItem`은 `useWorkflowExecutionAction(issue.workflowId)`로 실행/중지 액션 상태를 만든 뒤 `DashboardErrorCard`에 전달한다.
- `DashboardErrorCard`는 현재 카드 전체 `Box`에 `onClick={onToggle}`, `role="button"`, `tabIndex={0}`, `aria-expanded={isExpanded}`를 달아 카드 전체 클릭/Enter/Space로 상세 내역을 펼친다.

현재 issue 데이터 구조:

- API 응답 타입 `DashboardIssueResponse`는 `id`, `type`, `workflowId`, `workflowName`, `isActive`, `startService`, `endService`, `occurredAt`, `message`, `items`를 가진다.
- FE 모델 `DashboardIssue`도 `workflowId: string`을 가진다.
- `getDashboardIssuesFromSummary`는 `DashboardIssueResponse`를 `DashboardIssue`로 변환하며, `message`는 `buildProgressLabel`로 들어간다.
- `items`가 비어 있으면 `getDashboardIssueItems`에서 `issue.message` 또는 `type`을 fallback item으로 만든다.

현재 클릭/action 구조:

- 현재 카드 전체 클릭은 펼치기 토글이다.
- 오른쪽 끝에는 이미 실행/중지 `IconButton`이 있다.
- 실행/중지 버튼은 `event.stopPropagation()`을 호출해 카드 전체 토글과 충돌하지 않는다.
- `useDashboardActions`는 `expandedIssueId` 하나만 관리하므로 동시에 하나의 issue만 펼쳐진다.

workflowId 사용 가능 여부:

- 현재 타입 기준으로 `workflowId`는 필수 string이다.
- `useWorkflowExecutionAction`은 `workflowId: string | undefined`를 받을 수 있어 방어 로직이 이미 있다.
- 요구사항상 `workflowId`가 없거나 빈 값인 issue 가능성을 고려해야 하므로, 구현 시 타입을 성급히 바꾸기보다 card/item 레벨에서 `typeof issue.workflowId === "string" && issue.workflowId.trim().length > 0` 형태의 runtime guard를 둔다.

기존 레퍼런스와 유지할 부분:

- `DashboardIssueCardItem -> DashboardErrorCard` 분리 구조는 유지한다.
- `DashboardSection`의 `expandedIssueId` 단일 확장 상태는 유지한다.
- `dashboard summary API`, `DashboardIssueResponse`, `DashboardIssue` 변환 흐름은 유지한다.
- `issue.items` fallback 생성 로직은 유지한다.
- 실행/중지 액션과 `useWorkflowExecutionAction`은 유지한다.
- `WorkflowRow`, `TemplateRow`, `ServiceConnectionCard`에서 쓰는 내부 액션 `stopPropagation` 패턴을 따른다.

### 0.2 2차 검토: 이벤트 충돌 가능성 분석

카드 가운데 클릭과 오른쪽 펼치기 클릭의 충돌 가능성:

- 현재는 root card 전체가 펼치기 버튼 역할을 하기 때문에, 가운데 클릭을 workflow 이동으로 바꾸면 root `onClick={onToggle}`와 목적이 충돌한다.
- root container에 click handler를 유지하면 오른쪽 펼치기 버튼, 실행/중지 버튼, 상세 item 클릭이 모두 bubbling 충돌 가능성을 갖는다.
- 따라서 root card는 시각적 container로만 두고, interaction은 `MainClickableArea`, `ExecutionActionButton`, `RightToggleButton`으로 분리한다.

event.stopPropagation 필요 지점:

- `RightToggleButton` 클릭은 `event.stopPropagation()` 후 `onToggle()`만 호출한다.
- 기존 `ExecutionActionButton` 클릭은 지금처럼 `event.stopPropagation()` 후 `onExecutionAction()`만 호출한다.
- 만약 오른쪽 action group 전체에 pointer/key handler를 둔다면 `onPointerDown`, `onClick`, `onKeyDown`에서 propagation을 막는 기존 menu 패턴을 참고한다.
- 펼쳐진 상세 영역은 root click handler를 제거하면 별도 stopPropagation이 필수는 아니지만, 상세 영역 내부에 향후 링크/버튼이 생길 가능성을 고려해 root click 의존을 만들지 않는다.

Link/useNavigate 중 어떤 방식이 적절한지:

- 현재 프로젝트의 목록 row navigation은 `WorkflowRow`, `TemplateRow`, `useWorkflowListActions`, `useCreateWorkflowShortcut`에서 `useNavigate`와 callback 기반 `onOpen` 패턴을 많이 쓴다.
- `DashboardIssueCardItem`이 `useNavigate`와 `buildPath.workflowEditor(issue.workflowId)`를 사용해 `onOpenWorkflow`를 만들고, `DashboardErrorCard`는 routing을 모르는 presentational component로 유지하는 방식이 적절하다.
- `<Link>`로 main area를 감쌀 수도 있지만, 현재 카드 안에 실행/중지와 펼치기 `IconButton`이 함께 존재하므로 sibling action 영역과 명확히 분리해야 한다. 기존 callback 패턴과 일관성을 위해 `useNavigate`를 우선한다.

버튼/클릭 영역 분리 방식:

- `IssueCard` root는 `Box` container로 유지한다.
- 가운데 영역은 `Box as="button"` 또는 `Flex as="button"` 형태의 `MainClickableArea`로 분리한다.
- 오른쪽 끝에는 `RightToggleButton`을 둔다.
- 기존 실행/중지 버튼은 오른쪽 action group 안에 유지하되, 펼치기 버튼을 가장 오른쪽에 둔다.
- main area와 right action group은 sibling이어야 하며, main area 안에 `IconButton`이 중첩되지 않게 한다.

키보드 접근성 고려:

- main clickable area는 native `button`을 쓰는 것이 가장 안전하다. 그러면 Enter/Space 동작은 브라우저 기본 버튼 동작을 사용할 수 있다.
- workflowId가 없으면 main clickable area는 `disabled` 또는 `aria-disabled` 상태가 되어야 한다.
- toggle button은 `aria-label={isExpanded ? "에러 상세 접기" : "에러 상세 펼치기"}`와 `aria-expanded={isExpanded}`를 가진다.
- toggle button은 `aria-controls`로 상세 영역 id를 참조할 수 있다.
- root container에 `role="button"`을 남기지 않는다. interactive element가 여러 개 있는 card에서 root button role은 스크린 리더와 키보드 탐색에 혼란을 줄 수 있다.

workflowId가 없을 때 처리:

- `workflowId`가 없거나 빈 문자열이면 main area 이동을 비활성화한다.
- 비활성 상태에서는 cursor를 `default`로 두고 hover elevation을 적용하지 않는다.
- 보조 문구는 과하게 추가하지 않고, 필요하면 `title="연결된 워크플로우 정보가 없습니다."` 정도만 둔다.
- 실행/중지 action은 `useWorkflowExecutionAction`의 기존 guard가 있으므로, 구현 시 action disabled 조건에도 `!canNavigateWorkflow`를 반영하는 것을 검토한다.

### 0.3 3차 검토: 구현 범위와 회귀 위험 분석

수정할 파일:

- `src/pages/dashboard/ui/DashboardIssueCardItem.tsx`
- `src/pages/dashboard/ui/DashboardErrorCard.tsx`

필요 시 수정할 파일:

- `src/pages/dashboard/model/types.ts`

단, `workflowId` optional 전환은 API/모델 계약 변경에 가까우므로 1차 구현에서는 피하고 runtime guard로 대응한다.

수정하지 않을 파일:

- `src/entities/dashboard/api/get-dashboard-summary.api.ts`
- `src/entities/dashboard/api/types.ts`
- `src/pages/dashboard/model/useDashboardData.ts`
- `src/pages/dashboard/model/dashboard.ts`
- `src/pages/dashboard/model/useDashboardActions.ts`
- `src/features/workflow-execution/model/useWorkflowExecutionAction.ts`
- Spring/FastAPI/DB/workflow execution 관련 파일

서버/API/DB 영향 여부:

- 없음.
- dashboard summary API 응답 형태는 유지한다.
- issue type, source, workflow 실행 흐름은 변경하지 않는다.

dashboard summary API 변경 필요 여부:

- 필요 없음.
- 이미 `workflowId`, `message`, `items`가 존재한다.
- `items`가 없는 경우 FE mapper에서 fallback item을 생성하고 있으므로 상세 영역 fallback도 기존 데이터 흐름으로 처리 가능하다.

기존 실행/중지 액션 영향 여부:

- 실행/중지 버튼은 유지한다.
- 기존 `event.stopPropagation()` 패턴은 유지한다.
- 오른쪽 action group에 펼치기 버튼이 추가되므로 버튼 순서와 touch target만 조정한다.

수동 검증 항목:

- issue main area 클릭 시 `/workflows/:workflowId` 편집 화면으로 이동한다.
- 오른쪽 펼치기 버튼 클릭 시 상세 내역만 펼쳐지고 페이지 이동은 발생하지 않는다.
- 실행/중지 버튼 클릭 시 상세 토글과 페이지 이동이 발생하지 않는다.
- Enter/Space로 main area를 조작하면 workflow 편집 화면으로 이동한다.
- Enter/Space로 toggle button을 조작하면 상세만 펼쳐진다.
- workflowId가 없는 issue는 이동 UI가 비활성화되고 상세 펼치기는 가능하다.
- 좁은 화면에서 main area와 right action button이 겹치거나 너무 작아지지 않는다.

## 1. 목적

`오늘 발생한 에러` 영역은 사용자가 실패한 자동화를 빠르게 확인하는 대시보드 진입점이다.

이번 개선의 목적은 다음과 같다.

- 에러 카드의 주요 내용 영역을 클릭하면 해당 workflow 편집 화면으로 바로 이동할 수 있게 한다.
- 오른쪽 끝에는 에러 상세 내역을 펼치는 전용 액션을 둔다.
- 가운데 이동 클릭과 오른쪽 펼치기 클릭이 이벤트 전파로 충돌하지 않게 한다.
- 기존 dashboard API, issue 데이터 source, workflow 실행/중지 액션은 그대로 유지한다.

## 2. 현재 상태 분석

### 2.1 Dashboard issue card 컴포넌트

현재 `오늘 발생한 에러` 영역은 다음 흐름으로 렌더링된다.

```text
DashboardPage
  └─ DashboardSection
      └─ DashboardIssueCardItem
          └─ DashboardErrorCard
```

`DashboardSection`은 `useDashboardData()`에서 받은 `issues`를 순회하고, `useDashboardActions()`의 `expandedIssueId`와 `handleToggleIssue`를 각 card에 전달한다.

`DashboardIssueCardItem`은 issue별 실행/중지 상태를 만들기 위해 `useWorkflowExecutionAction(issue.workflowId)`를 호출한다.

`DashboardErrorCard`는 실제 카드 UI를 렌더링한다. 현재 root `Box`가 clickable이며, `onClick={onToggle}`로 상세 영역을 펼치거나 접는다.

### 2.2 issue type 구조

API 응답 타입:

```ts
export type DashboardIssueResponse = {
  id: string;
  type: "EXECUTION_FAILED" | "WORKFLOW_NOT_EXECUTABLE" | string;
  workflowId: string;
  workflowName: string | null;
  isActive: boolean;
  startService: string | null;
  endService: string | null;
  occurredAt: string | null;
  message: string | null;
  items: DashboardIssueItemResponse[];
};
```

FE view model:

```ts
export type DashboardIssue = {
  id: string;
  workflowId: string;
  name: string;
  isActive: boolean;
  startBadgeKey: ServiceBadgeKey;
  endBadgeKey: ServiceBadgeKey;
  relativeUpdateLabel: string;
  buildProgressLabel: string;
  items: DashboardIssueItem[];
};
```

현재 타입상 `workflowId`는 존재하지만, 요구사항상 runtime data가 비어 있을 가능성을 고려한다.

### 2.3 workflowId 존재 여부

`DashboardIssueResponse.workflowId`와 `DashboardIssue.workflowId` 모두 string이다.

다만 구현 시 다음 guard를 둔다.

```ts
const workflowId = issue.workflowId?.trim();
const canOpenWorkflow = Boolean(workflowId);
```

더 방어적으로는 runtime data를 고려해 다음처럼 체크할 수 있다.

```ts
const workflowId =
  typeof issue.workflowId === "string" ? issue.workflowId.trim() : "";
const canOpenWorkflow = workflowId.length > 0;
```

이 guard는 API 타입을 바꾸지 않으면서 workflowId가 비어 있는 상황의 UI 회귀를 막는다.

### 2.4 message/items 구조

`dashboard.ts`의 `getDashboardIssueItems`는 `issue.items.length === 0`이면 fallback item을 만든다.

fallback message 우선순위:

1. `issue.message`
2. `issue.type`
3. `"Issue"`

따라서 `DashboardErrorCard`는 지금처럼 `issue.items.map`을 사용해도 상세 내역이 비지 않는다.

구현 시에도 이 mapper를 유지하고, card 내부에서 별도 API fallback을 만들지 않는다.

### 2.5 현재 액션 버튼/상태 표시

현재 오른쪽 끝에는 실행/중지 `IconButton`이 있다.

- 실행 가능 상태: `MdPlayArrow`
- 실행 중 상태: `MdStop`
- pending 상태: `Spinner`
- label: `워크플로우 실행` 또는 `워크플로우 중지`

이 버튼은 `event.stopPropagation()`을 호출해 root card toggle과 충돌하지 않게 되어 있다.

### 2.6 routing 방식

workflow 편집 페이지 route:

```ts
DYNAMIC_ROUTE_PATHS.WORKFLOW_EDITOR = "/workflows/:id";
buildPath.workflowEditor = (id: string) => `/workflows/${id}`;
```

router 연결:

```tsx
<Route
  path={DYNAMIC_ROUTE_PATHS.WORKFLOW_EDITOR}
  element={<WorkflowEditorPage />}
/>
```

기존 코드에서는 workflow open 동작에 `useNavigate(buildPath.workflowEditor(id))` 패턴을 사용한다.

### 2.7 기존 UI 컴포넌트 패턴

기존 row click 패턴:

- `WorkflowRow`는 row 전체를 `role="button"`으로 두고 `onClick={onOpen}`을 사용한다.
- 내부 실행/삭제/menu 버튼에서는 `stopPropagation()`을 호출한다.
- `TemplateRow`도 row click과 오른쪽 action button을 분리한다.

이번 issue card는 interactive action이 둘 이상이므로 root 전체 `role="button"`보다는 main area button + right action buttons로 분리하는 편이 더 안전하다.

기존 expand/collapse 패턴:

- `DashboardErrorCard`는 Chakra `Accordion`/`Collapsible`을 쓰지 않고 `isExpanded ? <VStack /> : null` 조건부 렌더링을 사용한다.
- 현재 프로젝트에서 `Accordion`, `Collapsible`, `Disclosure` 사용 패턴은 확인되지 않았다.
- 따라서 새 dependency나 새 UI primitive를 도입하지 않고 기존 조건부 렌더링을 유지한다.

## 3. 요구사항 정의

### 3.1 가운데 클릭 동작

- 카드의 주요 내용 영역 클릭 시 `/workflows/:workflowId`로 이동한다.
- 이동 경로는 `buildPath.workflowEditor(workflowId)`를 사용한다.
- `workflowId`가 없거나 빈 문자열이면 이동을 비활성화한다.
- 이동 가능 상태에서는 `cursor="pointer"`와 hover/focus 스타일을 적용한다.
- 이동 불가능 상태에서는 `cursor="default"` 또는 `not-allowed`를 적용하고 hover elevation은 제거한다.
- 오른쪽 펼치기 버튼 클릭과 충돌하지 않는다.
- 실행/중지 버튼 클릭과도 충돌하지 않는다.

### 3.2 오른쪽 끝 펼치기 동작

- 오른쪽 끝에 펼치기 전용 `IconButton`을 배치한다.
- 버튼 클릭 시 상세 에러 내역을 표시한다.
- 다시 클릭하면 상세 에러 내역을 접는다.
- 펼치기 버튼 클릭 시 workflow 이동 이벤트가 발생하지 않는다.
- `onClick`에서 `event.stopPropagation()`을 호출한다.
- `aria-expanded`, `aria-controls`, 상태별 `aria-label`을 제공한다.
- 상세 내역에는 `issue.items`를 표시한다.
- `issue.items`가 비어 있는 경우는 mapper fallback이 이미 생성하지만, UI 레벨에서도 `issue.items.length === 0` 방어 메시지를 둘 수 있다.

### 3.3 유지할 동작

- 기존 dashboard issue 데이터 source를 유지한다.
- 기존 `/dashboard/summary` API를 유지한다.
- 기존 `DashboardIssueResponse`와 issue type 구조를 임의로 바꾸지 않는다.
- 기존 `getDashboardIssuesFromSummary` mapper 흐름을 유지한다.
- 기존 `expandedIssueId` 단일 확장 방식은 유지한다.
- 기존 workflow execution action이 동작하는 경로와 mutation hook은 변경하지 않는다.
- 기존 카드 시각 스타일은 최대한 유지한다.

## 4. UI/Interaction 설계

### 4.1 카드 레이아웃

권장 구조:

```text
IssueCard
  ├─ HeaderRow
  │   ├─ MainClickableArea  -> navigate(`/workflows/${workflowId}`)
  │   └─ RightActionGroup
  │       ├─ ExecutionActionButton -> run/stop
  │       └─ RightToggleButton     -> expand/collapse
  └─ ExpandedErrorDetails
```

root `IssueCard`는 더 이상 click handler를 갖지 않는다.

시각 스타일은 현재 `DashboardErrorCard` root의 값을 유지한다.

```text
bg="bg.surface"
border="1px solid"
borderColor="border.default"
borderRadius="10px"
boxShadow="0 0 4px rgba(239, 61, 61, 0.24)"
```

### 4.2 가운데 클릭 영역

`MainClickableArea`는 서비스 badge, workflow name, 발생 시각, error message를 포함한다.

권장 구현:

```tsx
<Flex
  as="button"
  type="button"
  flex={1}
  minW={0}
  align="center"
  gap={3}
  textAlign="left"
  disabled={!canOpenWorkflow}
  cursor={canOpenWorkflow ? "pointer" : "default"}
  onClick={canOpenWorkflow ? onOpenWorkflow : undefined}
>
  ...
</Flex>
```

`button`을 사용하면 Enter/Space keyboard activation은 기본 동작으로 처리된다.

주의:

- 이 영역 내부에는 다른 `button`을 넣지 않는다.
- `RightActionGroup`은 sibling으로 분리한다.
- disabled 상태에서 `onClick`이 실행되지 않게 한다.

### 4.3 오른쪽 펼치기 버튼 영역

오른쪽 끝 action group은 최소 두 버튼을 가진다.

```text
RightActionGroup
  ├─ ExecutionActionButton
  └─ DetailToggleButton
```

펼치기 버튼이 오른쪽 끝 요구사항을 만족하도록 action group의 마지막에 둔다.

권장 아이콘:

- 접힘 상태: `MdKeyboardArrowDown` 또는 `MdExpandMore`
- 펼침 상태: `MdKeyboardArrowUp` 또는 동일 아이콘 rotate

권장 구현:

```tsx
const handleToggleClick = (event: MouseEvent<HTMLButtonElement>) => {
  event.stopPropagation();
  onToggle();
};

<IconButton
  type="button"
  aria-label={isExpanded ? "에러 상세 접기" : "에러 상세 펼치기"}
  aria-expanded={isExpanded}
  aria-controls={detailsId}
  variant="ghost"
  size="sm"
  onClick={handleToggleClick}
>
  {isExpanded ? <MdKeyboardArrowUp /> : <MdKeyboardArrowDown />}
</IconButton>
```

실행/중지 버튼은 기존 handler를 유지한다.

```tsx
const handleExecutionActionClick = (event: MouseEvent<HTMLButtonElement>) => {
  event.stopPropagation();
  onExecutionAction();
};
```

### 4.4 펼쳐진 상세 영역

현재 구조처럼 `isExpanded` 조건부 렌더링을 유지한다.

권장 구조:

```tsx
{isExpanded ? (
  <VStack id={detailsId} align="stretch" gap={2} mt={4}>
    {issue.items.length > 0 ? (
      issue.items.map(...)
    ) : (
      <Text fontSize="sm" color="text.secondary">
        표시할 상세 에러 내역이 없습니다.
      </Text>
    )}
  </VStack>
) : null}
```

현재 mapper가 fallback item을 보장하므로 fallback text는 방어 용도다.

### 4.5 hover/focus 스타일

main clickable area:

- 이동 가능 시 hover에서 text/background를 아주 약하게 강조한다.
- root card 전체가 이동 가능한 것처럼 보이지 않게 hover는 main area에만 적용한다.
- `focusVisible` outline을 main area에 제공한다.

right action buttons:

- 기존 `IconButton variant="ghost" size="sm"`를 유지한다.
- toggle button은 expanded 상태에서 `_expanded` 또는 `bg="bg.overlay"`에 준하는 시각 피드백을 줄 수 있다.

disabled 상태:

- workflowId가 없으면 main area만 disabled 처리한다.
- toggle button은 workflowId와 무관하게 사용할 수 있다.
- 실행/중지 버튼은 workflowId가 없으면 disabled 처리를 검토한다.

### 4.6 모바일/좁은 화면

현재 `DashboardErrorCard`는 base에서 column, md 이상에서 row 방향을 쓴다.

새 구조에서는 다음 중 하나를 선택한다.

1. 기존처럼 base에서 column을 유지하고 action group을 오른쪽 아래에 둔다.
2. base에서도 row를 유지하되 main area `minW={0}`와 action group `flexShrink={0}`를 강하게 둔다.

권장:

- base에서는 header row를 `align="flex-start"`로 두고, action group은 `alignSelf="flex-end"`로 둔다.
- main area text는 `lineClamp={1}`를 유지한다.
- action button target은 `size="sm"` 이상을 유지한다.
- 상세 영역은 full width로 header row 아래에 표시한다.

### 4.7 workflowId 없는 issue 처리

처리 기준:

- `canOpenWorkflow === false`이면 main area는 disabled.
- `aria-disabled` 또는 `disabled`를 사용한다.
- `title="연결된 워크플로우 정보가 없습니다."`를 줄 수 있다.
- toggle button은 계속 활성화한다.
- 상세 내역은 계속 확인 가능하다.

권장 helper:

```ts
const getNavigableWorkflowId = (workflowId: unknown) =>
  typeof workflowId === "string" ? workflowId.trim() : "";
```

이 helper는 card 내부 private helper로 둘 수 있다.

### 4.8 error items 없는 경우 fallback 처리

기본적으로 `getDashboardIssueItems`가 fallback item을 만든다.

UI 방어는 다음 정도로 제한한다.

```text
issue.items.length > 0
  -> item list 렌더링
issue.items.length === 0
  -> "표시할 상세 에러 내역이 없습니다."
```

API나 mapper를 변경해 fallback 정책을 중복 구현하지 않는다.

## 5. 구현 설계

### 5.1 `DashboardIssueCardItem.tsx`

역할:

- routing 책임을 가진 container component로 확장한다.
- `useNavigate`와 `buildPath.workflowEditor`를 사용한다.
- `issue.workflowId` runtime guard를 만든다.
- `DashboardErrorCard`에 `canOpenWorkflow`, `onOpenWorkflow`를 전달한다.

권장 흐름:

```tsx
const navigate = useNavigate();
const workflowId = getNavigableWorkflowId(issue.workflowId);
const canOpenWorkflow = workflowId.length > 0;

const handleOpenWorkflow = () => {
  if (!canOpenWorkflow) return;
  navigate(buildPath.workflowEditor(workflowId));
};
```

주의:

- `onToggle`은 그대로 상세 전용 callback으로 유지한다.
- `useWorkflowExecutionAction(issue.workflowId)`는 기존대로 유지하되, workflowId guard를 반영할지 검토한다.

### 5.2 `DashboardErrorCard.tsx`

props 추가 후보:

```ts
type Props = {
  issue: DashboardIssue;
  executionActionKind: "run" | "stop";
  executionActionLabel: string;
  isExecutionActionPending: boolean;
  isExpanded: boolean;
  canOpenWorkflow: boolean;
  onOpenWorkflow: () => void;
  onToggle: () => void;
  onExecutionAction: () => void;
};
```

구조 변경:

- root `Box`에서 `cursor`, `onClick`, `onKeyDown`, `role="button"`, `tabIndex`, `aria-expanded` 제거
- main area에 click/keyboard 이동 책임 부여
- 오른쪽 toggle button에 `aria-expanded` 부여
- 기존 실행/중지 button handler 유지

### 5.3 `useDashboardActions.ts`

변경하지 않는다.

현재 `expandedIssueId` 단일 상태는 요구사항과 충돌하지 않는다.

### 5.4 `dashboard.ts` / `types.ts`

변경하지 않는다.

`workflowId` optional 전환은 API 계약 변경처럼 보일 수 있고, 이번 요구사항은 FE interaction 설계다.

## 6. 이벤트 설계

### 6.1 클릭 이벤트 흐름

```text
MainClickableArea click
  -> onOpenWorkflow()
  -> navigate(buildPath.workflowEditor(workflowId))

RightToggleButton click
  -> event.stopPropagation()
  -> onToggle()

ExecutionActionButton click
  -> event.stopPropagation()
  -> onExecutionAction()
```

root container에는 click handler가 없으므로 bubbling에 의존하지 않는다.

### 6.2 키보드 이벤트 흐름

```text
MainClickableArea Enter/Space
  -> native button activation
  -> onOpenWorkflow()

RightToggleButton Enter/Space
  -> native button activation
  -> onToggle()

ExecutionActionButton Enter/Space
  -> native button activation
  -> onExecutionAction()
```

custom `onKeyDown`은 최소화한다.

`WorkflowRow`처럼 root `div role="button"`에 keydown을 직접 붙이는 방식은 여기서는 피한다. 하나의 card 안에 main action, run/stop action, toggle action이 공존하기 때문이다.

## 7. 접근성 설계

- main area는 이동 버튼 역할이므로 `aria-label={`${issue.name} 워크플로우 편집 화면 열기`}`를 제공한다.
- workflowId가 없으면 main area는 disabled 처리한다.
- toggle button은 `aria-expanded`를 가진다.
- toggle button은 `aria-controls={detailsId}`를 가진다.
- details 영역은 `id={detailsId}`를 가진다.
- expanded details는 의미상 list에 가까우므로 현재 `VStack` 유지 또는 `role="list"`/item `role="listitem"` 적용을 검토한다.
- 실행/중지 button은 기존 `executionActionLabel`을 그대로 `aria-label`로 사용한다.

## 8. 회귀 위험과 대응

### 8.1 기존 펼치기 UX 변경 위험

위험:

- 기존에는 카드 아무 곳이나 누르면 펼쳐졌지만, 변경 후 오른쪽 버튼만 펼치기가 된다.

대응:

- 요구사항이 명시적으로 가운데 이동, 오른쪽 펼치기 분리를 요구하므로 의도된 변경이다.
- 오른쪽 button의 affordance를 명확히 한다.

### 8.2 실행/중지 버튼 위치 충돌

위험:

- 현재 오른쪽 끝 실행/중지 버튼이 있으며, 새 펼치기 버튼도 오른쪽 끝을 요구한다.

대응:

- right action group을 만들고 실행/중지 버튼을 왼쪽, 펼치기 버튼을 가장 오른쪽에 배치한다.
- 기존 실행/중지 버튼 기능은 그대로 유지한다.

### 8.3 workflowId 누락

위험:

- API 타입은 string이지만 실제 응답이 비어 있으면 navigate가 잘못된 URL로 이동할 수 있다.

대응:

- runtime guard로 빈 workflowId 이동을 막는다.
- toggle detail은 workflowId와 무관하게 동작하게 한다.

### 8.4 모바일 레이아웃

위험:

- main area와 action group이 좁은 화면에서 겹칠 수 있다.

대응:

- main area에 `minW={0}`와 lineClamp 유지
- action group에 `flexShrink={0}` 적용
- base breakpoint에서 action group 위치를 명확히 한다.

## 9. 테스트 / 검증 계획

정적 검증:

- `pnpm tsc`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

기존 mapper test 영향:

- `src/pages/dashboard/model/dashboard.test.ts`는 변경하지 않아도 통과해야 한다.
- workflowId mapper 구조를 바꾸지 않으므로 기존 test 영향은 없어야 한다.

수동 검증:

- 대시보드에서 error issue가 있는 상태로 진입한다.
- main area 클릭 시 `/workflows/:workflowId`로 이동한다.
- 오른쪽 펼치기 버튼 클릭 시 이동 없이 상세가 펼쳐진다.
- 펼친 상태에서 다시 오른쪽 버튼 클릭 시 접힌다.
- 실행/중지 버튼 클릭 시 이동/펼치기가 발생하지 않는다.
- Tab 이동 순서가 main area -> 실행/중지 -> 상세 toggle 순서로 자연스러운지 확인한다.
- 모바일 폭에서 action buttons가 텍스트를 덮지 않는지 확인한다.

## 10. 최종 권장 구현 범위

1차 구현은 다음 두 파일만 수정한다.

```text
src/pages/dashboard/ui/DashboardIssueCardItem.tsx
src/pages/dashboard/ui/DashboardErrorCard.tsx
```

수정하지 않는다.

```text
src/entities/dashboard/**
src/entities/workflow/**
src/entities/execution/**
src/features/workflow-execution/model/useWorkflowExecutionAction.ts
src/pages/dashboard/model/dashboard.ts
src/pages/dashboard/model/types.ts
Spring / FastAPI / DB / workflow execution API
```

이 범위가 가장 안전한 이유:

- routing 책임은 item container에만 추가한다.
- card UI는 기존 props 기반 구조를 유지한다.
- data source와 mapper는 그대로 둔다.
- 기존 실행/중지 action은 유지한다.
- 이벤트 충돌은 root click 제거와 sibling interactive area 분리로 해결한다.
