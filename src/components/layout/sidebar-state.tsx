'use client'

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react'

const SIDEBAR_STORAGE_KEY = 'clawcloud.sidebar.collapsed'

function getStoredCollapsed(): boolean {
  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true'
}

const noop = () => () => {}

interface SidebarStateContextValue {
  collapsed: boolean
  toggleCollapsed: () => void
  setCollapsed: (collapsed: boolean) => void
}

const SidebarStateContext = createContext<SidebarStateContextValue | null>(null)

export function SidebarStateProvider({ children }: { children: React.ReactNode }) {
  const initialCollapsed = useSyncExternalStore(noop, getStoredCollapsed, () => false)
  const [collapsed, setCollapsed] = useState(initialCollapsed)

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed))
  }, [collapsed])

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
