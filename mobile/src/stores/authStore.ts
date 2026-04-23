import { create } from 'zustand'

export type CareHomeRole = 'carer' | 'senior' | 'manager' | 'family'

interface User {
  id: string
  name: string
  email: string
  role: CareHomeRole
  home_id?: string
  resident_id?: string
  access_token: string
}

interface AuthStore {
  user: User | null
  isLoading: boolean
  login: (user: User) => void
  logout: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: false,
  login: (user) => set({ user }),
  logout: () => set({ user: null }),
  setLoading: (loading) => set({ isLoading: loading }),
}))
