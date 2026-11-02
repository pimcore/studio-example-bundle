import type React from 'react'

/** What every icon of the set takes. */
export interface CoasterIconProps {
  /**
   * The icon's own name for screen readers, when no text stands next to it. Without one the icon is decorative
   * (aria-hidden): the visible label beside it says what it means.
   */
  label?: string
  /** Width and height in pixels; the drawing is on a 24 x 24 grid and scales. Default 18, the rail's icon size. */
  size?: number
}

/**
 * The frame of the plugin's own icons (README.md): an inline SVG on a 24 x 24 grid, drawn as 1.75 px lines in the
 * text colour around it (currentColor), so an icon takes the colour of the button, rail entry or label it sits in.
 * No script, no event attribute, no link: each icon is a few paths, made for this example (no third-party art).
 */
export function CoasterIcon ({ label, size = 18, children }: CoasterIconProps & { children: React.ReactNode }): React.JSX.Element {
  const a11y = label === undefined
    ? { 'aria-hidden': true, focusable: 'false' as const }
    : { role: 'img', 'aria-label': label }
  return (
    <svg
      width={ size }
      height={ size }
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      { ...a11y }
    >
      { children }
    </svg>
  )
}
