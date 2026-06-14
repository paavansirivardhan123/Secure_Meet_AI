import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token && token !== 'null' && token !== 'undefined' && token.trim() !== '') {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
