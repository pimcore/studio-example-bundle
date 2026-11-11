<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore\Pimcore;

use Pimcore\Bundle\PortalEngineBundle\Entity\PublicShare;
use Pimcore\Bundle\PortalEngineBundle\Entity\PublicShareItem;
use Pimcore\Bundle\PortalEngineBundle\Model\Configuration\DataPool\DataPoolConfigInterface;
use Pimcore\Bundle\PortalEngineBundle\Service\DataPool\DataPoolConfigService;
use Pimcore\Bundle\PortalEngineBundle\Service\Entity\EntityManagerService;
use Pimcore\Bundle\PortalEngineBundle\Service\PublicShare\PublicShareService;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\Command\CoasterDemo\CoasterDemo;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\Command\CoasterDemo\ScreamScoreDemo;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\Command\CoasterDemo\ScreamScoreEnvironment;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore\Rides;
use Pimcore\Model\Asset;
use Pimcore\Model\DataObject\PortalUser;
use Pimcore\Model\Site;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

/**
 * The guests' way in (F322): one Portal Engine public share per coaster, named "<Coaster>: your scream score". It holds
 * only that coaster asset, never expires, offers no download and shows no terms text. Its owner is the Park staff
 * portal user (ScreamScoreDemo), on the demo portal's site. A guest opens the share's coaster page, guestLink(): the
 * real coaster detail, with the scream score under it.
 *
 * coaster-demo:setup calls setup(), coaster-demo:reset reset() (new shares, new hashes) and reset --all remove().
 * Everything else (the park's page, the live check) reads the guest link only from here.
 *
 * PublicShareService::create() reads the logged-in portal user and the current Site, which a console command does not
 * have. So setup() saves the share with the PublicShare model's own setters, owner and site set here, and adds the
 * coaster through the service's addItemsToPublicShare(), which also queues the asset for the search index.
 */
class GuestShares
{
    public const NAME_SUFFIX = ': your scream score';

    /** The share's coaster page (portal_engine's PublicShareController::publicAssetDetailAction()). */
    public const ROUTE = 'pimcore_portalengine_public_share_public_asset_detail';

    /** The demo portal answers on plain http (CoasterDemo::DEFAULT_DOMAIN is portal.localhost). */
    public const SCHEME = 'http';

    public function __construct(
        private readonly PublicShareService $publicShares,
        private readonly EntityManagerService $entities,
        private readonly DataPoolConfigService $dataPools,
        private readonly UrlGeneratorInterface $urls,
        private readonly ScreamScoreEnvironment $environment,
        private readonly Rides $rides,
    ) {
    }

    /** "Thunder Loop" => "Thunder Loop: your scream score": how setup finds a coaster's share again. */
    public static function shareName(string $coaster): string
    {
        return $coaster . self::NAME_SUFFIX;
    }

    /**
     * Gives every coaster its share, or repairs the one it has: the same share and hash, its settings back to the
     * demo's, and exactly the current coaster asset in it (reset uploads the coaster again with a new id). Runs after
     * ScreamScoreDemo::setup(), which makes the Park staff user.
     *
     * @return string[] one plain line per thing it made or changed; [] if all was there
     */
    public function setup(): array
    {
        $owner = $this->ownerId() ?? throw new \RuntimeException(sprintf('There is no park-staff portal user %s to own the guests\' shares. Run coaster-demo:setup, which makes it first.', ScreamScoreDemo::STAFF_EMAIL));
        $site = $this->site();
        $pool = $this->assetPool($site);
        $changes = [];
        foreach ($this->coasters() as $name => $asset) {
            $share = $this->share($name, $owner);
            if ($share === null) {
                $share = $this->newShare($name, $owner, $site);
                $changes[] = sprintf('Made the public share "%s" for the guests', $share->getName());
            } elseif (!self::isDemoShare($share, $site)) {
                $this->entities->persist(self::demoSettings($share, $site)->setModificationDate(time()));
                $changes[] = sprintf('Put back the settings of the public share "%s": no expiry, no download, no terms text', $share->getName());
            }
            $changes = [...$changes, ...$this->holdOnly($share, $pool, $asset)];
        }

        return $changes;
    }

    /**
     * New shares for the guests: removes the demo's shares, then sets them up again, so every link has a new hash.
     *
     * @return string[] what was changed
     */
    public function reset(): array
    {
        return [...$this->remove(), ...$this->setup()];
    }

    /**
     * Deletes the demo's shares: those named "...: your scream score" and owned by the Park staff user. Every other
     * share stays, also one of that name with another owner. Nothing to remove is fine.
     *
     * @return string[] what was changed
     */
    public function remove(): array
    {
        $owner = $this->ownerId();
        if ($owner === null) {
            return [];
        }
        $changes = [];
        foreach ($this->entities->getManager()->getRepository(PublicShare::class)->findBy(['userId' => $owner]) as $share) {
            if (str_ends_with($share->getName(), self::NAME_SUFFIX)) {
                $this->publicShares->delete($share);
                $changes[] = sprintf('Deleted the public share "%s"', $share->getName());
            }
        }

        return $changes;
    }

    /**
     * The guest link of a ride: its share's coaster page, `http://<portal site domain>/<asset data pool path>/<hash>/public-share-a~<asset id>`.
     * Built like portal_engine's Rest/Api/PublicShareController, with the site's domain: a console command has no
     * request to take it from. Null when the ride has no share (yet).
     */
    public function guestLink(string $ride): ?string
    {
        $name = $this->rides->name($ride);
        $owner = $this->ownerId();
        $share = $name === null || $owner === null ? null : $this->share($name, $owner);
        if ($share === null) {
            return null;
        }
        $site = $this->site();
        $pool = $this->assetPool($site);
        $item = $this->items($share, $pool)[0] ?? null;
        if ($item === null) {
            return null;
        }

        $context = $this->urls->getContext();
        [$host, $scheme] = [$context->getHost(), $context->getScheme()];
        $context->setHost($site->getMainDomain())->setScheme(self::SCHEME);
        try {
            return $this->urls->generate(self::ROUTE, [
                'publicShareHash' => $share->getHash(),
                'id' => $item->getElementId(),
                'documentPath' => ltrim(self::pathInSite($pool, $site), '/'),
            ], UrlGeneratorInterface::ABSOLUTE_URL);
        } finally {
            $context->setHost($host)->setScheme($scheme);
        }
    }

    /**
     * The guest link of every ride that has a share, by ride key.
     *
     * @return array<string, string> ride key => link
     */
    public function guestLinks(): array
    {
        $links = [];
        foreach ($this->environment->rides(PimcoreFeedbackStore::RIDES_FOLDER) as $ride) {
            $link = $this->guestLink($ride);
            if ($link !== null) {
                $links[$ride] = $link;
            }
        }

        return $links;
    }

    /**
     * The demo portal's asset data pool, the one the coasters are in: the share's item and its link name it.
     */
    public function assetPool(Site $site): DataPoolConfigInterface
    {
        foreach ($this->dataPools->getDataPoolConfigsFromSite($site) as $pool) {
            if ($pool->getElementType() === 'asset') {
                return $pool;
            }
        }

        throw new \RuntimeException(sprintf('The "%s" portal has no asset data pool for the coasters. Run coaster-demo:setup.', CoasterDemo::PORTAL_NAME));
    }

    /** @return array<string, Asset> coaster name => its asset, for every coaster in the ride designs folder */
    private function coasters(): array
    {
        $coasters = [];
        foreach ($this->environment->rides(PimcoreFeedbackStore::RIDES_FOLDER) as $ride) {
            $id = $this->environment->coasterAssetId(PimcoreFeedbackStore::RIDES_FOLDER, $ride);
            $asset = $id === null ? null : Asset::getById($id);
            $name = $this->rides->name($ride);
            if ($asset !== null && $name !== null) {
                $coasters[$name] = $asset;
            }
        }

        return $coasters;
    }

    /** @return string[] */
    private function holdOnly(PublicShare $share, DataPoolConfigInterface $pool, Asset $asset): array
    {
        $changes = [];
        $holds = false;
        foreach ($this->publicShares->getPublicShareItems($share) as $item) {
            if ($item->getElementType() === 'asset' && $item->getElementId() === $asset->getId() && $item->getDataPoolId() === $pool->getId()) {
                $holds = true;
            } else {
                // an earlier upload of the coaster (reset deletes it), or anything added by hand
                $this->entities->remove($item, false);
                $changes[] = sprintf('Took %s %d out of the public share "%s"', $item->getElementType(), $item->getElementId(), $share->getName());
            }
        }
        if ($changes !== []) {
            $this->entities->flush();
        }
        if (!$holds) {
            $this->publicShares->addItemsToPublicShare($share, $pool, [$asset]);
            $changes[] = sprintf('Put the coaster asset %d into the public share "%s"', $asset->getId(), $share->getName());
        }

        return $changes;
    }

    private function newShare(string $coaster, int $owner, Site $site): PublicShare
    {
        $share = self::demoSettings((new PublicShare())->setCollectionId(null), $site)
            ->setHash($this->uniqueHash())
            ->setName(self::shareName($coaster))
            ->setUserId($owner)
            ->setCreationDate(time())
            ->setModificationDate(time());
        $this->entities->persist($share);

        return $share;
    }

    /** The demo's settings: on the portal's site, no expiry, no download types, no terms text (council D2, D5). */
    private static function demoSettings(PublicShare $share, Site $site): PublicShare
    {
        return $share
            ->setCurrentSiteId((int) $site->getId())
            ->setExpiryDate(null)
            ->setShowTermsText(false)
            ->setTermsText(null)
            ->setConfigs([]);
    }

    private static function isDemoShare(PublicShare $share, Site $site): bool
    {
        return $share->getCurrentSiteId() === (int) $site->getId()
            && $share->getCollectionId() === null
            && $share->getExpiryDate() === null
            && !$share->isShowTermsText()
            && $share->getTermsText() === null
            && $share->getConfigs() === [];
    }

    /** @return PublicShareItem[] the share's asset items in the pool */
    private function items(PublicShare $share, DataPoolConfigInterface $pool): array
    {
        return array_values(array_filter(
            $this->publicShares->getPublicShareItems($share),
            static fn (PublicShareItem $item): bool => $item->getElementType() === 'asset' && $item->getDataPoolId() === $pool->getId(),
        ));
    }

    private function share(string $coaster, int $owner): ?PublicShare
    {
        return $this->entities->getManager()->getRepository(PublicShare::class)->findOneBy(['name' => self::shareName($coaster), 'userId' => $owner]);
    }

    /** As PublicShareService::getUniqueHash() (protected there): 32 hex characters no other share has. */
    private function uniqueHash(): string
    {
        do {
            $hash = bin2hex(random_bytes(16));
        } while ($this->publicShares->getByHash($hash) !== null);

        return $hash;
    }

    private function ownerId(): ?int
    {
        $user = PortalUser::getByEmail(ScreamScoreDemo::STAFF_EMAIL, 1);

        return $user instanceof PortalUser ? $user->getId() : null;
    }

    private function site(): Site
    {
        $portalId = $this->environment->portalId();
        $site = $portalId === null ? null : Site::getByRootId($portalId);

        return $site ?? throw new \RuntimeException(sprintf('There is no "%s" portal site. Run coaster-demo:setup, which makes it first.', CoasterDemo::PORTAL_NAME));
    }

    /**
     * The data pool's document path as the portal's site serves it: without the site's root, as Document::getPath()
     * gives it in a request on that site (on the command line it gives the full path).
     */
    private static function pathInSite(DataPoolConfigInterface $pool, Site $site): string
    {
        $path = $pool->getLanguageVariantOrDocument()->getRealFullPath();
        $root = rtrim((string) $site->getRootPath(), '/');

        return $root !== '' && str_starts_with($path, $root . '/') ? substr($path, strlen($root)) : $path;
    }
}
