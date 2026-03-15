'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Server, CreditCard, Settings, ExternalLink, Plus, PanelLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Instances', href: '/instances', icon: Server },
  { label: 'Billing', href: '/billing', icon: CreditCard },
  { label: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex lg:w-72 lg:flex-col lg:border-r lg:border-border lg:bg-sidebar">
      <div className="flex h-full flex-col px-3 py-3">
        <div className="flex items-center gap-2 px-2 py-2">
          <PanelLeft className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">ClawCloud</span>
        </div>
        <Link
          href="/instances/new"
          className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
        >
          <Plus className="h-4 w-4" />
          New instance
        </Link>
        <nav className="mt-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="mt-6 px-3 text-xs text-muted-foreground">
          Managed OpenClaw instances and billing in one workspace.
        </div>
        <div className="mt-auto border-t border-border pt-3">
          <a
            href="https://docs.clawcloud.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" />
            Docs
          </a>
        </div>
      </div>
    </aside>
  )
}
