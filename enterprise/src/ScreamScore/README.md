# Scream score: guests rate a coaster, the park reviews

Every coaster of the Pimcore Kingdom gets a scream score from 1 to 10. A guest with an annual pass opens one link per
coaster on the phone, without a portal login, and rates the ride. The park's staff sign in to the portal and see the
average, the number of ratings and the newest comments of each coaster, and can hide a comment.

## What it shows

- **The guest page**, one public link per coaster, e.g. `http://portal.localhost/_scream-score/thunder-loop`: a score
  from 1 ("barely a squeak") to 10 ("lost my voice"), an optional comment of at most 280 characters, the annual pass
  number and its code. After sending, the guest sees "Thanks! Your scream score 8 for Thunder Loop is saved." Rating
  the same coaster again with the same pass replaces the earlier score, and the thanks page says so.
- **The park's page** for the staff, `http://portal.localhost/_scream-scores`: one row per coaster with its average
  ("7.4 / 10"), the number of ratings and the guest link to copy. A coaster's own page lists its five newest visible
  comments with score and date, each with **Hide**; hidden ones are under **Show hidden (n)** with **Show again**.
  A hidden comment still counts in the average and the count: hiding takes away the words, not the guest's vote.
  The park never sees a pass number.

## How to run

1. Install the sub-bundle as described in [the enterprise README](../../README.md).
2. Run `bin/console coaster-demo:setup` ([`src/Command/README.md`](../Command/README.md)). Besides the coaster demo it
   creates the data object class "Guest feedback" (`GuestFeedback`), the five demo annual passes, three sample
   ratings of Thunder Loop (one of them hidden) and the staff user. It prints each coaster's guest link.
3. Open the guest link, e.g. `http://portal.localhost/_scream-score/thunder-loop`, and rate the ride with one of the
   demo passes. Passes 0001 to 0003 already rated Thunder Loop (a new rating replaces theirs); 0004 and 0005 are free:

   | Pass number | Code |
   | --- | --- |
   | `PK-2026-0001` | `scream-0001` |
   | `PK-2026-0002` | `scream-0002` |
   | `PK-2026-0003` | `scream-0003` |
   | `PK-2026-0004` | `scream-0004` |
   | `PK-2026-0005` | `scream-0005` |

4. Sign in to the portal as the park's staff, `staff@pimcore-kingdom.example`, password `scream-score`, and open
   `http://portal.localhost/_scream-scores`. Your rating is in the count; open Thunder Loop to hide your comment.

The demo passes and their codes, and the staff login, are public demo defaults like the supplier's
`supplier@loopwerk.example` / `thunder-loop`: printed here and by setup, the same on every install. The data keeps
only the codes' hashes. Use them on a demo machine only; on any other install run `bin/console coaster-demo:reset --all`
when you are done, which removes the passes, the ratings and the staff user.

Tests, from the repository root: `enterprise/tests/scream-score.test.mjs` (the rules), `scream-score-setup.test.mjs`
(setup and reset), `scream-score-guest.test.mjs` (the guest page) and `scream-score-park.test.mjs` (the park's page).
They run with `node --test 'enterprise/tests/*.test.mjs'` and need `php` on the PATH.

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

### A public page in a portal: `custom_public_routes`

The Portal Engine asks for a portal login on every page of a portal site, except its public routes. The guest route,
`pimcore_studio_example_enterprise_scream_score_guest` in `config/pimcore/routing.yaml`, is added to
`pimcore_portal_engine.custom_public_routes` by the bundle's extension
(`PimcoreStudioExampleEnterpriseExtension::prepend()`): exactly this one route name, merged with the app's own list.
The park's routes stay behind the portal login, and `src/Portal/ScreamScore/StaffAccess.php` lets only members of the
portal user group "Park staff" in (403 for everyone else). A park adds staff by adding them to that group in Studio.

### Why no plugin JavaScript

Both pages are server-rendered Twig with plain HTML forms (`src/Portal/ScreamScore/`,
`templates/portal/scream-score/`), styled with the PortalUiKit's tokens. A guest on a phone in the queue needs one
quick form, not the portal app: no navigation, no data pool, no frontend build, and it works without JavaScript. Each
form carries a CSRF token, and every send is answered with a redirect, so reloading the thanks page sends nothing
twice.

## Reset

- `bin/console coaster-demo:reset` puts the scream score back to exactly the three sample ratings
  ([`demo-data/scream-score-samples.json`](../../demo-data/scream-score-samples.json)): it deletes every rating a guest
  added, shows a hidden sample again where it was shown, and clears the lockouts. Run it between demo runs.
- `bin/console coaster-demo:reset --all` removes it all: the ratings, the passes, the staff user and group and the
  class "Guest feedback".

## Extension point

**A public portal route** (`custom_public_routes`, added from the bundle's extension) with server-rendered pages, and
the rules behind two interfaces, **`AnnualPasses`** and **`FeedbackStore`**, that a real park swaps for its own
systems.

## Code

- `ScreamScore.php`: the rules; `GuestFeedback.php` one rating; `RatingResult.php` what a rating attempt returns
- `AnnualPasses.php`, `FeedbackStore.php`, `FailureCounter.php`, `Rides.php`: the interfaces; `CacheFailureCounter.php`
  the lockout in the app cache
- `Pimcore/`: the interfaces on Pimcore, and `PimcoreScreamScoreEnvironment.php` for setup and reset
- `InMemory/`: the same in memory, for the tests
- `../Portal/ScreamScore/GuestController.php`, `ParkController.php`, `StaffAccess.php`: the guest page, the park's page
  and who is staff
- `../Command/CoasterDemo/ScreamScoreDemo.php`: what setup and reset do for the scream score
