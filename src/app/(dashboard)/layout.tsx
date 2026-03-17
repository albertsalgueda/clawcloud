import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { SidebarStateProvider } from '@/components/layout/sidebar-state'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { org } = await requireAuth()

  return (
    <SidebarStateProvider>
      <div className="app-shell flex min-h-screen">
        <Sidebar currentOrgSlug={org.slug} />
        <div className="relative flex flex-1 flex-col overflow-hidden">
          <Topbar currentOrgSlug={org.slug} />
          <main className="relative flex-1 overflow-y-auto px-4 pb-8 pt-3 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarStateProvider>
  )
}
