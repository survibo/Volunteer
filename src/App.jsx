import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router'
import AppFrame from './components/AppFrame'
import { getCurrentProfile, getHomePath } from './lib/auth'
import AdminPage from './pages/AdminPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
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
    <main className="grid min-h-screen place-items-center px-4 py-8 md:p-6">
      <section className="w-full max-w-[380px] rounded-[var(--radius-lg)] border border-white/70 bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] ring-1 ring-white/60 backdrop-blur-xl md:p-8">
        <p className="text-base leading-relaxed text-[var(--text-secondary)]">불러오는 중입니다.</p>
      </section>
    </main>
  )
}

function ErrorScreen({ message }) {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-8 md:p-6">
      <section className="w-full max-w-[380px] rounded-[var(--radius-lg)] border border-white/70 bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] ring-1 ring-white/60 backdrop-blur-xl md:p-8">
        <p className="mb-2.5 text-[13px] font-extrabold text-[var(--accent-dark)]">오류</p>
        <h1 className="text-[28px] font-extrabold leading-[1.08] tracking-normal text-[var(--text-primary)] md:text-[44px]">
          처리할 수 없습니다.
        </h1>
        <p className="mt-3.5 text-sm leading-normal text-[var(--red)]">{message}</p>
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
          element={<ProtectedRoute>{() => <VolunteerPage />}</ProtectedRoute>}
        />
        <Route
          path="/education"
          element={<ProtectedRoute>{() => <EducationPage />}</ProtectedRoute>}
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
          path="*"
          element={<ProtectedRoute>{() => <NotFoundPage />}</ProtectedRoute>}
        />
      </Routes>
    </BrowserRouter>
  )
}
