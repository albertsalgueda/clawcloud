'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Server, CreditCard, Settings, ExternalLink, Zap, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Instances', href: '/instances', icon: Server },
  { label: 'Billing', href: '/billing', icon: CreditCard },
  { label: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex lg:w-72 lg:flex-col lg:px-4 lg:py-5">
      <div className="glass-panel surface-noise flex h-full flex-col rounded-[28px] p-4">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="warm-glow flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-semibold">ClawCloud</div>
            <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Control deck</div>
          </div>
        </div>
        <div className="mt-5 rounded-2xl border border-white/10 bg-background/30 p-4">
          <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Mission status</div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Build, ship, and monitor OpenClaw environments from one cinematic command center.
          </p>
        </div>
        <nav className="mt-5 flex-1 space-y-2">
          <div className="px-2 text-[11px] uppercase tracking-[0.26em] text-muted-foreground">Navigation</div>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'warm-glow bg-primary text-primary-foreground'
                  : 'border border-transparent text-muted-foreground hover:border-white/10 hover:bg-white/5 hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              <ChevronRight className={cn('h-4 w-4 transition-all duration-200', isActive ? 'opacity-100' : 'translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100')} />
            </Link>
          )
        })}
        </nav>
        <div className="rounded-2xl border border-white/10 bg-background/35 p-4">
          <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Daily rhythm</div>
          <div className="mt-3 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Provisioning</span>
              <span className="font-medium">Realtime</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Billing pulse</span>
              <span className="font-medium">Per model</span>
            </div>
          </div>
        </div>
        <div className="mt-4 border-t border-white/10 pt-4">
          <a
            href="https://docs.clawcloud.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-background/35 px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" />
            Docs
          </a>
        </div>
      </div>
    </aside>
  )
}
