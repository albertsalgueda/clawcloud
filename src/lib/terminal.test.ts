import { describe, expect, it } from 'vitest'
import { getInstanceTerminalConnection } from './terminal'

describe('getInstanceTerminalConnection', () => {
  it('prefers the proxied terminal route when the dashboard URL is available', () => {
    expect(
      getInstanceTerminalConnection({
        dashboard_url: 'https://demo.example.com/',
        ip_address: '203.0.113.10',
      }),
    ).toEqual({
      preferredUrl: 'https://demo.example.com/terminal/',
      proxiedUrl: 'https://demo.example.com/terminal/',
      directUrl: 'http://203.0.113.10:7681',
      mode: 'proxied',
    })
  })

  it('falls back to the raw ttyd port when there is no dashboard URL yet', () => {
    expect(
      getInstanceTerminalConnection({
        dashboard_url: null,
        ip_address: '203.0.113.10',
      }),
    ).toEqual({
      preferredUrl: 'http://203.0.113.10:7681',
      proxiedUrl: null,
      directUrl: 'http://203.0.113.10:7681',
      mode: 'direct',
    })
  })

  it('returns an unavailable state when no terminal endpoint exists', () => {
    expect(
      getInstanceTerminalConnection({
        dashboard_url: null,
        ip_address: null,
      }),
    ).toEqual({
      preferredUrl: null,
      proxiedUrl: null,
      directUrl: null,
      mode: 'unavailable',
    })
  })
})
