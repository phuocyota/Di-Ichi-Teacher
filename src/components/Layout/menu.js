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
} from 'lucide-react'

export const menuItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, badge: null },
  { label: 'Lịch giảng dạy', path: '/lich-giang-day', icon: CalendarDays, badge: null },
  { label: 'Lớp học Online', path: '/lop-hoc-online', icon: Video, badge: null },
  { label: 'Lớp học của tôi', path: '/lop-hoc-cua-toi', icon: GraduationCap, badge: null },
  { label: 'Ngân hàng bài tập', path: '/ngan-hang-bai-tap', icon: BookOpen, badge: null },
  { label: 'Ngân hàng đề thi', path: '/ngan-hang-de-thi', icon: ClipboardList, badge: null },
  { label: 'Chấm điểm', path: '/cham-diem', icon: CheckSquare, badge: null },
  { label: 'Kết quả học tập', path: '/ket-qua-hoc-tap', icon: NotebookTabs, badge: null },
  { label: 'Hồ sơ cá nhân', path: '/ho-so-ca-nhan', icon: UserRound, badge: null },
]
