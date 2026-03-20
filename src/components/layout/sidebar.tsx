'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Server, CreditCard, Settings, ExternalLink, Plus, PanelLeft, ChevronLeft, ChevronRight, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useSidebarState } from './sidebar-state'
import { OrgSwitcher } from './org-switcher'

export function Sidebar({ currentOrgSlug }: { currentOrgSlug: string }) {
  const pathname = usePathname()
  const { collapsed, toggleCollapsed } = useSidebarState()

  const navItems = [
    { label: 'Instances', href: `/${currentOrgSlug}/instances`, icon: Server },
    { label: 'Billing', href: `/${currentOrgSlug}/billing`, icon: CreditCard },
    { label: 'Team', href: `/${currentOrgSlug}/settings/members`, icon: Users },
    { label: 'Settings', href: '/settings', icon: Settings },
  ]

  return (
    <aside
      className={cn(
        'hidden lg:flex lg:flex-col lg:border-r lg:border-border lg:bg-sidebar lg:transition-[width] lg:duration-200',
        collapsed ? 'lg:w-16' : 'lg:w-72'
      )}
    >
      <div className="flex h-full flex-col px-3 py-3">
        <div className={cn('flex items-center px-2 py-2', collapsed ? 'justify-center' : 'justify-between gap-2')}>
          <div className={cn('flex items-center gap-2 min-w-0', collapsed && 'justify-center')}>
            <PanelLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
            {!collapsed && <span className="truncate text-sm font-medium">Agent Computers</span>}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
        <div className="mt-2">
          <OrgSwitcher collapsed={collapsed} currentOrgSlug={currentOrgSlug} />
        </div>
        <Link
          href={`/${currentOrgSlug}/instances/new`}
          className={cn(
            'mt-3 flex rounded-xl border border-border bg-card py-2.5 text-sm font-medium transition-colors hover:bg-accent',
            collapsed ? 'justify-center px-0' : 'items-center gap-2 px-3'
          )}
          title="New instance"
        >
          <Plus className="h-4 w-4" />
          {!collapsed && 'New instance'}
        </Link>
        <nav className="mt-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex rounded-lg py-2 text-sm transition-colors',
                  collapsed ? 'justify-center px-0' : 'items-center gap-3 px-3',
                  isActive ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
                title={item.label}
              >
                <item.icon className="h-4 w-4" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>
        <div className="mt-auto border-t border-border pt-3">
          <a
            href="https://docs.agentcomputers.app"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex rounded-lg py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
              collapsed ? 'justify-center px-0' : 'items-center gap-3 px-3'
            )}
            title="Docs"
          >
            <ExternalLink className="h-4 w-4" />
            {!collapsed && 'Docs'}
          </a>
        </div>
      </div>
    </aside>
  )
}
