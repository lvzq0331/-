// App.tsx — 路由与全局布局
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import AppLayout from '@/components/layout/AppLayout';
import ErrorBoundary from '@/components/common/ErrorBoundary';

import LoginPage from '@/pages/LoginPage';
// 懒加载其余页面（避免循环依赖，先声明再实现）
import { lazy, Suspense } from 'react';

const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const QuestionListPage = lazy(() => import('@/pages/QuestionListPage'));
const QuestionCreatePage = lazy(() => import('@/pages/QuestionCreatePage'));
const ExamPaperListPage = lazy(() => import('@/pages/ExamPaperListPage'));
const ExamPaperCreatePage = lazy(() => import('@/pages/ExamPaperCreatePage'));
const TagManagePage = lazy(() => import('@/pages/TagManagePage'));
const ExamPaperDetailPage = lazy(() => import('@/pages/ExamPaperDetailPage'));
const ExamPaperEditPage = lazy(() => import('@/pages/ExamPaperEditPage'));
const QuestionEditPage = lazy(() => import('@/pages/QuestionEditPage'));
const QuestionReviewPage = lazy(() => import('@/pages/QuestionReviewPage'));
const ResetAdminPage = lazy(() => import('@/pages/ResetAdminPage'));
const DebugPage = lazy(() => import('@/pages/DebugPage'));
const PersonalSpacePage = lazy(() => import('@/pages/PersonalSpacePage'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <AppLayout />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        >
          <Route index element={<LazyPage><DashboardPage /></LazyPage>} />
          <Route path="questions" element={<LazyPage><QuestionListPage /></LazyPage>} />
          <Route path="questions/create" element={<LazyPage><QuestionCreatePage /></LazyPage>} />
          <Route path="questions/:id/edit" element={<LazyPage><QuestionEditPage /></LazyPage>} />
          <Route path="exams" element={<LazyPage><ExamPaperListPage /></LazyPage>} />
          <Route path="exams/create" element={<LazyPage><ExamPaperCreatePage /></LazyPage>} />
          <Route path="tags" element={<LazyPage><TagManagePage /></LazyPage>} />
          <Route path="exams/:id" element={<LazyPage><ExamPaperDetailPage /></LazyPage>} />
          <Route path="exams/:id/edit" element={<LazyPage><ExamPaperEditPage /></LazyPage>} />
          <Route path="questions/review" element={<LazyPage><QuestionReviewPage /></LazyPage>} />
          <Route path="debug" element={<LazyPage><DebugPage /></LazyPage>} />
          <Route path="reset-admin" element={<LazyPage><ResetAdminPage /></LazyPage>} />
          <Route path="my-space" element={<LazyPage><PersonalSpacePage /></LazyPage>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="p-8 text-center text-gray-400">加载中...</div>}>{children}</Suspense>;
}

export default App;
