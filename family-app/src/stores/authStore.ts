import { create } from 'zustand'

interface FamilyUser {
  id: string
  name: string
  email: string
  resident_id: string
  access_token: string
}

interface AuthStore {
  user: FamilyUser | null
  isLoading: boolean
  login: (user: FamilyUser) => void
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
