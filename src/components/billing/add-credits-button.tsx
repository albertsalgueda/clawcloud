'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Plus, Loader2 } from 'lucide-react'

interface AddCreditsButtonProps {
  onSuccess?: () => void
}

export function AddCreditsButton({ onSuccess }: AddCreditsButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch('/api/billing/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_eur: 20 }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to create top-up')
        return
      }
      // For now, show success toast. In production, use Stripe Elements
      // with the clientSecret to confirm the PaymentIntent.
      toast.success('Top-up initiated. Credits will be added once payment confirms.')
      onSuccess?.()
    } catch {
      toast.error('Failed to add credits')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={loading}>
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
      Add Credits
    </Button>
  )
}
