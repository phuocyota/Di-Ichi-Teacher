import {
  BookOpen,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  NotebookTabs,
  UserRound,
  Video,
} from "lucide-react";

export const menuItems = [
  { label: 'Soạn e-learning', path: '/soan-elearning', icon: ClipboardList, badge: null },
  { label: 'Giáo án của tôi', path: '/giao-an', icon: ClipboardList, badge: null },
  { label: 'Soạn giáo án', path: '/soan-giao-an', icon: NotebookTabs, badge: null },
  { label: 'Thư viện bài giảng', path: '/thu-vien-bai-giang', icon: BookOpen, badge: null },
  {
    label: "Tổng quan",
    path: "/dashboard",
    icon: LayoutDashboard,
    badge: null,
  },
  {
    label: "Lịch giảng dạy",
    path: "/lich-giang-day",
    icon: CalendarDays,
    badge: null,
  },
  {
    label: "Lớp học Online",
    path: "/lop-hoc-online",
    icon: Video,
    badge: null,
  },
  {
    label: "Lớp học của tôi",
    path: "/lop-hoc-cua-toi",
    icon: GraduationCap,
    badge: null,
  },
  {
    label: "Ngân hàng bài tập",
    path: "/ngan-hang-bai-tap",
    icon: BookOpen,
    badge: null,
  },
  {
    label: "Ngân hàng đề thi",
    path: "/ngan-hang-de-thi",
    icon: ClipboardList,
    badge: null,
  },
  { label: "Chấm điểm", path: "/cham-diem", icon: CheckSquare, badge: null },
  {
    label: "Kết quả học tập",
    path: "/ket-qua-hoc-tap",
    icon: NotebookTabs,
    badge: null,
  },
  {
    label: "Hồ sơ cá nhân",
    path: "/ho-so-ca-nhan",
    icon: UserRound,
    badge: null,
  },
];
