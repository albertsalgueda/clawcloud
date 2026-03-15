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
import { User, LogOut, Zap } from 'lucide-react'
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
    <header className="flex h-14 shrink-0 items-center border-b bg-card/50 backdrop-blur-sm px-4 sm:px-6">
      <div className="flex items-center gap-3 lg:hidden">
        <MobileNav />
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <span className="font-semibold">ClawCloud</span>
        </div>
      </div>

      <span className="hidden lg:block text-sm font-medium text-muted-foreground">
        {title}
      </span>

      <div className="ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon" />}
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
    </header>
  )
}
