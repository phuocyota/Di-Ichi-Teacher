import { api } from './api.js'

export const loginStaff = (credentials) => api.post('/auth/staff/login', credentials)
