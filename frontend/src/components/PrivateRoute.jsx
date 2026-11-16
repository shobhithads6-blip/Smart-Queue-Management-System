import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function PrivateRoute({ children, role }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <p role="status" className="text-sm text-gray-500">
        Checking your session…
      </p>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (role === 'STAFF' && user.role !== 'STAFF' && user.role !== 'ADMIN') {
    return <Navigate to="/" replace />
  }
  if (role === 'ADMIN' && user.role !== 'ADMIN') {
    return <Navigate to="/" replace />
  }

  return children
}