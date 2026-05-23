import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router'
import AppFrame from './components/AppFrame'
import ReloadPrompt from './components/ReloadPrompt'
import TopLoadingBar from './components/TopLoadingBar'
import { getCurrentProfile, getHomePath } from './lib/auth'
import ActivityDetailPage from './pages/activity/ActivityDetailPage'
import AdminPage from './pages/admin/AdminPage'
import AdminActivityEditPage from './pages/admin/AdminActivityEditPage'
import AdminApplicationsPage from './pages/admin/AdminApplicationsPage'
import AdminMemberDetailPage from './pages/admin/AdminMemberDetailPage'
import AdminMemberHistoryPage from './pages/admin/AdminMemberHistoryPage'
import AuthCallbackPage from './pages/auth/AuthCallbackPage'
import ComingSoonPage from './pages/ComingSoonPage'
import CreateEducationPage from './pages/admin/CreateEducationPage'
import CreateVolunteerPage from './pages/admin/CreateVolunteerPage'
import EducationPage from './pages/activity/EducationPage'
import LoginPage from './pages/auth/LoginPage'
import MyHistoryPage from './pages/mypage/MyHistoryPage'
import MyPage from './pages/mypage/MyPage'
import MyPageEditPage from './pages/mypage/MyPageEditPage'
import NotFoundPage from './pages/NotFoundPage'
import RegisterPage from './pages/auth/RegisterPage'
import VolunteerPage from './pages/activity/VolunteerPage'

function PublicOnly({ children }) {
  const [state, setState] = useState({ loading: true, session: null, profile: null, error: '' })

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const result = await getCurrentProfile()
        if (mounted) {
          setState({ loading: false, session: result.session, profile: result.profile, error: '' })
        }
      } catch (error) {
        if (mounted) {
          setState({ loading: false, session: null, profile: null, error: error.message })
        }
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [])

  if (state.loading) {
    return <LoadingScreen />
  }

  if (state.error) {
    return <ErrorScreen message={state.error} />
  }

  if (state.session) {
    return <Navigate to={getHomePath(state.profile)} replace />
  }

  return children
}

function ProtectedRoute({ adminOnly = false, children }) {
  const location = useLocation()
  const [state, setState] = useState({ loading: true, session: null, profile: null, error: '' })

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const result = await getCurrentProfile()
        if (mounted) {
          setState({ loading: false, session: result.session, profile: result.profile, error: '' })
        }
      } catch (error) {
        if (mounted) {
          setState({ loading: false, session: null, profile: null, error: error.message })
        }
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [location.pathname])

  if (state.loading) {
    return <LoadingScreen />
  }

  if (state.error) {
    return <ErrorScreen message={state.error} />
  }

  if (!state.session) {
    return <Navigate to="/" replace />
  }

  if (!state.profile) {
    return <Navigate to="/auth/register" replace />
  }

  if (adminOnly && state.profile.role !== 'admin') {
    return <Navigate to="/volunteer" replace />
  }

  return <AppFrame profile={state.profile}>{children(state.profile)}</AppFrame>
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
      <ReloadPrompt />
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
          element={<ProtectedRoute>{(profile) => <ActivityDetailPage table="volunteer_activities" profile={profile} />}</ProtectedRoute>}
        />
        <Route
          path="/education"
          element={<ProtectedRoute>{(profile) => <EducationPage profile={profile} />}</ProtectedRoute>}
        />
        <Route
          path="/education/:id"
          element={<ProtectedRoute>{(profile) => <ActivityDetailPage table="educations" profile={profile} />}</ProtectedRoute>}
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
    </BrowserRouter>
  )
}
