# Scream score: guests rate a coaster, the park reviews

Every coaster of the Pimcore Kingdom gets a scream score from 1 to 10. A guest with an annual pass opens the coaster's
public share on the phone, without a portal login, sees the coaster and rates the ride right under it. The park's
staff sign in to the portal and see the average, the number of ratings and the newest comments of each coaster, and
can hide a comment.

## What it shows

- **The guest's share page**, one public share per coaster, e.g. Thunder Loop's
  `http://portal.localhost/<pool-path>/<share-hash>/public-share-a~<coaster-id>`: the portal's own coaster detail
  (the preview with the 3D ride, and the key figures), and under it the scream score panel: a score from 1 ("barely a
  squeak") to 10 ("lost my voice"), an optional comment of at most 280 characters, the annual pass number and its
  code. After sending, the panel says "Thanks! Your scream score 8 for Thunder Loop is saved." Rating the same coaster
  again with the same pass replaces the earlier score, and the panel says so. The page offers nothing that needs an
  account: no "Ask the brief", no download, no share action.
- **The park's page** for the staff, `http://portal.localhost/_scream-scores`: one row per coaster with its average
  ("7.4 / 10"), the number of ratings and the guest link to copy, the coaster's public share, with **Open as a
  guest**. A coaster's own page lists its five newest visible comments with score and date, each with **Hide**;
  hidden ones are under **Show hidden (n)** with **Show again**. A hidden comment still counts in the average and the
  count: hiding takes away the words, not the guest's vote. The park never sees a pass number.

## How to run

1. Install the sub-bundle as described in [the enterprise README](../../README.md), with the portal plugin built.
2. Run `bin/console coaster-demo:setup` ([`src/Command/README.md`](../Command/README.md)). Besides the coaster demo it
   creates the data object class "Guest feedback" (`GuestFeedback`), the five demo annual passes, three sample
   ratings of Thunder Loop (one of them hidden), the staff user and one public share per coaster. It prints each
   coaster's guest link: the share's coaster page.
3. Open Thunder Loop's guest link in a private window, e.g.
   `http://portal.localhost/<pool-path>/<share-hash>/public-share-a~<coaster-id>` (as setup printed it), wait for the
   coaster to show, and rate the ride in the panel under it with one of the demo passes. Passes 0001 to 0003 already
   rated Thunder Loop (a new rating replaces theirs); 0004 and 0005 are free:

   | Pass number | Code |
   | --- | --- |
   | `PK-2026-0001` | `scream-0001` |
   | `PK-2026-0002` | `scream-0002` |
   | `PK-2026-0003` | `scream-0003` |
   | `PK-2026-0004` | `scream-0004` |
   | `PK-2026-0005` | `scream-0005` |

4. Sign in to the portal as the park's staff, `staff@pimcore-kingdom.example`, password `scream-score`, and open
   `http://portal.localhost/_scream-scores`. Your rating is in the count; open Thunder Loop to hide your comment. The
   same page shows each coaster's guest link.

The demo passes and their codes, and the staff login, are public demo defaults like the supplier's
`supplier@loopwerk.example` / `thunder-loop`: printed here and by setup, the same on every install. The data keeps
only the codes' hashes. Use them on a demo machine only; on any other install run `bin/console coaster-demo:reset --all`
when you are done, which removes the shares, the passes, the ratings and the staff user.

Tests, from the repository root: `enterprise/tests/scream-score.test.mjs` (the rules), `scream-score-setup.test.mjs`
(setup and reset), `scream-score-shares.test.mjs` (the guests' shares), `scream-score-share-api.test.mjs` (the
share's rating endpoint), `scream-score-panel.test.mjs` (the panel), `portal-public-share.test.mjs` (the plugin's
opt-in), `scream-score-redirect.test.mjs` and `scream-score-guest.test.mjs` (the old link) and
`scream-score-park.test.mjs` (the park's page). They run with `node --test 'enterprise/tests/*.test.mjs'` and need
`php` on the PATH.

## How it works

### The rules: `ScreamScore`

`ScreamScore.php` holds every rule, in plain PHP without a Pimcore call, so the tests run it in memory:

- the score is a whole number from 1 to 10; anything else is refused, never rounded or clamped;
- the comment is optional plain text of at most 280 characters, stored as typed and escaped where it is shown;
- one rating per pass and coaster: a second one replaces the first;
- the pass comes first: the number must look like `PK-2026-0001` and its code must match before anything is stored.
  An unknown pass and a wrong code get the same answer and take as long, so the page does not tell which passes exist;
- after 5 failed tries on a pass, or from one client, that pass or client is refused for 15 minutes. Anyone can lock
  a pass that way by typing a wrong code 5 times: fine for a demo, a real park would rate-limit differently (per
  device, or through its ticket system).

### The guests' shares: `GuestShares`

`coaster-demo:setup` gives every coaster one Portal Engine public share, "Thunder Loop: your scream score"
(`Pimcore/GuestShares.php`). It holds only that coaster's asset, has no expiry, no download and no terms text, and
belongs to the park-staff user on the demo portal's site. A second setup changes nothing; a share changed by hand
gets the demo's settings back. No expiry suits a demo that runs all year; a real park would give each share an expiry
date at the end of the season (the share's expiry date, as in the portal's own share dialog) and make new ones for
the next. The share's coaster goes through the portal's search index queue, so on a fresh install the share page can
take a moment before it shows the coaster.

The guest link is the share's coaster page, `GuestShares::guestLink()`: setup's printout and the park's page both read
it from there. The old link `/_scream-score/<ride>` (`src/Portal/ScreamScore/GuestController.php`, from before the
shares) has no page any more: it answers 302 to the ride's current share, or 404 "This ride has no scream score"
without one. The target is always a stored share's link, never built from the request, and the old link never rates.

### Two interfaces to swap

The rules reach the data only through two interfaces (and the `FailureCounter` for the lockout, kept in Symfony's app
cache, `CacheFailureCounter.php`):

- **`AnnualPasses`**: the hash of a pass's code, or nothing for an unknown pass. The demo's
  `Pimcore/PimcoreAnnualPasses.php` reads the hashes setup stored in Pimcore's settings store. A real park implements
  this one interface against its ticket system and changes nothing else.
- **`FeedbackStore`**: where the ratings live. The demo's `Pimcore/PimcoreFeedbackStore.php` keeps each one as a
  published `GuestFeedback` data object at `/Pimcore Kingdom/Guest feedback/<ride>-<pass number>`, linked to the
  coaster's asset, so editors see them in Studio too.

`config/scream-score-demo.yaml` wires the Pimcore versions; the tests use the `InMemory/` ones, which are never
services.

### Nothing that needs an account

The panel under the coaster detail is part of this bundle's portal plugin
([`assets/portal/js/src/scream-score/README.md`](../../assets/portal/js/src/scream-score/README.md)). A portal plugin
runs on a public share's page only if its provider opts in: `src/Portal/StudioExampleEnterprisePortalPlugin.php`
implements `PublicSharePluginProviderInterface` (`isAvailableForPublicShare()` answers true). That one opt-in covers
everything the plugin adds, so it offers a guest only what works without an account: the coaster tile, the preview
with the 3D ride (its file route checks the share's hash) and the scream score panel. "Ask the brief" never reaches a
guest: a share page has no header actions, and on a share page the plugin's config has no `agent` part, so no chat
URL. The share itself offers no download, and its page has no share action.

### Public routes in a portal: `custom_public_routes`

The Portal Engine asks for a portal login on every page of a portal site, except its public shares and its public
routes. The share's scream score route, `pimcore_studio_example_enterprise_scream_score_share`, the coaster file's
route (a public share's 3D ride) and the old guest link's route, `pimcore_studio_example_enterprise_scream_score_guest`
(all in `config/pimcore/routing.yaml`), are added to `pimcore_portal_engine.custom_public_routes` by the bundle's
extension (`PimcoreStudioExampleEnterpriseExtension::prepend()`): exactly these route names, merged with the app's own
list. The park's routes stay behind the portal login, and `src/Portal/ScreamScore/StaffAccess.php` lets only members
of the portal user group "Park staff" in (403 for everyone else). A park adds staff by adding them to that group in
Studio.

### On a public share's coaster page: JSON

The panel rates through `/studio-example-enterprise/scream-score/{share hash}/{asset id}`
(`src/Portal/ScreamScore/ShareRatingController.php`, route `pimcore_studio_example_enterprise_scream_score_share`).
GET answers the coaster's ride key and name and a CSRF token; POST takes `{"score", "comment", "passNumber",
"passCode", "token"}` as JSON and answers 200, 422 with one message per field (`score`, `comment`, `pass`), 429 after
too many wrong tries, 400 for an expired token or a request from another site (no `Origin` of the portal's own), and
404 for an unknown or expired share or an asset that is not the share's coaster. The ride is always found from the
share, never sent by the browser; the rules are the same.

The park's pages are server-rendered Twig with plain HTML forms (`src/Portal/ScreamScore/`,
`templates/portal/scream-score/`), styled with the PortalUiKit's tokens; each form carries a CSRF token, and every
send is answered with a redirect, so a reload sends nothing twice.

## Reset

- `bin/console coaster-demo:reset` puts the scream score back to exactly the three sample ratings
  ([`demo-data/scream-score-samples.json`](../../demo-data/scream-score-samples.json)): it deletes every rating a guest
  added, shows a hidden sample again where it was shown, and clears the lockouts. It also makes new public shares
  (new hashes, so new guest links; the old `/_scream-score/<ride>` link leads to the new one). Run it between demo
  runs.
- `bin/console coaster-demo:reset --all` removes it all: the shares, the ratings, the passes, the staff user and
  group and the class "Guest feedback".

## Extension point

**A portal plugin on a public share** (`PublicSharePluginProviderInterface`, the panel in `slots.detailPanels`) with
its public route (`custom_public_routes`, added from the bundle's extension), and the rules behind two interfaces,
**`AnnualPasses`** and **`FeedbackStore`**, that a real park swaps for its own systems.

## Code

- `ScreamScore.php`: the rules; `GuestFeedback.php` one rating; `RatingResult.php` what a rating attempt returns
- `AnnualPasses.php`, `FeedbackStore.php`, `FailureCounter.php`, `Rides.php`: the interfaces; `CacheFailureCounter.php`
  the lockout in the app cache
- `Pimcore/`: the interfaces on Pimcore, `GuestShares.php` the guests' public shares, and
  `PimcoreScreamScoreEnvironment.php` for setup and reset
- `InMemory/`: the same in memory, for the tests
- `../Portal/ScreamScore/ShareRatingController.php`: the JSON endpoint for a public share's coaster page;
  `GuestController.php` the old link's redirect; `ParkController.php`, `StaffAccess.php` the park's page and who is
  staff
- `../Portal/StudioExampleEnterprisePortalPlugin.php`: the plugin's opt-in to public shares
- `../Command/CoasterDemo/ScreamScoreDemo.php`: what setup and reset do for the scream score
