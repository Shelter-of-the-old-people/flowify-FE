import { BrowserRouter, Route, Routes } from "react-router";

import { MainPage, NotFoundPage } from "@/pages";
import { ROUTE_PATHS } from "@/shared";
import { RootLayout } from "@/widgets";

export const Router = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route path={ROUTE_PATHS.MAIN} element={<MainPage />} />
          <Route path={ROUTE_PATHS.NOT_FOUND} element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
