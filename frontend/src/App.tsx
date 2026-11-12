import { BrowserRouter, Route, Routes } from "react-router-dom";

import { PublicLayout } from "./components/layout/PublicLayout";
import { AboutPage } from "./pages/AboutPage";
import { ComingSoonPage } from "./pages/ComingSoonPage";
import { ContactPage } from "./pages/ContactPage";
import { FarmerProfilePage } from "./pages/FarmerProfilePage";
import { HomePage } from "./pages/HomePage";
import { HowItWorksPage } from "./pages/HowItWorksPage";
import { MarketplacePage } from "./pages/MarketplacePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PoliciesPage } from "./pages/PoliciesPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { ProductDetailPage } from "./pages/ProductDetailPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="marketplace" element={<MarketplacePage />} />
        <Route path="products/:id" element={<ProductDetailPage />} />
        <Route path="farmers/:id" element={<FarmerProfilePage />} />
        <Route path="how-it-works" element={<HowItWorksPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="policies" element={<PoliciesPage />} />

        {/* Accounts and selling tools arrive in Step 8; these keep the header
            links usable until then. */}
        <Route
          path="login"
          element={
            <ComingSoonPage titleKey="comingSoon.loginTitle" bodyKey="comingSoon.loginBody" />
          }
        />
        <Route
          path="register"
          element={
            <ComingSoonPage
              titleKey="comingSoon.registerTitle"
              bodyKey="comingSoon.registerBody"
            />
          }
        />
        <Route
          path="sell"
          element={
            <ComingSoonPage titleKey="comingSoon.sellTitle" bodyKey="comingSoon.sellBody" />
          }
        />

        <Route path="*" element={<NotFoundPage />} />
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
