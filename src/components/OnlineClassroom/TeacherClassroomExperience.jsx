import { useCallback, useEffect, useRef, useState } from 'react'
import { ControlBar, GridLayout, ParticipantTile, RoomAudioRenderer, StartAudio, useRoomContext, useTracks } from '@livekit/components-react'
import { RoomEvent, Track } from 'livekit-client'
import { toast } from 'sonner'
import { getClassroomErrorMessage, getClassroomParticipants, kickClassroomParticipant, updateClassroomPermissions } from '../../services/classroomApi.js'
import { useClassroomSocket } from '../../hooks/useClassroomSocket.js'
import { ClassroomBoard } from './ClassroomBoard.jsx'
import { ParticipantPanel } from './ParticipantPanel.jsx'

export const TeacherClassroomExperience = ({ joinData, onLeave, onDeviceError }) => {
  const [participants, setParticipants] = useState([])
  const [raisedHands, setRaisedHands] = useState(new Set())
  const [saving, setSaving] = useState('')
  const [kicking, setKicking] = useState(new Set())
  const kickRequests = useRef(new Set())
  const rosterRequest = useRef(0)
  const room = useRoomContext()
  const loadParticipants = useCallback(async () => {
    const request = ++rosterRequest.current
    try {
      const result = await getClassroomParticipants(joinData.scheduleId)
      if (request === rosterRequest.current) setParticipants(result)
    } catch (error) {
      if (request === rosterRequest.current) toast.error('Không thể tải danh sách học sinh', { description: getClassroomErrorMessage(error) })
    }
  }, [joinData.scheduleId])
  const onEvent = useCallback((eventName, event) => {
    if (eventName === 'classroom:raise-hand' || eventName === 'classroom:lower-hand') {
      setRaisedHands((current) => {
        const next = new Set(current)
        if (eventName === 'classroom:raise-hand') next.add(event.studentId)
        else next.delete(event.studentId)
        return next
      })
    }
    if (eventName === 'classroom:participant-joined' || eventName === 'classroom:participant-left') void loadParticipants()
    if (eventName === 'classroom:permission-changed') {
      setParticipants((current) => current.map((item) => item.identity === event.identity ? { ...item, permissions: event.permissions } : item))
    }
  }, [loadParticipants])
  const { socket, connected } = useClassroomSocket({ scheduleId: joinData.scheduleId, onEvent })
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ], { onlySubscribed: false })

  useEffect(() => {
    void loadParticipants()
    const timer = window.setInterval(loadParticipants, 15000)
    const refresh = () => { void loadParticipants() }
    const events = [RoomEvent.ParticipantConnected, RoomEvent.ParticipantDisconnected, RoomEvent.Reconnected]
    events.forEach((event) => room.on(event, refresh))
    return () => {
      window.clearInterval(timer)
      events.forEach((event) => room.off(event, refresh))
      // This is a request counter, not a DOM ref: invalidate outstanding fetches on cleanup.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      rosterRequest.current++
    }
  }, [loadParticipants, room])

  const kickParticipant = async (participant) => {
    const { identity } = participant
    if (!identity || !participant.connected || kickRequests.current.has(identity)) return
    kickRequests.current.add(identity)
    setKicking(new Set(kickRequests.current))
    try {
      const result = await kickClassroomParticipant(joinData.scheduleId, identity)
      rosterRequest.current++
      setParticipants((current) => current.map((item) => item.identity === identity ? { ...item, connected: false } : item))
      setRaisedHands((current) => {
        const next = new Set(current)
        next.delete(participant.studentId)
        return next
      })
      toast.success(result.removed ? 'Đã mời học sinh ra khỏi lớp' : 'Học sinh đã rời lớp')
      await loadParticipants()
    } catch (error) {
      toast.error('Không thể mời học sinh ra khỏi lớp', { description: getClassroomErrorMessage(error) })
    } finally {
      kickRequests.current.delete(identity)
      setKicking(new Set(kickRequests.current))
    }
  }

  const changePermission = async (participant, key, value) => {
    const savingKey = `${participant.studentId}:${key}`
    setSaving(savingKey)
    try {
      const result = await updateClassroomPermissions(joinData.scheduleId, participant.studentId, { [key]: value })
      setParticipants((current) => current.map((item) => item.studentId === participant.studentId ? { ...item, permissions: result.permissions } : item))
    } catch (error) {
      toast.error('Không thể cập nhật quyền', { description: getClassroomErrorMessage(error) })
    } finally {
      setSaving('')
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white" data-lk-theme="default">
      <header className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
        <div><p className="text-xs font-black uppercase text-orange-400">Lớp học trực tuyến</p><h1 className="text-xl font-black">{joinData.room}</h1><p className="text-xs text-slate-400">Realtime {connected ? 'đã kết nối' : 'đang kết nối lại'}</p></div>
        <button type="button" onClick={onLeave} className="rounded-2xl bg-red-500 px-4 py-2 font-black">Rời lớp</button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
        <main className="flex min-w-0 flex-1 flex-col">
          <GridLayout tracks={tracks} className="lk-grid-layout min-h-96 flex-1 p-4"><ParticipantTile /></GridLayout>
          <RoomAudioRenderer />
          <StartAudio label="Bật âm thanh" />
          <ClassroomBoard socket={socket} scheduleId={joinData.scheduleId} permissions={joinData.permissions} />
          <div className="flex justify-center border-t border-white/10 p-3">
            <ControlBar variation="minimal" controls={{ microphone: true, camera: true, screenShare: true, chat: false, settings: true, leave: false }} onDeviceError={({ error }) => onDeviceError(error.message)} />
          </div>
        </main>
        <ParticipantPanel participants={participants} raisedHands={raisedHands} saving={saving} onPermission={changePermission} kicking={kicking} onKick={kickParticipant} />
      </div>
    </div>
  )
}
