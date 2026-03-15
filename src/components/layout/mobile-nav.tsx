'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Menu, Server, CreditCard, Settings, ExternalLink, Plus, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { OrgSwitcher } from './org-switcher'

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const params = useParams<{ orgSlug: string }>()
  const orgSlug = params.orgSlug ?? ''

  const navItems = [
    { label: 'Instances', href: `/${orgSlug}/instances`, icon: Server },
    { label: 'Billing', href: `/${orgSlug}/billing`, icon: CreditCard },
    { label: 'Team', href: `/${orgSlug}/settings/members`, icon: Users },
    { label: 'Settings', href: `/settings`, icon: Settings },
  ]

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon" className="rounded-full" />}
      >
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-72 border-border bg-sidebar p-0">
        <div className="flex h-full flex-col p-3">
          <div className="px-2 py-2 text-sm font-medium">Agent Computers</div>
          <div className="mt-2">
            <OrgSwitcher collapsed={false} />
          </div>
          <Link
            href={`/${orgSlug}/instances/new`}
            onClick={() => setOpen(false)}
            className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            New instance
          </Link>
          <nav className="mt-4 flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
          </nav>
          <div className="mt-auto border-t border-border pt-3">
            <a
              href="https://docs.clawcloud.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ExternalLink className="h-4 w-4" />
              Docs
            </a>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
