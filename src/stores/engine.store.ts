import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Engine = 'dialer' | 'crm'

interface EngineState {
  engine: Engine
  setEngine: (e: Engine) => void
}

export const useEngineStore = create<EngineState>()(
  persist(
    (set) => ({
      engine: 'dialer',
      setEngine: (engine) => set({ engine }),
    }),
    { name: 'rocketdialer-engine' }
  )
)
