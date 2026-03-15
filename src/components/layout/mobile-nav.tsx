'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Menu, Server, CreditCard, Settings, ExternalLink, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Instances', href: '/instances', icon: Server },
  { label: 'Billing', href: '/billing', icon: CreditCard },
  { label: 'Settings', href: '/settings', icon: Settings },
]

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon" className="rounded-full border border-white/10 bg-background/35" />}
      >
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-72 border-white/10 bg-background/90 p-0 backdrop-blur-2xl">
        <div className="surface-noise flex h-full flex-col p-4">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-card/70 px-4 py-4">
            <div className="warm-glow flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-semibold">ClawCloud</div>
              <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Control deck</div>
            </div>
          </div>
          <nav className="mt-4 flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all',
                  isActive
                    ? 'warm-glow bg-primary text-primary-foreground'
                    : 'border border-white/10 bg-card/55 text-muted-foreground hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
          </nav>
          <div className="mt-auto rounded-2xl border border-white/10 bg-card/55 p-4">
            <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Need docs?</div>
            <a
              href="https://docs.clawcloud.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center gap-2.5 rounded-xl border border-white/10 bg-background/35 px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ExternalLink className="h-4 w-4" />
              Open documentation
            </a>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
