# Scream-score panel on a share's coaster page

## What it shows

Someone opens a public share link of a coaster (for example Thunder Loop) without a portal login. Under the portal's
own coaster detail (the 3D ride and the key figures) they see a panel: "How loud did you scream on Thunder Loop?", ten
scores from 1 "barely a squeak" to 10 "lost my voice", an optional comment with a 280-character counter, the
annual-pass number and the pass code, and **Send my scream score**.

After a valid send the panel says thanks in place, for example "Thanks! Your scream score 8 for Thunder Loop is
saved.", plus "It replaces your earlier score 6." when the pass had rated this ride before, and a **Change my scream
score** button that opens the form again. The coaster stays on the page. A refused send keeps what was typed and shows
one message at each field; too many tries, an expired form or a network error show one plain line.

Signed-in portal users, other assets and data objects see no panel at all.

## How to run

1. Build and install the portal plugin as [the plugin's README](../../../README.md) says.
2. Run the demo setup (`bin/console coaster-demo:setup`), which creates the coasters, the annual passes
   and a public share per coaster ([src/Command/README.md](../../../../../src/Command/README.md)).
3. Open the share's link in a private window, open Thunder Loop, scroll under the detail, and send a score with a pass
   from the demo data ([src/ScreamScore/README.md](../../../../../src/ScreamScore/README.md)).

## Extension point

**The detail page's panels**, the slot `slots.detailPanels` of `@pimcore/portal-plugin-sdk`. Every component in the
slot is drawn below the element detail, on the signed-in detail page and on a public share's detail page alike (when
the plugin provider opts in to public shares). The portal passes `{ id, dataPoolId, kind }` (`DetailPanelsProps`).

```tsx
// plugin.tsx, in the module's onInit
componentRegistry.registerToSlot(slots.detailPanels, { name: 'studio-example-enterprise/scream-score', component: ScreamScorePanel })
```

Three things to know:

- **Ask the SDK who is looking.** `isPublicShare()` tells a share's guest from a signed-in user; the panel never works
  it out itself. A panel meant for guests only returns `null` for everyone else.
- **The share hash is in the path.** The slot passes no hash, so `shareHashFromPath` in `scream-score-model.ts` reads
  it from `/<documentPath>/<hash>/public-share-a~<id>`: the segment right before `public-share-a~<id>`, never the first
  one, because the document path may have several segments.
- **Keep the start-up small.** `ScreamScorePanel.tsx` holds only the show rule and a `React.lazy` import; the form with
  the kit's `Panel`, `Form` and `Button` (`ScreamScoreForm.tsx`) is a chunk of its own, fetched on a share's detail
  page only.

The panel talks to one route of this bundle, `/studio-example-enterprise/scream-score/{hash}/{assetId}`
(`src/Portal/ScreamScore/ShareRatingController.php`): GET names the ride and hands out the form's token, POST sends
the score. The server finds the ride from the share's hash and the asset id and answers 404 for any asset that is not
a coaster, so that answer also hides the panel. The slot hands the panel no permission flags, so there is nothing to
pass through `capForPublicShare`; a panel that gets flags from the portal or fetches them should cap them with it.

All decisions (when to show, the hash, the texts, what each answer shows) are in `scream-score-model.ts`, plain
TypeScript without React, tested in Node by `enterprise/tests/scream-score-panel.test.mjs`.
