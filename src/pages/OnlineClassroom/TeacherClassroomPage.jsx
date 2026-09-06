import { useEffect, useState } from 'react'
import { LiveKitRoom } from '@livekit/components-react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { TeacherClassroomExperience } from '../../components/OnlineClassroom/TeacherClassroomExperience.jsx'
import { joinClassroom } from '../../services/classroomApi.js'

export const TeacherClassroomPage = () => {
  const { scheduleId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [joinData, setJoinData] = useState(location.state?.joinData || null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (joinData || !scheduleId) return undefined
    let active = true
    joinClassroom(scheduleId).then((data) => active && setJoinData(data)).catch((requestError) => active && setError(requestError.message))
    return () => { active = false }
  }, [joinData, scheduleId])
  if (!scheduleId) return <Navigate to="/lop-hoc-online" replace />
  if (error) return <div className="grid min-h-screen place-items-center bg-orange-50 p-4"><div className="max-w-lg rounded-3xl bg-white p-8 text-center shadow-xl"><h1 className="text-2xl font-black">Không thể vào lớp</h1><p className="mt-3 font-bold text-red-600">{error}</p><button type="button" onClick={() => navigate('/lop-hoc-online')} className="mt-5 rounded-2xl bg-orange-600 px-5 py-3 font-black text-white">Quay lại</button></div></div>
  if (!joinData) return <p className="grid min-h-screen place-items-center bg-slate-950 text-xl font-black text-white">Đang kết nối lớp học...</p>
  return (
    <LiveKitRoom serverUrl={joinData.serverUrl} token={joinData.token} connect audio={false} video={false} onDisconnected={() => navigate('/lop-hoc-online')} onError={(roomError) => setError(roomError.message)} className="min-h-screen">
      <TeacherClassroomExperience joinData={joinData} onLeave={() => navigate('/lop-hoc-online')} onDeviceError={setError} />
    </LiveKitRoom>
  )
}
