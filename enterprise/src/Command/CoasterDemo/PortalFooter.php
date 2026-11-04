<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Command\CoasterDemo;

/**
 * The portal's footer (F157): the small "Talk" link lives there, since Portal Engine has no footer plugin slot. The
 * footer is the snippet the portal configuration names (footerSnippet). The demo's own footer is a marked snippet
 * that renders the Talk link; on a portal with another footer (an editor's, or the one the Portal Engine wizard
 * makes) it shows that footer first, unchanged, and the link at its end. A DemoEnvironment that also implements this
 * gets the link; setup() checks for it, as for ContentPages.
 */
interface PortalFooter
{
    /**
     * The portal's footer snippet: ['id', 'path', 'demo' => whether it is the demo's own, 'wraps' => the id of the
     * footer the demo's shows before the link, or null, 'wrapsPath' => that footer's path, or null], or null when the
     * portal has none.
     */
    public function footer(int $portalId): ?array;

    /**
     * Creates or updates the demo's footer snippet (one per portal), showing the footer $wraps (if given) and then the
     * Talk link, and makes it the portal's footer; the portal's other settings and the wrapped footer stay.
     */
    public function setDemoFooter(int $portalId, ?int $wraps): void;

    /** Gives the portal back the footer the demo's wraps (or none) and deletes the demo's footer snippet. */
    public function removeDemoFooter(int $portalId): void;
}
