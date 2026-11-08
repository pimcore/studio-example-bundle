<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Agent;

use Pimcore\Bundle\PortalEngineBundle\Model\DataObject\PortalUserInterface;

/**
 * What KingdomBriefTools reads from Pimcore and the Portal Engine: the park's brief, every .coaster revision there is,
 * and whether a portal user may view an asset. PimcoreKingdomSource is the real one; the tests use an in-memory one.
 * It does not filter by user itself: KingdomBriefTools asks mayView() for every revision, so the filter is in one place.
 */
interface KingdomSource
{
    /** The Thunder Loop brief as plain text (its ride brief object, or the brief page before F293), or null without a demo portal or brief. */
    public function briefText(): ?string;

    /**
     * Every revision of every .coaster asset, oldest first per asset, whoever may see it.
     *
     * @return list<array{assetId: int, path: string, revision: int, maxHeightM: ?float, lengthM: ?float}>
     */
    public function coasterRevisions(): array;

    /** Whether the portal user may view the asset in the demo portal's data pool (the Portal Engine's "view" right). */
    public function mayView(PortalUserInterface $user, int $assetId): bool;
}
