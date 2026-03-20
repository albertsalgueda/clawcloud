'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { BillingPortalButton } from '@/components/billing/billing-portal-button'
import { AddCreditsButton } from '@/components/billing/add-credits-button'

interface AutoTopupSettingsProps {
  enabled: boolean
  amountEur: number
  thresholdEur: number
  failed: boolean
  onUpdate?: () => void
}

export function AutoTopupSettings({
  enabled,
  amountEur,
  thresholdEur,
  failed,
  onUpdate,
}: AutoTopupSettingsProps) {
  const [saving, setSaving] = useState(false)
  const [draftAmount, setDraftAmount] = useState(String(amountEur))
  const [draftThreshold, setDraftThreshold] = useState(String(thresholdEur))

  useEffect(() => {
    setDraftAmount(String(amountEur))
    setDraftThreshold(String(thresholdEur))
  }, [amountEur, thresholdEur])

  const isDirty = useMemo(
    () => Number(draftAmount) !== amountEur || Number(draftThreshold) !== thresholdEur,
    [amountEur, draftAmount, draftThreshold, thresholdEur],
  )

  function handleAmountChange(value: string | null) {
    if (value) setDraftAmount(value)
  }

  function handleThresholdChange(value: string | null) {
    if (value) setDraftThreshold(value)
  }

  async function saveSettings(nextEnabled = enabled) {
    setSaving(true)
    try {
      const res = await fetch('/api/billing/credits', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auto_topup_enabled: nextEnabled,
          auto_topup_amount_eur: Number(draftAmount),
          auto_topup_threshold_eur: Number(draftThreshold),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to update settings')
        return
      }
      toast.success(
        nextEnabled
          ? `Auto top-up will add ${formatCurrency(Number(draftAmount))} below ${formatCurrency(Number(draftThreshold))}.`
          : 'Auto top-up disabled',
      )
      onUpdate?.()
    } catch {
      toast.error('Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Low-Balance Auto Top-Up</CardTitle>
            <CardDescription>
              Automatically buy more credits with your default payment method before the balance runs out.
            </CardDescription>
          </div>
          <Badge variant={enabled ? 'default' : 'outline'}>
            {enabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
          <p className="text-sm font-medium">
            {enabled
              ? `Currently adds ${formatCurrency(amountEur)} when balance drops below ${formatCurrency(thresholdEur)}.`
              : 'Auto top-up is currently off.'}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Set the refill amount and the low-balance trigger, then enable the setup. If a payment fails, update your card and save again to retry.
          </p>
          {failed && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Last auto top-up failed. Update your payment method, then save this setup again.
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="auto-topup-amount">Top-up amount</Label>
            <Select value={draftAmount} onValueChange={handleAmountChange}>
              <SelectTrigger id="auto-topup-amount" className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50, 100, 200].map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    {formatCurrency(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              How many credits to buy each time the balance needs a refill.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="auto-topup-threshold">Balance threshold</Label>
            <Select value={draftThreshold} onValueChange={handleThresholdChange}>
              <SelectTrigger id="auto-topup-threshold" className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2, 5, 10, 20, 50].map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    {formatCurrency(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              When the balance falls below this amount, the refill is triggered.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => saveSettings(!enabled)} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {enabled ? 'Disable Auto Top-Up' : 'Enable Auto Top-Up'}
          </Button>
          <Button
            variant="outline"
            onClick={() => saveSettings(enabled)}
            disabled={saving || (!enabled && !isDirty) || (enabled && !isDirty)}
          >
            Save Refill Settings
          </Button>
          <AddCreditsButton
            amountEur={Number(draftAmount)}
            label={`Top Up ${formatCurrency(Number(draftAmount))} Now`}
            onSuccess={onUpdate}
          />
        </div>

        <div className="rounded-xl border border-dashed border-border px-4 py-3">
          <p className="text-sm font-medium">Need to update the card used for top-ups?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Open the Stripe billing portal to change your default payment method or review invoices.
          </p>
          <div className="mt-3">
            <BillingPortalButton />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
