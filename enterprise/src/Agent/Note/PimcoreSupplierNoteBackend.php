<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Agent\Note;

use Pimcore\Bundle\PortalEngineBundle\Enum\Permission;
use Pimcore\Bundle\PortalEngineBundle\Model\DataObject\PortalUserInterface;
use Pimcore\Bundle\PortalEngineBundle\Service\DataPool\DataPoolConfigService;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\Command\CoasterDemo\CoasterDemo;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\Command\CoasterDemo\DemoEnvironment;
use Pimcore\Model\Asset;
use Pimcore\Model\Element\Note;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

/**
 * SupplierNoteBackend on Pimcore and the Portal Engine.
 *
 * The edit check is the Portal Engine's own DataPoolItemPermissionVoter (isGranted(edit, $asset)): workspaces of the
 * user, its groups and the data pool, workflow and upload-folder rules. The voter asks the data pool of the current
 * portal page; this route is no page of a data pool, so the demo's "Ride designs" pool is made current for the check
 * and the previous one restored. The voter checks the token's portal user, the same one the controller let in.
 */
class PimcoreSupplierNoteBackend implements SupplierNoteBackend
{
    public function __construct(
        private readonly DemoEnvironment $environment,
        private readonly DataPoolConfigService $dataPools,
        private readonly AuthorizationCheckerInterface $authorization,
    ) {
    }

    public function mayEdit(PortalUserInterface $user, int $assetId): bool
    {
        $portalId = $this->environment->portalId();
        $dataPoolId = $portalId === null ? null : $this->environment->dataPoolId($portalId, CoasterDemo::DATA_POOL_NAME);
        $asset = $dataPoolId === null ? null : Asset::getById($assetId);
        if (!$asset instanceof Asset) {
            return false;
        }

        $previous = $this->dataPools->getCurrentDataPoolConfig();
        $this->dataPools->setCurrentDataPoolConfigById($dataPoolId);
        try {
            if ($this->dataPools->getCurrentDataPoolConfig()?->getId() !== $dataPoolId) {
                return false;
            }

            return $this->authorization->isGranted(Permission::EDIT, $asset);
        } finally {
            $this->dataPools->setCurrentDataPoolConfig($previous);
        }
    }

    public function writeSupplierNote(int $assetId, int $revision, string $supplierName, string $text): int
    {
        $asset = Asset::getById($assetId);
        if (!$asset instanceof Asset) {
            throw new \RuntimeException(sprintf('Asset %d is gone.', $assetId));
        }

        // No setUser(): the author stays empty, never the Portal Engine's shared fallback user. Note::save() would only
        // fill in a Studio admin, and a portal request has none.
        $note = new Note();
        $note->setElement($asset);
        $note->setDate(time());
        $note->setType(self::NOTE_TYPE);
        $note->setTitle(sprintf('Revision %d', $revision));
        $note->setDescription($text);
        $note->addData('supplier', 'text', $supplierName);
        $note->addData('revision', 'text', (string) $revision);
        $note->save();

        return (int) $note->getId();
    }

    public function demoAssetIds(): array
    {
        $listing = new Asset\Listing();
        $listing->setCondition('`path` LIKE ?', [CoasterDemo::ASSET_ROOT . '/%']);

        return array_values(array_map('intval', $listing->loadIdList()));
    }

    public function removeSupplierNotes(array $assetIds): int
    {
        $assetIds = array_values(array_unique(array_map('intval', $assetIds)));
        if ($assetIds === []) {
            return 0;
        }

        $listing = new Note\Listing();
        $listing->setCondition(
            'ctype = ? AND type = ? AND cid IN (' . implode(', ', array_fill(0, count($assetIds), '?')) . ')',
            ['asset', self::NOTE_TYPE, ...$assetIds],
        );

        $removed = 0;
        foreach ($listing->getNotes() as $note) {
            // the same rule again: whatever the listing returns, no other note is ever deleted
            if ($note->getCtype() === 'asset' && $note->getType() === self::NOTE_TYPE && in_array($note->getCid(), $assetIds, true)) {
                $note->delete();
                ++$removed;
            }
        }

        return $removed;
    }
}
