'use client'

import { createContext, useContext } from 'react'
import { DEMO_USER_ID, DEMO_SQUAD_ID } from '@/lib/demo/seed'

interface DemoUserCtx {
  userId: string
  squadId: string
}

const DemoUserContext = createContext<DemoUserCtx>({ userId: DEMO_USER_ID, squadId: DEMO_SQUAD_ID })

export function DemoUserProvider({ children }: { children: React.ReactNode }) {
  return (
    <DemoUserContext.Provider value={{ userId: DEMO_USER_ID, squadId: DEMO_SQUAD_ID }}>
      {children}
    </DemoUserContext.Provider>
  )
}

export function useDemoUser() {
  return useContext(DemoUserContext)
}
