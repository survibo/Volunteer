import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import AppFrame from './components/AppFrame'
import PublicDetailFrame from './components/PublicDetailFrame'
import AddToHomeScreen from './components/AddToHomeScreen'

import TopLoadingBar from './components/TopLoadingBar'
import { getHomePath } from './lib/auth'
import { useCurrentProfile } from './hooks/useCurrentProfile'

const ActivityDetailPage = lazy(() => import('./pages/activity/ActivityDetailPage'))
const AdminPage = lazy(() => import('./pages/admin/AdminPage'))
const AdminActivityEditPage = lazy(() => import('./pages/admin/AdminActivityEditPage'))
const AdminApplicationsPage = lazy(() => import('./pages/admin/AdminApplicationsPage'))
const AdminMemberDetailPage = lazy(() => import('./pages/admin/AdminMemberDetailPage'))
const AdminMemberHistoryPage = lazy(() => import('./pages/admin/AdminMemberHistoryPage'))
const AuthCallbackPage = lazy(() => import('./pages/auth/AuthCallbackPage'))
const ComingSoonPage = lazy(() => import('./pages/ComingSoonPage'))
const CreateEducationPage = lazy(() => import('./pages/admin/CreateEducationPage'))
const CreateVolunteerPage = lazy(() => import('./pages/admin/CreateVolunteerPage'))
const EducationPage = lazy(() => import('./pages/activity/EducationPage'))
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const MyHistoryPage = lazy(() => import('./pages/mypage/MyHistoryPage'))
const MyPage = lazy(() => import('./pages/mypage/MyPage'))
const MyPageEditPage = lazy(() => import('./pages/mypage/MyPageEditPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const PendingPage = lazy(() => import('./pages/PendingPage'))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'))
const VolunteerPage = lazy(() => import('./pages/activity/VolunteerPage'))

function PublicOnly({ children }) {
  const { data: profile, isLoading, error } = useCurrentProfile()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (error) {
    return <ErrorScreen message={error.message} />
  }

  if (profile) {
    return <Navigate to={getHomePath(profile)} replace />
  }

  return children
}

function ProtectedRoute({ adminOnly = false, children }) {
  const { data: profile, isLoading, error } = useCurrentProfile()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (error) {
    return <ErrorScreen message={error.message} />
  }

  if (!profile) {
    return <Navigate to="/" replace />
  }

  if (adminOnly && profile.role !== 'admin') {
    return <Navigate to="/volunteer" replace />
  }

  return <AppFrame profile={profile}>{children(profile)}</AppFrame>
}

function OptionalAuthRoute({ children }) {
  const { data: profile, isLoading, error } = useCurrentProfile()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (error) {
    return <ErrorScreen message={error.message} />
  }

  if (profile) {
    return <AppFrame profile={profile}>{children(profile)}</AppFrame>
  }

  return <PublicDetailFrame>{children(null)}</PublicDetailFrame>
}

function LoadingScreen() {
  return <TopLoadingBar />
}

function ErrorScreen({ message }) {
  return (
    <main className="flex min-h-full flex-col overflow-y-auto px-4 py-8 md:p-6">
      <section className="m-auto w-full max-w-[380px] rounded-xl border border-border-default bg-surface-base p-6 md:p-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-action-default">오류</p>
        <h1 className="text-3xl font-bold leading-tight text-text-primary md:text-5xl">
          처리할 수 없습니다.
        </h1>
        <p className="mt-4 text-sm text-status-error-text">{message}</p>
      </section>
    </main>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AddToHomeScreen />
      <Suspense fallback={<TopLoadingBar />}>
        <Routes>
        <Route
          path="/"
          element={
            <PublicOnly>
              <LoginPage />
            </PublicOnly>
          }
        />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        <Route
          path="/volunteer"
          element={<ProtectedRoute>{(profile) => <VolunteerPage profile={profile} />}</ProtectedRoute>}
        />
        <Route
          path="/volunteer/:id"
          element={<OptionalAuthRoute>{(profile) => <ActivityDetailPage table="volunteer_activities" profile={profile} />}</OptionalAuthRoute>}
        />
        <Route
          path="/education"
          element={<ProtectedRoute>{(profile) => <EducationPage profile={profile} />}</ProtectedRoute>}
        />
        <Route
          path="/education/:id"
          element={<OptionalAuthRoute>{(profile) => <ActivityDetailPage table="educations" profile={profile} />}</OptionalAuthRoute>}
        />
        <Route
          path="/mylist"
          element={<ProtectedRoute>{(profile) => <MyHistoryPage profile={profile} />}</ProtectedRoute>}
        />
        <Route
          path="/mypage"
          element={<ProtectedRoute>{(profile) => <MyPage profile={profile} />}</ProtectedRoute>}
        />
        <Route
          path="/mypage/edit"
          element={<ProtectedRoute>{(profile) => <MyPageEditPage profile={profile} />}</ProtectedRoute>}
        />
        <Route
          path="/mypage/volunteer"
          element={<ProtectedRoute>{() => <ComingSoonPage />}</ProtectedRoute>}
        />
        <Route
          path="/mypage/education"
          element={<ProtectedRoute>{() => <ComingSoonPage />}</ProtectedRoute>}
        />
        <Route
          path="/mypage/withdraw"
          element={<ProtectedRoute>{() => <ComingSoonPage />}</ProtectedRoute>}
        />
        <Route
          path="/pending"
          element={<ProtectedRoute>{(profile) => <PendingPage profile={profile} />}</ProtectedRoute>}
        />
        <Route
          path="/admin"
          element={<ProtectedRoute adminOnly>{() => <AdminPage />}</ProtectedRoute>}
        />
        <Route
          path="/admin/members"
          element={<ProtectedRoute adminOnly>{() => <ComingSoonPage />}</ProtectedRoute>}
        />
        <Route
          path="/admin/members/pending"
          element={<ProtectedRoute adminOnly>{() => <ComingSoonPage />}</ProtectedRoute>}
        />
        <Route
          path="/admin/members/:id/history"
          element={<ProtectedRoute adminOnly>{() => <AdminMemberHistoryPage />}</ProtectedRoute>}
        />
        <Route
          path="/admin/members/:id"
          element={<ProtectedRoute adminOnly>{() => <AdminMemberDetailPage />}</ProtectedRoute>}
        />
        <Route
          path="/admin/members/withdrawn"
          element={<ProtectedRoute adminOnly>{() => <ComingSoonPage />}</ProtectedRoute>}
        />
        <Route
          path="/admin/volunteer"
          element={<ProtectedRoute adminOnly>{() => <ComingSoonPage />}</ProtectedRoute>}
        />
        <Route
          path="/admin/volunteer/new"
          element={<ProtectedRoute adminOnly>{(profile) => <CreateVolunteerPage profile={profile} />}</ProtectedRoute>}
        />
        <Route
          path="/admin/volunteer/:id"
          element={<ProtectedRoute adminOnly>{(profile) => <AdminActivityEditPage table="volunteer_activities" redirectTo="/volunteer" sectionLabel="봉사활동" pageTitle="봉사활동 수정" profile={profile} />}</ProtectedRoute>}
        />
        <Route
          path="/admin/volunteer/:id/applications"
          element={<ProtectedRoute adminOnly>{() => <AdminApplicationsPage table="volunteer_activities" />}</ProtectedRoute>}
        />
        <Route
          path="/admin/education"
          element={<ProtectedRoute adminOnly>{() => <ComingSoonPage />}</ProtectedRoute>}
        />
        <Route
          path="/admin/education/new"
          element={<ProtectedRoute adminOnly>{(profile) => <CreateEducationPage profile={profile} />}</ProtectedRoute>}
        />
        <Route
          path="/admin/education/:id"
          element={<ProtectedRoute adminOnly>{(profile) => <AdminActivityEditPage table="educations" redirectTo="/education" sectionLabel="교육" pageTitle="교육 수정" profile={profile} />}</ProtectedRoute>}
        />
        <Route
          path="/admin/education/:id/applications"
          element={<ProtectedRoute adminOnly>{() => <AdminApplicationsPage table="educations" />}</ProtectedRoute>}
        />
        <Route
          path="*"
          element={<ProtectedRoute>{() => <NotFoundPage />}</ProtectedRoute>}
        />
      </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
