import { createBrowserRouter, Navigate } from 'react-router-dom'
import LessonLibrary from '../library/LessonLibrary.jsx'
import LessonPlanner from '../lesson-planner/LessonPlanner.jsx'
import LessonPlanList from '../lesson-planner/LessonPlanList.jsx'
import ActivityStudio from '../lesson-planner/ActivityStudio.jsx'
import { MainLayout } from '../layouts/MainLayout.jsx'
import { DashboardPage } from '../pages/Dashboard/DashboardPage.jsx'
import { TeachingSchedulePage } from '../pages/TeachingSchedule/TeachingSchedulePage.jsx'
import { MyClassesPage } from '../pages/MyClasses/MyClassesPage.jsx'
import { AssignmentBankPage } from '../pages/AssignmentBank/AssignmentBankPage.jsx'
import { ExamBankPage } from '../pages/ExamBank/ExamBankPage.jsx'
import { GradingPage } from '../pages/Grading/GradingPage.jsx'
import { LearningResultsPage } from '../pages/LearningResults/LearningResultsPage.jsx'
import { ProfilePage } from '../pages/Profile/ProfilePage.jsx'
import { LoginPage } from '../pages/Login/LoginPage.jsx'
import { ProtectedRoute } from './ProtectedRoute.jsx'
import { OnlineClassesPage } from '../pages/OnlineClassroom/OnlineClassesPage.jsx'
import { TeacherClassroomPage } from '../pages/OnlineClassroom/TeacherClassroomPage.jsx'

export const router = createBrowserRouter([
  { path: '/', element: <LoginPage /> },
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute><MainLayout /></ProtectedRoute>,
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/thu-vien-bai-giang', element: <LessonLibrary /> },
      { path: '/soan-giao-an', element: <LessonPlanner /> },
      { path: '/soan-giao-an/:planId', element: <LessonPlanner /> },
      { path: '/giao-an', element: <LessonPlanList /> },
      { path: '/tao-hoat-dong', element: <ActivityStudio /> },
      { path: '/tao-hoat-dong/:planId', element: <ActivityStudio /> },
      { path: '/soan-elearning', element: <ActivityStudio /> },
      { path: '/soan-elearning/:planId', element: <ActivityStudio /> },
      { path: '/lich-giang-day', element: <TeachingSchedulePage /> },
      { path: '/lop-hoc-cua-toi', element: <MyClassesPage /> },
      { path: '/ngan-hang-bai-tap', element: <AssignmentBankPage /> },
      { path: '/ngan-hang-de-thi', element: <ExamBankPage /> },
      { path: '/cham-diem', element: <GradingPage /> },
      { path: '/ket-qua-hoc-tap', element: <LearningResultsPage /> },
      { path: '/ho-so-ca-nhan', element: <ProfilePage /> },
      { path: '/lop-hoc-online', element: <OnlineClassesPage /> },
    ],
  },
  { path: '/lop-hoc-online/:scheduleId', element: <ProtectedRoute><TeacherClassroomPage /></ProtectedRoute> },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])
