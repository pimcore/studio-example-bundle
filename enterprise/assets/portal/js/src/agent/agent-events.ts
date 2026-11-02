// One question and its answer as the panel shows it (contracts C2, C3), built from the stream's events by a pure
// reducer: AskBriefPanel.tsx keeps a list of turns and renders each one. Everything in a turn is plain data;
// text stays a string for React to render as a text node, never as HTML.
import type { AgentEvent, ChatOutcome } from './agent-stream'

/** The notice the replay route sends before turn-started: this answer was recorded, not generated now. */
export const RECORDED_NOTICE_KEYS = ['recorded', 'agent.recorded']

export type Failure = 'auth' | 'unavailable'

/** What the panel says when a turn fails; both come with a retry. */
export const FAILURE_TEXT: Record<Failure, string> = {
  auth: 'Please sign in again',
  unavailable: 'The assistant is not available'
}

export interface Widget {
  widgetType: string
  data: Record<string, unknown>
}

export interface Turn {
  question: string
  /** waiting: sent, no text yet (typing indicator); streaming: text arrives; done; failed; cancelled: closed by the user */
  status: 'waiting' | 'streaming' | 'done' | 'failed' | 'cancelled'
  /** The answer so far, the text-deltas joined. */
  text: string
  /** The stream carried the recorded notice: the bubble shows the "recorded" badge. */
  recorded: boolean
  widgets: Widget[]
  /** The messages of `error` events, each an inline error bubble. */
  errors: string[]
  failure: Failure | null
}

export function startTurn (question: string): Turn {
  return { question, status: 'waiting', text: '', recorded: false, widgets: [], errors: [], failure: null }
}

export const isRunning = (turn: Turn): boolean => turn.status === 'waiting' || turn.status === 'streaming'

/** The turn after one event of its stream. turn-started, turn-ended and complete change nothing visible. */
export function reduceTurn (turn: Turn, event: AgentEvent): Turn {
  switch (event.type) {
    case 'system-notice':
      return RECORDED_NOTICE_KEYS.includes(event.messageKey) ? { ...turn, recorded: true } : turn
    case 'text-delta':
      return { ...turn, text: turn.text + event.text, status: turn.status === 'waiting' ? 'streaming' : turn.status }
    case 'widget':
      return { ...turn, widgets: [...turn.widgets, { widgetType: event.widgetType, data: event.data }] }
    case 'error':
      return { ...turn, errors: [...turn.errors, event.message] }
    default:
      return turn
  }
}

/** The turn once its request has ended. */
export function finishTurn (turn: Turn, outcome: ChatOutcome): Turn {
  switch (outcome.kind) {
    case 'complete':
      return { ...turn, status: 'done' }
    case 'aborted':
      return { ...turn, status: 'cancelled' }
    default:
      return { ...turn, status: 'failed', failure: outcome.kind }
  }
}

/**
 * A widget's line of plain text until its own card exists (the Supplier note card is F130's): its `text` or
 * `summary`, or null for a widget without one.
 */
export function widgetText (widget: Widget): string | null {
  for (const key of ['text', 'summary']) {
    const value = widget.data[key]
    if (typeof value === 'string' && value !== '') return value
  }
  return null
}
