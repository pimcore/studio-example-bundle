<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore;

use Psr\Cache\CacheItemPoolInterface;

/**
 * The FailureCounter of the running demo: the counts live in the app cache (`cache.app`, config/scream-score.yaml),
 * so they hold across requests and expire on their own. The cache key is a hash of the key, so no request text
 * becomes part of it. clear() starts a new generation: the keys of the old one are never read again and expire on
 * their own, and nothing else in the app cache is touched.
 */
class CacheFailureCounter implements FailureCounter
{
    private const KEY_PREFIX = 'studio_example_enterprise_scream_score_failures_';

    private const GENERATION_KEY = self::KEY_PREFIX . 'generation';

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

    public function clear(): void
    {
        $item = $this->cache->getItem(self::GENERATION_KEY);
        $item->set($this->generation() + 1);
        $this->cache->save($item);
    }

    private function generation(): int
    {
        $item = $this->cache->getItem(self::GENERATION_KEY);

        return $item->isHit() ? (int) $item->get() : 0;
    }

    private function cacheKey(string $key): string
    {
        return self::KEY_PREFIX . $this->generation() . '_' . hash('sha256', $key);
    }
}
