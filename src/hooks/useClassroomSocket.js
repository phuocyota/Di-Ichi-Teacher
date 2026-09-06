import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { getAccessToken } from '../services/authSession.js'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '')

export const useClassroomSocket = ({ scheduleId, onEvent }) => {
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!scheduleId) return undefined
    const client = io(`${API_URL}/classroom`, {
      auth: { token: getAccessToken() },
      transports: ['websocket', 'polling'],
    })
    const events = [
      'classroom:participant-joined',
      'classroom:participant-left',
      'classroom:raise-hand',
      'classroom:lower-hand',
      'classroom:permission-changed',
    ]
    client.on('connect', () => {
      setConnected(true)
      client.emit('classroom:join', { scheduleId })
    })
    client.on('disconnect', () => setConnected(false))
    events.forEach((eventName) => {
      client.on(eventName, (event) => {
        if (event.scheduleId === scheduleId) onEvent?.(eventName, event)
      })
    })
    setSocket(client)
    return () => {
      client.disconnect()
      setSocket(null)
      setConnected(false)
    }
  }, [onEvent, scheduleId])

  return { socket, connected }
}
