import { createBrowserRouter } from 'react-router-dom'
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

export const router = createBrowserRouter([
  { path: '/', element: <LoginPage /> },
  { path: '/login', element: <LoginPage /> },
  {
    element: <MainLayout />,
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/lich-giang-day', element: <TeachingSchedulePage /> },
      { path: '/lop-hoc-cua-toi', element: <MyClassesPage /> },
      { path: '/ngan-hang-bai-tap', element: <AssignmentBankPage /> },
      { path: '/ngan-hang-de-thi', element: <ExamBankPage /> },
      { path: '/cham-diem', element: <GradingPage /> },
      { path: '/ket-qua-hoc-tap', element: <LearningResultsPage /> },
      { path: '/ho-so-ca-nhan', element: <ProfilePage /> },
    ],
  },
])
