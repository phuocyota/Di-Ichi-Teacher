import { Navigate, useLocation } from './localizedRouter.jsx'
import { getAccessToken, subscribeAuthSession } from '../services/authSession.js'
import { Fragment, useSyncExternalStore } from 'react'

export const ProtectedRoute = ({ children }) => {
  const location = useLocation()
  const token = useSyncExternalStore(subscribeAuthSession, getAccessToken)

  if (!token) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}${location.hash}` }} />

  return <Fragment key={token}>{children}</Fragment>
}
