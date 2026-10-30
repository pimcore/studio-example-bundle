# Portal page "Talk"

The slides of the talk as a page of the portal: **Talk** in the portal's navigation rail opens the slide viewer
full-screen, without the portal's header, navigation rail and footer. The viewer itself is the standalone
`talk.html` (built from the talk's Markdown deck); the page shows it in a frame that fills the window.

The page is an example of a portal plugin owning a portal page. How that works is described in the Portal Engine
documentation, "Portal Frontend Plugins", section "Serving your own page".

## The three extension points

1. **A bundle route**, in `config/pimcore/routing.yaml` of this sub-bundle. Pimcore's `BundleRoutingLoader` reads
   that file from every registered bundle, so the application's `config/routes.yaml` stays unchanged. The route
   `pimcore_studio_example_enterprise_talk` has the path `/{_portal_engine_prefix}talk` with Portal Engine's
   requirement for the prefix, so it sits under the portal's language prefix (e.g. `/en/talk`), and the condition
   `request.attributes.get('isPortalEngineSite')`, so it answers on portal sites only. Its controller,
   `src/Portal/Talk/TalkController.php`, is registered with the `controller.service_arguments` tag in
   `config/portal-talk.yaml`.
2. **The blocks of the portal layout**: the page template, `templates/portal/talk.html.twig`, extends
   `@PimcorePortalEngine/layout/studio.html.twig` and overrides the blocks `shellHeader` and `shellNav` (and
   `shellFooter`) with nothing, which drops the portal's chrome. Its `studioContent` block holds the frame.
3. **The navigation slot `slots.navEntries`** of the portal plugin: `js/src/plugin.tsx` registers
   `talk/TalkNavEntry.tsx` there, so "Talk" appears under the navigation rail's own items. The entry's URL comes
   from the server: `src/Portal/StudioExampleEnterprisePortalPlugin.php` generates it in `getFrontendConfig()` and
   the entry reads it with `config('studio-example-enterprise')`.

## Set it up

1. Install the sub-bundle as described in [the enterprise README](../../../README.md), and build the portal plugin
   as described in [the portal plugin README](../README.md) (needs vendor access).
2. Put the viewer where the page loads it from. By default that is
   `/bundles/pimcorestudioexampleenterprise/talk/talk.html`: copy the built `talk.html` to `public/talk/talk.html` of
   this sub-bundle and run `bin/console assets:install`. To load it from elsewhere, set the URL in your application's
   `.env.local`:

   ```dotenv
   PORTAL_TALK_VIEWER_URL=/talk/talk.html
   ```

   A URL on another host works too, as long as that host allows being framed by the portal.
3. Clear the cache (`bin/console cache:clear`) and enable "Studio Example Enterprise" in the **Enabled plugins**
   field of the portal's configuration document.

## The slides in the portal's colours

The page frames the viewer as `<viewer URL>?host=portal&accent=<brand>`: the brand colour is the portal
configuration's `colorPrimary`, the same colour Portal Engine's layout writes into `--pe-brand`. The viewer's title
slides, headings and links take it instead of the neutral default of the standalone `talk.html` and the PDF (the
talk's `viewer/README.md` lists the variables; its `theme.css` overrides them, in the portal too).

## Try it

Log into the portal. Below the navigation rail's own items there is **Talk**. Click it: the page `/<language>/talk`
opens with the slides filling the window, no portal header or rail around them. The viewer's keys work as in the
standalone file (arrows and Space to move, `B` for a black screen, `F` for full screen). The browser's back button
returns to the portal.
