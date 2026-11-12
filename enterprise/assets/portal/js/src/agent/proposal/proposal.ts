// The Supplier note card's logic (F130): which widget becomes a card, the confirm request to F129's route
// (src/Agent/Note/ConfirmController.php) and the card's states. Free of React, so the tests run it in Node;
// SupplierNoteCard.tsx renders it. The request carries only the proposal's id: the note's text lives on the server.

/** The widget F127's replay route sends when the agent proposes a Supplier note (src/Portal/Agent/ReplayPlayer.php). */
export const SUPPLIER_NOTE_WIDGET = 'kingdom-supplier-note'

/** The confirm route's path (config/pimcore/routing.yaml, pimcore_studio_example_enterprise_agent_proposal_confirm). */
const CONFIRM_PATH = '/studio-example-enterprise/agent/proposal/{id}/confirm'

/** F126's proposal ids: 32 lowercase hex, the route's own requirement; anything else never reaches a URL. */
const PROPOSAL_ID = /^[0-9a-f]{32}$/

/** The card's states, exposed as data-agent-proposal-state. */
export const PROPOSAL_STATES = ['pending', 'confirming', 'confirmed', 'failed'] as const
export type ProposalState = typeof PROPOSAL_STATES[number]

export interface SupplierNote {
  proposalId: string
  revision: number
  /** The note's text, shown as the preview; never sent back. */
  text: string
}

export interface ProposalCard {
  state: ProposalState
  /** What the card says under the note: null while pending or confirming. */
  message: string | null
  /** A failed card offers Retry (sign-in, server or network trouble); an expired proposal does not. */
  retry: boolean
}

export const CARD_TEXT = {
  added: 'Note added',
  already: 'Already added',
  expired: 'This proposal expired',
  auth: 'Please sign in again',
  unavailable: 'The note could not be added'
} as const

export const PENDING_CARD: ProposalCard = { state: 'pending', message: null, retry: false }

/** The note of a `kingdom-supplier-note` widget, or null for any other widget or a note that is not valid. */
export function supplierNoteOf (widget: { widgetType: string, data: Record<string, unknown> }): SupplierNote | null {
  if (widget.widgetType !== SUPPLIER_NOTE_WIDGET) return null
  const { proposalId, revision, text } = widget.data
  if (typeof proposalId !== 'string' || !PROPOSAL_ID.test(proposalId)) return null
  if (typeof revision !== 'number' || !Number.isInteger(revision) || revision < 1) return null
  if (typeof text !== 'string' || text.trim() === '') return null
  return { proposalId, revision, text }
}

export const cardTitle = (note: SupplierNote): string => `Add note to rev${note.revision}`

export const confirmUrlOf = (proposalId: string): string => CONFIRM_PATH.replace('{id}', proposalId)

/** Confirm can be pressed while the card is pending, or failed with a retry. */
export const confirmDisabled = (card: ProposalCard): boolean =>
  !(card.state === 'pending' || (card.state === 'failed' && card.retry))

/** The card after the confirm route answered with this response. */
export function cardOf (response: Pick<Response, 'status' | 'type' | 'redirected' | 'ok'>): ProposalCard {
  const { status } = response
  // redirect: 'manual' makes the login redirect an opaque response
  if (response.type === 'opaqueredirect' || response.redirected || (status >= 300 && status < 400) || status === 401 || status === 403) {
    return { state: 'failed', message: CARD_TEXT.auth, retry: true }
  }
  if (status === 409) return { state: 'confirmed', message: CARD_TEXT.already, retry: false }
  if (status === 404) return { state: 'failed', message: CARD_TEXT.expired, retry: false }
  if (response.ok) return { state: 'confirmed', message: CARD_TEXT.added, retry: false }
  return { state: 'failed', message: CARD_TEXT.unavailable, retry: true }
}

const NETWORK_FAILED: ProposalCard = { state: 'failed', message: CARD_TEXT.unavailable, retry: true }

export interface ProposalControllerOptions {
  proposalId: string
  /** Called with every new card. */
  onChange: (card: ProposalCard) => void
  /** For tests; the browser's fetch by default. */
  fetchImpl?: typeof fetch
}

/**
 * One card's confirm: confirm() sends the request once, and again only after a failure that offers a retry; a press
 * while it runs or after the note was added sends nothing.
 */
export function createProposalController ({ proposalId, onChange, fetchImpl }: ProposalControllerOptions): { card: () => ProposalCard, confirm: () => Promise<void> } {
  let card = PENDING_CARD
  const set = (next: ProposalCard): void => { card = next; onChange(next) }

  return {
    card: () => card,
    async confirm (): Promise<void> {
      if (confirmDisabled(card)) return
      set({ state: 'confirming', message: null, retry: false })
      let response: Response
      try {
        response = await (fetchImpl ?? globalThis.fetch)(confirmUrlOf(proposalId), {
          method: 'POST',
          credentials: 'include',
          redirect: 'manual',
          headers: { Accept: 'application/json' }
        })
      } catch {
        set(NETWORK_FAILED)
        return
      }
      response.body?.cancel().catch(() => {})
      set(cardOf(response))
    }
  }
}
