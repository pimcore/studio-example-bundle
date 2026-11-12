<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore;

/**
 * The park's annual passes: each pass number has a code, kept only as a hash (password_hash()). A guest proves the
 * pass with number and code; ScreamScore compares the code with password_verify(). The tests use
 * InMemory\InMemoryAnnualPasses; the demo's passes come with the demo data (F316).
 */
interface AnnualPasses
{
    /** The hash of this pass's code, or null when there is no such pass. */
    public function codeHash(string $passNumber): ?string;
}
