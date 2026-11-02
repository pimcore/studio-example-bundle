import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Alert, Button, Input, Tag } from '@pimcore/portal-ui-kit/components'
import { Panel } from '@pimcore/portal-ui-kit/ui'
import type { AgentConfig } from './agent-config'
import { FAILURE_TEXT, finishTurn, isRunning, reduceTurn, startTurn, widgetText, type Turn } from './agent-events'
import { streamChat } from './agent-stream'

interface AskBriefPanelProps {
  agent: AgentConfig
  onClose: () => void
}

// Own overlay (the portal SDK has no Drawer): a sheet on the right, the full width on a phone. Tokens only.
const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end', background: 'rgba(0, 0, 0, 0.25)'
}
const sheetStyle: React.CSSProperties = {
  width: 'min(440px, 100vw)', height: '100%', boxSizing: 'border-box', padding: 'var(--p-space-sm)',
  background: 'var(--p-bg-container)', boxShadow: 'var(--p-elevation-tile)', display: 'flex', flexDirection: 'column'
}
const logStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 'var(--p-space-sm)', minHeight: '40vh', maxHeight: 'calc(100dvh - 180px)', overflowY: 'auto'
}
const bubbleStyle: React.CSSProperties = {
  padding: 'var(--p-space-xs) var(--p-space-sm)', borderRadius: 'var(--p-radius-lg)', whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere', color: 'var(--p-text)', fontSize: 'var(--p-font-size)'
}
const questionStyle: React.CSSProperties = { ...bubbleStyle, alignSelf: 'flex-end', maxWidth: '85%', background: 'var(--p-primary-bg)' }
const answerStyle: React.CSSProperties = { ...bubbleStyle, alignSelf: 'flex-start', maxWidth: '95%', background: 'var(--p-bg-layout)' }
const quietStyle: React.CSSProperties = { color: 'var(--p-text-secondary)', fontSize: 'var(--p-font-size-sm)' }
const badgeRowStyle: React.CSSProperties = { marginBottom: 'var(--p-space-xxs)' }
const askRowStyle: React.CSSProperties = { display: 'flex', gap: 'var(--p-space-xs)', marginTop: 'var(--p-space-sm)' }

/**
 * The "Ask the brief" panel: a dialog over the page that sends the supplier's question to agent.chatUrl and streams
 * the answer in. Everything the agent sends is rendered as plain text. Escape, the close button or a click beside
 * the sheet close it, and closing aborts a running request.
 */
export default function AskBriefPanel ({ agent, onClose }: AskBriefPanelProps): React.JSX.Element {
  const [turns, setTurns] = useState<Turn[]>([])
  const [question, setQuestion] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const running = turns.some(isRunning)
  const titleId = 'studio-example-enterprise-ask-brief-title'

  const close = useCallback(() => {
    abortRef.current?.abort()
    onClose()
  }, [onClose])

  // Escape closes the panel wherever the focus is
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') { event.preventDefault(); close() }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey) }
  }, [close])
  // unmounting aborts too (the portal navigates away)
  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  const ask = (text: string): void => {
    const message = text.trim()
    if (message === '') return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const updateLast = (change: (turn: Turn) => Turn): void => {
      setTurns((list) => list.length === 0 ? list : [...list.slice(0, -1), change(list[list.length - 1])])
    }
    setTurns((list) => [...list, startTurn(message)])
    setQuestion('')
    void streamChat({
      chatUrl: agent.chatUrl,
      message,
      signal: controller.signal,
      onEvent: (event) => { updateLast((turn) => reduceTurn(turn, event)) }
    }).then((outcome) => {
      if (abortRef.current === controller) abortRef.current = null
      updateLast((turn) => finishTurn(turn, outcome))
    })
  }

  // a failed turn is asked again in its place
  const retry = (turn: Turn): void => {
    setTurns((list) => list.filter((t) => t !== turn))
    ask(turn.question)
  }

  return createPortal(
    <div style={ overlayStyle } onMouseDown={ (event) => { if (event.target === event.currentTarget) close() } }>
      <div role="dialog" aria-modal="true" aria-labelledby={ titleId } data-agent-panel style={ sheetStyle }>
        <Panel
          title={ <span id={ titleId }>{ agent.label }</span> }
          extra={ <Button onClick={ close } aria-label="Close">Close</Button> }
        >
          <div style={ logStyle }>
            { turns.length === 0 && (
              <p style={ quietStyle }>Ask about the brief and your revisions, e.g. "Does my latest Thunder Loop revision meet the brief?"</p>
            ) }
            { turns.map((turn, index) => (
              <React.Fragment key={ index }>
                <div style={ questionStyle }>{ turn.question }</div>
                <div style={ answerStyle } aria-live="polite" aria-busy={ isRunning(turn) } data-agent-turn={ turn.status }>
                  { turn.recorded && (
                    <div data-agent-badge="recorded" style={ badgeRowStyle }><Tag color="default">recorded</Tag></div>
                  ) }
                  { turn.status === 'waiting' && <span style={ quietStyle } aria-label="The assistant is typing">…</span> }
                  <span data-agent-text>{ turn.text }</span>
                  { turn.widgets.map((widget, w) => {
                    const line = widgetText(widget)
                    return line === null
                      ? null
                      : <div key={ w } data-agent-widget={ widget.widgetType } style={ quietStyle }>{ widgetText(widget) }</div>
                  }) }
                </div>
                { turn.errors.map((message, e) => (
                  <Alert key={ e } type="error" showIcon message={ message } />
                )) }
                { turn.failure !== null && (
                  <Alert
                    type="warning"
                    showIcon
                    data-agent-failure={ turn.failure }
                    message={ FAILURE_TEXT[turn.failure] }
                    action={ <Button onClick={ () => { retry(turn) } }>Retry</Button> }
                  />
                ) }
              </React.Fragment>
            )) }
          </div>
          <div style={ askRowStyle }>
            <Input
              autoFocus
              aria-label="Your question"
              placeholder="Your question"
              value={ question }
              disabled={ running }
              maxLength={ 2000 }
              onChange={ (event) => { setQuestion(event.target.value) } }
              onPressEnter={ () => { if (!running) ask(question) } }
            />
            <Button type="primary" disabled={ running || question.trim() === '' } onClick={ () => { ask(question) } }>Ask</Button>
          </div>
        </Panel>
      </div>
    </div>,
    document.body
  )
}
