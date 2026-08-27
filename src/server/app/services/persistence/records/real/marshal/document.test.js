import { describe, expect, it } from 'vitest'

import { marshal } from './document.js'

const FROZEN_PARTIES = {
  consignor: { addressId: 'astra-rosales', name: 'Astra Rosales' }
}

const wireDocument = (overrides = {}) => ({
  referenceNumber: 'GBN-AG-26-ABC123',
  status: 'DRAFT',
  created: '2026-07-23T09:00:00',
  submittedAt: null,
  concurrencyToken: 0,
  fulfilments: [],
  ...overrides
})

describe('the real records marshal', () => {
  it('Should carry the frozen parties for a submitted notification', () => {
    const record = marshal(
      wireDocument({
        status: 'SUBMITTED',
        submittedAt: '2026-08-01T10:00:00',
        submittedBaseline: FROZEN_PARTIES
      })
    )

    expect(record.frozenParties).toEqual(FROZEN_PARTIES)
  })

  it('Should carry no frozen parties for a draft or an amendment', () => {
    // Both are meant to reflect address-book edits, so they resolve live and
    // must not be handed a freeze to render instead.
    expect(marshal(wireDocument({ status: 'DRAFT' })).frozenParties).toBeNull()
    expect(
      marshal(
        wireDocument({ status: 'AMEND', submittedBaseline: FROZEN_PARTIES })
      ).frozenParties
    ).toBeNull()
  })

  it('Should tolerate a submitted notification with no freeze on it', () => {
    // Submitted before the freeze existed. The controller falls back to a live
    // resolve, so null has to travel rather than undefined leaking through.
    const record = marshal(
      wireDocument({ status: 'SUBMITTED', submittedAt: '2026-08-01T10:00:00' })
    )

    expect(record.frozenParties).toBeNull()
  })
})
