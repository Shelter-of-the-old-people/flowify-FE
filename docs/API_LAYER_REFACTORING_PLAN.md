# API 레이어 리팩토링 설계 문서

> **작성일**: 2026-04-13
> **대상**: flowify-fe API 통신 계층 전체
> **목적**: `request 경계`, `에러 정규화`, `hook 옵션 계약`, `workflow domain cache`를 기준으로 API 레이어를 재설계한다.

---

## 1. 문제 정의

현재 구조의 핵심 문제는 파일 분해보다 런타임 계약이 먼저 흔들린다는 점이다.

1. 비-2xx 응답이 Axios 단계에서 먼저 `AxiosError`로 reject 되어 `success: false` 기반 비즈니스 에러가 `ApiError`로 정규화되지 못한다.
2. `refreshAccessToken()`이 일반 API 함수와 다른 응답 경로를 써서 에러 규칙이 두 갈래로 갈린다.
3. `QueryClient`는 `meta.showErrorToast`를 읽지만, 실제 public query/mutation 훅은 그런 정책 옵션을 받지 못한다.
4. workflow 삭제 시 execution cache까지 정리되지 않아 domain cache ownership이 불명확하다.
5. `normalizeApiError()`와 `getApiErrorMessage()`의 책임 경계가 문서상 명확하지 않다.

---

## 2. 설계 원칙

### 2.1 계층별 책임

| 계층 | 책임 |
|------|------|
| `shared/api/client.ts` | Axios 인스턴스, 토큰 부착, 401 refresh, refresh 실패 시 로그인 리다이렉트 |
| `shared/api/core/request.ts` | 응답 언래핑, 비즈니스/HTTP 에러 정규화, cancel 예외 처리 |
| `shared/api/*/*.api.ts` | 엔드포인트 단위 API 함수. 내부 구현은 반드시 `request()` 또는 `requestWithClient()` 사용 |
| `shared/model/**/*Query.ts` | 조회 훅. query key + queryFn + 화면 정책 옵션 연결 |
| `shared/model/**/*Mutation.ts` | 변경 훅. mutationFn + 성공 후 캐시 정책 + 화면 정책 옵션 연결 |
| `shared/libs/query-client.ts` | 토스트 정책 집행. 최종 사용자 메시지는 `getApiErrorMessage()`에 위임 |

### 2.2 단일 입구 원칙

- 정상적인 application error는 모두 `request()` 계층에서 정규화한다.
- 예외적으로 auth session 만료는 transport concern으로 유지한다.
  - `apiClient`는 401 refresh 실패 시 세션 정리 후 `/login`으로 리다이렉트한다.

### 2.3 메시지 책임 원칙

- `normalizeApiError()`는 구조 정규화만 담당한다.
- `getApiErrorMessage()`가 최종 사용자 메시지를 생성한다.
- `showErrorToast()`는 메시지 생성이 아니라 토스트 출력만 담당한다.

### 2.4 취소 요청 원칙

- Axios cancel / abort는 `ApiError`로 감싸지 않는다.
- 취소된 요청은 토스트 대상이 아니다.

### 2.5 OAuth callback 인증 경계

- `/auth/exchange`와 `/auth/refresh`는 로그인 완료 전(pre-auth) 인증 흐름으로 본다.
- pre-auth 엔드포인트는 `publicApiClient`를 사용한다.
  - `Authorization` 헤더를 자동 주입하지 않는다.
  - `401 -> refresh -> /login redirect` 인터셉터를 타지 않는다.
- 보호 API는 기존 `apiClient`를 사용한다.
  - `Authorization` 헤더 자동 주입
  - `401 -> refresh -> retry`
  - refresh 실패 시 세션 정리 후 `/login` 이동
- 이유:
  - `AuthCallbackPage`는 `/auth/exchange` 실패를 직접 받아 사용자에게 안내해야 한다.
  - callback 단계에서 전역 인증 인터셉터가 먼저 개입하면 실제 교환 실패 원인을 화면에서 설명하기 어렵다.

### 2.6 Auth callback 에러 메시지 정책

- callback 페이지는 실패 원인을 두 갈래로 나눈다.
  - redirect query 기반 실패
  - exchange API 기반 실패
- 메시지 우선순위는 아래와 같다.
  1. query `message`
  2. query `error` 코드 매핑
  3. `ApiError.errorCode` 기반 auth callback 전용 매핑
  4. shared `getApiErrorMessage(error)`
  5. generic callback fallback message
- auth callback 전용 코드(`oauth_failed`, `exchange_code_expired`, `exchange_code_invalid`)는 page-local helper에서 관리한다.
- 공통 HTTP/API 에러 메시지는 계속 `shared/constants/api-error-messages.ts`가 담당한다.

---

## 3. Phase 1 — Request 경계 통합

### 3.1 목표

각 API 파일에서 `processApiResponse()`를 반복 호출하는 구조를 제거하고, `request()` 계층에서 응답 언래핑과 에러 정규화를 함께 처리한다.

### 3.2 변경 파일

| 파일 | 작업 |
|------|------|
| `shared/api/core/api-error.ts` | `ApiError`, `normalizeApiError()`, `isCanceledRequestError()` |
| `shared/api/core/request.ts` | `unwrapApiResponse()`, `request()`, `requestWithClient()` |
| `shared/api/core/index.ts` | core 배럴 |
| `shared/api/client.ts` | `publicApiClient`, `apiClient`, `refreshClient` 책임 분리 및 `refreshAccessToken()`을 `requestWithClient(refreshClient, ...)` 기반으로 변경 |
| `shared/utils/api/api-utils.ts` | 제거 또는 역할 이전 |
| `shared/api/auth/exchange-auth.api.ts` | `requestWithClient(publicApiClient, ...)` 사용 |
| `shared/api/auth/refresh-auth.api.ts` | `requestWithClient(publicApiClient, ...)` 사용 |
| 모든 `shared/api/**/*.api.ts` | `apiClient.* + processApiResponse()` 패턴 제거 |

### 3.3 `ApiError`

```typescript
export class ApiError extends Error {
  public readonly errorCode: string | null;
  public readonly statusCode: number | null;
  public readonly isNetworkError: boolean;
  public override readonly cause?: unknown;

  constructor(params: {
    message: string;
    errorCode?: string | null;
    statusCode?: number | null;
    isNetworkError?: boolean;
    cause?: unknown;
  }) {
    super(params.message);
    this.name = "ApiError";
    this.errorCode = params.errorCode ?? null;
    this.statusCode = params.statusCode ?? null;
    this.isNetworkError = params.isNetworkError ?? false;
    this.cause = params.cause;
  }
}
```

### 3.4 `normalizeApiError()`

```typescript
export const isCanceledRequestError = (error: unknown) =>
  isAxiosError(error) && error.code === "ERR_CANCELED";

export const normalizeApiError = (error: unknown): ApiError => {
  if (error instanceof ApiError) {
    return error;
  }

  if (isAxiosError<ApiResponse<unknown>>(error)) {
    const response = error.response;
    const data = response?.data;

    if (data && typeof data === "object" && "success" in data && data.success === false) {
      return new ApiError({
        message: data.message ?? "요청을 처리할 수 없습니다.",
        errorCode: data.errorCode ?? null,
        statusCode: response?.status ?? null,
        cause: error,
      });
    }

    if (!response) {
      return new ApiError({
        message: "네트워크 연결을 확인해주세요.",
        errorCode: "NETWORK_ERROR",
        isNetworkError: true,
        cause: error,
      });
    }

    return new ApiError({
      message: error.message,
      statusCode: response.status,
      cause: error,
    });
  }

  if (error instanceof Error) {
    return new ApiError({ message: error.message, cause: error });
  }

  return new ApiError({ message: "요청을 처리할 수 없습니다.", cause: error });
};
```

### 3.5 `request()` / `requestWithClient()`

```typescript
const toBusinessApiError = (response: {
  message: string;
  errorCode: string | null;
}) =>
  new ApiError({
    message: response.message || "요청을 처리할 수 없습니다.",
    errorCode: response.errorCode,
  });

const unwrapApiResponse = <T>(response: ApiResponse<T>): T => {
  if (response.success) {
    return response.data;
  }

  throw toBusinessApiError(response);
};

export const requestWithClient = async <T>(
  client: AxiosInstance,
  config: AxiosRequestConfig,
): Promise<T> => {
  try {
    const { data } = await client.request<ApiResponse<T>>(config);
    return unwrapApiResponse(data);
  } catch (error) {
    if (isCanceledRequestError(error)) {
      throw error;
    }

    throw normalizeApiError(error);
  }
};

export const request = <T>(config: AxiosRequestConfig) =>
  requestWithClient<T>(apiClient, config);
```

### 3.6 refresh 경로

```typescript
const refreshAccessToken = async (refreshToken: string) => {
  const result = await requestWithClient<LoginResponse>(refreshClient, {
    url: "/auth/refresh",
    method: "POST",
    data: { refreshToken },
  });

  storeTokens(result.accessToken, result.refreshToken);
  storeAuthUser(result.user);
  return result.accessToken;
};
```

### 3.7 public/private auth client

```typescript
const sharedClientConfig = {
  baseURL: API_BASE_URL,
  timeout: 10_000,
  headers: {
    "Content-Type": "application/json",
  },
};

export const publicApiClient = axios.create(sharedClientConfig);
export const apiClient = axios.create(sharedClientConfig);
const refreshClient = axios.create(sharedClientConfig);
```

규칙:

- `publicApiClient`
  - `/auth/exchange`, `/auth/refresh` 전용
  - 인증 헤더 부착 없음
  - 401 refresh/login redirect 없음
- `apiClient`
  - 보호 API 전용
  - request interceptor에서 access token 주입
  - response interceptor에서 `401 -> refresh -> retry`
- `refreshClient`
  - transport 전용 내부 client
  - refresh 응답도 동일한 `requestWithClient()` 경계를 탄다

예시:

```typescript
export const exchangeAuthAPI = (exchangeCode: string): Promise<LoginResponse> =>
  requestWithClient<LoginResponse>(publicApiClient, {
    url: "/auth/exchange",
    method: "POST",
    data: {
      exchangeCode,
    },
  });
```

```typescript
export const refreshAuthAPI = (refreshToken: string): Promise<LoginResponse> =>
  requestWithClient<LoginResponse>(publicApiClient, {
    url: "/auth/refresh",
    method: "POST",
    data: {
      refreshToken,
    },
  });
```

---

## 4. Phase 2 — 에러 표시 정책 정리

### 4.1 메시지 책임

| 함수 | 책임 |
|------|------|
| `normalizeApiError()` | 원시 에러를 `ApiError` 구조로 정규화 |
| `getApiErrorMessage()` | 최종 사용자 메시지 생성 |
| `showErrorToast()` | 토스트 출력 |

### 4.2 Query/Mutation 정책

| 구분 | 기본 동작 |
|------|----------|
| Query | 토스트 안 함 |
| Mutation | 토스트 함 |
| Cancel | 토스트 안 함 |

### 4.3 `getApiErrorMessage()`

```typescript
export const getApiErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    if (error.errorCode) {
      const apiMessage =
        API_ERROR_MESSAGES[error.errorCode as keyof typeof API_ERROR_MESSAGES];
      if (apiMessage) {
        return apiMessage;
      }
    }

    if (error.statusCode) {
      const httpMessage =
        HTTP_ERROR_MESSAGES[error.statusCode as keyof typeof HTTP_ERROR_MESSAGES];
      if (httpMessage) {
        return httpMessage;
      }
    }

    return error.message || HTTP_ERROR_MESSAGES.default;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return HTTP_ERROR_MESSAGES.default;
};
```

### 4.4 `QueryClient`

```typescript
const showErrorToast = (
  error: unknown,
  meta: Record<string, unknown> | undefined,
) => {
  if (isCanceledRequestError(error)) {
    return;
  }

  if (meta?.showErrorToast === false) {
    return;
  }

  const description =
    typeof meta?.errorMessage === "string"
      ? meta.errorMessage
      : getApiErrorMessage(error);

  toaster.create({
    type: "error",
    description,
  });
};
```

`query.meta.showErrorToast === true`일 때만 query 토스트를 띄우고, mutation은 `showErrorToast === false`가 아닌 한 기본 토스트를 띄운다. `throwOnError` 기본값은 계속 `false`다.

### 4.5 `AuthCallbackPage` 에러 처리

`AuthCallbackPage`는 아래 순서로 동작한다.

1. `exchange_code`, `error`, `message`를 query에서 읽는다.
2. redirect 단계 실패가 있으면 세션을 정리하고 즉시 에러 UI를 보여준다.
3. `exchange_code`가 있으면 `authApi.exchange(exchangeCode)`를 호출한다.
4. 성공 시 `accessToken`, `refreshToken`, `user`를 저장하고 `/workflows`로 이동한다.
5. 실패 시 `clearAuthSession()` 후 exchange 에러를 해석해 에러 UI를 보여준다.

권장 helper 분리:

- `resolveRedirectError(searchParams): string | null`
- `resolveAuthExchangeError(error: unknown): string`

규칙:

- redirect query 에러와 API 에러 해석 로직을 분리한다.
- `catch`에서 실제 `error`를 버리지 않는다.
- exchange 실패는 callback 페이지가 직접 처리하고, 전역 인증 인터셉터가 먼저 `/login`으로 보내지 않도록 한다.

---

## 5. Phase 3 — 쿼리 키와 도메인 캐시 재정의

### 5.1 쿼리 키

```typescript
export const workflowKeys = {
  all: () => ["workflow"] as const,
  lists: () => [...workflowKeys.all(), "list"] as const,
  list: (params: { page: number; size: number }) =>
    [...workflowKeys.lists(), params.page, params.size] as const,
  infiniteList: (size: number) =>
    [...workflowKeys.lists(), "infinite", size] as const,
  details: () => [...workflowKeys.all(), "detail"] as const,
  detail: (workflowId: string) =>
    [...workflowKeys.details(), workflowId] as const,
  choicesRoot: (workflowId: string) =>
    [...workflowKeys.detail(workflowId), "choices"] as const,
  choice: (workflowId: string, prevNodeId: string) =>
    [...workflowKeys.choicesRoot(workflowId), prevNodeId] as const,
} as const;

export const executionKeys = {
  all: () => ["execution"] as const,
  workflow: (workflowId: string) =>
    [...executionKeys.all(), "workflow", workflowId] as const,
  lists: (workflowId: string) =>
    [...executionKeys.workflow(workflowId), "list"] as const,
  detail: (workflowId: string, executionId: string) =>
    [...executionKeys.workflow(workflowId), "detail", executionId] as const,
} as const;
```

### 5.2 캐시 helper

```typescript
export const removeWorkflowDomainCache = async (workflowId: string) => {
  queryClient.removeQueries({ queryKey: workflowKeys.detail(workflowId) });
  queryClient.removeQueries({ queryKey: workflowKeys.choicesRoot(workflowId) });
  queryClient.removeQueries({ queryKey: executionKeys.workflow(workflowId) });
  await queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
};
```

### 5.3 mutation별 소유 범위

| mutation | 캐시 처리 |
|----------|----------|
| create/update/toggle workflow | detail set + workflow lists invalidate |
| delete workflow | `removeWorkflowDomainCache(workflowId)` |
| add/update/delete workflow node | workflow detail set |
| execute/rollback workflow | `executionKeys.workflow(workflowId)` invalidate |

---

## 6. Phase 4 — API 파일 구조 정리

```text
shared/api/
├── client.ts
├── core/
│   ├── api-error.ts
│   ├── request.ts
│   └── index.ts
├── workflow/
├── execution/
├── template/
├── auth/
└── oauth-token/
```

규칙:

1. API 함수는 액션별 1파일로 둔다.
2. 내부 구현은 반드시 `request()` 또는 `requestWithClient()`를 사용한다.
3. `shared/index.ts`에서 `export * from "./api"`를 제거해 `@/shared` 배럴 우회를 막는다.

---

## 7. Phase 5 — Query/Mutation 훅 계약 정리

### 7.1 공용 옵션 타입

```typescript
type QueryPolicyOptions<TQueryFnData, TData = TQueryFnData> = Pick<
  UseQueryOptions<TQueryFnData, ApiError, TData>,
  "enabled" | "select" | "retry" | "staleTime" | "refetchInterval" | "placeholderData"
> & {
  showErrorToast?: boolean;
  errorMessage?: string;
};

type MutationPolicyOptions<TData, TVariables> = Pick<
  UseMutationOptions<TData, ApiError, TVariables>,
  "onSuccess" | "onError" | "retry"
> & {
  showErrorToast?: boolean;
  errorMessage?: string;
};
```

### 7.2 Query 훅 예시

```typescript
export const useWorkflowListQuery = (
  page = 0,
  size = 20,
  options?: QueryPolicyOptions<PageResponse<WorkflowResponse>>,
) =>
  useQuery({
    queryKey: workflowKeys.list({ page, size }),
    queryFn: () => getWorkflowListAPI(page, size),
    enabled: options?.enabled ?? true,
    select: options?.select,
    retry: options?.retry,
    staleTime: options?.staleTime,
    refetchInterval: options?.refetchInterval,
    placeholderData: options?.placeholderData,
    meta: {
      showErrorToast: options?.showErrorToast,
      errorMessage: options?.errorMessage,
    },
    throwOnError: false,
  });
```

### 7.3 Mutation 훅 예시

```typescript
export const useDeleteWorkflowMutation = (
  options?: MutationPolicyOptions<void, string>,
) =>
  useMutation({
    mutationFn: deleteWorkflowAPI,
    meta: {
      showErrorToast: options?.showErrorToast,
      errorMessage: options?.errorMessage,
    },
    onSuccess: async (_data, workflowId, context) => {
      await removeWorkflowDomainCache(workflowId);
      await options?.onSuccess?.(_data, workflowId, context);
    },
    onError: async (error, workflowId, context) => {
      await options?.onError?.(error, workflowId, context);
    },
  });
```

### 7.4 직접 API 호출 금지 규칙

- 원칙적으로 `shared/api`는 `shared/model` 내부 훅에서만 import 한다.
- 예외:
  - `AuthCallbackPage.tsx`의 OAuth 콜백 교환
  - `useLogout.ts`의 로그아웃 호출
  - `shared/api/client.ts`의 Axios transport 정의

검증:

```powershell
rg -n "from ['\"]@/shared/api" src |
  rg -v "src/shared/model/|src/shared/api/client.ts|src/pages/auth-callback/AuthCallbackPage.tsx|src/features/auth/logout/model/useLogout.ts"
```

---

## 8. 영향 범위와 마이그레이션 체크리스트

- [ ] `shared/api/core` 도입
- [ ] `publicApiClient` / `apiClient` / `refreshClient` 책임 분리
- [ ] `refreshAccessToken()`을 `requestWithClient()`로 전환
- [ ] 모든 API 파일에서 `processApiResponse()` 제거
- [ ] `shared/utils/api/api-utils.ts` 역할 정리
- [ ] `/auth/exchange`, `/auth/refresh`를 `publicApiClient` 기반으로 전환
- [ ] `AuthCallbackPage`에서 redirect/query 에러와 exchange API 에러를 분리 처리
- [ ] query/mutation public hook에 `options` 계약 추가
- [ ] `removeWorkflowDomainCache()` 도입
- [ ] `executionKeys.workflow(workflowId)` 루트 도입
- [ ] `@/shared` API re-export 제거

---

## 9. 환경별 API 도메인 전략

| 환경변수 | 용도 |
|---------|------|
| `VITE_API_BASE_URL` | API 도메인 + base path |
| `VITE_AUTH_GOOGLE_PATH` | Google OAuth 시작 경로 |

원칙:

- `.env.local`은 Docker 로컬 개발용으로만 사용한다.
- `VITE_AUTH_GOOGLE_PATH`는 기본값(`/api/auth/google`)을 유지하고, 특수 환경에서만 절대 URL로 오버라이드한다.
- `refreshClient`도 동일한 `baseURL`을 사용하며, refresh 응답 역시 일반 API와 같은 request 경계를 탄다.
- `VITE_AUTH_GOOGLE_PATH`가 가리키는 OAuth 시작 URL과 `/auth/callback`의 콜백 경로는 같은 환경(local/dev/prod) 쌍으로 관리한다.

---

## 10. 제외 범위

- Zustand 구조 개편
- auth storage 전략 변경
- Error Boundary 도입
- MSW 도입
- `shared/model` -> `entities/*/model` 레이어 재배치

---

## 11. 검증 기준

### 정적 검증

- `response.data.data` 사용 0건
- `shared/api/**/*.api.ts`에서 `processApiResponse` 사용 0건
- `@/shared/api` 직접 import가 예외 파일 외 0건

### 동작 검증

1. 200 + `success: true` 응답이 정상 데이터로 반환된다.
2. 200 + `success: false` 응답이 `ApiError`로 변환된다.
3. 비-2xx 응답도 `ApiError`로 정규화된다.
4. cancel 된 요청은 토스트가 뜨지 않는다.
5. query는 `showErrorToast: true`일 때만 토스트가 뜬다.
6. mutation은 기본 토스트가 뜨고 `showErrorToast: false`일 때만 꺼진다.
7. workflow 삭제 후 workflow detail, choices, execution cache가 모두 제거된다.
8. 401 -> refresh 성공/실패 흐름이 기존과 동일하게 유지된다.
9. `/auth/exchange`가 400/401/409로 실패해도 `AuthCallbackPage`가 실패 메시지를 직접 표시하고 즉시 `/login`으로 튕기지 않는다.
10. redirect query(`?error=oauth_failed&message=...`)가 있으면 callback 페이지에서 해당 메시지를 우선 노출한다.
