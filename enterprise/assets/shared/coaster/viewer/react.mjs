// The orbit view as a React component, props `file` and `size` (see orbit.mjs). The host passes its own React in,
// so the viewer never loads a second copy of it:
//
//   import React from 'react';
//   import { createCoasterViewer } from '.../shared/coaster/viewer/react.mjs';
//   const CoasterViewer = createCoasterViewer(React);
//   <CoasterViewer file={text} size={{ width: 800, height: 500 }} />
import { mountCoasterViewer } from './orbit.mjs';

/** @param {typeof import('react')} React */
export function createCoasterViewer(React) {
  const { createElement, useEffect, useRef } = React;
  return function CoasterViewer({ file, size, colors, className }) {
    const ref = useRef(null);
    const width = size?.width;
    const height = size?.height;
    useEffect(() => {
      if (!ref.current) return undefined;
      const viewer = mountCoasterViewer(ref.current, { file, size: size && { width, height }, colors });
      return () => viewer.dispose();
      // A new file or size mounts it again; the colours count only on mount.
    }, [file, width, height]);
    return createElement('div', {
      ref,
      className: ['coaster-viewer-host', className].filter(Boolean).join(' '),
      style: size ? { width, height } : { width: '100%', height: '100%' },
    });
  };
}
