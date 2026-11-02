// The panel's chat client (contract C2): POSTs the question and reads the answer's body as Server-Sent Events up to
// `complete`. PimcoreAgentBundle's agent server writes the whole turn into that response
// (agent-server/src/routes/sse-helpers.ts), and so does the replay route of this bundle, so the portal needs no
// Mercure. Every `data:` line holds one AgentEvent (agent-server/src/types/events.ts on 2026.3); only the types the
// panel shows pass, each checked field by field. Everything else is dropped, never shown raw.

/** The AgentEvents the panel uses. `ts` and `seq`, which the server adds, are kept but not read. */
export type AgentEvent =
  | { type: 'turn-started', messageId: string, agentName?: string }
  | { type: 'text-delta', text: string }
  | { type: 'widget', widgetType: string, data: Record<string, unknown> }
  | { type: 'system-notice', messageKey: string, params?: Record<string, unknown> }
  | { type: 'error', message: string }
  | { type: 'turn-ended', status: string }
  | { type: 'complete' }

/**
 * How a chat request ended: `complete` arrived (complete), the portal wants a new login (auth), the assistant could
 * not answer to the end (unavailable), or the panel stopped it (aborted).
 */
export type ChatOutcome = { kind: 'complete' } | { kind: 'auth' } | { kind: 'unavailable' } | { kind: 'aborted' }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** One parsed `data:` value as an AgentEvent the panel knows, or null (unknown type, wrong fields). */
export function toAgentEvent (value: unknown): AgentEvent | null {
  if (!isRecord(value)) return null
  const v = value
  switch (v.type) {
    case 'turn-started':
      return typeof v.messageId === 'string' ? v as AgentEvent : null
    case 'text-delta':
      return typeof v.text === 'string' ? v as AgentEvent : null
    case 'widget':
      return typeof v.widgetType === 'string' && isRecord(v.data) ? v as AgentEvent : null
    case 'system-notice':
      return typeof v.messageKey === 'string' && (v.params === undefined || isRecord(v.params)) ? v as AgentEvent : null
    case 'error':
      return typeof v.message === 'string' ? v as AgentEvent : null
    case 'turn-ended':
      return typeof v.status === 'string' ? v as AgentEvent : null
    case 'complete':
      return v as AgentEvent
    default:
      return null
  }
}

/**
 * An incremental SSE parser: feed() takes the decoded text as it arrives, in pieces of any size, and returns the
 * events completed by it. An event ends at a blank line; its `data:` lines are joined with "\n" (the SSE rules);
 * comments and the other fields (event, id, retry) are ignored. An event the stream cuts off is never returned.
 */
export function createSseParser (): { feed: (text: string) => AgentEvent[] } {
  let buffer = ''
  let data: string[] = []

  const dispatch = (out: AgentEvent[]): void => {
    if (data.length === 0) return
    const payload = data.join('\n')
    data = []
    try {
      const event = toAgentEvent(JSON.parse(payload))
      if (event !== null) out.push(event)
    } catch {
      // malformed JSON: dropped
    }
  }

  return {
    feed (text: string): AgentEvent[] {
      buffer += text
      const out: AgentEvent[] = []
      // a line ends at \n, \r\n or \r; a trailing \r waits for the next piece, it may be the start of \r\n
      let match: RegExpExecArray | null
      const lineEnd = /\r\n|\n|\r(?=[^\n])/g
      let start = 0
      while ((match = lineEnd.exec(buffer)) !== null) {
        const line = buffer.slice(start, match.index)
        start = match.index + match[0].length
        if (line === '') { dispatch(out); continue }
        if (line.startsWith(':')) continue
        const colon = line.indexOf(':')
        const field = colon === -1 ? line : line.slice(0, colon)
        let value = colon === -1 ? '' : line.slice(colon + 1)
        if (value.startsWith(' ')) value = value.slice(1)
        if (field === 'data') data.push(value)
      }
      buffer = buffer.slice(start)
      return out
    }
  }
}

export interface ChatRequest {
  chatUrl: string
  message: string
  sessionId?: string
  /** Aborts the request and the stream: the panel's Escape and close. */
  signal?: AbortSignal
  /** Called with every event as soon as it is read. */
  onEvent: (event: AgentEvent) => void
  /** For tests; the browser's fetch by default. */
  fetchImpl?: typeof fetch
}

/** The outcome a response stands for before its body is read, or null when it is the event stream. */
function failureOf (response: Response): ChatOutcome | null {
  // redirect: 'manual' turns a redirect into an opaque response; a 3xx or a followed redirect is the login page
  if (response.type === 'opaqueredirect' || response.redirected || (response.status >= 300 && response.status < 400)) return { kind: 'auth' }
  if (response.status === 401 || response.status === 403) return { kind: 'auth' }
  if (!response.ok || response.body === null) return { kind: 'unavailable' }
  if (!(response.headers.get('Content-Type') ?? '').toLowerCase().includes('text/event-stream')) return { kind: 'unavailable' }
  return null
}

/** POSTs the question and streams the answer's events to onEvent until `complete`. Never throws. */
export async function streamChat ({ chatUrl, message, sessionId, signal, onEvent, fetchImpl }: ChatRequest): Promise<ChatOutcome> {
  // a function, not a narrowed property: the signal changes while the stream is read
  const isAborted = (): boolean => signal?.aborted === true
  const aborted = (): ChatOutcome => ({ kind: isAborted() ? 'aborted' : 'unavailable' })
  let response: Response
  try {
    response = await (fetchImpl ?? globalThis.fetch)(chatUrl, {
      method: 'POST',
      credentials: 'include',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify(sessionId === undefined ? { message } : { message, sessionId }),
      signal
    })
  } catch {
    return aborted()
  }

  const failure = failureOf(response)
  if (failure !== null) {
    response.body?.cancel().catch(() => {})
    return failure
  }

  const reader = (response.body as ReadableStream<Uint8Array>).getReader()
  const stop = (): void => { reader.cancel().catch(() => {}) }
  signal?.addEventListener('abort', stop, { once: true })
  const decoder = new TextDecoder()
  const parser = createSseParser()
  try {
    while (true) {
      if (isAborted()) { stop(); return { kind: 'aborted' } }
      const { done, value } = await reader.read()
      const text = done ? decoder.decode() : decoder.decode(value, { stream: true })
      for (const event of parser.feed(text)) {
        if (isAborted()) { stop(); return { kind: 'aborted' } }
        onEvent(event)
        if (event.type === 'complete') { stop(); return { kind: 'complete' } }
      }
      if (isAborted()) { stop(); return { kind: 'aborted' } }
      // the stream ended without `complete`: the turn did not finish
      if (done) return { kind: 'unavailable' }
    }
  } catch {
    return aborted()
  } finally {
    signal?.removeEventListener('abort', stop)
  }
}
