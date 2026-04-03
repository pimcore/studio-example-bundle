import { createStyles } from 'antd-style'

export const useStyles = createStyles(({ token }) => {
  return {
    markdownTextarea: {
      fontFamily: 'monospace',
      padding: '8px',
      border: `1px solid ${token.colorBorder}`,
      borderRadius: `${token.borderRadius}px`,
      resize: 'both' as const,
      outline: 'none',

      '&:hover': {
        borderColor: token.colorPrimaryHover
      },

      '&:focus': {
        borderColor: token.colorPrimary,
        boxShadow: `0 0 0 2px ${token.colorPrimaryBg}`
      }
    }
  }
})
