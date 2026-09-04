import { Navigate, useLocation } from 'react-router-dom'
import { getAccessToken } from '../services/authSession.js'

export const ProtectedRoute = ({ children }) => {
  const location = useLocation()

  if (!getAccessToken()) return <Navigate to="/login" replace state={{ from: location.pathname }} />

  return children
}
