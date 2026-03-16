import { stripe } from './client'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Organization } from '@/lib/auth'

export async function ensureStripeCustomer(org: Organization): Promise<string | null> {
  if (org.stripe_customer_id) {
    try {
      await stripe.customers.retrieve(org.stripe_customer_id)
      return org.stripe_customer_id
    } catch {
      console.warn(`Stripe customer ${org.stripe_customer_id} not found in current mode, creating new one`)
    }
  }

  try {
    const stripeCustomer = await stripe.customers.create({
      name: org.name,
      metadata: {
        org_id: org.id,
        org_slug: org.slug,
      },
    })

    await supabaseAdmin
      .from('organizations')
      .update({ stripe_customer_id: stripeCustomer.id })
      .eq('id', org.id)

    return stripeCustomer.id
  } catch (err) {
    console.error('Failed to create Stripe customer:', err)
    return null
  }
}
