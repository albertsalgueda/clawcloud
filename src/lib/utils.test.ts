import { describe, it, expect, vi, afterEach } from 'vitest'
import { cn, slugify, generateSlug, formatCurrency, formatDate } from './utils'

describe('utils', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('merges class names with tailwind conflict resolution', () => {
    expect(cn('px-2', 'px-4', { hidden: false, block: true })).toBe('px-4 block')
  })

  it('slugifies mixed text into a URL-safe value', () => {
    expect(slugify(' Hello, Claw Cloud! 2026 ')).toBe('hello-claw-cloud-2026')
  })

  it('generates a slug with a random suffix', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789)

    expect(generateSlug('My Instance')).toBe('my-instance-4fzzzx')
  })

  it('formats currency using the provided currency code', () => {
    expect(formatCurrency(12.5, 'EUR')).toBe('EUR 12.50')
  })

  it('formats a date consistently', () => {
    expect(formatDate('2026-03-17T12:34:56Z')).toBe('Mar 17, 2026')
  })
})
