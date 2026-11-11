<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore;

/**
 * What ScreamScore::rate() did: stored or not, whether it replaced an earlier score of the same pass, and when
 * refused, one plain message per field (`pass`, `score`, `comment`, `ride`).
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
    ) {
    }

    public static function stored(int $id, bool $replaced): self
    {
        return new self(true, $replaced, [], $id);
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
