import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { store } from '../../../../../../engine/store.js'
import {
  configureRecords,
  SUBMITTED
} from '../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import { journeyRequest, stubH } from '../../../../../../engine/test-support.js'
import { routes } from './controller.js'

const getHandler = routes.find((route) => route.method === 'GET').handler

const FROZEN_NAME = 'Frozen At Submit Ltd'
const LIVE_NAME = 'Astra Rosales'
const ROLES_AND_ADDRESSES = 'Roles and addresses'

const frozenConsignor = {
  consignor: {
    addressId: 'astra-rosales',
    name: FROZEN_NAME,
    phone: '01228 555 0104',
    email: 'frozen@example.co.uk',
    address: {
      addressLine1: '9 Freeze Lane',
      townOrCity: 'Carlisle',
      county: 'Cumbria',
      postcode: 'CA1 3CC',
      countryCode: 'GB'
    }
  }
}

/** A records adapter that serves `frozenParties` on a submitted journey, the way
 * the real one does once the backend has frozen them at submit. The stub adapter
 * deliberately does not freeze (see stub/marshal/document.js), so this branch of
 * the controller is unreachable through the stub alone. */
const recordsServingFrozenParties = {
  ...recordsStub,
  load: async (query) => {
    const journey = await recordsStub.load(query)
    return journey?.status === SUBMITTED
      ? { ...journey, frozenParties: frozenConsignor }
      : journey
  }
}

const consignorValueOf = (view) => {
  const card = view.context.sections
    .flatMap((section) => section.groups.flatMap((group) => group.cards))
    .find((entry) => entry.title === ROLES_AND_ADDRESSES)
  return card.rows.find((row) => row.key.text === 'Consignor')?.value
}

const renderSubmitted = async () => {
  const journey = await store.create()
  await store.submit(journey.journeyId)
  const h = stubH()
  await getHandler(journeyRequest(journey.journeyId), h)
  return h.captured.view
}

describe('check your answers — where a submitted notification gets its parties', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
  })

  beforeEach(() => store.clear())
  afterAll(() => configureRecords(recordsStub))

  it('Should render the frozen parties for a submitted notification', async () => {
    configureRecords(recordsServingFrozenParties)

    const value = consignorValueOf(await renderSubmitted())

    // Rendered from the freeze, with no address-book lookup behind it.
    expect(value.html).toContain(FROZEN_NAME)
    expect(value.html).toContain('Carlisle')
    expect(value.html).toContain('CA1 3CC')
    expect(value.html).not.toContain(LIVE_NAME)
  })

  it('Should fall back to resolving live when the notification carries no freeze', async () => {
    // A notification submitted before the freeze existed, or served by an
    // adapter that does not carry it. The page must still render rather than
    // showing every party as blank.
    configureRecords(recordsStub)

    const value = consignorValueOf(await renderSubmitted())

    expect(value.html ?? value.text).toBeDefined()
    expect(value.html ?? value.text).not.toContain(FROZEN_NAME)
  })
})
