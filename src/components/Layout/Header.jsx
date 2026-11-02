import React from "react";
import { Bell, Menu } from "lucide-react";
import { usePortal } from "../../portal/portalStore.js";
import { Link } from "react-router-dom";
import { LanguageSwitcher } from "../Common/LanguageSwitcher.jsx";

export const Header = ({ onMenu }) => {
  const { data } = usePortal();
  const teacherName = data.profile.name;
  const unread = data.notifications.filter((n) => !n.readAt).length;
  const initials = teacherName
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((s) => s[0])
    .join("");
  return (
    <header className="teacher-header">
      <div className="flex min-w-0 items-center gap-3">
        <button
          className="teacher-icon-button lg:hidden"
          type="button"
          aria-label="Mở menu"
          onClick={onMenu}
        >
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          <p className="teacher-eyebrow">Di-Ichi Teacher</p>
          <p className="teacher-welcome truncate" title={teacherName}>
            Xin chào, {teacherName}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="hidden sm:block">
          <LanguageSwitcher compact />
        </span>
        <Link
          to="/dashboard#thong-bao"
          className="teacher-icon-button teacher-notification"
          aria-label={`Thông báo${unread ? `, ${unread} chưa đọc` : ""}`}
        >
          <Bell size={19} />
          {unread > 0 && <span className="teacher-unread" />}
        </Link>
        <Link
          to="/ho-so-ca-nhan"
          className="teacher-profile-link"
          aria-label={`Hồ sơ ${teacherName}`}
        >
          <span className="teacher-avatar">{initials}</span>
          <span className="hidden sm:block">
            <strong className="block max-w-40 truncate">{teacherName}</strong>
            <small>Giáo viên</small>
          </span>
        </Link>
      </div>
    </header>
  );
};
