import { BrowserRouter, Route, Routes } from "react-router-dom";

import { PublicLayout } from "./components/layout/PublicLayout";
import { FoundationPage } from "./pages/FoundationPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<FoundationPage />} />
        <Route path="*" element={<PlaceholderPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
