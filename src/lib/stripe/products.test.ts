import { describe, expect, it } from 'vitest'
import { PLAN_PRICES } from './products'

describe('PLAN_PRICES', () => {
  it('reads plan price ids from env getters', () => {
    process.env.STRIPE_PRICE_STARTER = 'price_starter'
    process.env.STRIPE_PRICE_PRO = 'price_pro'
    process.env.STRIPE_PRICE_BUSINESS = 'price_business'

    expect(PLAN_PRICES.starter).toBe('price_starter')
    expect(PLAN_PRICES.pro).toBe('price_pro')
    expect(PLAN_PRICES.business).toBe('price_business')
  })

  it('falls back to empty strings when env vars are missing', () => {
    delete process.env.STRIPE_PRICE_STARTER
    delete process.env.STRIPE_PRICE_PRO
    delete process.env.STRIPE_PRICE_BUSINESS

    expect(PLAN_PRICES.starter).toBe('')
    expect(PLAN_PRICES.pro).toBe('')
    expect(PLAN_PRICES.business).toBe('')
  })
})
