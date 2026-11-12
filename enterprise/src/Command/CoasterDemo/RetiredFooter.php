<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Command\CoasterDemo;

/**
 * The portal footer snippet earlier versions of the demo wrote (a marked snippet with a link after the portal's own
 * footer). The demo writes no footer any more; setup() and reset --all remove the one it once wrote and give the
 * portal back the footer that snippet showed first, or none. A DemoEnvironment that also implements this gets the
 * clean-up; setup() checks for it, as for ContentPages.
 */
interface RetiredFooter
{
    /**
     * Gives the portal back the footer the demo's snippet wrapped (or none) and deletes that snippet.
     *
     * @return array{wrapsPath: ?string}|null null when the portal has no such snippet; else the path of the footer
     *                                        it got back, or null when it has none now
     */
    public function removeDemoFooter(int $portalId): ?array;
}
