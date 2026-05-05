# 노드 권한 상태 표시 개선 설계

> **작성일:** 2026-05-05  
> **브랜치:** `feat#132-node-permission-state-ui`  
> **목적:** 백엔드가 `missingFields`에 `oauth_scope_insufficient`를 내려줄 때 프론트에서 권한 부족 상태를 정확히 표시한다.

---

## 1. 배경

Spring 백엔드는 OAuth 상태를 `missingFields` 기반으로 구분하는 A안으로 정리할 예정이다.

| 상태 | 백엔드 `missingFields` |
| --- | --- |
| 서비스 토큰 없음 | `["oauth_token"]` |
| OAuth scope 부족 | `["oauth_scope_insufficient"]` |

현재 프론트는 `missingFields`를 이미 사용하고 있으므로 `NodeStatusResponse`에 `reason` 같은 새 필드를 추가하지 않아도 된다.

다만 현재 UI는 `configured=false`일 때만 missing field를 노드 요약에 표시한다. scope 부족은 설정값 누락이 아니라 실행 조건 문제이므로, 백엔드가 아래처럼 내려줄 수 있다.

```ts
{
  configured: true,
  executable: false,
  missingFields: ["oauth_scope_insufficient"],
}
```

따라서 프론트는 `configured`만 보지 않고 `executable` 상태까지 함께 해석해야 한다.

---

## 2. 현재 구현

### 2.1 타입

`WorkflowNodeStatusResponse`는 현재 다음 구조다.

```ts
export interface WorkflowNodeStatusResponse {
  nodeId: string;
  configured: boolean;
  saveable: boolean;
  choiceable: boolean;
  executable: boolean;
  missingFields: string[] | null;
}
```

`reason` 필드는 없고, adapter에서 `missingFields`만 `[]`로 정규화한다.

### 2.2 missing field 라벨

`src/entities/workflow/lib/node-status.ts`에서 raw key를 사용자 표시 라벨로 바꾼다.

현재는 `oauth_token: "인증 연결"`만 존재한다. `oauth_scope_insufficient`는 아직 라벨이 없어 raw key로 노출될 수 있다.

### 2.3 Canvas 노드 요약

`BaseNode`는 현재 `configured=false`일 때만 missing field 요약을 만든다.

```ts
nodeStatus && !nodeStatus.configured && nodeStatus.missingFields.length > 0
```

따라서 `configured=true`, `executable=false`인 권한 부족 상태는 캔버스 노드에 보이지 않을 수 있다.

### 2.4 패널 표시

`InputPanel`, `SinkNodePanel`은 `missingFields`를 표시하지만 문구가 `누락 항목`이다. 권한 부족은 누락 항목이라기보다 실행 조건 문제라 문구가 어색할 수 있다.

---

## 3. 설계 원칙

1. 백엔드 계약은 A안을 따른다.
   - 새 `reason` 필드를 전제로 하지 않는다.
   - `missingFields` key 해석만 확장한다.

2. 상태 해석 로직은 `entities/workflow/lib`에 둔다.
   - `BaseNode`, `InputPanel`, `SinkNodePanel`에 중복 조건문을 만들지 않는다.
   - FSD 의존성 방향을 유지한다.

3. `configured`와 `executable`의 의미를 분리한다.
   - `configured=false`: 사용자가 채워야 할 필수 설정 문제
   - `configured=true && executable=false`: 인증, 권한, 실행 조건 문제

4. 기존 `config.*` missingFields 표시는 유지한다.
   - `config.folder_id` -> `폴더`
   - `config.spreadsheet_id` -> `스프레드시트`
   - `oauth_token` -> `인증 연결`

---

## 4. 상태 표시 정책

### 4.1 라벨 매핑

`NODE_STATUS_FIELD_LABELS`에 다음 key를 추가한다.

```ts
oauth_scope_insufficient: "권한 부족",
```

### 4.2 상태 요약 prefix

노드 상태에 따라 prefix를 분리한다.

| 조건 | prefix | 예시 |
| --- | --- | --- |
| `configured=false` | `필수 설정` | `필수 설정: 폴더` |
| `configured=true && executable=false` | `실행 조건` | `실행 조건: 권한 부족` |
| `missingFields=[]` | 표시하지 않음 | - |

### 4.3 패널 문구

패널에서는 `누락 항목` 대신 더 넓은 표현을 사용한다.

| 기존 | 변경 |
| --- | --- |
| `누락 항목: ...` | `확인 항목: ...` |

이 문구는 설정 누락과 권한 부족을 모두 포괄한다.

---

## 5. 파일별 설계

### 5.1 `src/entities/workflow/lib/node-status.ts`

역할:

- missing field key 정규화
- missing field label 변환
- node status의 표시 prefix 계산
- node status 요약 문자열 생성

추가할 helper:

```ts
type NodeStatusSummaryKind = "required_config" | "execution_condition";

export const getNodeStatusSummaryKind = (
  status: Pick<WorkflowNodeStatusResponse, "configured" | "executable">,
): NodeStatusSummaryKind | null => {
  if (!status.configured) {
    return "required_config";
  }
  if (!status.executable) {
    return "execution_condition";
  }
  return null;
};
```

```ts
export const getNodeStatusSummaryLabel = (
  status: Pick<
    WorkflowNodeStatusResponse,
    "configured" | "executable" | "missingFields"
  >,
) => {
  const missingFields = status.missingFields ?? [];
  const kind = getNodeStatusSummaryKind(status);

  if (!kind || missingFields.length === 0) {
    return null;
  }

  const prefix =
    kind === "required_config" ? "필수 설정" : "실행 조건";

  return `${prefix}: ${missingFields
    .map(getNodeStatusMissingFieldLabel)
    .join(", ")}`;
};
```

실제 구현 시 `WorkflowNodeStatusResponse`를 import하면 `entities/workflow/api`와 `entities/workflow/lib` 사이 순환이 생기지 않는지 확인한다. 순환 우려가 있으면 `Pick` 대신 lib 내부 최소 타입을 선언한다.

### 5.2 `src/entities/node/ui/BaseNode.tsx`

현재 `missingFieldSummary` 계산을 helper 호출로 대체한다.

기존:

```ts
const missingFieldSummary =
  nodeStatus && !nodeStatus.configured && nodeStatus.missingFields.length > 0
    ? ...
    : null;
```

변경:

```ts
const statusSummary = nodeStatus
  ? getNodeStatusSummaryLabel(nodeStatus)
  : null;
```

`summaryContent`는 기존처럼 `statusSummary ?? presentation.helperText`를 사용한다.

### 5.3 `src/widgets/input-panel/ui/InputPanel.tsx`

현재:

```tsx
누락 항목: {activeNodeMissingFields.join(", ")}
```

변경:

```tsx
확인 항목: {activeNodeMissingFields.join(", ")}
```

### 5.4 `src/features/configure-node/ui/panels/SinkNodePanel.tsx`

현재:

```tsx
누락 항목: {missingFields.join(", ")}
```

변경:

```tsx
확인 항목: {missingFields.join(", ")}
```

### 5.5 `src/entities/oauth-token/api/types.ts`

백엔드가 Google Sheets alias metadata를 내려줄 수 있으므로 optional field를 추가한다.

```ts
export interface OAuthTokenSummary {
  service: string;
  connected: boolean;
  accountEmail: string | null;
  expiresAt: string | null;
  aliasOf?: string | null;
  disconnectable?: boolean | null;
  reason?: string | null;
}
```

현재 프론트 로직은 `connected`와 `service`만 사용하므로 기존 동작은 바뀌지 않는다.

---

## 6. 구현 순서

1. `node-status.ts` 상태 helper와 `oauth_scope_insufficient` 라벨 추가
2. `BaseNode`에서 helper 사용
3. `InputPanel`, `SinkNodePanel` 문구를 `확인 항목`으로 변경
4. `OAuthTokenSummary` optional field 확장
5. 타입 체크 및 빌드 검증

---

## 7. 검증 계획

### 7.1 정적 검증

```bash
pnpm run tsc
pnpm run build
```

### 7.2 수동 검증

1. 일반 설정 누락 노드
   - 예: Google Drive 도착 노드 `folder_id=""`
   - 기대: `필수 설정: 폴더`

2. 토큰 미연결 노드
   - 기대: `실행 조건: 인증 연결` 또는 백엔드 configured 정책에 따라 `필수 설정: 인증 연결`
   - 핵심은 raw key가 보이지 않아야 한다.

3. scope 부족 노드
   - 백엔드 응답 예:

   ```json
   {
     "configured": true,
     "executable": false,
     "missingFields": ["oauth_scope_insufficient"]
   }
   ```

   - 기대: 캔버스 노드에 `실행 조건: 권한 부족`
   - 패널에는 `확인 항목: 권한 부족`

4. 정상 노드
   - 기대: 기존 helper text 표시 유지

---

## 8. 완료 기준

- `oauth_scope_insufficient`가 화면에 raw key로 노출되지 않는다.
- `configured=true`, `executable=false`인 권한 부족 노드도 캔버스에서 상태 메시지가 보인다.
- 기존 설정 누락 상태는 `필수 설정`으로 계속 표시된다.
- `InputPanel`, `SinkNodePanel`의 상태 문구가 설정 누락과 권한 부족을 모두 포괄한다.
- OAuth alias metadata가 타입 오류 없이 수용된다.
- `pnpm run tsc`, `pnpm run build`가 통과한다.
