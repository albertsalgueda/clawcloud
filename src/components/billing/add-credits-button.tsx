'use client'

import { useState, type ComponentProps } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Plus, Loader2 } from 'lucide-react'

interface AddCreditsButtonProps {
  onSuccess?: () => void
  amountEur?: number
  label?: string
  variant?: ComponentProps<typeof Button>['variant']
  size?: ComponentProps<typeof Button>['size']
  className?: string
}

export function AddCreditsButton({
  onSuccess,
  amountEur = 20,
  label,
  variant = 'outline',
  size = 'sm',
  className,
}: AddCreditsButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch('/api/billing/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_eur: amountEur }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to create top-up')
        return
      }
      // For now, show success toast. In production, use Stripe Elements
      // with the clientSecret to confirm the PaymentIntent.
      toast.success(`Top-up started for €${amountEur}. Credits will be added once payment confirms.`)
      onSuccess?.()
    } catch {
      toast.error('Failed to add credits')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
      {label ?? `Top Up €${amountEur}`}
    </Button>
  )
}
