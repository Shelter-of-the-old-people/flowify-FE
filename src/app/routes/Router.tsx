import { BrowserRouter, Route, Routes } from "react-router";

import {
  LoginPage,
  MainPage,
  NotFoundPage,
  TemplateDetailPage,
  TemplatesPage,
  WorkflowEditorPage,
  WorkflowsPage,
} from "@/pages";
import { DYNAMIC_ROUTE_PATHS, ROUTE_PATHS } from "@/shared";
import { EditorLayout, RootLayout } from "@/widgets";

export const Router = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* 기본 레이아웃 (Header + Footer) */}
        <Route element={<RootLayout />}>
          <Route path={ROUTE_PATHS.MAIN} element={<MainPage />} />
          <Route path={ROUTE_PATHS.LOGIN} element={<LoginPage />} />
          <Route path={ROUTE_PATHS.TEMPLATES} element={<TemplatesPage />} />
          <Route
            path={DYNAMIC_ROUTE_PATHS.TEMPLATE_DETAIL}
            element={<TemplateDetailPage />}
          />
          <Route path={ROUTE_PATHS.WORKFLOWS} element={<WorkflowsPage />} />
        </Route>

        {/* 에디터 레이아웃 (풀스크린 캔버스) */}
        <Route element={<EditorLayout />}>
          <Route
            path={DYNAMIC_ROUTE_PATHS.WORKFLOW_EDITOR}
            element={<WorkflowEditorPage />}
          />
        </Route>

        <Route path={ROUTE_PATHS.NOT_FOUND} element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};
