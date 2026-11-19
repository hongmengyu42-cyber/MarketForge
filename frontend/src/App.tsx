import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore, useUIStore } from '@/store';
import MainLayout from '@/layouts/MainLayout';
import AuthModal from '@/components/modals/AuthModal';

// ──── Code-Splitting: Lazy-loaded pages for fast initial bundle load ────
const HomePage = lazy(() => import('@/pages/HomePage'));
const ServicesPage = lazy(() => import('@/pages/ServicesPage'));
const ContactPage = lazy(() => import('@/pages/ContactPage'));
const ListingDetailPage = lazy(() => import('@/pages/ListingDetailPage'));
const OrdersPage = lazy(() => import('@/pages/OrdersPage'));
const OrderWorkspacePage = lazy(() => import('@/pages/OrderWorkspacePage'));
const SellerStudioPage = lazy(() => import('@/pages/SellerStudioPage'));
const AdminDashboardPage = lazy(() => import('@/pages/AdminDashboardPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const PublicSellerProfilePage = lazy(() => import('@/pages/PublicSellerProfilePage'));
const MessagesPage = lazy(() => import('@/pages/MessagesPage'));
const JobBoardPage = lazy(() => import('@/pages/JobBoardPage'));
const PostJobPage = lazy(() => import('@/pages/PostJobPage'));
const JobDetailPage = lazy(() => import('@/pages/JobDetailPage'));
const WalletPage = lazy(() => import('@/pages/WalletPage'));
const AssessmentsPage = lazy(() => import('@/pages/AssessmentsPage'));
const SavedServicesPage = lazy(() => import('@/pages/SavedServicesPage'));
const DisputeResolutionPage = lazy(() => import('@/pages/DisputeResolutionPage'));
const VerifyEmailPage = lazy(() => import('@/pages/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'));

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 space-y-3">
      <div className="w-9 h-9 border-3 border-primary-100 border-t-primary-600 rounded-full animate-spin" />
      <span className="text-xs font-medium text-gray-400 tracking-wide">Loading MarketForge...</span>
    </div>
  );
}

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (adminOnly && !user?.isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const { activeModal, closeModal } = useUIStore();

  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/explore" element={<ServicesPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/jobs" element={<JobBoardPage />} />
            <Route path="/jobs/new" element={
              <ProtectedRoute><PostJobPage /></ProtectedRoute>
            } />
            <Route path="/jobs/:slug" element={<JobDetailPage />} />
            <Route path="/listings/:slug" element={<ListingDetailPage />} />
            <Route path="/sellers/:id" element={<PublicSellerProfilePage />} />
            <Route path="/profile" element={
              <ProtectedRoute><ProfilePage /></ProtectedRoute>
            } />
            <Route path="/messages" element={
              <ProtectedRoute><MessagesPage /></ProtectedRoute>
            } />
            <Route path="/orders" element={
              <ProtectedRoute><OrdersPage /></ProtectedRoute>
            } />
            <Route path="/orders/:id" element={
              <ProtectedRoute><OrderWorkspacePage /></ProtectedRoute>
            } />
            <Route path="/orders/:id/dispute" element={
              <ProtectedRoute><DisputeResolutionPage /></ProtectedRoute>
            } />
            <Route path="/disputes/:id" element={
              <ProtectedRoute><DisputeResolutionPage /></ProtectedRoute>
            } />
            <Route path="/wallet" element={
              <ProtectedRoute><WalletPage /></ProtectedRoute>
            } />
            <Route path="/saved" element={
              <ProtectedRoute><SavedServicesPage /></ProtectedRoute>
            } />
            <Route path="/assessments" element={<AssessmentsPage />} />
            <Route path="/seller-studio" element={
              <ProtectedRoute><SellerStudioPage /></ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute adminOnly><AdminDashboardPage /></ProtectedRoute>
            } />
          </Route>
          {/* Auth pages — no main layout wrapper */}
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Routes>
      </Suspense>

      {activeModal === 'auth' && <AuthModal onClose={closeModal} />}
    </>
  );
}
