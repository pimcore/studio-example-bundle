<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore;

/**
 * Counts failed pass checks per key (a pass number or a client key) for a while. ScreamScore refuses a key with too
 * many failures. CacheFailureCounter keeps the counts in the app cache; the tests use InMemory\InMemoryFailureCounter.
 */
interface FailureCounter
{
    /** The failures counted for this key that have not expired. */
    public function failures(string $key): int;

    /** Counts one more failure; the key's count expires $seconds after its latest failure. */
    public function recordFailure(string $key, int $seconds): void;

    /** Forgets every count, so no key is refused any more: the coaster demo's reset (F316). */
    public function clear(): void;
}
