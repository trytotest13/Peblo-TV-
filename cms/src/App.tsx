import { Routes, Route, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from './lib/api'
import Login from './pages/Login'
import Layout from './components/Layout'
import ShowsList from './pages/ShowsList'
import ShowDetail from './pages/ShowDetail'
import EpisodesList from './pages/EpisodesList'
import Publish from './pages/Publish'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('peblo_token')
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: api.me,
    retry: false,
  })
  if (!user) return <div>Loading...</div>
  if (user.role !== 'admin') return <div className="alert alert-error">Admin only.</div>
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/shows" replace />} />
        <Route path="shows" element={<ShowsList />} />
        <Route path="shows/:id" element={<ShowDetail />} />
        <Route path="episodes" element={<EpisodesList />} />
        <Route
          path="publish"
          element={
            <AdminRoute>
              <Publish />
            </AdminRoute>
          }
        />
      </Route>
    </Routes>
  )
}
