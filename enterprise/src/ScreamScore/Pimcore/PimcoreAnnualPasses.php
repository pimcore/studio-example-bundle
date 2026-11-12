<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore\Pimcore;

use Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore\AnnualPasses;
use Pimcore\Model\Tool\SettingsStore;

/**
 * The AnnualPasses of the running demo: the demo passes' code hashes as one JSON entry in Pimcore's settings store,
 * written by coaster-demo:setup from demo-data/annual-passes.json (F316). Only hashes are stored. A real park would
 * ask its ticket system here instead.
 */
class PimcoreAnnualPasses implements AnnualPasses
{
    public const SETTINGS_ID = 'coaster-demo-annual-passes';

    public const SETTINGS_SCOPE = 'studio-example-enterprise';

    public function codeHash(string $passNumber): ?string
    {
        return $this->all()[$passNumber] ?? null;
    }

    /**
     * Every stored pass: [pass number => code hash]; null if none are stored.
     *
     * @return array<string, string>|null
     */
    public function all(): ?array
    {
        $entry = SettingsStore::get(self::SETTINGS_ID, self::SETTINGS_SCOPE);
        $hashes = $entry === null ? null : json_decode((string) $entry->getData(), true);

        return is_array($hashes) ? array_map('strval', $hashes) : null;
    }

    /** @param array<string, string> $hashes pass number => code hash */
    public function save(array $hashes): void
    {
        SettingsStore::set(self::SETTINGS_ID, json_encode($hashes, JSON_THROW_ON_ERROR), SettingsStore::TYPE_STRING, self::SETTINGS_SCOPE);
    }

    public function delete(): void
    {
        SettingsStore::delete(self::SETTINGS_ID, self::SETTINGS_SCOPE);
    }
}
