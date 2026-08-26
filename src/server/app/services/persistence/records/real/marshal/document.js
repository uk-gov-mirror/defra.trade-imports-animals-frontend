import { SUBMITTED } from '../../../../../engine/persistence/records.js'
import { decodePersistedFulfilment } from '../../fulfilment-codec/index.js'
import { mapStatus } from '../status.js'

export const marshal = (document) => {
  const status = mapStatus(document.status)
  return {
    journeyId: document.referenceNumber,
    status,
    createdAt: document.created ?? null,
    submittedAt: status === SUBMITTED ? (document.submittedAt ?? null) : null,
    concurrencyToken: document.concurrencyToken ?? null,
    // The parties as they stood at submit. Carried only for a submitted
    // notification, which renders from them instead of resolving its address
    // references live. A draft or an in-flight amendment is meant to reflect
    // address edits, so it resolves and this stays null.
    frozenParties:
      status === SUBMITTED ? (document.submittedBaseline ?? null) : null,
    // Engine-facing key stays as `fulfilment` (a UUID-keyed map);
    // wire read uses the renamed `fulfilments` list. See follow-up ticket for
    // the engine-facing rename.
    fulfilment: decodePersistedFulfilment(document.fulfilments)
  }
}
