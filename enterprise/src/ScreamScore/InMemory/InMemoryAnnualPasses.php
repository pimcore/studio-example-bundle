<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore\InMemory;

use Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore\AnnualPasses;

/** AnnualPasses from an array of pass number => code hash, for the tests. */
class InMemoryAnnualPasses implements AnnualPasses
{
    /** @param array<string, string> $codeHashes pass number => password_hash() of its code */
    public function __construct(private readonly array $codeHashes)
    {
    }

    /**
     * Hashes plain codes (pass number => code). The low bcrypt cost keeps the tests quick; real passes use the default.
     *
     * @param array<string, string> $codes
     */
    public static function fromCodes(array $codes, int $cost = 4): self
    {
        return new self(array_map(static fn (string $code): string => password_hash($code, PASSWORD_BCRYPT, ['cost' => $cost]), $codes));
    }

    public function codeHash(string $passNumber): ?string
    {
        return $this->codeHashes[$passNumber] ?? null;
    }
}
