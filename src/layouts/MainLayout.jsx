import React from 'react'
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Header } from '../components/Layout/Header.jsx'
import { Sidebar } from '../components/Layout/Sidebar.jsx'
import { PortalProvider } from '../portal/PortalContext.jsx'

export const MainLayout = () => {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <PortalProvider><div className="min-h-screen">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="lg:pl-72">
        <Header onMenu={() => setMenuOpen(true)} />
        <main className="px-4 py-5 lg:px-6">
          <motion.div className="mx-auto max-w-7xl space-y-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div></PortalProvider>
  )
}
