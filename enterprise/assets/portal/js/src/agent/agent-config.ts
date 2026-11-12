// The panel's config (contract C1), handed over by src/Portal/StudioExampleEnterprisePortalPlugin.php's
// getFrontendConfig() as config('studio-example-enterprise').agent. Without it there is no button. Kept free of
// imports: AskBriefButton.tsx loads it at the portal's start-up.

export interface AgentConfig {
  /** Where the panel POSTs the question; the answer is a PimcoreAgentBundle event stream. */
  chatUrl: string
  /** The button's text. */
  label: string
  /** replay (the recorded turn, today) or live (the agent server, later). Informational: the badge comes from the stream. */
  mode: 'replay' | 'live'
}

export const DEFAULT_LABEL = 'Ask the brief'

/** The agent part of the plugin's config, or null when there is none (no button). */
export function agentConfigOf (pluginConfig: unknown): AgentConfig | null {
  if (typeof pluginConfig !== 'object' || pluginConfig === null) return null
  const agent = (pluginConfig as { agent?: unknown }).agent
  if (typeof agent !== 'object' || agent === null) return null
  const { chatUrl, label, mode } = agent as Record<string, unknown>
  if (typeof chatUrl !== 'string' || chatUrl === '') return null

  return {
    chatUrl,
    label: typeof label === 'string' && label !== '' ? label : DEFAULT_LABEL,
    mode: mode === 'live' ? 'live' : 'replay'
  }
}
