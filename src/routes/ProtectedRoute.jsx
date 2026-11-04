import { Navigate, useLocation } from './localizedRouter.jsx'
import { getAccessToken } from '../services/authSession.js'

export const ProtectedRoute = ({ children }) => {
  const location = useLocation()

  if (!getAccessToken()) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}${location.hash}` }} />

  return children
}
