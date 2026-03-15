'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
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

      toast.success('Instance created! Provisioning...')
      router.push(`/instances/${data.instance.id}`)
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
        <Label htmlFor="name" className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Instance Name</Label>
        <Input
          id="name"
          placeholder="my-openclaw-instance"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="h-12 rounded-2xl border-white/10 bg-background/35"
        />
        <p className="text-xs text-muted-foreground">Letters, numbers, spaces, and hyphens only</p>
      </div>

      <div className="space-y-3">
        <Label className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Plan</Label>
        <div className="grid gap-3 sm:grid-cols-3">
          {(Object.entries(PLANS) as [InstancePlan, (typeof PLANS)[InstancePlan]][]).map(([key, p]) => {
            const isSelected = plan === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPlan(key)}
                className={cn(
                  'relative flex flex-col gap-3 rounded-[24px] border p-4 text-left transition-all duration-200',
                  isSelected
                    ? 'warm-glow border-primary bg-primary/10 ring-1 ring-primary/50'
                    : 'border-white/10 bg-background/25 hover:border-primary/20 hover:bg-background/40'
                )}
              >
                {isSelected && (
                  <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">{p.name}</div>
                  <div className="mt-2 text-3xl font-semibold tracking-tight">
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
                    Up to {p.max_instances} instance{p.max_instances > 1 ? 's' : ''}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Region</Label>
        <Select value={region} onValueChange={(v) => setRegion(v as InstanceRegion)}>
          <SelectTrigger className="h-12 rounded-2xl border-white/10 bg-background/35">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(REGIONS) as [InstanceRegion, (typeof REGIONS)[InstanceRegion]][]).map(([key, r]) => (
              <SelectItem key={key} value={key}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="surface-noise rounded-[24px] border border-white/10 p-5">
        <div className="flex items-center justify-between gap-4 text-sm">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Monthly estimate</div>
            <div className="mt-2 text-2xl font-semibold">{formatCurrency(selectedPlan.price_eur)}/mo</div>
          </div>
          <div className="text-right text-xs leading-5 text-muted-foreground">
            {selectedPlan.vcpu} vCPU
            <br />
            {selectedPlan.ram_gb} GB RAM
          </div>
        </div>
      </div>

      <Button type="submit" disabled={loading} className="warm-glow h-12 w-full rounded-2xl text-sm font-semibold">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Create Instance
      </Button>
    </form>
  )
}
