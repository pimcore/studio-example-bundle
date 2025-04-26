import { type AbstractGridCellDefinition } from '@pimcore/studio-ui-bundle/modules/element'
import React, { useEffect, useState } from 'react'

export interface LiveUpdatingCellComponentProps extends AbstractGridCellDefinition {}

export const LiveUpdatingCellComponent = ({ getValue }: LiveUpdatingCellComponentProps): React.JSX.Element => {
  const [currentValue, setCurrentValue] = useState(0)

  useEffect(() => {
    // Simulate a live updating value
    // In a real-world scenario, this could be a Server Side Event or an API call
    // The cell value could be used as a configuration for the API call
    // or the SSE connection
    const timer = setInterval(() => {
      const newValue = Math.floor(Math.random() * 1000)
      setCurrentValue(newValue)
    }, 2000)

    return () => {
      clearInterval(timer)
    }
  }, [])

  return (
    <div className='default-cell__content'>
      {currentValue}
    </div>
  )
}
