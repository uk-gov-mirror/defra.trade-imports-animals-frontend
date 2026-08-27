import { describe, expect, it } from 'vitest'

import { frozenPartiesOf } from './frozen-parties.js'

const CONSIGNOR_NAME = 'Astra Rosales'

const frozenParty = (name, extra = {}) => ({
  addressId: 'astra-rosales',
  name,
  phone: '+41 22 000 0000',
  email: 'astra@example.com',
  address: {
    addressLine1: '43 East Hague Extension',
    addressLine2: null,
    townOrCity: 'Vernier',
    county: 'Soleure',
    postcode: '30055',
    countryCode: 'CH'
  },
  ...extra
})

describe('frozenPartiesOf', () => {
  it('Should key the backend roles by the journey party ids the cards read', () => {
    const parties = frozenPartiesOf({
      placeOfOrigin: frozenParty('Origin Farm'),
      consignor: frozenParty(CONSIGNOR_NAME),
      consignee: frozenParty('Bramble Holdings'),
      importer: frozenParty('Cardinal Imports'),
      destination: frozenParty('Delta Abattoir'),
      consignment: frozenParty('Erin Contact')
    })

    expect(Object.keys(parties)).toEqual([
      'placeOfOrigin',
      'consignor',
      'consignee',
      'importer',
      'placeOfDestination',
      'contactAddress'
    ])
    // The two names the backend and the journey disagree on.
    expect(parties.placeOfDestination.name).toBe('Delta Abattoir')
    expect(parties.contactAddress.name).toBe('Erin Contact')
  })

  it('Should map the wire address block onto the shape the party row renders', () => {
    const { consignor } = frozenPartiesOf({
      consignor: frozenParty(CONSIGNOR_NAME)
    })

    expect(consignor).toEqual({
      id: 'astra-rosales',
      name: CONSIGNOR_NAME,
      address: {
        addressLine1: '43 East Hague Extension',
        addressLine2: null,
        townOrCity: 'Vernier',
        county: 'Soleure',
        // The API says postcode/countryCode; the journey renders
        // postalOrZipCode/country.
        postalOrZipCode: '30055',
        country: 'Switzerland',
        telephoneNumber: '+41 22 000 0000',
        emailAddress: 'astra@example.com'
      }
    })
  })

  it('Should fall back to the raw country code when it maps to no known country', () => {
    const { consignor } = frozenPartiesOf({
      consignor: frozenParty(CONSIGNOR_NAME, {
        address: { countryCode: 'ZZ' }
      })
    })

    expect(consignor.address.country).toBe('ZZ')
  })

  it('Should leave a role the notification never carried undefined', () => {
    const parties = frozenPartiesOf({ consignor: frozenParty(CONSIGNOR_NAME) })

    // Undefined renders as "not provided", exactly like an unanswered party.
    expect(parties.importer).toBeUndefined()
    expect(parties.placeOfDestination).toBeUndefined()
  })

  it('Should render a frozen party that carries only a name', () => {
    // placeOfOrigin and the consignment contact are entered inline in the
    // journey, so a freeze can hold a party with no address block and no
    // addressId behind it. It still has to render rather than throw.
    const { consignor } = frozenPartiesOf({ consignor: { name: 'Bare Name' } })

    expect(consignor.name).toBe('Bare Name')
    expect(consignor.id).toBeNull()
    // An address block is still built, just an empty one — the party row reads
    // it unconditionally, so a missing block must not blow up the render.
    expect(Object.values(consignor.address).filter(Boolean)).toEqual([])
  })

  it('Should treat a nameless party as not provided', () => {
    const parties = frozenPartiesOf({ consignor: { addressId: 'orphan' } })

    expect(parties.consignor).toBeUndefined()
  })

  it('Should return every role unprovided when there is no freeze at all', () => {
    // Still every key, so a caller destructuring by party id gets the same
    // shape it would from a resolve that found nothing.
    const parties = frozenPartiesOf(undefined)

    expect(Object.keys(parties)).toEqual([
      'placeOfOrigin',
      'consignor',
      'consignee',
      'importer',
      'placeOfDestination',
      'contactAddress'
    ])
    expect(Object.values(parties).filter(Boolean)).toEqual([])
  })
})
