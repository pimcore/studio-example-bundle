<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore\Pimcore;

use Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore\Rides;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore\ScreamScore;
use Pimcore\Model\Asset;

/**
 * The rides of the running demo: `<ride key>.coaster` under /Pimcore Kingdom/Ride designs (PimcoreFeedbackStore::coaster()).
 * The name is the design's `meta.name`; a design without one is named after its key ("thunder-loop" → "Thunder Loop").
 * Reads the asset directly: the guest page opens no data pool.
 */
class PimcoreRides implements Rides
{
    public function __construct(private readonly PimcoreFeedbackStore $store)
    {
    }

    public function name(string $ride): ?string
    {
        if (preg_match(ScreamScore::RIDE_PATTERN, $ride) !== 1) {
            return null;
        }
        $coaster = $this->store->coaster($ride);
        if ($coaster === null) {
            return null;
        }
        $design = json_decode((string) $coaster->getData(), true);
        $name = is_array($design) ? ($design['meta']['name'] ?? null) : null;

        return is_string($name) && trim($name) !== '' ? trim($name) : ucwords(str_replace('-', ' ', $ride));
    }

    public function all(): array
    {
        $folder = PimcoreFeedbackStore::RIDES_FOLDER;
        $assets = new Asset\Listing();
        $assets->setCondition('`filename` LIKE ? AND (`path` = ? OR `path` LIKE ?)', ['%.coaster', $folder . '/', $folder . '/%']);
        $names = [];
        foreach ($assets->getAssets() as $asset) {
            $ride = substr((string) $asset->getFilename(), 0, -strlen('.coaster'));
            $name = $this->name($ride);
            if ($name !== null) {
                $names[$ride] = $name;
            }
        }
        asort($names, SORT_NATURAL | SORT_FLAG_CASE);

        return $names;
    }
}
