<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore;

/**
 * What ScreamScore::rate() did: stored or not, whether it replaced an earlier score of the same pass, and when
 * refused, one plain message per field (`pass`, `score`, `comment`, `ride`). After a replace, `earlierScore` is the
 * score it replaced (the guest page says so, F317).
 */
final class RatingResult
{
    /**
     * @param array<string, string> $errors field => message; empty when stored
     */
    private function __construct(
        public readonly bool $stored,
        public readonly bool $replaced,
        public readonly array $errors,
        public readonly ?int $id,
        public readonly ?int $earlierScore = null,
    ) {
    }

    /** @param int|null $earlierScore the score a replace replaced; null for a first rating */
    public static function stored(int $id, bool $replaced, ?int $earlierScore = null): self
    {
        return new self(true, $replaced, [], $id, $replaced ? $earlierScore : null);
    }

    /** @param array<string, string> $errors */
    public static function refused(array $errors): self
    {
        return new self(false, false, $errors, null);
    }

    /** @return array{stored: bool, replaced: bool, errors: array<string, string>, id: ?int} */
    public function toArray(): array
    {
        return ['stored' => $this->stored, 'replaced' => $this->replaced, 'errors' => $this->errors, 'id' => $this->id];
    }
}
