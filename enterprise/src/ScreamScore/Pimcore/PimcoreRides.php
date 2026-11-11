<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore\Pimcore;

use Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore\Rides;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore\ScreamScore;

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
}
