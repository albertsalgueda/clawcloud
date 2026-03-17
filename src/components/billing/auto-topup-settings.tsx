'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'

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

  async function toggleEnabled() {
    setSaving(true)
    try {
      const res = await fetch('/api/billing/credits', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_topup_enabled: !enabled }),
      })
      if (!res.ok) {
        toast.error('Failed to update settings')
        return
      }
      toast.success(enabled ? 'Auto top-up disabled' : 'Auto top-up enabled')
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
        <CardTitle className="text-sm font-medium text-muted-foreground">Auto Top-Up</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">
              {enabled ? 'Enabled' : 'Disabled'}
            </p>
            {enabled && (
              <p className="text-xs text-muted-foreground">
                Adds {formatCurrency(amountEur)} when balance drops below {formatCurrency(thresholdEur)}
              </p>
            )}
            {failed && (
              <p className="text-xs text-destructive">
                Last auto top-up failed. Please check your payment method.
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleEnabled}
            disabled={saving}
          >
            {enabled ? 'Disable' : 'Enable'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
