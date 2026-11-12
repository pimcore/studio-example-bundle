// Types of track.mjs for TypeScript hosts in strict mode (the portal plugin's tile picture, assets/portal/tsconfig.json).

export interface TrackPoint {
  x: number;
  y: number;
  z: number;
  /** roll in degrees, positive leans right */
  bank: number;
}

export interface TrackElement {
  index: number;
  type: string;
  label?: string;
  start: number;
  end: number;
}

/** Builds the closed centre line of a coaster design (a parsed, validated `.coaster` file, see FORMAT.md). */
export function buildTrack(
  design: { track: Array<{ type: string, label?: string }> },
  options?: { step?: number },
): { points: TrackPoint[], elements: TrackElement[], station: { x: number, y: number, z: number }, closed: true };
