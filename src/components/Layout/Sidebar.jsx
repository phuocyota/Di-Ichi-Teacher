import React, { useEffect, useRef } from "react";
import { NavLink, useNavigate } from "../../routes/localizedRouter.jsx";
import { LogOut, X } from "lucide-react";
import logo from "../../assets/logo/LOGO_Diichi.webp";
import { menuItems } from "./menu.js";
import { clearAuthSession } from "../../services/authSession.js";
import { usePortal } from "../../portal/portalStore.js";

export const Sidebar = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { data } = usePortal();
  const drawer = useRef(null);
  const today = new Date().toLocaleDateString("en-CA");
  const todayClasses = data.schedules.filter(
    (s) =>
      new Date(s.startAt).toLocaleDateString("en-CA") === today &&
      s.status !== "cancelled",
  ).length;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawer.current?.querySelector("button")?.focus();
    const resize = () => {
      if (window.innerWidth >= 1024) onClose();
    };
    window.addEventListener("resize", resize);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("resize", resize);
      previous?.focus();
    };
  }, [open, onClose]);
  function keyboard(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
    if (event.key === "Tab") {
      const nodes = [...drawer.current.querySelectorAll("a,button")];
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  }
  const contents = (mobile) => (
    <>
      <div className="teacher-brand">
        <img src={logo} alt="Di-Ichi" />
        <div>
          <strong>Di-Ichi</strong>
          <p>Cổng giáo viên</p>
        </div>
        {mobile && (
          <button
            className="teacher-icon-button"
            aria-label="Đóng menu"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        )}
      </div>
      <div className="teacher-today">
        <span>Hôm nay</span>
        <strong>{todayClasses} buổi học</strong>
        <p>{data.students.length} học sinh trong các lớp</p>
      </div>
      <nav aria-label="Điều hướng giáo viên" className="teacher-navigation">
        {menuItems.map((item, index) => {
          if (item.hidden) return null;
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={mobile ? onClose : undefined}
              className="teacher-nav-item"
              data-tone={
                [
                  "blue",
                  "cyan",
                  "blue",
                  "green",
                  "orange",
                  "purple",
                  "green",
                  "purple",
                  "red",
                ][index]
              }
            >
              <span className="teacher-nav-icon">
                <Icon size={18} aria-hidden="true" />
              </span>
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
      <div className="teacher-sidebar-footer">
        <button
          className="teacher-logout"
          type="button"
          onClick={() => {
            clearAuthSession();
            onClose();
            navigate("/login", { replace: true });
          }}
        >
          <LogOut size={17} /> Đăng xuất
        </button>
      </div>
    </>
  );
  return (
    <>
      <aside className="teacher-sidebar hidden lg:flex">
        {contents(false)}
      </aside>
      {open && (
        <div className="teacher-drawer lg:hidden">
          <button
            className="teacher-backdrop"
            aria-label="Đóng nền menu"
            onClick={onClose}
          />
          <aside
            ref={drawer}
            role="dialog"
            aria-modal="true"
            aria-label="Menu giáo viên"
            className="teacher-sidebar teacher-mobile-panel"
            onKeyDown={keyboard}
          >
            {contents(true)}
          </aside>
        </div>
      )}
    </>
  );
};
