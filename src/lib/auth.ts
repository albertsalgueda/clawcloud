import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export interface Customer {
  id: string
  auth_user_id: string
  email: string
  name: string | null
  stripe_customer_id: string | null
  plan: string
  max_instances: number
  created_at: string
  updated_at: string
}

export async function currentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function requireAuth(): Promise<Customer> {
  const user = await currentUser()
  if (!user) {
    redirect('/login')
  }

  const { data: customer, error } = await supabaseAdmin
    .from('customers')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  if (error || !customer) {
    redirect('/login')
  }

  return customer as Customer
}

export async function getCustomerByAuthId(authUserId: string): Promise<Customer | null> {
  const { data } = await supabaseAdmin
    .from('customers')
    .select('*')
    .eq('auth_user_id', authUserId)
    .single()

  return data as Customer | null
}

export async function getCustomerByStripeId(stripeCustomerId: string): Promise<Customer | null> {
  const { data } = await supabaseAdmin
    .from('customers')
    .select('*')
    .eq('stripe_customer_id', stripeCustomerId)
    .single()

  return data as Customer | null
}
