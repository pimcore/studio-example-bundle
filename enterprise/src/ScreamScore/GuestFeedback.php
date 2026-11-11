<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore;

/**
 * One guest's rating of one coaster: the scream score (1-10), an optional comment, the annual pass that rated it,
 * whether the park shows it, and when it was given. One record per pass and ride: a new rating replaces the old one.
 * The ride is its stable key (the coaster's file name without `.coaster`, e.g. `thunder-loop`), not the asset id,
 * which changes when the demo reset uploads the coaster again. Immutable: every change gives a new record.
 */
final class GuestFeedback
{
    public function __construct(
        public readonly ?int $id,
        public readonly string $ride,
        public readonly int $screamScore,
        public readonly ?string $comment,
        public readonly string $passNumber,
        public readonly bool $visible,
        public readonly \DateTimeImmutable $createdAt,
    ) {
    }

    /** The same record with this id; a store gives a new record its id when it saves it. */
    public function withId(int $id): self
    {
        return new self($id, $this->ride, $this->screamScore, $this->comment, $this->passNumber, $this->visible, $this->createdAt);
    }

    /** A new rating by the same pass for the same ride: score, comment and date change, `visible` stays as it was. */
    public function withRating(int $screamScore, ?string $comment, \DateTimeImmutable $createdAt): self
    {
        return new self($this->id, $this->ride, $screamScore, $comment, $this->passNumber, $this->visible, $createdAt);
    }

    /** The same record, shown or hidden by the park. Nothing else changes. */
    public function withVisible(bool $visible): self
    {
        return new self($this->id, $this->ride, $this->screamScore, $this->comment, $this->passNumber, $visible, $this->createdAt);
    }
}
