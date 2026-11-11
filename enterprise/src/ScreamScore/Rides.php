<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore;

/**
 * The coasters guests can rate, by ride key (the coaster's file name without `.coaster`, e.g. `thunder-loop`). The
 * guest page (Portal\ScreamScore\GuestController) asks it for the name it shows; an unknown key has no page. The tests
 * use InMemory\InMemoryRides; the demo looks in the coaster assets (Pimcore\PimcoreRides).
 */
interface Rides
{
    /** The coaster's name, e.g. "Thunder Loop", or null when there is no such ride. */
    public function name(string $ride): ?string;
}
