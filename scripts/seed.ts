import { supabaseAdmin } from '../src/lib/supabase/admin'

async function seed() {
  console.log('Seeding database...')

  const { data: existing } = await supabaseAdmin
    .from('customers')
    .select('id')
    .eq('email', 'test@clawcloud.dev')
    .single()

  if (existing) {
    console.log('Seed data already exists, skipping.')
    return
  }

  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({
    perPage: 1000,
  })
  let authUser = users?.find((u) => u.email === 'test@clawcloud.dev')

  if (!authUser) {
    const { data: created, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: 'test@clawcloud.dev',
        password: 'test-password-123',
        email_confirm: true,
        user_metadata: { name: 'Test User' },
      })

    if (createError) {
      console.error('Failed to create auth user:', createError)
      return
    }
    authUser = created.user
  }

  const { data: customer, error: customerError } = await supabaseAdmin
    .from('customers')
    .insert({
      auth_user_id: authUser!.id,
      email: 'test@clawcloud.dev',
      name: 'Test User',
      plan: 'pro',
      max_instances: 3,
    })
    .select()
    .single()

  if (customerError) {
    console.error('Failed to create customer:', customerError)
    return
  }

  console.log('Created customer:', customer.id)

  const { data: instance, error: instanceError } = await supabaseAdmin
    .from('instances')
    .insert({
      customer_id: customer.id,
      name: 'My First Instance',
      slug: 'my-first-instance-abc123',
      status: 'running',
      plan: 'pro',
      region: 'eu-central',
      ip_address: '1.2.3.4',
      config: {},
      env_vars: { EXAMPLE_KEY: 'example_value' },
    })
    .select()
    .single()

  if (instanceError) {
    console.error('Failed to create instance:', instanceError)
    return
  }

  console.log('Created instance:', instance.id)

  const models = [
    'anthropic/claude-sonnet-4.6',
    'openai/gpt-4o',
    'google/gemini-2.5-pro',
  ]

  const usageEvents = []
  const now = new Date()
  for (let day = 0; day < 14; day++) {
    const date = new Date(now)
    date.setDate(date.getDate() - day)

    for (const model of models) {
      const inputTokens = Math.floor(Math.random() * 10000) + 1000
      const outputTokens = Math.floor(Math.random() * 3000) + 500
      const costUsd = inputTokens * 0.000003 + outputTokens * 0.000015
      const billedUsd = costUsd * 1.25

      usageEvents.push({
        instance_id: instance.id,
        customer_id: customer.id,
        model,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost_usd: costUsd.toFixed(6),
        billed_usd: billedUsd.toFixed(6),
        created_at: date.toISOString(),
      })
    }
  }

  const { error: usageError } = await supabaseAdmin
    .from('usage_events')
    .insert(usageEvents)

  if (usageError) {
    console.error('Failed to create usage events:', usageError)
    return
  }

  console.log(`Created ${usageEvents.length} usage events`)
  console.log('Seeding complete!')
}

seed().catch(console.error)
