<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore\InMemory;

use Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore\FailureCounter;

/** A FailureCounter in an array with its own clock, for the tests. */
class InMemoryFailureCounter implements FailureCounter
{
    /** @var array<string, array{count: int, expiresAt: int}> */
    private array $counts = [];

    /** @var \Closure(): int */
    private readonly \Closure $now;

    /** @param (\Closure(): int)|null $now the clock in Unix seconds */
    public function __construct(?\Closure $now = null)
    {
        $this->now = $now ?? static fn (): int => time();
    }

    public function failures(string $key): int
    {
        $entry = $this->counts[$key] ?? null;

        return $entry !== null && $entry['expiresAt'] > ($this->now)() ? $entry['count'] : 0;
    }

    public function recordFailure(string $key, int $seconds): void
    {
        $this->counts[$key] = ['count' => $this->failures($key) + 1, 'expiresAt' => ($this->now)() + $seconds];
    }

    public function clear(): void
    {
        $this->counts = [];
    }
}
