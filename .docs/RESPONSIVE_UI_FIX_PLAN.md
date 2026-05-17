# 1. 작업 개요

## 목적

Issue 18의 목표는 Flowify Frontend 워크플로우 에디터 화면에서 viewport 크기와 브라우저 확대 비율에 따라 패널, 캔버스, 노드 포커싱이 어색하게 보이는 문제를 수정하는 것이다. 이번 문서는 실제 구현 전에 현재 구조와 원인 후보를 정리하고, 이후 구현에서 따라야 할 수정 기준을 정의한다.

## 수정 대상 화면

- 워크플로우 에디터 페이지: `src/pages/workflow-editor/WorkflowEditorPage.tsx`
- React Flow 기반 캔버스: `src/widgets/canvas/ui/Canvas.tsx`
- 입력/출력/선택/설정 패널: `src/widgets/input-panel/ui/InputPanel.tsx`, `src/widgets/output-panel/ui/OutputPanel.tsx`, `src/features/add-node/ui/ServiceSelectionPanel.tsx`, `src/features/configure-node/ui/**`
- 에디터 상단/원격 조작 UI: `src/widgets/editor-remote-bar/ui/**`

## 이번 작업에서 해결하려는 문제

- FHD, QHD, 1366px, 1440px 등 화면 폭/높이에 따라 패널과 캔버스가 어색하게 배치되는 문제
- 패널이 화면 밖으로 나가거나 겹치는 문제
- 시작 노드, 중간 노드, 도착 노드 선택 시 zoom과 center 기준이 달라지는 문제
- 패널 border-radius가 과하게 커서 SaaS 도구 화면보다 둥글게 보이는 문제
- 제목, 본문, 라벨, 버튼 텍스트 크기가 화면 크기에 따라 어색하게 보이는 문제

## 이번 설계에서 제외하는 범위

- 워크플로우 저장, 수정, 실행 API 연동 변경
- OAuth, connector, template 데이터 구조 변경
- React Flow 노드/엣지 데이터 모델 변경
- Slack 제거 작업과 관련된 기능 변경
- 신규 기능 추가나 화면 전면 리디자인
- 공통 node/template/picker abstraction 변경

# 2. 현재 구조 분석

## 관련 컴포넌트 목록

| 파일 | 역할 | 반응형 이슈와의 관련성 |
| --- | --- | --- |
| `src/pages/workflow-editor/WorkflowEditorPage.tsx` | 워크플로우 에디터 페이지의 최상위 composition. `ReactFlowProvider`, `Canvas`, `EditorRemoteBar`, `ServiceSelectionPanel`, `InputPanel`, `OutputPanel`을 배치한다. | 에디터 전체 높이, `overflow="hidden"`, 상대 위치 기준을 제공한다. |
| `src/widgets/canvas/ui/Canvas.tsx` | React Flow 캔버스, 노드 클릭, placeholder 선택, fitView, setCenter 로직을 담당한다. | 노드 선택 시 zoom/center 불일치의 핵심 위치다. |
| `src/widgets/input-panel/ui/InputPanel.tsx` | source 설정/입력 패널을 absolute 위치로 렌더링한다. | panel width, height, top, left, radius, overflow가 직접 지정된다. |
| `src/widgets/output-panel/ui/OutputPanel.tsx` | sink 설정, 실행 결과, 노드 데이터 보기 패널을 absolute 위치로 렌더링한다. | panel width, height, top, left, radius, overflow가 직접 지정된다. |
| `src/features/add-node/ui/ServiceSelectionPanel.tsx` | 시작 노드/다음 노드/도착 노드 선택 UI를 렌더링한다. | 시작 노드 선택 UI는 `flowToScreenPosition`과 clamp를 사용하고, 도착 노드 선택 UI는 dual panel layout을 사용한다. |
| `src/features/configure-node/ui/PanelRenderer.tsx` | 노드 타입에 맞는 설정 패널을 선택한다. | 패널 내부 콘텐츠 높이와 overflow에 영향을 준다. |
| `src/features/configure-node/ui/panels/NodePanelShell.tsx` | 설정 패널 공통 shell이다. | Heading, description, gap 등 패널 내부 typography와 spacing 기준이 있다. |
| `src/entities/node/ui/BaseNode.tsx` | 일반 노드 카드 UI를 렌더링한다. | 노드 radius, title/body font-size, node click 경로와 관련된다. |
| `src/entities/node/ui/custom-nodes/**` | Start, End, Placeholder 등 커스텀 노드 UI를 렌더링한다. | 시작/도착/placeholder 노드 크기와 center 계산 기준에 영향을 준다. |
| `src/features/workflow-editor/model/workflowStore.ts` | active panel, placeholder, layout state를 관리한다. | UI 상태 전환은 담당하지만 저장/실행 API 변경 대상은 아니다. |

## 관련 스타일 파일 목록

| 파일 | 역할 |
| --- | --- |
| `src/shared/libs/dual-panel-layout.ts` | editor canvas 크기를 기준으로 wide, compact, stacked layout을 계산한다. |
| `src/shared/styles/token/size/layout-token.ts` | panel width, height, gap, safe padding, wide/compact 기준값을 정의한다. |
| `src/shared/theme/config/style-system-config.ts` | Chakra system config와 token 연결점이다. |
| `src/shared/theme/global/global-style.ts` | 전역 body, scrollbar, selection 스타일을 정의한다. |
| `src/shared/styles/token/colors/**` | 색상 token과 semantic token을 정의한다. |
| 각 컴포넌트의 Chakra props | `borderRadius`, `fontSize`, `gap`, `px`, `py`, `boxShadow` 등 상당수가 inline prop으로 흩어져 있다. |

## 노드 선택/확대/중앙 정렬 관련 로직 위치

- `src/widgets/canvas/ui/Canvas.tsx`
  - `useReactFlow()`에서 `fitView`, `getZoom`, `setCenter`를 사용한다.
  - `handleNodeClick`
    - `placeholder-start` 선택 시 `window.innerWidth * 0.2`를 더한 x 좌표로 `setCenter(..., { zoom: 1, duration: 300 })`를 호출한다.
    - 일반 노드 선택 시 `openPanel(node.id, { mode: "view" })`를 호출하고, 실제 center 이동은 `activePanelNodeId` effect에서 처리된다.
  - `handleSelectSinkNode`
    - 도착 노드 preview center를 계산해 `setCenter(..., { zoom: 1, duration: 300 })`를 호출한다.
  - `activePanelNodeId` effect
    - 도착 노드는 해당 노드 중심으로 이동한다.
    - 도착 노드가 아닌 경우 `getChainNodes(activePanelNodeId)`와 `getNodesBoundsCenter(chainNodes)`를 사용해 연결된 노드 묶음 중심으로 이동한다.
    - zoom은 `getZoom()`을 유지한다.
  - `pendingAutoLayoutFit` effect
    - active panel, placeholder, next step이 없을 때 `fitView({ padding: 0.2 })`를 실행한다.

## 시작 노드, 중간 노드, 도착 노드 선택 처리 방식

- 시작 placeholder 선택은 `handleNodeClick` 내부에서 별도 branch로 처리되고, viewport 폭 기반 offset과 zoom 1이 적용된다.
- 중간 노드 또는 일반 노드 선택은 panel open 이후 `activePanelNodeId` effect에서 처리되며, 현재 zoom을 유지한다.
- 도착 노드 선택은 일반 노드 선택 branch 이후 `activePanelNodeId` effect에서 단일 노드 중심으로 이동한다.
- 도착 placeholder 선택은 `handleSelectSinkNode`에서 별도 branch로 처리되고, preview center와 zoom 1이 적용된다.
- 따라서 선택 대상의 종류에 따라 center 기준과 zoom 기준이 분리되어 있다.

## 패널 레이아웃 관련 로직 위치

- `src/shared/libs/dual-panel-layout.ts`
  - `useDualPanelLayout()`이 `EDITOR_CANVAS_AREA_ID` element 크기를 `ResizeObserver`와 window resize로 추적한다.
  - `getDualPanelLayout(targetSize)`가 wide, compact, stacked 모드를 결정한다.
  - panel left/top, width/height, chain center를 계산한다.
- `src/shared/styles/token/size/layout-token.ts`
  - `basePanelWidth: 690`, `basePanelHeight: 800`, `baseGap: 296`
  - `compactMinPanelWidth: 520`, `compactMinPanelHeight: 640`, `compactMinGap: 160`
  - `safePaddingX: 24`, `safePaddingY: 24`
  - `wideMinCanvasWidth: 1760`, `wideMinCanvasHeight: 864`
  - `compactMinCanvasWidth: 1280`, `compactMinCanvasHeight: 720`
- `InputPanel.tsx`, `OutputPanel.tsx`
  - `useDualPanelLayout()` 결과를 absolute `top`, `left`, `width`, `height`에 적용한다.
  - 패널 내부는 `overflowY="auto"`로 처리한다.
- `ServiceSelectionPanel.tsx`
  - 시작 선택 UI는 wrapper 크기를 측정해 overlay 안에서 clamp한다.
  - 도착 선택 UI는 dual panel layout의 output panel 위치와 크기를 사용한다.

## 글자 크기/spacing/radius 관련 스타일 위치

- `InputPanel.tsx`, `OutputPanel.tsx`
  - `borderRadius="20px"`, `fontSize="xl"`, `letterSpacing="-0.4px"`, `px={3}`, `py={6}`가 직접 지정되어 있다.
- `ServiceSelectionPanel.tsx`
  - 선택 패널과 검색 UI에서 `borderRadius="20px"`, 일부 `fontSize="24px"`, `fontSize="sm"` 등이 직접 지정되어 있다.
- `BaseNode.tsx`
  - node container는 `borderRadius="xl"`, icon container는 큰 원형/rounded 스타일, title은 `fontSize="lg"`, meta는 `xs` 계열을 사용한다.
- `NodePanelShell.tsx`와 configure panel 파일들
  - Chakra `Heading size="md"`, `Text fontSize="sm"`, `gap`, `Stack` spacing 등이 패널 내부별로 분산되어 있다.
- 현재 확인 기준으로 radius/font-size 전용 design token은 명확히 분리되어 있지 않고, layout token 중심으로만 공통화되어 있다.

## 반응형 breakpoint 또는 viewport 대응 로직

- 에디터 핵심 패널은 Chakra breakpoint보다 `useDualPanelLayout()`의 pixel threshold 기반 custom layout을 사용한다.
- `EditorRemoteBar`와 일부 설정 패널은 Chakra responsive prop인 `base`, `md`, `xl`, `2xl`를 사용한다.
- `ServiceSelectionPanel`의 시작 선택 UI는 screen position과 measured size를 기준으로 viewport boundary clamp를 수행한다.
- 전역적으로 scrollbar가 숨겨져 있어 overflow가 발생해도 사용자가 스크롤 가능 영역을 인지하기 어렵다.

## 기존 workflow 저장/실행/API 연동과 관련 없는 UI 레이아웃 범위

- 변경 대상은 React Flow viewport 이동, panel positioning, panel sizing, visual token 적용, typography/radius 정리에 한정한다.
- `workflowStore`는 active UI state를 읽거나 dispatch하는 수준으로만 다룬다.
- 다음 영역은 이번 이슈에서 변경하지 않는다.
  - workflow query/mutation, hydrate/sync, save/execute API 호출
  - node data schema, template schema, connector schema
  - OAuth 연결과 token 처리
  - backend contract

# 3. 문제별 원인 후보

## FHD 화면에서 UI가 깨지는 원인 후보

- wide layout 진입 기준이 `1760 x 864`인데, FHD viewport라도 앱 shell, header, browser zoom, OS scaling 이후 실제 editor canvas height가 864px보다 작아질 수 있다.
- `basePanelWidth 690`, `baseGap 296`, 좌우 safe padding을 합치면 wide layout의 가로 여유가 빠듯하다.
- panel height가 800px 고정에 가깝게 계산되어 FHD에서 세로 여유가 부족할 수 있다.
- React Flow canvas와 absolute panel이 같은 상대 container 안에 있으나, panel open/close transform이 layout mode별로 다르게 적용되어 전환 중 겹침이 보일 수 있다.

## 패널이 화면 밖으로 나가는 원인 후보

- `InputPanel`과 `OutputPanel`은 `top`, `left`, `width`, `height`를 계산값 그대로 사용하므로 최종 DOM 크기와 viewport boundary 사이에 추가 clamp가 없다.
- `boxShadow`, padding, border, transform까지 포함한 실제 렌더링 영역이 계산된 panel box보다 커질 수 있다.
- closed/open transition의 translate 값이 wide/stacked 모드별로 다르고, 작은 화면에서 off-screen 방향이 과하게 적용될 수 있다.
- 패널 내부 content가 길 때 `overflowY="auto"`는 있지만 전역 scrollbar 숨김 때문에 overflow 상태가 시각적으로 드러나지 않는다.

## 노드 선택 시 확대 비율이 다르게 적용되는 원인 후보

- 시작 placeholder와 도착 placeholder는 `setCenter(..., { zoom: 1 })`을 사용한다.
- 일반 노드와 도착 노드는 `activePanelNodeId` effect에서 `zoom: getZoom()`을 사용해 현재 zoom을 유지한다.
- `fitView`가 auto layout 이후 padding 0.2로 실행되므로 이후 선택 시점의 current zoom이 workflow 크기에 따라 달라질 수 있다.
- 노드 종류별 handler가 분리되어 있어 focus 정책이 한 곳에서 관리되지 않는다.

## 선택된 노드가 중앙에 오지 않는 원인 후보

- 시작 placeholder는 `window.innerWidth * 0.2` offset을 x 좌표에 더해 center가 실제 노드 중심에서 벗어난다.
- 일반 중간 노드는 선택된 노드 중심이 아니라 `getChainNodes()` 결과의 bounds center를 사용한다.
- 도착 노드는 단일 노드 중심을 사용하므로 중간 노드와 기준이 다르다.
- React Flow 좌표계와 DOM screen 좌표계가 섞여 사용되는 branch가 있어 panel 상태와 viewport 상태에 따라 결과가 달라질 수 있다.

## 패널 border-radius가 과하게 보이는 원인 후보

- 주요 패널에 `borderRadius="20px"`가 반복 적용되어 큰 크기의 도구 패널이 카드처럼 둥글게 보인다.
- 일부 내부 UI는 `28px`, `32px`, `40px`, `999px` 계열의 radius를 사용해 전체 인상이 더 부드럽게 치우친다.
- radius 기준이 panel, card, button, input, pill로 분리되어 있지 않아 같은 화면에서 둥근 정도가 누적된다.

## 글자 크기가 화면 크기별로 어색한 원인 후보

- 패널 제목에 `fontSize="xl"` 또는 `24px`가 쓰이고, FHD나 browser zoom 125%에서 panel 내부 밀도가 낮아질 수 있다.
- node title은 `lg`, panel body는 `sm`, helper는 `xs` 등 Chakra scale을 쓰지만 화면별 hierarchy 기준이 문서화되어 있지 않다.
- 일부 텍스트에 negative letter spacing이 있어 작은 크기나 확대 환경에서 가독성이 흔들릴 수 있다.
- layout은 viewport 크기에 따라 바뀌지만 typography는 mode별 기준 없이 고정되어 있다.

# 4. 수정 설계

## 4-1. 노드 선택 zoom/center 통일 설계

### 기준

- 시작 노드, 중간 노드, 도착 노드, placeholder 선택 모두 동일한 focus policy를 사용한다.
- 사용자가 "선택한 노드"가 화면 중앙에 오는 것을 기본 기준으로 삼는다.
- 선택 시 zoom은 노드 종류와 무관하게 하나의 상수로 통일한다.
  - 제안값: `EDITOR_NODE_FOCUS_ZOOM = 1`
  - transition: `EDITOR_NODE_FOCUS_DURATION_MS = 300`
- 사용자가 직접 zoom 조작 중인 상태를 보존해야 한다는 별도 요구가 생기기 전까지, 선택 focus는 일관성을 우선한다.

### 공통 함수화 제안

- `Canvas.tsx` 내부에 흩어진 `setCenter` 호출을 공통 helper로 묶는다.
- 구현 파일 후보:
  - 작은 변경: `src/widgets/canvas/ui/Canvas.tsx` 내부 `focusNodeCenter()` 함수로 시작
  - 재사용 필요 시: `src/widgets/canvas/lib/focus-node-viewport.ts`
- 공통 함수가 받을 값:
  - `node.position`
  - `node.measured.width`, `node.measured.height`, 없으면 type별 fallback size
  - `zoom`, `duration`
- 함수 책임:
  - React Flow 좌표계 기준 node center 계산
  - `setCenter(centerX, centerY, { zoom: EDITOR_NODE_FOCUS_ZOOM, duration })` 호출
  - `window.innerWidth` 기반 offset 제거

### 선택 유형별 적용

- 시작 placeholder
  - 기존 `window.innerWidth * 0.2` offset을 제거한다.
  - placeholder node의 React Flow 중심 좌표를 기준으로 focus한다.
- 중간 노드
  - `getChainNodes()` bounds center가 아니라 선택한 node center를 기준으로 focus한다.
  - chain 전체를 보여줘야 하는 UX가 필요하면 별도 action인 "fit chain"으로 분리한다.
- 도착 노드
  - 중간 노드와 동일한 node center focus를 사용한다.
- 도착 placeholder
  - preview placeholder의 center 좌표를 같은 helper로 넘긴다.

### React Flow API 사용 기준

- 선택 focus: `setCenter(centerX, centerY, { zoom, duration })`
- 전체 workflow 자동 맞춤: 기존처럼 `fitView({ padding })`를 유지하되, node selection focus와 충돌하지 않도록 조건을 명확히 한다.
- `fitView`는 workflow load, auto layout 완료, 사용자가 명시적으로 전체 보기 버튼을 누른 경우에만 사용한다.
- active panel이 열린 뒤 자동 `fitView`가 다시 실행되어 선택 focus를 덮어쓰지 않도록 `pendingAutoLayoutFit` 조건을 재확인한다.

## 4-2. 패널 viewport boundary 설계

### 기준

- 모든 panel은 editor canvas area 내부의 safe boundary를 넘지 않아야 한다.
- safe padding은 기존 `layoutToken.panel.safePaddingX/Y`를 우선 사용한다.
- panel 크기는 base size를 목표로 하되, 실제 viewport가 작으면 `availableWidth`, `availableHeight` 안에서 축소한다.
- panel 내부 콘텐츠가 길어질 경우 panel 자체는 화면 안에 유지하고 내부 영역만 scroll 처리한다.

### max-width, max-height, overflow, position 기준

- `width`
  - `min(targetPanelWidth, availableWidth)`
  - compact 이하에서는 최소 사용 가능 폭을 보장하되, 화면 밖으로 나갈 경우 stacked layout으로 전환한다.
- `height`
  - `min(targetPanelHeight, availableHeight)`
  - panel header/footer가 있는 경우 body 영역에 `minHeight: 0`, `overflowY: auto`를 적용한다.
- `position`
  - 기존 absolute positioning은 유지하되, 최종 `left`, `top`을 safe boundary 안으로 clamp한다.
  - clamp 기준은 `0 + safePadding`부터 `containerSize - panelSize - safePadding`까지로 둔다.
- `transform`
  - open 상태에서는 panel이 boundary 안에 있어야 한다.
  - closed transition은 시각적 퇴장만 담당하고, open layout 계산과 섞이지 않게 한다.
- `overflow`
  - panel container는 `overflow: hidden` 또는 border clipping을 담당한다.
  - content body는 `overflowY: auto`를 담당한다.
  - 전역 scrollbar 숨김 정책 때문에 panel body에는 별도 scroll affordance를 줄지 검토한다.

### 화면 크기별 대응

- 1366px
  - wide layout을 강제하지 않는다.
  - compact 또는 stacked layout을 사용한다.
  - 단일 panel width는 editor area의 safe boundary 안에 들어오게 한다.
- 1440px
  - compact layout을 기본으로 고려한다.
  - input/output 동시 노출이 어렵다면 stacked 또는 한쪽 panel 우선 노출 정책을 유지한다.
- 1920px FHD
  - editor canvas의 실제 height가 충분하면 wide layout을 사용한다.
  - browser zoom 125% 또는 header로 인해 height가 부족하면 compact layout으로 자연스럽게 내려간다.
  - wide 기준을 viewport 전체가 아니라 editor canvas area 기준으로 판단한다.
- 2560px QHD
  - wide layout을 안정적으로 사용한다.
  - panel width를 무한히 늘리지 않고 base width를 유지해 SaaS 도구 화면의 밀도를 유지한다.

## 4-3. 패널 radius 조정 설계

### 현재 과하게 보이는 부분

- `InputPanel.tsx`, `OutputPanel.tsx`, `ServiceSelectionPanel.tsx`의 큰 panel radius 20px
- 큰 검색/선택 영역과 카드성 UI의 20px 이상 radius
- 버튼, badge, icon container, pill 성격 UI가 한 화면에서 모두 큰 radius를 사용해 전체 톤이 지나치게 둥글게 보이는 부분

### 조정 기준 제안

- panel/surface: 10px 또는 12px
- repeated card: 8px
- button/control/input: 6px 또는 8px
- icon button: 6px 또는 원형이 필요한 경우에만 999px
- badge/pill/status chip: 999px 허용

### 적용 방향

- 기존 Flowify의 깔끔한 SaaS 스타일을 유지하기 위해 큰 panel부터 radius를 낮춘다.
- radius를 한 번에 전역 변경하지 않고 workflow editor 범위의 panel부터 정리한다.
- 추후 공통화가 필요하면 `src/shared/styles/token/size` 또는 theme token에 radius 기준을 추가한다.
- 카드 안에 또 다른 카드처럼 보이는 중첩 surface는 줄이고, panel 내부는 border/divider/spacing으로 hierarchy를 만든다.

## 4-4. 글자 크기 조정 설계

### 타입 기준 제안

| 용도 | 권장 크기 | 적용 후보 |
| --- | --- | --- |
| 패널 제목 | 18px 또는 Chakra `lg` | 입력/출력/선택 패널 title |
| 섹션 제목 | 16px 또는 Chakra `md` | 설정 패널 section heading |
| 본문 | 14px 또는 Chakra `sm` | 설명, field body |
| 보조 설명 | 12px 또는 Chakra `xs` | helper, meta text |
| 버튼/라벨 | 13px 또는 14px | action button, form label |
| 노드 title | 14px 또는 16px | BaseNode title, placeholder title |

### px/rem/clamp 사용 기준

- editor tool surface에서는 viewport 폭에 따라 font-size가 크게 변하지 않는 것이 좋다.
- 기본은 Chakra scale 또는 rem 기반 고정 scale을 유지한다.
- `clamp()`는 hero나 marketing text가 아니라면 남용하지 않는다.
- panel title처럼 특정 화면에서만 과하게 커지는 텍스트는 `xl`에서 `lg` 또는 18px 계열로 낮춘다.
- negative letter spacing은 제거하거나 0으로 맞춘다.

### 기존 token/theme 활용

- 우선 Chakra theme scale과 기존 style system을 사용한다.
- layout token처럼 typography token이 필요해지면 별도 이슈로 `textStyle` 또는 size token을 추가한다.
- 이번 이슈에서는 workflow editor 범위 안에서 일관된 scale을 먼저 적용한다.

# 5. 단계별 구현 계획

## Step 1: 관련 파일 및 현재 동작 확인

- 목적
  - 구현 직전 현재 UI 동작과 변경 범위를 다시 확인한다.
- 수정 예상 파일
  - 없음. 분석과 캡처 중심.
- 작업 내용
  - `WorkflowEditorPage.tsx`, `Canvas.tsx`, `dual-panel-layout.ts`, `layout-token.ts`, `InputPanel.tsx`, `OutputPanel.tsx`, `ServiceSelectionPanel.tsx`를 다시 확인한다.
  - 1366, 1440, 1920, 2560 viewport에서 현재 panel 위치와 node focus 동작을 기록한다.
- 주의사항
  - workflow 저장/실행/API 파일은 수정하지 않는다.
  - 현재 브랜치의 다른 이슈 변경사항과 섞지 않는다.
- 검증 방법
  - 변경 전 screenshot 또는 Playwright trace를 남긴다.
  - node type별 선택 시 zoom 값과 center 좌표 변화를 기록한다.

## Step 2: 노드 선택 zoom/center 로직 통일

- 목적
  - 시작, 중간, 도착 노드 선택 시 동일한 zoom과 center 기준을 적용한다.
- 수정 예상 파일
  - `src/widgets/canvas/ui/Canvas.tsx`
  - 필요 시 `src/widgets/canvas/lib/focus-node-viewport.ts`
- 작업 내용
  - 공통 focus helper를 만든다.
  - `handleNodeClick`, `handleSelectSinkNode`, `activePanelNodeId` effect의 center 계산을 공통 helper로 연결한다.
  - `window.innerWidth * 0.2` offset과 chain bounds center 중심 이동을 제거하거나 명시적 별도 action으로 분리한다.
- 주의사항
  - `fitView`가 node selection focus를 덮어쓰지 않도록 조건을 유지한다.
  - placeholder와 실제 node의 fallback width/height가 다를 수 있으므로 measured size가 없을 때 type별 fallback을 둔다.
- 검증 방법
  - 시작 노드, 중간 노드, 도착 노드, 도착 placeholder를 선택해 같은 zoom이 적용되는지 확인한다.
  - 선택된 노드 중심이 viewport 중심과 일관되게 맞는지 확인한다.

## Step 3: 패널 viewport boundary 처리

- 목적
  - panel이 editor canvas area 밖으로 나가지 않도록 한다.
- 수정 예상 파일
  - `src/shared/libs/dual-panel-layout.ts`
  - `src/shared/styles/token/size/layout-token.ts`
  - `src/widgets/input-panel/ui/InputPanel.tsx`
  - `src/widgets/output-panel/ui/OutputPanel.tsx`
  - `src/features/add-node/ui/ServiceSelectionPanel.tsx`
- 작업 내용
  - panel size와 position 계산 후 safe boundary clamp를 적용한다.
  - `maxHeight`, body `overflowY`, `minHeight: 0` 기준을 정리한다.
  - start selection panel의 clamp 기준과 dual panel clamp 기준을 맞춘다.
- 주의사항
  - closed animation용 transform이 open layout 계산을 망치지 않게 분리한다.
  - compact/stacked 전환 기준을 과하게 바꾸면 기존 workflow editor UX가 크게 달라질 수 있다.
- 검증 방법
  - 1366, 1440, 1920, 2560 viewport에서 panel open/close를 반복한다.
  - browser zoom 125%에서 panel top/left/right/bottom이 editor area 밖으로 나가지 않는지 확인한다.

## Step 4: panel radius/font-size 정리

- 목적
  - workflow editor panel이 기존 Flowify SaaS 톤에 맞게 덜 둥글고 더 정돈되어 보이도록 한다.
- 수정 예상 파일
  - `src/widgets/input-panel/ui/InputPanel.tsx`
  - `src/widgets/output-panel/ui/OutputPanel.tsx`
  - `src/features/add-node/ui/ServiceSelectionPanel.tsx`
  - `src/features/configure-node/ui/panels/**`
  - 필요 시 `src/shared/styles/token/size/**` 또는 theme token 파일
- 작업 내용
  - 큰 panel radius를 10px 또는 12px 기준으로 낮춘다.
  - card/control/input/badge radius 기준을 구분한다.
  - panel title, section title, body, helper, button font-size 기준을 맞춘다.
  - negative letter spacing은 제거한다.
- 주의사항
  - 전역 theme 변경은 다른 화면에 영향을 줄 수 있으므로 workflow editor 범위에서 먼저 적용한다.
  - button, badge, input의 기존 상태 스타일을 깨지 않게 한다.
- 검증 방법
  - panel 내부 텍스트가 줄바꿈, 잘림, 겹침 없이 보이는지 확인한다.
  - 90%, 100%, 125% browser zoom에서 panel title과 button label이 과하게 커지지 않는지 확인한다.

## Step 5: 화면 크기별 QA

- 목적
  - 실제 문제가 보고된 화면 조건에서 UI가 안정적인지 확인한다.
- 수정 예상 파일
  - 없음. QA와 필요한 최소 수정만 후속 step에 반영한다.
- 작업 내용
  - 1366, 1440, 1920 FHD, 2560 QHD viewport로 확인한다.
  - browser zoom 90%, 100%, 125%를 확인한다.
  - 시작, 중간, 도착 노드 선택과 panel open/close를 반복한다.
- 주의사항
  - viewport 전체가 아니라 editor canvas area 기준으로 판정한다.
  - OS scaling과 browser zoom이 겹치는 환경에서는 실제 screenshot 기준으로 판단한다.
- 검증 방법
  - panel boundary, node focus center, zoom consistency, text readability를 체크리스트로 기록한다.
  - 가능하면 Playwright screenshot을 남겨 회귀 비교가 가능하게 한다.

## Step 6: 기존 기능 회귀 테스트

- 목적
  - UI 레이아웃 수정이 workflow 저장/수정/실행 기능을 깨지 않았는지 확인한다.
- 수정 예상 파일
  - 없음. 테스트와 확인 중심.
- 작업 내용
  - workflow 불러오기, 노드 선택, 설정 변경, 저장, 실행 결과 panel 확인을 수행한다.
  - connector/OAuth/template/API 동작은 코드 변경 대상이 아니므로 기존 경로가 유지되는지만 확인한다.
- 주의사항
  - API contract나 workflow schema를 수정하지 않는다.
  - Slack 제거 이슈나 다른 브랜치 변경사항과 섞지 않는다.
- 검증 방법
  - `pnpm tsc`
  - `pnpm test`
  - `pnpm build`
  - 수동 QA로 저장/수정/실행의 기본 흐름을 확인한다.

# 6. QA 시나리오

## 화면 크기

- 1366px
- 1440px
- 1920px FHD
- 2560px QHD

## 브라우저 확대

- 90%
- 100%
- 125%

## 사용자 동작

- 시작 노드 선택
- 중간 노드 선택
- 도착 노드 선택
- 패널 열기/닫기
- 템플릿/설정/실행 결과 패널 확인
- 노드 여러 개가 있는 workflow 확인
- 화면 가장자리 근처 노드 선택

## 검증 기준

- 패널이 editor canvas area 밖으로 나가지 않을 것
- 패널끼리 겹치거나 주요 노드 조작 영역을 비정상적으로 가리지 않을 것
- 선택된 노드가 일관된 기준으로 화면 중앙에 올 것
- 확대 비율이 노드 종류에 따라 달라지지 않을 것
- 시작 노드, 중간 노드, 도착 노드 선택 후 zoom 값이 동일할 것
- 글자가 과하게 크거나 작지 않을 것
- 버튼/라벨/제목 텍스트가 잘리거나 겹치지 않을 것
- panel 내부 내용이 길어도 panel 자체는 화면 안에 남고 내부 scroll로 처리될 것
- 기존 workflow 저장/수정/실행 기능이 깨지지 않을 것

## QA 매트릭스

| Viewport | Browser zoom | 확인 항목 |
| --- | --- | --- |
| 1366px | 90%, 100%, 125% | compact/stacked panel boundary, panel scroll, node selection center |
| 1440px | 90%, 100%, 125% | compact panel 위치, panel open/close transition, text readability |
| 1920px FHD | 90%, 100%, 125% | wide/compact 전환 안정성, panel height, selected node focus |
| 2560px QHD | 90%, 100%, 125% | wide layout 안정성, panel이 과하게 벌어지지 않는지, zoom consistency |

# 7. 위험 요소 및 후속 작업

## 구현 중 깨질 수 있는 부분

- `fitView`와 `setCenter` 호출 순서가 꼬이면 선택 직후 viewport가 다시 전체 보기로 돌아갈 수 있다.
- placeholder node는 measured size가 없을 수 있어 fallback size가 부정확하면 center가 약간 어긋날 수 있다.
- panel boundary clamp가 과하면 panel transition이 부자연스럽게 보일 수 있다.
- compact/stacked threshold를 바꾸면 기존 사용자가 익숙한 panel 배치가 달라질 수 있다.
- 전역 radius/font-size token을 수정하면 workflow editor 밖 화면까지 영향이 번질 수 있다.

## 다른 이슈와 충돌 가능성이 있는 부분

- Slack 제거 이슈와 직접 관련은 없지만, template/connector UI 파일을 동시에 수정하면 충돌이 날 수 있다.
- dashboard, template detail, node configuration 개선 이슈가 같은 panel component를 수정할 경우 style conflict가 생길 수 있다.
- `workflowStore`를 수정하는 다른 작업이 active panel/placeholder 상태 전환과 충돌할 수 있다.

## 추후 별도 이슈로 분리해야 할 부분

- Playwright 기반 workflow editor visual regression test 구축
- radius/font-size를 전역 design token으로 정리하는 작업
- mobile 또는 tablet 전용 workflow editor UX 설계
- 숨겨진 scrollbar 정책 재검토와 panel scroll affordance 개선
- chain 전체 보기, 선택 노드 보기, 실행 결과 보기 같은 viewport action을 명시적으로 분리하는 UX 개선

## 이번 이슈에서 하지 말아야 할 작업

- workflow 저장/실행 API 변경
- OAuth, connector, template schema 변경
- node data model 변경
- Slack 제거 범위 재수정
- dashboard나 template detail 등 editor 밖 화면의 전면 스타일 변경
- 단순 문자열 검색 기반의 무차별 radius/font-size 치환
