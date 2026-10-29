# Talk: a main-nav entry that opens a widget

This example adds a **Talk** entry to the Studio main navigation. Clicking it opens a tab that shows the slide
viewer of the Portal Engine talk in an iframe, full size, with keyboard focus inside it so the slide keys (arrows,
space) work right away.

The slides themselves are not part of this bundle. The tab only shows a URL: by default `/talk/talk.html`, the
standalone viewer built in the talk project and published under the web root. Change `DEFAULT_TALK_URL` in
`config.ts`, or the `url` in the entry's `widgetConfig.config`, to show it from somewhere else (the page must allow
being framed by Studio).

## Extension points used

- **`MainNavRegistry.registerMainNavItem()`** (service `serviceIds.mainNavRegistry`): adds the "Talk" entry. Its
  `widgetConfig` names the widget to open (`component`) and the `config` the widget gets as its props (here `url`).
- **`WidgetRegistry.registerWidget()`** (service `serviceIds.widgetManager`): registers the React component
  `TalkSlidesWidget` under the name the entry points to (`talk-slides`).
- **`IAbstractPlugin.onStartup()` / `moduleSystem.registerModule()`**: the plugin in `index.ts` registers the module
  in `modules/talk-slides-extension.ts`, whose `onInit` does both registrations. The plugin is listed in
  `js/src/plugins.ts`.

## Files

- `index.ts`: the plugin.
- `modules/talk-slides-extension.ts`: the main-nav entry and the widget registration.
- `components/talk-slides-widget.tsx`: the iframe; moves focus into it once it has loaded.
- `config.ts`: the default viewer URL.
- `__tests__/talk-slides.test.tsx`: jest tests with the Studio SDK replaced by two small fakes.

## Read next

- `../main-nav-entry`: the smallest main-nav entry that opens a widget (with a parent group entry).
- `../custom-widgets`: more widgets, including `iframe-widget`, an iframe widget that can be configured in the
  widget editor.
- `../tab-manager`: opening and handling tabs from code.
