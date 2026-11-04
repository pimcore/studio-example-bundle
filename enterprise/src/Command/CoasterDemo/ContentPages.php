<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Command\CoasterDemo;

/**
 * The demo's content pages in the portal's navigation (F155): the brief and the pages for suppliers, each with its
 * navigation icon. A DemoEnvironment that also implements this gets them; setup() checks for it, so an environment
 * without it still runs (the brief then goes through DemoEnvironment::saveBrief(), without an icon).
 */
interface ContentPages
{
    /**
     * The demo's own content page with this key in the portal's language root: ['title', 'icon' => the
     * navigation_icon name or '', 'html' => its WYSIWYG brick's HTML or null], or null if the demo has none. An
     * editor's page is never the demo's, whatever its key.
     */
    public function contentPage(int $portalId, string $key): ?array;

    /**
     * Creates or updates the demo's content page with this key: title, navigation name, navigation icon (a name from
     * portal_engine's icon set, e.g. "handshake.svg") and one WYSIWYG brick with $html; its other settings stay. A new
     * page goes last in the navigation; if an editor's page has the key, the demo's takes the next free one.
     */
    public function saveContentPage(int $portalId, string $key, string $title, string $icon, string $html): void;
}
