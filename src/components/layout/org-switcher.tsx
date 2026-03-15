'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Building2, Check, ChevronsUpDown, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Org {
  id: string
  name: string
  slug: string
  role: string
}

export function OrgSwitcher({ collapsed }: { collapsed: boolean }) {
  const router = useRouter()
  const params = useParams<{ orgSlug: string }>()
  const [orgs, setOrgs] = useState<Org[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/organizations')
      .then(r => r.json())
      .then(data => {
        setOrgs(data.organizations ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const currentOrg = orgs.find(o => o.slug === params.orgSlug) ?? orgs[0]

  function switchOrg(org: Org) {
    document.cookie = `clawcloud-org=${org.slug};path=/;max-age=${60 * 60 * 24 * 365}`
    router.push(`/${org.slug}/instances`)
    router.refresh()
  }

  function goToCreateOrg() {
    const base = params.orgSlug ? `/${params.orgSlug}/settings` : '/settings'
    router.push(`${base}?create=true`)
  }

  if (loading) {
    return (
      <div className={cn(
        'flex items-center rounded-lg border border-border bg-card px-2 py-2',
        collapsed ? 'justify-center' : 'gap-2'
      )}>
        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
        {!collapsed && <span className="text-sm text-muted-foreground">Loading...</span>}
      </div>
    )
  }

  if (collapsed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg" title={currentOrg?.name ?? 'Organization'} />
          }
        >
          <Building2 className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {orgs.map(org => (
            <DropdownMenuItem key={org.id} onClick={() => switchOrg(org)}>
              <Building2 className="mr-2 h-4 w-4" />
              <span className="truncate">{org.name}</span>
              {org.slug === params.orgSlug && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={goToCreateOrg}>
            <Plus className="mr-2 h-4 w-4" />
            Create organization
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" className="w-full justify-between rounded-lg px-3 py-2 text-left h-auto" />
        }
      >
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="h-4 w-4 shrink-0" />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{currentOrg?.name ?? 'Select org'}</div>
            <div className="truncate text-xs text-muted-foreground">{currentOrg?.role ?? ''}</div>
          </div>
        </div>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
        {orgs.map(org => (
          <DropdownMenuItem key={org.id} onClick={() => switchOrg(org)}>
            <Building2 className="mr-2 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm">{org.name}</div>
              <div className="truncate text-xs text-muted-foreground">{org.role}</div>
            </div>
            {org.slug === params.orgSlug && <Check className="ml-auto h-4 w-4 shrink-0" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={goToCreateOrg}>
          <Plus className="mr-2 h-4 w-4" />
          Create organization
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
