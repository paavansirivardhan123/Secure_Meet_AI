import { create } from 'zustand'

interface AuthState {
  token: string | null
  email: string | null
  fullName: string | null
  role: string | null
  phoneNumber: string | null
  profilePicture: string | null
  bio: string | null
  setAuth: (
    token: string,
    email: string,
    fullName: string,
    role: string,
    phoneNumber?: string | null,
    profilePicture?: string | null,
    bio?: string | null
  ) => void
  updateProfile: (updates: {
    fullName?: string
    email?: string
    phoneNumber?: string | null
    profilePicture?: string | null
    bio?: string | null
  }) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  email: typeof window !== 'undefined' ? localStorage.getItem('email') : null,
  fullName: typeof window !== 'undefined' ? localStorage.getItem('fullName') : null,
  role: typeof window !== 'undefined' ? localStorage.getItem('role') : null,
  phoneNumber: typeof window !== 'undefined' ? localStorage.getItem('phoneNumber') : null,
  profilePicture: typeof window !== 'undefined' ? localStorage.getItem('profilePicture') : null,
  bio: typeof window !== 'undefined' ? localStorage.getItem('bio') : null,

  setAuth: (token, email, fullName, role, phoneNumber = null, profilePicture = null, bio = null) => {
    localStorage.setItem('token', token)
    localStorage.setItem('email', email)
    localStorage.setItem('fullName', fullName)
    localStorage.setItem('role', role)
    if (phoneNumber) localStorage.setItem('phoneNumber', phoneNumber)
    else localStorage.removeItem('phoneNumber')
    if (profilePicture) localStorage.setItem('profilePicture', profilePicture)
    else localStorage.removeItem('profilePicture')
    if (bio) localStorage.setItem('bio', bio)
    else localStorage.removeItem('bio')

    set({ token, email, fullName, role, phoneNumber, profilePicture, bio })
  },

  updateProfile: (updates) => {
    set((state) => {
      const newState = { ...state }
      if (updates.fullName !== undefined) {
        localStorage.setItem('fullName', updates.fullName)
        newState.fullName = updates.fullName
      }
      if (updates.email !== undefined) {
        localStorage.setItem('email', updates.email)
        newState.email = updates.email
      }
      if (updates.phoneNumber !== undefined) {
        if (updates.phoneNumber) localStorage.setItem('phoneNumber', updates.phoneNumber)
        else localStorage.removeItem('phoneNumber')
        newState.phoneNumber = updates.phoneNumber
      }
      if (updates.profilePicture !== undefined) {
        if (updates.profilePicture) localStorage.setItem('profilePicture', updates.profilePicture)
        else localStorage.removeItem('profilePicture')
        newState.profilePicture = updates.profilePicture
      }
      if (updates.bio !== undefined) {
        if (updates.bio) localStorage.setItem('bio', updates.bio)
        else localStorage.removeItem('bio')
        newState.bio = updates.bio
      }
      return newState
    })
  },

  logout: () => {
    localStorage.clear()
    set({ token: null, email: null, fullName: null, role: null, phoneNumber: null, profilePicture: null, bio: null })
  },
}))
