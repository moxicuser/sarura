import { BrowserRouter, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { DashboardLayout } from "./components/dashboard/DashboardLayout";
import { PublicLayout } from "./components/layout/PublicLayout";
import { AuthProvider } from "./lib/auth";
import { AboutPage } from "./pages/AboutPage";
import { ContactPage } from "./pages/ContactPage";
import { DashboardPage } from "./pages/DashboardPage";
import { FarmerProfilePage } from "./pages/FarmerProfilePage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { HomePage } from "./pages/HomePage";
import { HowItWorksPage } from "./pages/HowItWorksPage";
import { LoginPage } from "./pages/LoginPage";
import { MarketplacePage } from "./pages/MarketplacePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PoliciesPage } from "./pages/PoliciesPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { SellPage } from "./pages/SellPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { MyProductsPage } from "./pages/dashboard/MyProductsPage";
import { PlaceholderSectionPage } from "./pages/dashboard/PlaceholderSectionPage";
import { ProductFormPage } from "./pages/dashboard/ProductFormPage";
import { ProfilePage } from "./pages/dashboard/ProfilePage";
import { SavedProductsPage } from "./pages/dashboard/SavedProductsPage";

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

        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="verify-email" element={<VerifyEmailPage />} />
        <Route path="sell" element={<SellPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="products" element={<MyProductsPage />} />
            <Route path="products/new" element={<ProductFormPage />} />
            <Route path="products/:id/edit" element={<ProductFormPage />} />
            <Route
              path="requests"
              element={<PlaceholderSectionPage section="requests" />}
            />
            <Route path="orders" element={<PlaceholderSectionPage section="orders" />} />
            <Route path="saved" element={<SavedProductsPage />} />
            <Route path="messages" element={<PlaceholderSectionPage section="messages" />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
