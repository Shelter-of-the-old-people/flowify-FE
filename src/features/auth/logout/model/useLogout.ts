import { useCallback, useState } from "react";
import { useNavigate } from "react-router";

import { ROUTE_PATHS, authApi, clearAuthSession } from "@/shared";

export const useLogout = () => {
  const navigate = useNavigate();
  const [isPending, setIsPending] = useState(false);

  const logout = useCallback(async () => {
    if (isPending) {
      return;
    }

    setIsPending(true);

    try {
      await authApi.logout();
    } catch {
      // 요청 실패와 관계없이 로컬 세션은 정리한다.
    } finally {
      clearAuthSession();
      navigate(ROUTE_PATHS.LOGIN, { replace: true });
      setIsPending(false);
    }
  }, [isPending, navigate]);

  return {
    isPending,
    logout,
  };
};
