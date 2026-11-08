<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Agent;

use Pimcore\Bundle\PortalEngineBundle\Enum\Permission;
use Pimcore\Bundle\PortalEngineBundle\Model\DataObject\PortalUserInterface;
use Pimcore\Bundle\PortalEngineBundle\Service\Security\PermissionService;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\Coaster\CoasterMetadataListener;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\Command\CoasterDemo\CoasterDemo;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\Command\CoasterDemo\DemoEnvironment;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\Command\CoasterDemo\RideBriefs;
use Pimcore\Model\Asset;
use Pimcore\Model\Version;

/**
 * KingdomSource on Pimcore and the Portal Engine: the Thunder Loop ride brief the coaster demo set up, the .coaster assets with
 * their version history (version n = revision n, as the supplier uploaded them), and the Portal Engine's own "view"
 * check in the demo portal's data pool (workspaces of the user, its groups and the data pool).
 */
class PimcoreKingdomSource implements KingdomSource
{
    public function __construct(
        private readonly DemoEnvironment $environment,
        private readonly PermissionService $permissions,
    ) {
    }

    /**
     * The Thunder Loop ride brief (F293: a "Ride brief" data object, as CoasterDemo::briefText() writes it out), or the
     * brief page of a demo set up before the open briefs.
     */
    public function briefText(): ?string
    {
        $portalId = $this->environment->portalId();
        if ($portalId !== null && $this->environment instanceof RideBriefs) {
            $brief = $this->environment->briefs(CoasterDemo::BRIEF_CLASS, CoasterDemo::BRIEFS_FOLDER)[CoasterDemo::THUNDER_LOOP_BRIEF] ?? null;
            if ($brief !== null) {
                return CoasterDemo::briefText($brief);
            }
        }
        $html = $portalId === null ? null : $this->environment->briefHtml($portalId);
        if ($html === null) {
            return null;
        }
        $text = html_entity_decode(strip_tags(preg_replace('~<(br|/p|/li|/h[1-6])\b[^>]*>~i', "$0\n", $html)), ENT_QUOTES | ENT_HTML5, 'UTF-8');

        return trim(preg_replace("~\n{3,}~", "\n\n", $text));
    }

    public function coasterRevisions(): array
    {
        $listing = new Asset\Listing();
        $listing->setCondition('`filename` LIKE ?', ['%.' . CoasterMetadataListener::EXTENSION]);
        $listing->setOrderKey('id');

        $revisions = [];
        foreach ($listing->getAssets() as $asset) {
            $snapshots = array_values(array_filter(
                array_map(static fn (Version $version) => $version->loadData(), $asset->getVersions()),
                static fn (mixed $data) => $data instanceof Asset,
            ));
            foreach ($snapshots ?: [$asset] as $index => $snapshot) {
                $revisions[] = [
                    'assetId' => $asset->getId(),
                    'path' => $asset->getRealFullPath(),
                    'revision' => $index + 1,
                    'maxHeightM' => self::number($snapshot->getMetadata('maxHeight')),
                    'lengthM' => self::number($snapshot->getMetadata('length')),
                ];
            }
        }

        return $revisions;
    }

    public function mayView(PortalUserInterface $user, int $assetId): bool
    {
        $portalId = $this->environment->portalId();
        $dataPoolId = $portalId === null ? null : $this->environment->dataPoolId($portalId, CoasterDemo::DATA_POOL_NAME);
        $asset = $dataPoolId === null ? null : Asset::getById($assetId);
        if (!$asset) {
            return false;
        }

        return $this->permissions->isPermissionAllowed(Permission::VIEW, $user, $dataPoolId, $asset->getRealFullPath());
    }

    private static function number(mixed $value): ?float
    {
        return is_numeric($value) ? (float) $value : null;
    }
}
