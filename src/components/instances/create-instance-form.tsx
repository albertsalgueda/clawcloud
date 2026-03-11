'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PLANS, REGIONS } from '@/lib/constants'
import type { InstancePlan, InstanceRegion } from '@/types/instance'
import { cn, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { Loader2, Cpu, MemoryStick } from 'lucide-react'

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

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-2">
        <Label htmlFor="name">Instance Name</Label>
        <Input
          id="name"
          placeholder="My OpenClaw Instance"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">Letters, numbers, spaces, and hyphens only</p>
      </div>

      <div className="space-y-3">
        <Label>Plan</Label>
        <div className="grid gap-4 sm:grid-cols-3">
          {(Object.entries(PLANS) as [InstancePlan, (typeof PLANS)[InstancePlan]][]).map(([key, p]) => (
            <Card
              key={key}
              className={cn(
                'cursor-pointer transition-all',
                plan === key ? 'border-primary ring-2 ring-primary/20' : 'hover:border-muted-foreground/50'
              )}
              onClick={() => setPlan(key)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{p.name}</CardTitle>
                <CardDescription>{formatCurrency(p.price_eur)}/mo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5" />
                  {p.vcpu} vCPU
                </div>
                <div className="flex items-center gap-1.5">
                  <MemoryStick className="h-3.5 w-3.5" />
                  {p.ram_gb} GB RAM
                </div>
                <p>Up to {p.max_instances} instance{p.max_instances > 1 ? 's' : ''}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Region</Label>
        <Select value={region} onValueChange={(v) => setRegion(v as InstanceRegion)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(REGIONS) as [InstanceRegion, (typeof REGIONS)[InstanceRegion]][]).map(([key, r]) => (
              <SelectItem key={key} value={key}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Create Instance
      </Button>
    </form>
  )
}
