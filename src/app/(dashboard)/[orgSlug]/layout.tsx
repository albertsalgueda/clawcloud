import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  const { org } = await requireAuth()

  // #region agent log
  fetch('http://127.0.0.1:7806/ingest/d6f6e5dc-5e2a-4684-afdc-f324e215d821',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3dde84'},body:JSON.stringify({sessionId:'3dde84',location:'[orgSlug]/layout.tsx',message:'OrgLayout render',data:{urlOrgSlug:orgSlug,resolvedOrgSlug:org.slug,match:orgSlug===org.slug},timestamp:Date.now(),hypothesisId:'H-C,H-D'})}).catch(()=>{});
  // #endregion

  if (org.slug !== orgSlug) {
    redirect(`/${org.slug}/instances`)
  }

  return <>{children}</>
}
