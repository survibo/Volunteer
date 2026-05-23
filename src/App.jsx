import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router'
import AppFrame from './components/AppFrame'
import { getCurrentProfile, getHomePath } from './lib/auth'
import AdminPage from './pages/AdminPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import CreateEducationPage from './pages/admin/CreateEducationPage'
import CreateVolunteerPage from './pages/admin/CreateVolunteerPage'
import EducationPage from './pages/EducationPage'
import LoginPage from './pages/LoginPage'
import MyPage from './pages/MyPage'
import MyPageEditPage from './pages/MyPageEditPage'
import NotFoundPage from './pages/NotFoundPage'
import PendingPage from './pages/PendingPage'
import RegisterPage from './pages/RegisterPage'
import VolunteerPage from './pages/VolunteerPage'

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
  return (
    <main className="flex min-h-full flex-col overflow-y-auto px-4 py-8 md:p-6">
      <section className="m-auto w-full max-w-[380px] rounded-xl border border-border-default bg-surface-base p-6 md:p-8">
        <p className="text-sm text-text-secondary">불러오는 중입니다.</p>
      </section>
    </main>
  )
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
          path="/pending"
          element={<ProtectedRoute>{(profile) => <PendingPage profile={profile} />}</ProtectedRoute>}
        />
        <Route
          path="/volunteer"
          element={<ProtectedRoute>{(profile) => <VolunteerPage profile={profile} />}</ProtectedRoute>}
        />
        <Route
          path="/education"
          element={<ProtectedRoute>{(profile) => <EducationPage profile={profile} />}</ProtectedRoute>}
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
          path="/admin"
          element={<ProtectedRoute adminOnly>{() => <AdminPage />}</ProtectedRoute>}
        />
        <Route
          path="/admin/volunteer/new"
          element={<ProtectedRoute adminOnly>{(profile) => <CreateVolunteerPage profile={profile} />}</ProtectedRoute>}
        />
        <Route
          path="/admin/education/new"
          element={<ProtectedRoute adminOnly>{(profile) => <CreateEducationPage profile={profile} />}</ProtectedRoute>}
        />
        <Route
          path="*"
          element={<ProtectedRoute>{() => <NotFoundPage />}</ProtectedRoute>}
        />
      </Routes>
    </BrowserRouter>
  )
}
