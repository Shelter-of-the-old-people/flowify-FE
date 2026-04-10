import { BrowserRouter, Route, Routes } from "react-router";

import {
  AccountPage,
  LoginCallbackPage,
  LoginPage,
  MainPage,
  NotFoundPage,
  SettingsPage,
  TemplateDetailPage,
  TemplatesPage,
  WorkflowEditorPage,
  WorkflowsPage,
} from "@/pages";
import { DYNAMIC_ROUTE_PATHS, ROUTE_PATHS } from "@/shared";
import { AppShellLayout, EditorLayout, LandingLayout } from "@/widgets";

import { ProtectedRoute } from "./components";

export const Router = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<LandingLayout />}>
          <Route path={ROUTE_PATHS.MAIN} element={<MainPage />} />
        </Route>

        <Route path={ROUTE_PATHS.LOGIN} element={<LoginPage />} />
        <Route
          path={ROUTE_PATHS.LOGIN_CALLBACK}
          element={<LoginCallbackPage />}
        />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShellLayout />}>
            <Route path={ROUTE_PATHS.ACCOUNT} element={<AccountPage />} />
            <Route path={ROUTE_PATHS.SETTINGS} element={<SettingsPage />} />
            <Route path={ROUTE_PATHS.TEMPLATES} element={<TemplatesPage />} />
            <Route
              path={DYNAMIC_ROUTE_PATHS.TEMPLATE_DETAIL}
              element={<TemplateDetailPage />}
            />
            <Route path={ROUTE_PATHS.WORKFLOWS} element={<WorkflowsPage />} />
          </Route>

          <Route element={<EditorLayout />}>
            <Route
              path={DYNAMIC_ROUTE_PATHS.WORKFLOW_EDITOR}
              element={<WorkflowEditorPage />}
            />
          </Route>
        </Route>

        <Route path={ROUTE_PATHS.NOT_FOUND} element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};
