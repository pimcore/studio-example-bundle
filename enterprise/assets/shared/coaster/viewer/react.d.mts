// Types of react.mjs for TypeScript hosts in strict mode (the portal plugin, assets/portal/tsconfig.json).
import type * as ReactNamespace from 'react';

type ReactModule = typeof ReactNamespace;

/** A .coaster file: its text, or the parsed object (validated against the schema first). */
export type CoasterFile = string | Record<string, unknown>;

export interface CoasterSize {
  width: number;
  height: number;
}

export interface CoasterColors {
  background?: string;
  ground?: string;
  grid?: string;
  rail?: string;
  steel?: string;
  station?: string;
  mark?: string;
}

export interface CoasterViewerProps {
  file: CoasterFile;
  /** the canvas size; without it the canvas fills its element and follows it */
  size?: CoasterSize;
  colors?: CoasterColors;
  className?: string;
}

export interface CoasterRideProps extends CoasterViewerProps {
  /** metres per second, default 18 */
  speed?: number;
  /** start riding at once (default: wait for Play) */
  autoplay?: boolean;
}

export interface RidePairSide {
  file: CoasterFile;
  title?: string;
  marks?: number[];
}

export interface RidePairProps {
  left: RidePairSide;
  right: RidePairSide;
  speed?: number;
  colors?: CoasterColors;
  className?: string;
}

export function createCoasterViewer(React: ReactModule): ReactNamespace.FunctionComponent<CoasterViewerProps>;
export function createCoasterRide(React: ReactModule): ReactNamespace.FunctionComponent<CoasterRideProps>;
export function createRidePair(React: ReactModule): ReactNamespace.FunctionComponent<RidePairProps>;
