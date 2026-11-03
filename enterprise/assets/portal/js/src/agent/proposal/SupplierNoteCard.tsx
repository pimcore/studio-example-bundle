import React, { useRef, useState } from 'react'
import { Alert, Button } from '@pimcore/portal-ui-kit/components'
import { Panel } from '@pimcore/portal-ui-kit/ui'
import { cardTitle, confirmDisabled, createProposalController, PENDING_CARD, type ProposalCard, type SupplierNote } from './proposal'

interface SupplierNoteCardProps {
  note: SupplierNote
}

const noteStyle: React.CSSProperties = {
  margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', color: 'var(--p-text)', fontSize: 'var(--p-font-size)'
}
const actionsStyle: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 'var(--p-space-xs)', marginTop: 'var(--p-space-sm)' }
const doneStyle: React.CSSProperties = { marginTop: 'var(--p-space-sm)' }

/**
 * The agent's proposal "Add note to rev<n>" in the panel: the note's text, Confirm (writes the Supplier note through
 * F129's confirm route) and Dismiss (hides the card, nothing is written). The text is a React text node.
 */
export default function SupplierNoteCard ({ note }: SupplierNoteCardProps): React.JSX.Element | null {
  const [card, setCard] = useState<ProposalCard>(PENDING_CARD)
  const [dismissed, setDismissed] = useState(false)
  const controller = useRef<ReturnType<typeof createProposalController> | null>(null)
  if (controller.current === null) {
    controller.current = createProposalController({ proposalId: note.proposalId, onChange: setCard })
  }
  const confirm = (): void => { void controller.current?.confirm() }

  if (dismissed) return null

  const open = card.state === 'pending' || card.state === 'confirming'
  return (
    <div data-agent-proposal-state={ card.state } data-agent-proposal={ note.proposalId }>
      <Panel title={ cardTitle(note) }>
        <p style={ noteStyle }>{ note.text }</p>
        { open && (
          <div style={ actionsStyle }>
            <Button type="primary" loading={ card.state === 'confirming' } disabled={ confirmDisabled(card) } onClick={ confirm }>Confirm</Button>
            <Button disabled={ card.state === 'confirming' } onClick={ () => { setDismissed(true) } }>Dismiss</Button>
          </div>
        ) }
        { card.state === 'confirmed' && card.message !== null && (
          <Alert style={ doneStyle } type="success" showIcon message={ card.message } />
        ) }
        { card.state === 'failed' && card.message !== null && (
          <Alert
            style={ doneStyle }
            type="warning"
            showIcon
            message={ card.message }
            action={ card.retry
              ? <Button onClick={ confirm }>Retry</Button>
              : <Button onClick={ () => { setDismissed(true) } }>Dismiss</Button> }
          />
        ) }
      </Panel>
    </div>
  )
}
