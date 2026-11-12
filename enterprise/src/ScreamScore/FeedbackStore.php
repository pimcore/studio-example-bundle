<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore;

/**
 * Where the GuestFeedback records live. ScreamScore only calls it after the pass is checked, so a pass number that
 * reaches the store is always a known one. The tests use InMemory\InMemoryFeedbackStore; the demo's store keeps them
 * as Pimcore objects (F316).
 */
interface FeedbackStore
{
    /** The rating this pass gave this ride, or null when it has not rated it yet. */
    public function findByPassAndRide(string $passNumber, string $ride): ?GuestFeedback;

    /** The record with this id, or null. */
    public function find(int $id): ?GuestFeedback;

    /**
     * All ratings of this ride, hidden ones included, in any order.
     *
     * @return list<GuestFeedback>
     */
    public function forRide(string $ride): array;

    /** Saves the record (a new one when its id is null) and returns it with its id. */
    public function save(GuestFeedback $feedback): GuestFeedback;
}
