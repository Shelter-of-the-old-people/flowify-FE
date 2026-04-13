import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

import { getApiErrorMessage, toaster } from "../utils";

const showErrorToast = (
  error: Error,
  meta: Record<string, unknown> | undefined,
) => {
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

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.meta?.showErrorToast !== true) {
        return;
      }

      showErrorToast(error as Error, query.meta);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.showErrorToast === false) {
        return;
      }

      showErrorToast(error as Error, mutation.meta);
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 3,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      throwOnError: false,
    },
  },
});
