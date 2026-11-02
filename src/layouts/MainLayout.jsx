import React from "react";
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import { Header } from "../components/Layout/Header.jsx";
import { Sidebar } from "../components/Layout/Sidebar.jsx";
import { PortalProvider } from "../portal/PortalContext.jsx";

export const MainLayout = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <PortalProvider>
      <div className="teacher-shell min-h-screen">
        <a className="teacher-skip-link" href="#teacher-main">
          Đến nội dung chính
        </a>
        <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
        <div className="lg:pl-72">
          <Header onMenu={() => setMenuOpen(true)} />
          <main id="teacher-main" tabIndex={-1} className="teacher-content">
            <motion.div
              className="mx-auto max-w-[1600px] space-y-5"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </main>
        </div>
      </div>
    </PortalProvider>
  );
};
