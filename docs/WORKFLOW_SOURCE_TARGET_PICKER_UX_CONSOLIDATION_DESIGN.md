# Workflow Source Target Picker UX Consolidation Design

> 작성일: 2026-05-03  
> 목적: `feat#119-canvas-drive-workflow-ux` 브랜치의 UX 개선점 중 현재 프론트 구현과 백엔드 계약에 맞는 부분만 선별 반영한다.  
> 기준 문서: `docs/WORKFLOW_SOURCE_TARGET_PICKER_FRONTEND_DESIGN.md`, `docs/backend/WORKFLOW_SOURCE_TARGET_PICKER_BACKEND_COMPLETION_REPORT.md`

---

## 1. 배경

현재 브랜치에서는 백엔드의 source target option API에 맞춰 Canvas LMS와 Google Drive target picker를 연결했고, 선택 결과를 `target`, `target_label`, `target_meta`로 저장한다.

별도 브랜치 `feat#119-canvas-drive-workflow-ux`에서도 유사한 작업이 진행되었고, 다음 UX 개선점은 가져올 가치가 있다.

- Canvas/Drive 선택 UI를 공통화한 `RemoteOptionPicker`
- Google Drive folder picker의 breadcrumb 탐색
- Google Drive sink 설정의 folder picker UI
- OAuth 연결 후 원래 편집 화면으로 돌아오는 흐름

단, 해당 브랜치의 일부 구현은 현재 백엔드 계약과 맞지 않거나 기존 검증 흐름을 약화시키므로 그대로 병합하지 않는다.

---

## 2. 반영 원칙

1. 현재 백엔드에 존재하는 API만 사용한다.
2. source target 저장 계약은 후퇴시키지 않는다.
3. 기존 `SinkNodePanel`의 draft, validation, `isConfigured` 계산 흐름은 유지한다.
4. FSD 경계는 현재 프로젝트 컨벤션을 따른다.
5. 공통화는 실제 중복이 생긴 부분만 진행한다.

---

## 3. 가져올 항목과 제외 항목

### 3.1 가져올 항목

#### Remote option picker 공통화

현재 `SourceTargetPicker` 내부에 option row, loading, empty, error, pagination UI가 묶여 있다.  
Google Drive sink folder picker까지 추가하면 같은 UI가 반복되므로 공통 컴포넌트로 분리한다.

대상 위치:

```text
src/shared/ui/RemoteOptionPicker.tsx
```

역할:

- 검색 input
- 선택 목록
- 선택 강조
- loading, empty, error 표시
- pagination 더 보기
- folder breadcrumb 표시
- folder browse action

주의:

- `shared/ui` 컴포넌트이므로 Canvas LMS, Google Drive 같은 서비스 도메인 지식을 직접 가지지 않는다.
- option type별 icon, metadata 표시 형식은 props로 주입한다.
- `Box role="button"`만 쓰는 구조는 접근성이 약하므로 row는 실제 `Button` 또는 `button` semantic을 갖는 Chakra 컴포넌트로 구성한다.
- keyboard select, focus visible 상태를 유지한다.
- option metadata 저장 여부는 이 컴포넌트 책임이 아니다. 선택 item 전체를 상위로 전달한다.

#### Google Drive folder breadcrumb 탐색

백엔드는 이미 `parentId` query를 지원한다.

```http
GET /api/editor-catalog/sources/google_drive/target-options?mode=folder_all_files&parentId={folderId}
```

따라서 folder picker는 선택과 탐색을 분리한다.

- row 클릭: 해당 folder를 선택한다.
- `열기` 버튼: 해당 folder 내부로 진입한다.
- breadcrumb 클릭: 특정 상위 folder로 이동한다.
- root 클릭: `parentId`를 제거하고 root로 돌아간다.

적용 대상:

- source start node의 `folder_picker`
- sink node의 Google Drive `folder_picker`

#### Google Drive sink folder picker

백엔드 sink catalog에서 Google Drive sink field는 다음 형태다.

```json
{ "key": "folder_id", "label": "저장 폴더", "type": "folder_picker", "required": true }
```

프론트는 해당 field에 한해 직접 입력 input 대신 picker를 보여준다.

조회 계약:

현재 백엔드 target option API는 source endpoint만 제공한다.

```http
GET /api/editor-catalog/sources/google_drive/target-options
```

따라서 sink의 `folder_id` picker도 동일 endpoint를 재사용하고, Google Drive folder 목록 조회 mode는 아래 상수로 고정한다.

```ts
const GOOGLE_DRIVE_FOLDER_PICKER_MODE = "folder_all_files";
```

요청 예시:

```http
GET /api/editor-catalog/sources/google_drive/target-options?mode=folder_all_files&parentId={folderId}
```

저장 계약:

```ts
config.folder_id = selectedOption.id;
config.folder_id_label = selectedOption.label;
config.folder_id_meta = selectedOption.metadata;
```

단, 현재 백엔드 실행 로직은 `folder_id`만 필수로 본다. `folder_id_label`, `folder_id_meta`는 UI 표시용 보조 필드다.

주의:

- `folder_id_label`, `folder_id_meta`는 sink schema field가 아니므로 일반 schema field commit 루프만으로는 저장되지 않는다.
- `SinkSchemaEditor`는 `folder_picker` 선택 시 보조 draft 값을 별도로 보존하고, save 시 config에 함께 merge해야 한다.

#### OAuth 복귀 UX 보강

워크플로우 편집 중 OAuth 연결이 필요한 서비스를 선택하면, 연결 후 계정 페이지가 아니라 원래 편집 화면으로 복귀해야 한다.

현재 프로젝트에는 이미 다음 helper가 있다.

```text
src/shared/libs/oauth-connect-redirect.ts
```

따라서 `feat#119`의 별도 `oauth-callback-return-path.ts`는 가져오지 않고, 기존 `storeOAuthConnectReturnPath`, `consumeOAuthConnectReturnPath` 흐름을 유지한다.

---

### 3.2 제외 항목

#### Google Drive 새 폴더 만들기

`feat#119`에는 다음 API 호출이 있다.

```http
POST /api/editor-catalog/sinks/google_drive/folders
```

현재 백엔드에는 해당 endpoint가 없다. 따라서 이번 반영 범위에서 제외한다.  
추후 백엔드 계약이 추가되면 별도 이슈로 진행한다.

#### Workflow 이름 인라인 편집

유용한 UX지만 source target picker와 직접 관련이 없다.  
이번 통합 범위에서 제외하고 별도 이슈로 분리한다.

#### SinkNodePanel 전체 리팩터링

`feat#119`는 기존 draft 저장 방식을 즉시 반영 방식으로 바꾼다.  
이 경우 필수값 검증, number 검증, `isConfigured` 계산이 약해진다.

따라서 `SinkSchemaEditor` 구조는 유지하고, field renderer만 확장한다.

---

## 4. 현재 구현 기준 설계

## 4.1 API 계층

현재 API는 다음 이름을 유지한다.

```text
src/entities/workflow/api/get-source-target-options.api.ts
src/entities/workflow/model/useInfiniteSourceTargetOptionsQuery.ts
```

`feat#119`의 `get-target-options.api.ts`, `useTargetOptionsQuery.ts`는 가져오지 않는다.  
이름만 다른 중복 구현이므로 현재 브랜치의 API를 확장한다.

현재 request type:

```ts
export interface SourceTargetOptionsParameters {
  mode: string;
  parentId?: string;
  query?: string;
  cursor?: string;
}
```

변경 방향:

- `parentId`를 picker state에서 넘길 수 있게 한다.
- query key에는 `mode`, `parentId`, `query`가 반드시 포함되어야 한다.
- cursor는 infinite query의 `pageParam`으로만 사용한다.

---

## 4.2 공통 RemoteOptionPicker

추가 파일:

```text
src/shared/ui/RemoteOptionPicker.tsx
```

타입:

```ts
export interface RemoteOptionPickerItem {
  id: string;
  label: string;
  description?: string | null;
  type?: string | null;
  metadata?: Record<string, unknown>;
}

type RemoteOptionPathItem = {
  id: string;
  label: string;
};
```

핵심 props:

전제 import:

```ts
import { type ReactNode } from "react";
import { type IconType } from "react-icons";
```

```ts
type Props = {
  disabled?: boolean;
  emptyMessage: string;
  errorMessage?: string | null;
  getItemIcon?: (item: RemoteOptionPickerItem) => IconType;
  hasMore?: boolean;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  items: RemoteOptionPickerItem[];
  path?: RemoteOptionPathItem[];
  renderItemMetadata?: (item: RemoteOptionPickerItem) => ReactNode;
  rootLabel?: string;
  searchPlaceholder?: string;
  searchValue: string;
  selectedId?: string | null;
  onBrowse?: (item: RemoteOptionPickerItem) => void;
  onLoadMore?: () => void;
  onPathSelect?: (index: number) => void;
  onResetPath?: () => void;
  onSearchChange: (value: string) => void;
  onSelect: (item: RemoteOptionPickerItem) => void;
};
```

컴포넌트 선언:

```ts
export const RemoteOptionPicker = ({ ...props }: Props) => {
  // Chakra props 기반으로 구현한다.
};
```

컨벤션 기준:

- 컴포넌트 props 타입명은 `Props`로 둔다.
- 컴포넌트는 `export const` named export를 사용한다.
- 별도 `import type` 선언 대신 인라인 `type` import를 사용한다.

접근성 기준:

- option row는 keyboard focus가 가능해야 한다.
- Enter/Space로 선택 가능해야 한다.
- folder browse 버튼은 row 선택과 이벤트가 분리되어야 한다.
- browse 버튼에 `aria-label`을 제공한다.
- row 전체 선택 control과 browse button은 sibling으로 배치한다.
- `<Button>` 내부에 또 다른 `<Button>`을 넣지 않는다.
- 권장 구조는 row wrapper 안에 선택용 `button` 영역과 browse용 `IconButton`을 나란히 두는 방식이다.

레이어 기준:

- `RemoteOptionPicker`는 `shared/ui`에 위치하므로 `SourceTargetOptionItemResponse`를 직접 import하지 않는다.
- `RemoteOptionPickerItem`이라는 최소 형태만 알고, API 응답 타입 변환은 상위 컴포넌트가 담당한다.
- `MdFolder`, `MdSchool` 같은 도메인별 icon 선택은 `getItemIcon`으로 주입한다.
- `term`, `courseCount`, `mimeType` 같은 metadata 요약은 `renderItemMetadata`로 주입한다.

---

## 4.3 SourceTargetPicker 확장

현재 `SourceTargetPicker`의 책임은 유지한다.

- target schema type 판별
- remote picker query 호출
- day/time/text fallback 유지
- 선택 결과를 `SourceTargetPickerValue`로 상위 전달

상태 추가:

```ts
const [folderPath, setFolderPath] = useState<SourceTargetOptionItemResponse[]>([]);
```

`parentId` 계산:

```ts
const parentId =
  schemaType === "folder_picker" && folderPath.length > 0
    ? folderPath[folderPath.length - 1]?.id
    : undefined;
```

breadcrumb path 변환:

```ts
const pickerPath = folderPath.map(({ id, label }) => ({
  id,
  label,
}));
```

`RemoteOptionPicker`에는 API 응답 전체가 아니라 breadcrumb 표시용 최소 형태만 넘긴다.

query params:

```ts
{
  mode: mode.key,
  parentId,
  query: searchQuery,
}
```

folder browse:

```ts
const handleBrowseOption = (option: SourceTargetOptionItemResponse) => {
  if (option.type !== "folder") return;
  setFolderPath((current) => [...current, option]);
  setSearchQuery("");
  onChange({ option: null, value: "" });
};
```

path 이동:

```ts
const handleResetPath = () => {
  setFolderPath([]);
  setSearchQuery("");
  onChange({ option: null, value: "" });
};

const handlePathSelect = (index: number) => {
  setFolderPath((current) => current.slice(0, index + 1));
  setSearchQuery("");
  onChange({ option: null, value: "" });
};
```

선택 저장:

```ts
onChange({
  option,
  value: option.id,
});
```

상태 초기화:

`serviceKey`, `mode.key`, `schemaType`이 바뀌면 이전 picker 상태가 다음 선택 흐름에 섞이지 않도록 초기화한다.

```ts
useEffect(() => {
  setFolderPath([]);
  setSearchQuery("");
}, [serviceKey, mode.key, schemaType]);
```

검색 정책:

- 같은 폴더 안에서는 검색어를 유지한다.
- 폴더 진입, root 이동, breadcrumb 이동 시 검색어는 초기화한다.
- parentId가 바뀌면 query key도 바뀌므로 기존 page cache와 섞이지 않는다.

상위 `handleCreateStartNode`에서는 기존 계약을 유지한다.

```ts
target: selectedTargetValue.value,
target_label: selectedTargetValue.option?.label,
target_meta: selectedTargetValue.option?.metadata,
```

---

## 4.4 SinkNodePanel 확장

기존 `SinkSchemaEditor`를 유지한다.

추가할 책임:

- field type이 `folder_picker`이고 service가 `google_drive`이면 picker renderer를 사용한다.
- 그 외 field는 기존 input/select renderer를 그대로 사용한다.
- Google Drive folder picker query에는 `mode = "folder_all_files"`를 사용한다.

draft value 구조:

```ts
draftValues.folder_id = selectedOption.id;
draftValues.folder_id_label = selectedOption.label;
draftValues.folder_id_meta = selectedOption.metadata;
```

단, `draftValues`가 현재 `Record<string, string>`이라 metadata 객체를 직접 담기 어렵다.  
따라서 `SinkSchemaEditor` 내부 상태를 다음처럼 확장한다.

```ts
type DraftValues = Record<string, string>;

type AuxiliaryDraftValues = Record<string, unknown>;
```

검증은 문자열 필수값 기준을 유지한다.

```ts
const hasRequiredValue = (value: unknown) =>
  typeof value === "string" ? value.trim().length > 0 : value != null;
```

권장 상태 구조:

```ts
const [draftValues, setDraftValues] = useState<DraftValues>(initialDraftValues);
const [auxiliaryDraftValues, setAuxiliaryDraftValues] =
  useState<AuxiliaryDraftValues>(initialAuxiliaryDraftValues);
```

`folder_picker` 선택 시:

```ts
setDraftValues((current) => ({
  ...current,
  folder_id: selectedOption.id,
}));

setAuxiliaryDraftValues((current) => ({
  ...current,
  folder_id_label: selectedOption.label,
  folder_id_meta: selectedOption.metadata,
}));
```

commit 시:

- `folder_id`는 string으로 저장
- `folder_id_label`은 string으로 저장
- `folder_id_meta`는 object로 저장
- `isConfigured`는 기존 required field 기준으로 계산

commit 구현 기준:

```ts
const nextConfig = buildCommittedConfigFromDraft({
  draftValues,
  fields,
  sinkConfig,
});

const committedConfig = {
  ...nextConfig,
  ...auxiliaryDraftValues,
};
```

저장 주의:

- `auxiliaryDraftValues`는 schema field key가 아니므로 schema field 제거 필터에 의해 사라지지 않도록 별도로 merge한다.
- folder 선택을 비우면 `folder_id_label`, `folder_id_meta`도 함께 제거한다.
- `folder_id`가 빈 문자열이면 기존 config에 남아 있던 `folder_id_label`, `folder_id_meta`를 명시적으로 제거한다.
- 보조 필드 제거는 `undefined` 값을 merge하는 방식보다, 최종 config object에서 해당 key를 `delete`하는 방식이 안전하다.
- `hasChanges` 계산에는 `draftValues`와 `auxiliaryDraftValues`를 모두 포함한다.

주의:

- `replaceNodeConfig` 기반 최종 저장 구조를 유지한다.
- 즉시 `updateNodeConfig` 방식으로 바꾸지 않는다.
- number field는 기존 `Number.isFinite` 검증을 유지한다.

---

## 4.5 OAuth error UX

백엔드는 Google Drive picker에서 다음 error code를 내려줄 수 있다.

- `OAUTH_TOKEN_EXPIRED`
- `OAUTH_SCOPE_INSUFFICIENT`
- `OAUTH_NOT_CONNECTED`
- `EXTERNAL_API_ERROR`

프론트 메시지 매핑을 보강한다.

```text
src/shared/constants/api-error-messages.ts
```

추가:

```ts
OAUTH_NOT_CONNECTED: "서비스 연결이 필요합니다.",
OAUTH_TOKEN_EXPIRED: "Google Drive 연결이 만료되었습니다. 다시 연결해 주세요.",
OAUTH_SCOPE_INSUFFICIENT: "Google Drive 접근 권한이 부족합니다. 다시 연결해 주세요.",
EXTERNAL_API_ERROR: "외부 서비스에서 선택지를 불러오지 못했습니다.",
```

`HTTP_ERROR_MESSAGES` 추가:

```ts
502: "외부 서비스에서 선택지를 불러오지 못했습니다.",
```

picker error 영역에서는 `getApiErrorMessage(error)`를 사용한다.

추후 개선:

- OAuth 오류일 때 바로 연결 버튼을 노출한다.
- 현재 이 설계에서는 메시지 보강까지만 1차 범위로 둔다.

---

## 5. 구현 단계

### Step 1. 공통 RemoteOptionPicker 추가

작업:

- `src/shared/ui/RemoteOptionPicker.tsx` 추가
- `src/shared/ui/index.ts` export 추가
- 현재 `SourceTargetPicker` row UI를 대체할 수 있는 props 설계

검토:

- keyboard 선택 가능
- folder browse와 row select 이벤트 분리
- loading, empty, error, pagination 표시 가능
- shared component 내부에 Canvas/Drive 도메인 icon 또는 metadata key가 들어가지 않음

커밋 메시지:

```text
feat: add remote option picker component
```

### Step 2. SourceTargetPicker에 Drive folder breadcrumb 반영

작업:

- `SourceTargetPicker`에서 `RemoteOptionPicker` 사용
- `folder_picker`일 때 path state, parentId query 연결
- service/mode/schema 변경 시 path와 search query 초기화
- folder 진입/root/breadcrumb 이동 시 search query 초기화
- option 선택 시 기존 `SourceTargetPickerValue` 유지
- 선택 option metadata가 상위로 보존되는지 확인

검토:

- Canvas course/term 선택 정상
- Drive file 선택 정상
- Drive folder 선택 정상
- Drive folder 내부 탐색 정상
- `target`, `target_label`, `target_meta` 저장 유지

커밋 메시지:

```text
feat: add drive folder browsing to source picker
```

### Step 3. Google Drive sink folder picker 추가

작업:

- `SinkSchemaEditor`에 field renderer 분기 추가
- `serviceKey === "google_drive"`이고 `field.type === "folder_picker"`이면 remote picker 사용
- Google Drive folder picker 조회 mode는 `folder_all_files` 사용
- `folder_id`, `folder_id_label`, `folder_id_meta` draft 저장
- schema field가 아닌 보조 draft 값도 save 시 config에 merge
- 기존 validation과 `isConfigured` 계산 유지

검토:

- 기존 text/select/number field 동작 유지
- Google Drive sink에서 folder 직접 입력 대신 picker 표시
- sink folder picker가 `mode=folder_all_files`로 option API 호출
- sink folder picker에서 parentId 기반 folder 내부 탐색 가능
- 저장 후 config에 `folder_id` 포함
- 저장 후 config에 `folder_id_label`, `folder_id_meta` 포함
- 필수 folder 미선택 시 저장 불가
- 숫자 field `NaN` 저장 방지 유지

커밋 메시지:

```text
feat: add google drive folder picker for sink config
```

### Step 4. OAuth picker error message 보강

작업:

- `API_ERROR_MESSAGES`에 OAuth/External API error code 추가
- `HTTP_ERROR_MESSAGES`에 502 메시지 추가
- picker error 영역에서 `getApiErrorMessage` 사용 확인

검토:

- `OAUTH_TOKEN_EXPIRED` 메시지가 재연결 필요로 표시
- `OAUTH_SCOPE_INSUFFICIENT` 메시지가 권한 재연결 필요로 표시
- 일반 502는 외부 서비스 오류로 표시

커밋 메시지:

```text
fix: improve remote picker oauth error messages
```

### Step 5. 검증

자동 검증:

```bash
pnpm lint
pnpm tsc
pnpm test
```

수동 검증:

1. Canvas LMS course picker로 시작 노드 생성
2. Canvas LMS term picker로 시작 노드 생성
3. Google Drive file picker로 시작 노드 생성
4. Google Drive folder picker에서 folder 내부로 들어간 뒤 시작 노드 생성
5. 생성된 시작 노드 config에 `target`, `target_label`, `target_meta` 확인
6. Google Drive sink 도착 노드에서 저장 folder 선택
7. sink config 저장 후 `folder_id`, `folder_id_label`, `folder_id_meta`, `isConfigured` 확인
8. Google Drive 연결 만료 또는 권한 부족 시 picker error message 확인

---

## 6. 후속 이슈

이번 범위에서 제외하고 별도로 다룰 항목:

- Google Drive 새 폴더 만들기 API와 UI
- OAuth 오류 발생 시 picker 내부에서 바로 재연결 버튼 제공
- Workflow 이름 인라인 편집
- Gmail/Slack/Notion/Google Sheets picker 확장
- Drive folder picker 무한 스크롤 또는 virtual list
- `target_meta`를 backend schema preview source summary에 포함

---

## 7. 최종 방향

`feat#119`를 그대로 병합하지 않는다.  
현재 브랜치의 백엔드 계약 기반 구현을 기준으로 두고, `feat#119`의 UX 아이디어를 다음 순서로 흡수한다.

```text
공통 picker 추출
-> source Drive folder breadcrumb
-> sink Google Drive folder picker
-> OAuth error message 보강
```

이 순서가 가장 충돌이 적고, 기존 source target 저장 계약과 sink 설정 검증을 지킬 수 있다.
