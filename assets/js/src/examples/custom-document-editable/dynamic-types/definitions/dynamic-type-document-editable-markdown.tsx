import React from 'react'
import { injectable } from '@pimcore/studio-ui-bundle/app'
import { type AbstractDocumentEditableDefinition, DynamicTypeDocumentEditableAbstract } from '@pimcore/studio-ui-bundle/modules/element'
import { InheritanceOverlay } from '@pimcore/studio-ui-bundle/modules/document'
import { isNonEmptyString } from '@pimcore/studio-ui-bundle/utils'
import { useStyles } from './dynamic-type-document-editable-markdown.styles'

export type MarkdownEditableDefinition = Omit<AbstractDocumentEditableDefinition, 'config'> & {
  config?: {
    placeholder?: string
    width?: number
    height?: number
    class?: string
    required?: boolean
  }
}

interface MarkdownTextareaProps {
  value?: string | null
  onChange?: (value: string) => void
  config?: MarkdownEditableDefinition['config']
  inherited?: boolean
}

const MarkdownTextarea = ({ value, onChange, config, inherited = false }: MarkdownTextareaProps): React.JSX.Element => {
  const { styles } = useStyles()

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    onChange?.(e.target.value)
  }

  const handleOverwrite = (): void => {
    onChange?.(value ?? '')
  }

  return (
    <InheritanceOverlay
      isInherited={ inherited }
      onOverwrite={ handleOverwrite }
    >
      <textarea
        className={ `${styles.markdownTextarea} ${config?.class ?? ''}`.trim() }
        onChange={ handleChange }
        placeholder={ config?.placeholder }
        style={ {
          width: config?.width ?? 600,
          height: config?.height ?? 300
        } }
        value={ value ?? '' }
      />
    </InheritanceOverlay>
  )
}

@injectable()
export class DynamicTypeDocumentEditableMarkdown extends DynamicTypeDocumentEditableAbstract {
  id: string = 'markdown'

  getEditableDataComponent (props: MarkdownEditableDefinition): React.ReactElement {
    return (
      <MarkdownTextarea
        config={ props.config }
        inherited={ props.inherited }
      />
    )
  }

  isEmpty (value: any, props: MarkdownEditableDefinition): boolean {
    return !isNonEmptyString(value)
  }
}
