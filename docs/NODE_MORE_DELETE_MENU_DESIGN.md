# Node More Delete Menu Design

> **작성일:** 2026-05-13
> **대상 화면:** `/workflows/:workflowId` 워크플로우 편집 캔버스
> **범위:** 노드의 `...` 버튼 클릭 시 삭제 메뉴 노출
> **대상 저장소:** `flowify-FE`
> **관련 이슈:** 노드 `...` 삭제 메뉴 예정
> **최종 검토:** 3회 문서/설계 검토 반영 완료

---

## 0. 3회 검토 요약

### 0.1 1차 검토: 현재 노드 삭제 흐름과 충돌 가능성

확인 파일:

- `src/entities/node/ui/BaseNode.tsx`
- `src/entities/node/ui/NodeEditorContext.ts`
- `src/widgets/canvas/ui/Canvas.tsx`
- `src/entities/workflow/model/useDeleteWorkflowNodeMutation.ts`
- `src/widgets/editor-remote-bar/ui/WorkflowToolMenuButton.tsx`

결론:

- 현재 노드는 hover 시 우측 상단에 `MdCancel` 아이콘을 보여주고, 클릭 즉시 `onRemoveNode(id)`를 호출한다.
- 삭제 API와 store 동기화는 이미 `Canvas`에서 처리하고 있으므로, 이번 작업은 노드 UI의 action 진입 방식만 바꾸면 된다.
- `Menu`를 노드 hover 조건부 렌더링 안에 그대로 넣으면, 포인터가 메뉴 포털로 이동하는 순간 hover가 풀려 trigger가 unmount될 수 있다.
- 따라서 `isMenuOpen` 상태를 `BaseNode`가 들고, `isHovered || selected || isMenuOpen`일 때 메뉴 버튼을 유지해야 한다.
- 노드 클릭은 패널 열기와 연결되어 있으므로, `...` trigger와 menu item은 `pointerdown/click/select` 이벤트 전파를 막아야 한다.
- React Flow 내부 버튼이 노드 drag/pan으로 해석되지 않도록 trigger와 menu content에 `nodrag nopan` 클래스를 붙인다.

### 0.2 2차 검토: 과한 설계 제거

제외한 설계:

- 삭제 확인 모달 추가
- 전역 메뉴 상태 store 추가
- 삭제 pending 상태를 `NodeEditorContext` 계약에 새로 추가
- Spring/FastAPI API 변경
- 노드별 권한 정책 재설계

이유:

- 요구사항은 "`...` 버튼 클릭 시 삭제 메뉴가 뜨도록" 만드는 것이다.
- 기존 삭제 흐름은 이미 서버 API, store hydrate, toast error 처리가 구현되어 있다.
- 확인 모달이나 pending 상태는 UX를 더 무겁게 만들 수 있고, 현재 직접 삭제 버튼을 메뉴 한 단계로 바꾸는 것만으로 실수 삭제 위험이 줄어든다.
- 권한은 기존 `canEditNodes` 기준을 그대로 사용한다.

### 0.3 3차 검토: 접근성, 터치, 구현 적합성

보완 반영:

- hover가 없는 환경에서도 선택된 노드에는 `...` 버튼을 노출한다.
- trigger는 `aria-label="노드 메뉴 열기"`와 `title="노드 메뉴"`를 가진다.
- menu item은 삭제 의도를 명확히 하기 위해 `MdDeleteOutline` 아이콘과 `삭제` 텍스트를 함께 쓴다.
- 메뉴는 `placement="bottom-end"`로 노드 우측 상단 버튼 아래에 붙인다.
- 메뉴가 열린 동안에는 hover가 풀려도 trigger가 unmount되지 않는다.
- `canEditNodes=false`인 공유/읽기 전용 상태에서는 메뉴 자체를 노출하지 않는다.

---

## 1. 목적

현재 워크플로우 캔버스 노드는 hover 시 작은 삭제 아이콘을 바로 노출한다. 사용자는 삭제 버튼을 실수로 누를 수 있고, 노드별 action 진입 방식도 워크플로우 상단 도구 메뉴와 다르다.

이번 작업의 목적은 다음과 같다.

- 노드 우측 상단 action을 직접 삭제 버튼에서 `...` 메뉴 버튼으로 변경한다.
- `...` 클릭 시 삭제 메뉴를 노출한다.
- 기존 노드 삭제 API, store 동기화, error toast 흐름은 그대로 유지한다.
- 캔버스 클릭, 패널 열기, 드래그, React Flow 선택 동작과 충돌하지 않게 한다.

---

## 2. 현재 상태

### 2.1 현재 `BaseNode` 삭제 UI

현재 `BaseNode`는 hover 상태를 내부 state로 관리한다.

```tsx
const [isHovered, setIsHovered] = useState(false);
```

hover 중이고 편집 권한이 있으면 우측 상단에 직접 삭제 버튼을 보여준다.

```tsx
{isHovered && canEditNodes ? (
  <IconButton
    aria-label="노드 삭제"
    size="xs"
    position="absolute"
    top={1}
    right={1}
    variant="ghost"
    onClick={handleRemoveNode}
  >
    <MdCancel />
  </IconButton>
) : null}
```

삭제 버튼은 클릭 이벤트 전파를 막고 `onRemoveNode(id)`를 호출한다.

```tsx
const handleRemoveNode = (event: MouseEvent<HTMLButtonElement>) => {
  event.stopPropagation();
  onRemoveNode(id);
};
```

### 2.2 삭제 실행 흐름

삭제 실행은 `Canvas`가 담당한다.

```text
BaseNode
  -> useNodeEditorContext().onRemoveNode(id)
  -> Canvas.handleRemoveNode(nodeId)
  -> useDeleteWorkflowNodeMutation()
  -> workflowApi.deleteNode(workflowId, nodeId)
  -> hydrateStore(nextWorkflow)
```

실패 시 `Canvas`에서 toast를 띄운다.

```text
title: "노드 삭제 실패"
description: "노드를 삭제하지 못했습니다. 잠시 후 다시 시도해주세요."
```

따라서 새 메뉴는 삭제 실행 경로를 새로 만들지 않고 `onRemoveNode(id)`만 호출하면 된다.

### 2.3 재사용 가능한 메뉴 레퍼런스

`WorkflowToolMenuButton`은 이미 Chakra `Menu`와 `Portal`을 사용한다.

```text
Menu.Root
  -> Menu.Trigger asChild
  -> Portal
  -> Menu.Positioner
  -> Menu.Content
  -> Menu.Item value="delete"
```

노드 메뉴도 같은 구조를 따른다. 다만 노드는 부모 컨테이너 클릭이 패널 열기와 연결되어 있으므로 이벤트 전파 방지가 추가로 필요하다.

---

## 3. 설계 결정

### 3.1 UI 결정

기존:

```text
hover node -> X 아이콘 노출 -> 클릭 즉시 삭제
```

변경:

```text
hover 또는 selected node -> ... 버튼 노출 -> 클릭 -> 삭제 메뉴 노출 -> 삭제 선택
```

노출 조건:

```ts
const shouldShowNodeMenu = canEditNodes && (isHovered || selected || isMenuOpen);
```

이 조건을 쓰는 이유:

- hover 중에는 기존처럼 action 진입점이 보인다.
- selected 상태에서도 버튼이 보여 터치 환경에서 접근할 수 있다.
- menu open 중에는 포인터가 메뉴로 이동해도 trigger가 사라지지 않는다.

### 3.2 컴포넌트 분리

`BaseNode`에 Chakra `Menu` 마크업을 직접 길게 넣지 않고, 작은 전용 컴포넌트를 추가한다.

권장 파일:

```text
src/entities/node/ui/NodeMoreMenuButton.tsx
```

역할:

- `...` trigger 렌더링
- `삭제` menu item 렌더링
- 메뉴 open 상태 전달
- trigger/menu item 이벤트 전파 차단

`BaseNode` 역할:

- hover/open/selected 기반 노출 조건 계산
- `onRemoveNode(id)` 호출 핸들러 제공
- 위치 지정

### 3.3 props 계약

```ts
type NodeMoreMenuButtonProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
};
```

`canEditNodes`는 `BaseNode`에서 노출 여부로 제어한다. 메뉴 컴포넌트에는 권한 판단을 넣지 않는다.

이유:

- `BaseNode`가 노드 상태와 editor context를 이미 알고 있다.
- 메뉴 컴포넌트는 표시와 선택 이벤트에 집중한다.
- 권한 로직 중복을 줄인다.

### 3.4 이벤트 정책

노드 root는 클릭 시 설정 패널을 연다.

```tsx
<Box onClick={handleOpenPanel}>
```

따라서 메뉴 trigger는 다음 이벤트를 막아야 한다.

```tsx
onPointerDown={(event) => event.stopPropagation()}
onClick={(event) => event.stopPropagation()}
```

삭제 item 선택도 노드 클릭으로 전파되면 안 된다. Chakra `Menu.Item.onSelect`는 기존 코드에서 단순 handler로 사용하고 있으므로, DOM event 제어는 `Menu.Content` 쪽에서 처리한다.

```tsx
<Menu.Content
  onPointerDown={(event) => event.stopPropagation()}
  onClick={(event) => event.stopPropagation()}
>
  <Menu.Item
    value="delete"
    onSelect={() => {
      onOpenChange(false);
      onDelete();
    }}
  >
    삭제
  </Menu.Item>
</Menu.Content>
```

`Menu.Item`에 직접 DOM event가 필요한 구현으로 바꾸게 된다면, 다음처럼 item의 click 이벤트에서 전파를 막는다.

```tsx
onClick={(event) => {
  event.stopPropagation();
}}
```

React Flow 노드 내부의 interactive element는 drag/pan gesture와 충돌할 수 있으므로 trigger와 menu content에는 다음 class를 함께 둔다.

```tsx
className="nodrag nopan"
```

### 3.5 삭제 확인 정책

V1에서는 삭제 확인 모달을 추가하지 않는다.

이유:

- 기존 동작은 클릭 즉시 삭제였다.
- 이번 변경은 `...` 열기 후 `삭제` 선택이라는 한 단계 의도 확인을 이미 추가한다.
- 모달을 추가하면 `Canvas`의 node delete pending, active panel, focus restore까지 설계 범위가 커진다.

추후 요구가 있으면 `NodeDeleteConfirmDialog`를 별도 작업으로 분리한다.

---

## 4. 구현 설계

### 4.0 서버 영향도

이번 작업은 FE UI 변경만 포함한다.

변경 없음:

- `flowify-BE-spring`
- `flowify-BE`
- MongoDB schema
- delete node API contract
- workflow response contract

이유:

- 노드 삭제 API는 이미 `workflowApi.deleteNode(workflowId, nodeId)`로 연결되어 있다.
- `Canvas.handleRemoveNode()`가 서버 응답을 받아 `hydrateStore(nextWorkflow)`로 editor store를 갱신한다.
- 요구사항은 삭제 실행 방식이 아니라 삭제 action 진입 UI를 `...` 메뉴로 바꾸는 것이다.

### 4.1 `NodeMoreMenuButton` 추가

예상 구조:

```tsx
import { MdDeleteOutline, MdMoreHoriz } from "react-icons/md";

import { Button, Icon, Menu, Portal, Text } from "@chakra-ui/react";

type NodeMoreMenuButtonProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
};

export const NodeMoreMenuButton = ({
  open,
  onOpenChange,
  onDelete,
}: NodeMoreMenuButtonProps) => (
  <Menu.Root
    lazyMount
    unmountOnExit
    open={open}
    onOpenChange={(details) => onOpenChange(details.open)}
    positioning={{ placement: "bottom-end" }}
  >
    <Menu.Trigger asChild>
      <Button
        type="button"
        aria-label="노드 메뉴 열기"
        title="노드 메뉴"
        className="nodrag nopan"
        height="26px"
        minW="26px"
        px={0}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <Icon as={MdMoreHoriz} boxSize={4} />
      </Button>
    </Menu.Trigger>

    <Portal>
      <Menu.Positioner zIndex={30}>
        <Menu.Content
          className="nodrag nopan"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <Menu.Item
            value="delete"
            onSelect={() => {
              onOpenChange(false);
              onDelete();
            }}
            color="status.error"
          >
            <Icon as={MdDeleteOutline} boxSize={4} />
            <Text as="span" fontSize="sm">삭제</Text>
          </Menu.Item>
        </Menu.Content>
      </Menu.Positioner>
    </Portal>
  </Menu.Root>
);
```

스타일은 `WorkflowToolMenuButton`과 최대한 맞춘다.

- `bg="bg.surface"`
- `borderColor="border.default"`
- `boxShadow="lg"`
- trigger hover: `bg="bg.overlay"`
- delete item color: `status.error`

### 4.2 `BaseNode` 변경

기존 `MdCancel` import와 `handleRemoveNode(event)`를 제거한다.

변경 후:

```tsx
const [isHovered, setIsHovered] = useState(false);
const [isMenuOpen, setIsMenuOpen] = useState(false);

const shouldShowNodeMenu =
  canEditNodes && (isHovered || selected || isMenuOpen);

const handleRemoveNode = () => {
  setIsMenuOpen(false);
  onRemoveNode(id);
};
```

렌더링:

```tsx
{shouldShowNodeMenu ? (
  <Box position="absolute" top={1} right={1}>
    <NodeMoreMenuButton
      open={isMenuOpen}
      onOpenChange={setIsMenuOpen}
      onDelete={handleRemoveNode}
    />
  </Box>
) : null}
```

`BaseNodeProps.selected`는 현재 선언되어 있지만 사용하지 않는다. 이번 작업에서 selected를 의미 있게 사용한다.

### 4.3 export 정리

현재 `src/entities/node/ui/index.ts`가 있다면 `NodeMoreMenuButton`을 export한다. 없다면 `BaseNode`에서 상대 경로로 직접 import해도 된다.

권장:

```ts
export * from "./NodeMoreMenuButton";
```

단, 외부 계층에서 사용할 계획이 없으면 export는 필수는 아니다. V1에서는 `BaseNode` 내부 전용 컴포넌트로 시작해도 충분하다.

---

## 5. 구현 순서

1. `src/entities/node/ui/NodeMoreMenuButton.tsx` 추가
2. `BaseNode.tsx`에서 `MdCancel`, `IconButton`, `MouseEvent` 기반 직접 삭제 버튼 제거
3. `BaseNode.tsx`에 `isMenuOpen`, `shouldShowNodeMenu`, `handleRemoveNode` 추가
4. hover, selected, menu open 상태에서 메뉴 버튼 유지 확인
5. `canEditNodes=false`일 때 메뉴가 보이지 않는지 확인
6. 삭제 메뉴 선택 시 기존 `onRemoveNode(id)`가 호출되는지 확인
7. `pnpm tsc`, `pnpm test`, 필요 시 `pnpm build` 실행

---

## 6. 테스트 계획

### 6.1 단위 테스트

기존 테스트 인프라상 `BaseNode` 렌더 테스트가 없다면 필수 추가 범위는 아니다. 다만 추가한다면 다음을 검증한다.

- `canEditNodes=false`이면 `노드 메뉴 열기` 버튼이 보이지 않는다.
- hover 또는 selected이면 `노드 메뉴 열기` 버튼이 보인다.
- `...` 클릭 시 `삭제` menu item이 보인다.
- `삭제` 선택 시 `onRemoveNode(id)`가 1회 호출된다.
- trigger 클릭이 `onOpenPanel(id)`를 호출하지 않는다.

### 6.2 수동 검증

검증 시나리오:

- 노드 hover 시 우측 상단에 `...` 버튼이 노출된다.
- `...` 클릭 시 삭제 메뉴가 노드 우측 상단 아래에 열린다.
- 메뉴가 열린 상태에서 포인터가 노드 밖으로 이동해도 메뉴가 닫히거나 trigger가 사라지지 않는다.
- 삭제 선택 시 노드가 삭제되고 캔버스가 서버 응답 기준으로 갱신된다.
- 삭제 실패 시 기존 toast가 뜬다.
- 노드 본문 클릭은 기존처럼 패널을 연다.
- `...` 클릭은 패널을 열지 않는다.
- 읽기 전용 워크플로우에서는 `...` 버튼이 보이지 않는다.
- start/end/middle node 모두 기존 삭제 정책과 동일하게 동작한다.

### 6.3 회귀 검증 명령

```bash
pnpm tsc
pnpm test
pnpm build
```

---

## 7. 위험 요소와 대응

### 7.1 메뉴 open 중 trigger unmount

위험:

- hover 조건으로만 버튼을 렌더링하면 메뉴 포털로 포인터가 이동할 때 버튼이 사라질 수 있다.

대응:

- `isMenuOpen`을 `BaseNode`가 관리한다.
- `shouldShowNodeMenu = canEditNodes && (isHovered || selected || isMenuOpen)`로 렌더링한다.

### 7.2 노드 클릭과 메뉴 클릭 충돌

위험:

- `...` 클릭이 노드 root click으로 전파되어 설정 패널이 열릴 수 있다.

대응:

- trigger의 `onPointerDown`, `onClick`에서 `stopPropagation()` 처리한다.
- menu content의 `onPointerDown`, `onClick`에서 `stopPropagation()` 처리한다.
- delete item의 `onSelect`는 메뉴 닫기와 삭제 실행만 담당한다.

### 7.3 캔버스 드래그/패닝 충돌

위험:

- React Flow가 pointer event를 받아 노드 drag나 canvas interaction을 시작할 수 있다.

대응:

- trigger에서 pointer event 전파를 막는다.
- trigger와 menu content에 `className="nodrag nopan"`을 지정한다.
- menu content는 `Portal`로 띄우고 충분한 `zIndex`를 준다.

### 7.4 삭제 pending 중 중복 선택

위험:

- 현재 `NodeEditorContext`는 delete pending 상태를 제공하지 않는다.
- 사용자가 빠르게 여러 번 삭제를 선택할 수 있다.

대응:

- V1에서는 기존 직접 삭제 버튼과 동일한 정책을 유지한다.
- 중복 삭제 문제가 실제로 확인되면 `NodeEditorContext`에 `isDeleteNodePending` 또는 node별 pending state를 추가하는 후속 작업으로 분리한다.

### 7.5 확인 모달 부재

위험:

- 메뉴에서 삭제를 선택하면 바로 삭제된다.

대응:

- 기존은 버튼 클릭 즉시 삭제였고, 이번 변경은 메뉴 선택 단계를 추가한다.
- 삭제 확인 모달은 요구사항 범위를 넘기 때문에 V1에서 제외한다.

---

## 8. 완료 기준

- 노드 hover 또는 selected 상태에서 `...` 버튼이 노출된다.
- `...` 버튼 클릭 시 삭제 메뉴가 노출된다.
- 삭제 메뉴의 `삭제` 선택 시 기존 노드 삭제 API 흐름이 실행된다.
- `...` 클릭과 삭제 메뉴 클릭이 노드 패널 열기 이벤트를 발생시키지 않는다.
- 메뉴 open 중 hover가 풀려도 메뉴가 안정적으로 유지된다.
- 읽기 전용 상태에서는 메뉴가 보이지 않는다.
- FE 타입 체크와 기존 테스트가 통과한다.

---

## 9. 최종 요약

이번 기능은 서버 계약이나 워크플로우 삭제 도메인을 바꾸는 작업이 아니라, 노드 action UI를 직접 삭제 버튼에서 `...` 메뉴로 바꾸는 얇은 FE 변경이다.

가장 중요한 설계 포인트는 `Menu`가 열린 동안 trigger가 사라지지 않게 `isMenuOpen`을 렌더 조건에 포함하는 것과, `...` 버튼 클릭이 노드 패널 열기/드래그로 전파되지 않게 이벤트를 차단하는 것이다. 삭제 실행은 기존 `Canvas.handleRemoveNode`와 `useDeleteWorkflowNodeMutation` 흐름을 그대로 재사용한다.
