import {
  type InfiniteData,
  type QueryKey,
  type UseInfiniteQueryOptions,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";

import { type ApiError } from "../api/core";

type MetaPolicyOptions = {
  showErrorToast?: boolean;
  errorMessage?: string;
};

export type QueryPolicyOptions<
  TQueryFnData,
  TData = TQueryFnData,
> = MetaPolicyOptions & {
  enabled?: UseQueryOptions<TQueryFnData, ApiError, TData>["enabled"];
  select?: UseQueryOptions<TQueryFnData, ApiError, TData>["select"];
  retry?: UseQueryOptions<TQueryFnData, ApiError, TData>["retry"];
  staleTime?: UseQueryOptions<TQueryFnData, ApiError, TData>["staleTime"];
  refetchOnMount?: UseQueryOptions<
    TQueryFnData,
    ApiError,
    TData
  >["refetchOnMount"];
  refetchInterval?: UseQueryOptions<
    TQueryFnData,
    ApiError,
    TData
  >["refetchInterval"];
  placeholderData?: UseQueryOptions<
    TQueryFnData,
    ApiError,
    TData
  >["placeholderData"];
};

export type InfiniteQueryPolicyOptions<
  TQueryFnData,
  TPageParam = number,
> = MetaPolicyOptions & {
  enabled?: UseInfiniteQueryOptions<
    TQueryFnData,
    ApiError,
    InfiniteData<TQueryFnData, TPageParam>,
    QueryKey,
    TPageParam
  >["enabled"];
  retry?: UseInfiniteQueryOptions<
    TQueryFnData,
    ApiError,
    InfiniteData<TQueryFnData, TPageParam>,
    QueryKey,
    TPageParam
  >["retry"];
  staleTime?: UseInfiniteQueryOptions<
    TQueryFnData,
    ApiError,
    InfiniteData<TQueryFnData, TPageParam>,
    QueryKey,
    TPageParam
  >["staleTime"];
  refetchInterval?: UseInfiniteQueryOptions<
    TQueryFnData,
    ApiError,
    InfiniteData<TQueryFnData, TPageParam>,
    QueryKey,
    TPageParam
  >["refetchInterval"];
};

export type MutationPolicyOptions<
  TData,
  TVariables,
  TContext = unknown,
> = MetaPolicyOptions & {
  retry?: UseMutationOptions<TData, ApiError, TVariables, TContext>["retry"];
  onSuccess?: UseMutationOptions<
    TData,
    ApiError,
    TVariables,
    TContext
  >["onSuccess"];
  onError?: UseMutationOptions<
    TData,
    ApiError,
    TVariables,
    TContext
  >["onError"];
};

export const resolveQueryPolicyOptions = <TQueryFnData, TData = TQueryFnData>(
  enabledOrOptions?: boolean | QueryPolicyOptions<TQueryFnData, TData>,
) => {
  if (typeof enabledOrOptions === "boolean") {
    return { enabled: enabledOrOptions } as QueryPolicyOptions<
      TQueryFnData,
      TData
    >;
  }

  return enabledOrOptions;
};

export const resolveInfiniteQueryPolicyOptions = <
  TQueryFnData,
  TPageParam = number,
>(
  enabledOrOptions?:
    | boolean
    | InfiniteQueryPolicyOptions<TQueryFnData, TPageParam>,
) => {
  if (typeof enabledOrOptions === "boolean") {
    return {
      enabled: enabledOrOptions,
    } as InfiniteQueryPolicyOptions<TQueryFnData, TPageParam>;
  }

  return enabledOrOptions;
};

export const toQueryMeta = (options?: MetaPolicyOptions) => ({
  showErrorToast: options?.showErrorToast,
  errorMessage: options?.errorMessage,
});

export const toMutationMeta = (options?: MetaPolicyOptions) => ({
  showErrorToast: options?.showErrorToast,
  errorMessage: options?.errorMessage,
});
