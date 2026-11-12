# The `.coaster` format, version 1

A `.coaster` file describes a rollercoaster design: who it is for, its train, and its track as a **sequence of
elements** in ride order (a station, a lift hill, a drop, a loop, ...), not as raw coordinates. It is plain JSON,
UTF-8, pretty-printed with two spaces, one track element per line. That keeps a design short enough for a slide and
makes a change between two revisions a readable line in a diff (`{ "type": "loop", "diameter": 24 }` becomes
`... "diameter": 30 }`).

The JSON Schema is [`schema/coaster.schema.json`](schema/coaster.schema.json) (JSON Schema 2020-12). It is the
reference; this page explains it. [`schema/validate.mjs`](schema/validate.mjs) validates a parsed file against it
without dependencies, in the browser and in Node, and names the JSON Pointer path of every problem:

```js
import { validateCoaster } from './schema/validate.mjs';

const { valid, errors } = validateCoaster(JSON.parse(text));
// errors: [{ path: '/track/3/diameter', message: 'required field is missing' }]
```

Any other JSON Schema 2020-12 validator (e.g. Ajv) accepts the same files.

## Example

```json
{
  "format": "coaster-design",
  "version": "1.0",
  "meta": {
    "name": "Thunder Loop",
    "designer": "Loopwerk Engineering",
    "park": "Pimcore Kingdom",
    "revision": 3
  },
  "train": { "cars": 6, "seatsPerCar": 4 },
  "track": [
    { "type": "station", "length": 30 },
    { "type": "liftHill", "height": 45, "angle": 40 },
    { "type": "drop", "height": 42, "angle": 75 },
    { "type": "loop", "diameter": 24 },
    { "type": "airtimeHill", "height": 18 },
    { "type": "helix", "turns": 1.5, "radius": 15, "bank": 60 },
    { "type": "loop", "diameter": 18 },
    { "type": "brakeRun", "length": 25 },
    { "type": "station", "length": 0 }
  ]
}
```

## The document

| Field | Required | Meaning |
| --- | --- | --- |
| `format` | yes | Always `"coaster-design"`: marks the file as a coaster design. |
| `version` | yes | Format version `"<major>.<minor>"`, a string. This page and the schema describe major version `1` (`"1.0"`, `"1.1"`, ...). |
| `meta` | yes | What the design is (below). |
| `train` | yes | The train that rides it (below). |
| `track` | yes | The track elements in ride order, at least one. |

No other top-level fields are allowed: a typo is an error, not a silently ignored field.

### `meta`

| Field | Required | Meaning |
| --- | --- | --- |
| `name` | yes | Name of the ride, e.g. `"Thunder Loop"`. |
| `designer` | no | Who designed it. |
| `park` | no | The park it is built for. |
| `revision` | yes | Revision of this design, an integer from 1. Each saved change of the design raises it. |

### `train`

| Field | Required | Meaning |
| --- | --- | --- |
| `cars` | yes | Cars per train, 1 to 20. |
| `seatsPerCar` | yes | Seats in each car, 1 to 12. |

## Track elements

Every element is an object with a `type`, one of the eight below, and that type's fields. Units are metres and
degrees. Every element may also carry an optional `label` (a short name such as `"Big Loop"`, e.g. for the diff
view); any field not listed for its type is an error.

The format describes the ride, not its exact shape: how an element turns into a curve (and how the track closes back
at the station) is up to the geometry that reads the file, not to the file.

### `station`

Where the ride starts and ends: the train is loaded and unloaded here. A track usually starts and ends with one.

- `length` (required): platform length in metres, 0 or more. The closing station of a circuit may have `0`.
- `label` (optional): a short name for the element.

### `liftHill`

The climb that gives the train its height, pulled by a chain or cable.

- `height` (required): how far it climbs, in metres (more than 0, up to 200).
- `angle` (required): its slope in degrees from the horizontal (more than 0, up to 90).
- `label` (optional): a short name for the element.

### `drop`

A fall that turns height into speed; the first drop after the lift hill decides the top speed.

- `height` (required): how far it falls, in metres (more than 0, up to 200).
- `angle` (required): its slope in degrees from the horizontal (more than 0, up to 90; 90 is a vertical drop).
- `label` (optional): a short name for the element.

### `loop`

A vertical loop: the train goes once upside down (an inversion).

- `diameter` (required): loop diameter in metres, 8 to 60.
- `label` (optional): a short name for the element.

### `airtimeHill`

A hill crested fast enough that the riders lift out of their seats.

- `height` (required): its height in metres (more than 0, up to 200).
- `label` (optional): a short name for the element.

### `helix`

A banked spiral: the track circles several times on a constant radius.

- `turns` (required): full turns, more than 0, up to 5 (`1.5` = 540 degrees).
- `radius` (required): radius in metres, 6 to 100.
- `bank` (optional): bank angle in degrees, 0 (flat, the default) to 90.
- `direction` (optional): `"left"` or `"right"` (the default), seen from the front seat.
- `label` (optional): a short name for the element.

### `turn`

A level curve that changes the ride's heading.

- `angle` (required): how far it turns, in degrees (more than 0, up to 360).
- `radius` (required): radius in metres, 6 to 100.
- `bank` (optional): bank angle in degrees, 0 (flat, the default) to 90.
- `direction` (optional): `"left"` or `"right"` (the default), seen from the front seat.
- `label` (optional): a short name for the element.

### `brakeRun`

A straight with brakes that slows the train down before the station.

- `length` (required): length in metres, 0 or more.
- `label` (optional): a short name for the element.

## Versions

`version` is `"<major>.<minor>"`. A new minor version may only add something optional, so a reader of `1.0` can still
show a `1.x` file; the schema then gains the new fields. A change that an older reader would misread (renaming or
removing a field, changing a unit, a new required field) is a new major version with its own schema, and this
schema rejects it (`"2.0"` fails at `/version`).

## The viewer is swappable

The format is the contract, not the viewer. The 3D viewer, the metadata extraction (max height, length,
inversions, top speed) and the diff view all read only this format; none of them adds fields to it or depends on how
another one works. So the viewer is swappable behind the format: a different renderer (another 3D library, a 2D
side view, a native app) shows the same files without any change to them, and files stay valid when the viewer
changes.
