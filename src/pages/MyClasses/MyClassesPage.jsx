import React, { useEffect, useState } from 'react'
import { PortalScreen } from '../../portal/PortalScreen.jsx'
import { PortalContext, usePortal } from '../../portal/portalStore.js'
import { getClassStaffErrorMessage, getTeacherClassIds } from '../../services/classStaffApi.js'

export const MyClassesPage = () => {
  const portal = usePortal()
  const { data } = portal
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    getTeacherClassIds(data.profile.id, { signal: controller.signal })
      .then(ids => {
        if (!controller.signal.aborted) setResult({ staffId: data.profile.id, attempt, ids })
      })
      .catch(error => {
        if (!controller.signal.aborted)
          setResult({ staffId: data.profile.id, attempt, error: getClassStaffErrorMessage(error) })
      })
    return () => controller.abort()
  }, [data, attempt])

  const current = result?.staffId === data.profile.id && result?.attempt === attempt
  if (!current || result.error) return (
    <section className="portal" data-mode="classes">
      <header className="portal-toolbar portal-page-header"><h1>Lớp học của tôi</h1></header>
      {!current ? <p className="portal-loading" role="status">Đang tải phân công lớp…</p> : (
        <div className="portal-error" role="alert">
          {result.error}{' '}
          <button type="button" onClick={() => setAttempt(value => value + 1)}>Thử lại</button>
        </div>
      )}
    </section>
  )

  const assigned = new Set(result.ids)
  const classes = data.classes.filter(item => assigned.has(item.id))
  return (
    <PortalContext.Provider value={{ ...portal, data: { ...data, classes } }}>
      <PortalScreen mode="classes" />
    </PortalContext.Provider>
  )
}
