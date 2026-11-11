<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore;

use Psr\Cache\CacheItemPoolInterface;

/**
 * The FailureCounter of the running demo: the counts live in the app cache (`cache.app`, config/scream-score.yaml),
 * so they hold across requests and expire on their own. The cache key is a hash of the key, so no request text
 * becomes part of it.
 */
class CacheFailureCounter implements FailureCounter
{
    private const KEY_PREFIX = 'studio_example_enterprise_scream_score_failures_';

    public function __construct(private readonly CacheItemPoolInterface $cache)
    {
    }

    public function failures(string $key): int
    {
        $item = $this->cache->getItem($this->cacheKey($key));

        return $item->isHit() ? (int) $item->get() : 0;
    }

    public function recordFailure(string $key, int $seconds): void
    {
        $item = $this->cache->getItem($this->cacheKey($key));
        $item->set(($item->isHit() ? (int) $item->get() : 0) + 1);
        $item->expiresAfter($seconds);
        $this->cache->save($item);
    }

    private function cacheKey(string $key): string
    {
        return self::KEY_PREFIX . hash('sha256', $key);
    }
}
