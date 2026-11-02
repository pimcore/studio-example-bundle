<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Agent;

use Psr\Cache\CacheItemPoolInterface;

/**
 * Pending Supplier-note proposals, kept on the server: the agent proposes, the portal user confirms later (F130). The
 * confirm step reads the note from here, by id and for its portal user only, never from the request body
 * (r82-security). Ids are random (128 bits) and every proposal expires after its TTL. Nothing here writes a note.
 */
class ProposalStore
{
    public const DEFAULT_TTL = 900;

    private const KEY_PREFIX = 'studio_example_enterprise_agent_proposal_';

    /** @var \Closure(): int */
    private readonly \Closure $now;

    /**
     * @param (\Closure(): int)|null $now the clock in Unix seconds; the tests pass their own
     */
    public function __construct(
        private readonly CacheItemPoolInterface $cache,
        private readonly int $ttl = self::DEFAULT_TTL,
        ?\Closure $now = null,
    ) {
        $this->now = $now ?? static fn (): int => time();
    }

    /** Stores a pending proposal and returns its id. */
    public function add(int $portalUserId, int $assetId, int $revision, string $text): string
    {
        $id = bin2hex(random_bytes(16));
        $createdAt = ($this->now)();
        $item = $this->cache->getItem(self::KEY_PREFIX . $id);
        $item->set([
            'id' => $id,
            'portalUserId' => $portalUserId,
            'assetId' => $assetId,
            'revision' => $revision,
            'text' => $text,
            'createdAt' => $createdAt,
            'expiresAt' => $createdAt + $this->ttl,
        ]);
        $item->expiresAfter($this->ttl);
        $this->cache->save($item);

        return $id;
    }

    /**
     * The pending proposal with this id, or null when there is none or it has expired.
     *
     * @return array{id: string, portalUserId: int, assetId: int, revision: int, text: string, createdAt: int, expiresAt: int}|null
     */
    public function get(string $id): ?array
    {
        if (!preg_match('~^[0-9a-f]{32}$~', $id)) {
            return null;
        }
        $item = $this->cache->getItem(self::KEY_PREFIX . $id);
        $proposal = $item->isHit() ? $item->get() : null;
        if (!is_array($proposal)) {
            return null;
        }
        // The cache's own expiry may be coarser (or off in a test pool), so the stored time decides.
        if (($this->now)() >= $proposal['expiresAt']) {
            $this->remove($id);

            return null;
        }

        return $proposal;
    }

    public function remove(string $id): void
    {
        if (preg_match('~^[0-9a-f]{32}$~', $id)) {
            $this->cache->deleteItem(self::KEY_PREFIX . $id);
        }
    }

    public function ttl(): int
    {
        return $this->ttl;
    }
}
