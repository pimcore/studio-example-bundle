// Coaster metadata: max height, track length, inversions, top speed and ride duration of a valid .coaster file
// (FORMAT.md). Pure and deterministic: the same document always gives the same values, nothing is read or changed.
// The reference for the viewer and for the PHP port that fills asset metadata on upload; both check against
// enterprise/demo-data/expected-metadata.json. Simple physics on purpose, not physical accuracy.
// Erasable TypeScript only, so Node runs it as is (node --test) and any bundler takes it.

export type TrackElement =
  | { type: 'station'; length: number; label?: string }
  | { type: 'liftHill'; height: number; angle: number; label?: string }
  | { type: 'drop'; height: number; angle: number; label?: string }
  | { type: 'loop'; diameter: number; label?: string }
  | { type: 'airtimeHill'; height: number; label?: string }
  | { type: 'helix'; turns: number; radius: number; bank?: number; direction?: 'left' | 'right'; label?: string }
  | { type: 'turn'; angle: number; radius: number; bank?: number; direction?: 'left' | 'right'; label?: string }
  | { type: 'brakeRun'; length: number; label?: string };

export interface CoasterDesign {
  format: 'coaster-design';
  version: string;
  meta: { name: string; designer?: string; park?: string; revision: number };
  train: { cars: number; seatsPerCar: number };
  track: TrackElement[];
}

export interface CoasterMetadata {
  /** Highest point of the track above the station, in metres (one decimal). */
  maxHeight: number;
  /** Total track length, in metres (one decimal). */
  length: number;
  /** Times the riders go upside down: one per loop. */
  inversions: number;
  /** Speed at the foot of the highest drop, in km/h (one decimal). */
  topSpeed: number;
  /** Ride time from leaving the station to coming back, in whole seconds. */
  duration: number;
}

export const METADATA_UNITS = { maxHeight: 'm', length: 'm', inversions: '', topSpeed: 'km/h', duration: 's' } as const;

/** The model's constants; the PHP port uses the same. */
export const PHYSICS = {
  gravity: 9.81, // m/s²
  stationSpeed: 2, // m/s through a station platform
  chainSpeed: 3, // m/s up a lift hill
  brakeSpeed: 5, // m/s along a brake run
  minCruiseSpeed: 5, // m/s: the slowest the train rides any other element
} as const;

const rad = (degrees: number): number => (degrees * Math.PI) / 180;
const round1 = (value: number): number => Math.round(value * 10) / 10;

/** Length of one element along the track, in metres. */
export function elementLength(element: TrackElement): number {
  switch (element.type) {
    case 'station':
    case 'brakeRun':
      return element.length;
    case 'liftHill':
    case 'drop':
      return element.height / Math.sin(rad(element.angle)); // the slope's hypotenuse
    case 'loop':
      return Math.PI * element.diameter; // a circle
    case 'airtimeHill':
      return 2 * Math.sqrt(5) * element.height; // up and down two straight slopes, the hill 4 × its height wide
    case 'helix':
      return element.turns * 2 * Math.PI * element.radius;
    case 'turn':
      return (element.angle / 360) * 2 * Math.PI * element.radius;
  }
}

/** The five values of a valid .coaster document (already parsed; validate it first with validateCoaster). */
export function extractCoasterMetadata(design: CoasterDesign): CoasterMetadata {
  const { gravity, stationSpeed, chainSpeed, brakeSpeed, minCruiseSpeed } = PHYSICS;

  // Walk the track: the height above the station after each element, and the highest point reached.
  let level = 0;
  let maxHeight = 0;
  let maxDrop = 0;
  for (const element of design.track) {
    if (element.type === 'liftHill') level += element.height;
    if (element.type === 'drop') {
      maxDrop = Math.max(maxDrop, element.height);
      level = Math.max(0, level - element.height); // the track cannot go below the ground
    }
    const peak =
      element.type === 'loop' ? level + element.diameter : element.type === 'airtimeHill' ? level + element.height : level;
    maxHeight = Math.max(maxHeight, peak);
  }

  // Free fall from the drop height: v = √(2 g h). Without a drop, the highest point stands in for it.
  const topSpeedMs = Math.sqrt(2 * gravity * (maxDrop > 0 ? maxDrop : maxHeight));
  const cruiseSpeed = Math.max(minCruiseSpeed, topSpeedMs / 2);

  let length = 0;
  let duration = 0;
  for (const element of design.track) {
    const metres = elementLength(element);
    length += metres;
    const speed =
      element.type === 'station'
        ? stationSpeed
        : element.type === 'liftHill'
          ? chainSpeed
          : element.type === 'brakeRun'
            ? brakeSpeed
            : cruiseSpeed;
    duration += metres / speed;
  }

  return {
    maxHeight: round1(maxHeight),
    length: round1(length),
    inversions: design.track.filter((element) => element.type === 'loop').length,
    topSpeed: round1(topSpeedMs * 3.6),
    duration: Math.round(duration),
  };
}
