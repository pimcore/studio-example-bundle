<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore\InMemory;

use Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore\FeedbackStore;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore\GuestFeedback;

/** A FeedbackStore in an array, for the tests: ids count up from 1. */
class InMemoryFeedbackStore implements FeedbackStore
{
    /** @var array<int, GuestFeedback> */
    private array $records = [];

    private int $lastId = 0;

    public function findByPassAndRide(string $passNumber, string $ride): ?GuestFeedback
    {
        foreach ($this->records as $record) {
            if ($record->passNumber === $passNumber && $record->ride === $ride) {
                return $record;
            }
        }

        return null;
    }

    public function find(int $id): ?GuestFeedback
    {
        return $this->records[$id] ?? null;
    }

    public function forRide(string $ride): array
    {
        return array_values(array_filter($this->records, static fn (GuestFeedback $r): bool => $r->ride === $ride));
    }

    public function save(GuestFeedback $feedback): GuestFeedback
    {
        if ($feedback->id === null) {
            $feedback = $feedback->withId(++$this->lastId);
        }
        $this->records[$feedback->id] = $feedback;

        return $feedback;
    }

    /** @return list<GuestFeedback> every record, for the tests */
    public function all(): array
    {
        return array_values($this->records);
    }
}
