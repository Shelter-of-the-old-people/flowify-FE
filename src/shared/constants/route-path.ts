// 기본적인 router path를 상수로 정의
export const ROUTE_PATHS = {
  MAIN: "/",
  LOGIN: "/login",
  LOGIN_CALLBACK: "/login/callback",
  ACCOUNT: "/account",
  SETTINGS: "/settings",
  TEMPLATES: "/templates",
  WORKFLOWS: "/workflows",
  NOT_FOUND: "*",
};

// 동적 라우트 path를 상수로 정의 (파라미터 포함)
export const DYNAMIC_ROUTE_PATHS = {
  TEMPLATE_DETAIL: "/templates/:id",
  WORKFLOW_EDITOR: "/workflows/:id",
};

// 동적 라우트 URL 생성 헬퍼
export const buildPath = {
  templateDetail: (id: string) => `/templates/${id}`,
  workflowEditor: (id: string) => `/workflows/${id}`,
};
