<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore\InMemory;

use Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore\Rides;

/** Rides from an array, for the tests: ride key => coaster name. */
class InMemoryRides implements Rides
{
    /** @param array<string, string> $names */
    public function __construct(private readonly array $names)
    {
    }

    public function name(string $ride): ?string
    {
        return $this->names[$ride] ?? null;
    }

    public function all(): array
    {
        $names = $this->names;
        asort($names, SORT_NATURAL | SORT_FLAG_CASE);

        return $names;
    }
}
