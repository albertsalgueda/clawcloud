'use client'

import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { User, LogOut, Zap, Sparkles, Bell } from 'lucide-react'
import { MobileNav } from './mobile-nav'

const pageTitles: Record<string, string> = {
  '/instances': 'Instances',
  '/instances/new': 'Create Instance',
  '/billing': 'Billing',
  '/settings': 'Settings',
}

function getPageTitle(pathname: string) {
  if (pageTitles[pathname]) return pageTitles[pathname]
  if (pathname.startsWith('/instances/')) return 'Instance'
  return ''
}

export function Topbar() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const title = getPageTitle(pathname)

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="relative z-10 px-4 pt-4 sm:px-6 lg:px-8">
      <div className="glass-panel flex min-h-16 items-center gap-3 rounded-[24px] px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3 lg:hidden">
          <MobileNav />
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-semibold">ClawCloud</span>
          </div>
        </div>

        <div className="hidden lg:block">
          <div className="text-[11px] uppercase tracking-[0.26em] text-muted-foreground">Live workspace</div>
          <div className="mt-1 text-sm font-medium">{title}</div>
        </div>

        <div className="hidden flex-1 items-center justify-center xl:flex">
          <div className="flex items-center gap-3 rounded-full border border-white/10 bg-background/35 px-4 py-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Instant instance telemetry and billing visibility
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="icon" className="rounded-full border border-white/10 bg-background/35">
            <Bell className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon" className="rounded-full border border-white/10 bg-background/35" />}
            >
              <User className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="text-xs text-muted-foreground focus:bg-transparent" disabled>
                demo@clawcloud.dev
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
