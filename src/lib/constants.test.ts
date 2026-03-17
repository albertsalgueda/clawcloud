import { describe, it, expect } from 'vitest'
import { PLANS, MAX_INSTANCES_PER_ORG, REGIONS, PLAN_PRICES } from './constants'

describe('PLANS', () => {
  it('reads stripe price ids from env getters on each plan', () => {
    process.env.STRIPE_PRICE_STARTER = 'price_starter'
    process.env.STRIPE_PRICE_PRO = 'price_pro'
    process.env.STRIPE_PRICE_BUSINESS = 'price_business'

    expect(PLANS.starter.stripe_price_id).toBe('price_starter')
    expect(PLANS.pro.stripe_price_id).toBe('price_pro')
    expect(PLANS.business.stripe_price_id).toBe('price_business')
  })

  it('defines starter, pro, and business plans', () => {
    expect(Object.keys(PLANS)).toEqual(['starter', 'pro', 'business'])
  })

  it('has correct per-instance pricing with Hetzner margin', () => {
    expect(PLANS.starter.price_eur).toBe(5.99)
    expect(PLANS.pro.price_eur).toBe(9.99)
    expect(PLANS.business.price_eur).toBe(17.99)
  })

  it('prices are above Hetzner cost', () => {
    for (const plan of Object.values(PLANS)) {
      expect(plan.price_eur).toBeGreaterThan(plan.hetzner_cost)
    }
  })

  it('has valid Hetzner server types', () => {
    expect(PLANS.starter.hetzner_type).toBe('cx23')
    expect(PLANS.pro.hetzner_type).toBe('cx33')
    expect(PLANS.business.hetzner_type).toBe('cx43')
  })

  it('has correct specs', () => {
    expect(PLANS.starter.vcpu).toBe(2)
    expect(PLANS.starter.ram_gb).toBe(4)
    expect(PLANS.pro.vcpu).toBe(4)
    expect(PLANS.pro.ram_gb).toBe(8)
    expect(PLANS.business.vcpu).toBe(8)
    expect(PLANS.business.ram_gb).toBe(16)
  })
})

describe('MAX_INSTANCES_PER_ORG', () => {
  it('is a reasonable hard cap', () => {
    expect(MAX_INSTANCES_PER_ORG).toBe(50)
    expect(MAX_INSTANCES_PER_ORG).toBeGreaterThan(0)
  })
})

describe('REGIONS', () => {
  it('defines eu-central and eu-west', () => {
    expect(Object.keys(REGIONS)).toEqual(['eu-central', 'eu-west'])
  })

  it('maps to valid Hetzner locations', () => {
    expect(REGIONS['eu-central'].hetzner).toBe('fsn1')
    expect(REGIONS['eu-west'].hetzner).toBe('hel1')
    expect(REGIONS['eu-central'].label).toContain('Falkenstein')
    expect(REGIONS['eu-west'].label).toContain('Helsinki')
  })
})

describe('PLAN_PRICES', () => {
  it('has entries for all plan keys', () => {
    expect('starter' in PLAN_PRICES).toBe(true)
    expect('pro' in PLAN_PRICES).toBe(true)
    expect('business' in PLAN_PRICES).toBe(true)
  })

  it('reads the shared plan price getters from env', () => {
    process.env.STRIPE_PRICE_STARTER = 'price_starter'
    process.env.STRIPE_PRICE_PRO = 'price_pro'
    process.env.STRIPE_PRICE_BUSINESS = 'price_business'

    expect(PLAN_PRICES.starter).toBe('price_starter')
    expect(PLAN_PRICES.pro).toBe('price_pro')
    expect(PLAN_PRICES.business).toBe('price_business')
  })
})
