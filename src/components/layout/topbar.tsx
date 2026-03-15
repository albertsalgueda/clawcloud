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
import { User, LogOut, ChevronLeft, ChevronRight } from 'lucide-react'
import { MobileNav } from './mobile-nav'
import { useSidebarState } from './sidebar-state'

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
  const { collapsed, toggleCollapsed } = useSidebarState()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex min-h-14 items-center gap-3">
        <div className="flex items-center gap-3 lg:hidden">
          <MobileNav />
          <span className="font-medium">ClawCloud</span>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
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
          <div className="text-sm font-medium">{title}</div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon" className="rounded-full" />}
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
