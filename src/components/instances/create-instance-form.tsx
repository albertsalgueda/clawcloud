'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PLANS, REGIONS } from '@/lib/constants'
import type { InstancePlan, InstanceRegion } from '@/types/instance'
import { cn, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { Loader2, Cpu, MemoryStick, Check } from 'lucide-react'

export function CreateInstanceForm() {
  const params = useParams<{ orgSlug: string }>()
  const [name, setName] = useState('')
  const [plan, setPlan] = useState<InstancePlan>('starter')
  const [region, setRegion] = useState<InstanceRegion>('eu-central')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }
    if (!params.orgSlug) {
      toast.error('Organization not found. Please refresh the page.')
      return
    }
    setLoading(true)

    try {
      const res = await fetch('/api/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, plan, region }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Failed to create instance')
        return
      }

      toast.success('Redirecting to payment...')
      window.location.href = data.checkoutUrl
    } catch {
      toast.error('Failed to create instance')
    } finally {
      setLoading(false)
    }
  }

  const selectedPlan = PLANS[plan]

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-2">
        <Label htmlFor="name" className="text-xs text-muted-foreground">Instance name</Label>
        <Input
          id="name"
          placeholder="my-openclaw-instance"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="h-12 rounded-2xl border-border bg-background"
        />
        <p className="text-xs text-muted-foreground">Letters, numbers, spaces, and hyphens only</p>
      </div>

      <div className="space-y-3">
        <Label className="text-xs text-muted-foreground">Plan</Label>
        <div className="grid gap-3 sm:grid-cols-3">
          {(Object.entries(PLANS) as [InstancePlan, (typeof PLANS)[InstancePlan]][]).map(([key, p]) => {
            const isSelected = plan === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPlan(key)}
                className={cn(
                  'relative flex flex-col gap-3 rounded-2xl border p-4 text-left transition-colors',
                  isSelected
                    ? 'border-primary bg-accent'
                    : 'border-border bg-background hover:bg-accent/50'
                )}
              >
                {isSelected && (
                  <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Check className="h-3 w-3" />
                  </div>
                )}
                <div>
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="mt-2 text-2xl font-medium tracking-tight">
                    {formatCurrency(p.price_eur)}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">/mo</span>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Cpu className="h-3.5 w-3.5" />
                    {p.vcpu} vCPU
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MemoryStick className="h-3.5 w-3.5" />
                    {p.ram_gb} GB RAM
                  </div>
                  <div className="text-muted-foreground/70">
                    per instance
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Region</Label>
        <Select value={region} onValueChange={(v) => setRegion(v as InstanceRegion)}>
          <SelectTrigger className="h-12 w-full rounded-2xl border-border bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(REGIONS) as [InstanceRegion, (typeof REGIONS)[InstanceRegion]][]).map(([key, r]) => (
              <SelectItem key={key} value={key}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-border bg-background p-5 space-y-3">
        <div className="flex items-center justify-between gap-4 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Compute cost per instance</div>
            <div className="mt-2 text-2xl font-medium">{formatCurrency(selectedPlan.price_eur)}/mo</div>
          </div>
          <div className="text-right text-xs leading-5 text-muted-foreground">
            {selectedPlan.vcpu} vCPU
            <br />
            {selectedPlan.ram_gb} GB RAM
          </div>
        </div>
        <p className="text-xs text-muted-foreground/70">
          AI token usage is metered and billed separately based on actual consumption.
        </p>
      </div>

      <Button type="submit" disabled={loading} className="h-12 w-full rounded-2xl text-sm font-medium">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Create Instance
      </Button>
    </form>
  )
}
