import React, { useEffect, useState } from 'react'
import { Alert, Button, Form, Input, Segmented, TextArea } from '@pimcore/portal-ui-kit/components'
import { Panel } from '@pimcore/portal-ui-kit/ui'
import {
  CHANGE_LABEL, COMMENT_LABEL, MAX_COMMENT, PASS_CODE_LABEL, PASS_HINT, PASS_NUMBER_LABEL, SCORE_CHOICES,
  SCORE_LABEL, SEND_LABEL, changeScore, commentCounter, formState, question, readRideAnswer, readSendAnswer,
  screamScoreUrl, sendBody, type PanelState, type RideAnswer, type Typed
} from './scream-score-model'

/** The JSON of an answer, or undefined when it has none (a proxy's HTML error page, an empty body). */
async function jsonOf (response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return undefined
  }
}

/** The ride and its CSRF token, from the endpoint's GET; undefined while it loads. */
function useRide (url: string): RideAnswer | undefined {
  const [ride, setRide] = useState<RideAnswer | undefined>(undefined)
  useEffect(() => {
    let live = true
    setRide(undefined)
    fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(async (response) => readRideAnswer(response.status, await jsonOf(response)))
      .catch(() => readRideAnswer(0, undefined))
      .then((answer) => { if (live) setRide(answer) })
      .catch(() => {})
    return () => { live = false }
  }, [url])
  return ride
}

const SCORE_OPTIONS = SCORE_CHOICES.map((choice) => ({
  value: String(choice.value),
  label: String(choice.value),
  title: choice.label === null ? String(choice.value) : `${choice.value}, ${choice.label}`
}))

/**
 * The scream-score panel's body (its own chunk, loaded by ScreamScorePanel.tsx): the question, the ten scores, the
 * comment with its counter, the pass number and code, and Send; after a valid send the thanks in place, with
 * "Change my scream score". Talks to F324's endpoint only, with the share page's own session: nothing needs an account.
 */
export default function ScreamScoreForm ({ hash, assetId }: { hash: string, assetId: number | string }): React.JSX.Element | null {
  const url = screamScoreUrl(hash, assetId)
  const ride = useRide(url)
  const [state, setState] = useState<PanelState>(formState())
  const [sending, setSending] = useState(false)

  if (ride === undefined) return null
  // a 404: no coaster, or the share is unknown or expired; the portal's own detail says the rest
  if (ride.kind === 'none') return null
  if (ride.kind === 'error') {
    return <Panel title="Scream score"><Alert type="warning" showIcon message={ ride.message } /></Panel>
  }

  const typed = state.typed
  const edit = (change: Partial<Typed>): void => {
    if (state.kind === 'form') setState({ ...state, typed: { ...typed, ...change } })
  }

  const send = (): void => {
    setSending(true)
    fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: sendBody(typed, ride.token)
    })
      .then(async (response) => readSendAnswer(response.status, await jsonOf(response), typed))
      .catch(() => readSendAnswer(0, undefined, typed))
      .then((next) => { setState(next); setSending(false) })
      .catch(() => { setSending(false) })
  }

  if (state.kind === 'thanks') {
    return (
      <Panel title={ question(ride.name) } data-testid="scream-score-thanks">
        <Alert
          type="success"
          showIcon
          role="status"
          message={ state.thanks }
          description={ state.replaced ?? undefined }
        />
        <div style={ { marginTop: 'var(--p-space-md)' } }>
          <Button onClick={ () => { setState(changeScore(state)) } }>{ CHANGE_LABEL }</Button>
        </div>
      </Panel>
    )
  }

  return (
    <Panel title={ question(ride.name) } data-testid="scream-score-panel">
      { state.notice !== null && (
        <div style={ { marginBottom: 'var(--p-space-md)' } }>
          <Alert type="error" showIcon role="alert" message={ state.notice } />
        </div>
      ) }
      <Form layout="vertical" onFinish={ send } requiredMark={ false }>
        <Form.Item
          label={ SCORE_LABEL }
          validateStatus={ state.errors.score !== undefined ? 'error' : undefined }
          help={ state.errors.score ?? `${SCORE_CHOICES[0].value} ${SCORE_CHOICES[0].label ?? ''} · ${SCORE_CHOICES[SCORE_CHOICES.length - 1].value} ${SCORE_CHOICES[SCORE_CHOICES.length - 1].label ?? ''}` }
        >
          <Segmented
            // small and as wide as its numbers (not block, which gives every item the same width): all ten stay
            // readable at phone width (390 px), "10" too
            size="small"
            aria-label={ SCORE_LABEL }
            options={ SCORE_OPTIONS }
            value={ typed.score === null ? '' : String(typed.score) }
            onChange={ (value) => { edit({ score: Number(value) }) } }
          />
        </Form.Item>
        <Form.Item
          label={ COMMENT_LABEL }
          htmlFor="scream-score-comment"
          validateStatus={ state.errors.comment !== undefined ? 'error' : undefined }
          help={ state.errors.comment ?? commentCounter(typed.comment) }
        >
          <TextArea
            id="scream-score-comment"
            rows={ 3 }
            maxLength={ MAX_COMMENT }
            value={ typed.comment }
            onChange={ (e) => { edit({ comment: e.target.value }) } }
          />
        </Form.Item>
        <Form.Item label={ PASS_NUMBER_LABEL } htmlFor="scream-score-pass-number">
          <Input
            id="scream-score-pass-number"
            placeholder="PK-2026-0001"
            autoComplete="off"
            autoCapitalize="characters"
            value={ typed.passNumber }
            status={ state.errors.pass !== undefined ? 'error' : undefined }
            onChange={ (e) => { edit({ passNumber: e.target.value }) } }
          />
        </Form.Item>
        <Form.Item
          label={ PASS_CODE_LABEL }
          htmlFor="scream-score-pass-code"
          validateStatus={ state.errors.pass !== undefined ? 'error' : undefined }
          help={ state.errors.pass ?? PASS_HINT }
        >
          <Input
            id="scream-score-pass-code"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={ false }
            value={ typed.passCode }
            onChange={ (e) => { edit({ passCode: e.target.value }) } }
          />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={ sending }>{ SEND_LABEL }</Button>
      </Form>
    </Panel>
  )
}
