'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const tabs = [
  { label: 'Overview', href: '' },
  { label: 'Settings', href: '/settings' },
  { label: 'Usage', href: '/usage' },
]

export function InstanceTabs({ instanceId }: { instanceId: string }) {
  const pathname = usePathname()
  const basePath = `/instances/${instanceId}`

  return (
    <nav className="flex gap-1 border-b pb-px mb-6">
      {tabs.map((tab) => {
        const href = `${basePath}${tab.href}`
        const isActive = tab.href === ''
          ? pathname === basePath
          : pathname.startsWith(href)

        return (
          <Link
            key={tab.href}
            href={href}
            className={cn(
              'relative px-3 py-2 text-sm font-medium transition-colors rounded-md',
              isActive
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
            {isActive && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary rounded-full" />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
