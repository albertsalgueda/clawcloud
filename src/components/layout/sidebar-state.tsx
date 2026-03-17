'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const SIDEBAR_STORAGE_KEY = 'clawcloud.sidebar.collapsed'

interface SidebarStateContextValue {
  collapsed: boolean
  toggleCollapsed: () => void
  setCollapsed: (collapsed: boolean) => void
}

const SidebarStateContext = createContext<SidebarStateContextValue | null>(null)

export function SidebarStateProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY)
    if (stored === 'true') setCollapsed(true)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed))
    }
  }, [collapsed, hydrated])

  const value = useMemo<SidebarStateContextValue>(() => ({
    collapsed,
    toggleCollapsed: () => setCollapsed((current) => !current),
    setCollapsed,
  }), [collapsed])

  return (
    <SidebarStateContext.Provider value={value}>
      {children}
    </SidebarStateContext.Provider>
  )
}

export function useSidebarState() {
  const context = useContext(SidebarStateContext)
  if (!context) {
    throw new Error('useSidebarState must be used within SidebarStateProvider')
  }
  return context
}
