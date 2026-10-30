<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Command\CoasterDemo;

/**
 * Demo 1's state: the Theme Park of Tomorrow portal with a "Ride designs" asset data pool, the park's brief as a page
 * in it, the Loopwerk Engineering supplier with a public demo login, and revision 1 of Thunder Loop uploaded with its
 * metadata. setup() creates what is missing and leaves what is there, so a second run changes nothing; reset() goes
 * back to revision 1 (or, with $removeAll, to the state before setup). Both return what they changed, one line each.
 */
class CoasterDemo
{
    public const PORTAL_NAME = 'Theme Park of Tomorrow';

    public const DEFAULT_DOMAIN = 'portal.localhost';

    public const LANGUAGE = 'en';

    public const DATA_POOL_NAME = 'Ride designs';

    public const BRIEF_TITLE = 'Brief: Thunder Loop';

    // The public demo login: shown on stage and in the runbook, so it is no secret.
    public const SUPPLIER_EMAIL = 'supplier@loopwerk.example';

    public const SUPPLIER_PASSWORD = 'thunder-loop';

    public const SUPPLIER_FIRSTNAME = 'Loopwerk';

    public const SUPPLIER_LASTNAME = 'Engineering';

    // The supplier's asset workspace; everything the demo uploads lives below it.
    public const ASSET_ROOT = '/Theme Park of Tomorrow';

    public const COASTER_FOLDER = self::ASSET_ROOT . '/Thunder Loop';

    public const COASTER_FILENAME = 'thunder-loop.coaster';

    public const REVISION_1 = 'thunder-loop-rev1.coaster';

    // Portal Engine permission keys (Pimcore\Bundle\PortalEngineBundle\Enum\Permission): <permission>___<document id>.
    public const PORTAL_ACCESS = 'portal-access___';

    public const DATA_POOL_ACCESS = 'data-pool-access___';

    // What the supplier may do in the asset workspace: everything an upload and its edits need.
    public const WORKSPACE_PERMISSIONS = ['view', 'download', 'edit', 'update', 'create', 'delete', 'subfolder'];

    // Set by the coaster listener (src/Coaster/CoasterMetadataListener.php) on upload.
    public const METADATA = ['maxHeight', 'length', 'inversions', 'topSpeed', 'duration'];

    private readonly string $demoDataDir;

    public function __construct(private readonly DemoEnvironment $environment, ?string $demoDataDir = null)
    {
        $this->demoDataDir = $demoDataDir ?? dirname(__DIR__, 3) . '/demo-data';
    }

    /**
     * @return string[] what was changed; [] if the demo was set up already
     */
    public function setup(string $domain = self::DEFAULT_DOMAIN): array
    {
        $changes = [];
        $env = $this->environment;

        $portalId = $env->portalId();
        if ($portalId === null) {
            $portalId = $env->createPortal(self::PORTAL_NAME, $domain, self::LANGUAGE, self::DATA_POOL_NAME);
            $changes[] = sprintf('Created the portal "%s" on %s with the data pool "%s"', self::PORTAL_NAME, $domain, self::DATA_POOL_NAME);
        }
        $dataPoolId = $env->dataPoolId($portalId, self::DATA_POOL_NAME)
            ?? throw new \RuntimeException(sprintf('The portal "%s" has no asset data pool "%s". Run coaster-demo:reset --all, then setup again.', self::PORTAL_NAME, self::DATA_POOL_NAME));

        $brief = $this->briefHtml();
        if ($env->briefHtml($portalId) !== $brief) {
            $env->saveBrief($portalId, self::BRIEF_TITLE, $brief);
            $changes[] = sprintf('Wrote the brief page "%s"', self::BRIEF_TITLE);
        }

        $supplier = $this->supplier($portalId, $dataPoolId);
        if (!$this->supplierMatches($env->supplier(self::SUPPLIER_EMAIL, self::SUPPLIER_PASSWORD), $supplier)) {
            $env->saveSupplier($supplier);
            $changes[] = sprintf('Set up the supplier %s %s (%s)', self::SUPPLIER_FIRSTNAME, self::SUPPLIER_LASTNAME, self::SUPPLIER_EMAIL);
        }

        // Only a missing coaster is uploaded: setup never overwrites what the demo uploaded; reset does.
        if (!array_key_exists(self::COASTER_FILENAME, $env->assets(self::COASTER_FOLDER))) {
            $env->createAsset(self::COASTER_FOLDER, self::COASTER_FILENAME, $this->revision1());
            $changes[] = sprintf('Uploaded revision 1 as %s/%s', self::COASTER_FOLDER, self::COASTER_FILENAME);
        }
        $missing = array_diff(self::METADATA, array_keys($env->assetMetadata(self::COASTER_FOLDER, self::COASTER_FILENAME)));
        if ($missing !== []) {
            throw new \RuntimeException(sprintf('%s/%s has no metadata %s: is the coaster listener (config/coaster.yaml) registered?', self::COASTER_FOLDER, self::COASTER_FILENAME, implode(', ', $missing)));
        }

        return $changes;
    }

    /**
     * Back to revision 1: removes everything else the demo uploaded, replaces a changed coaster with a fresh revision 1
     * (no version history), then repairs the rest like setup(). With $removeAll, back to the state before setup:
     * removes the supplier, the demo's assets and the portal.
     *
     * @return string[] what was changed; [] if there was nothing to reset
     */
    public function reset(bool $removeAll = false, string $domain = self::DEFAULT_DOMAIN): array
    {
        $env = $this->environment;
        $changes = [];

        if ($removeAll) {
            if ($env->supplier(self::SUPPLIER_EMAIL, self::SUPPLIER_PASSWORD) !== null) {
                $env->deleteSupplier(self::SUPPLIER_EMAIL);
                $changes[] = sprintf('Deleted the supplier %s', self::SUPPLIER_EMAIL);
            }
            if ($env->folderExists(self::ASSET_ROOT)) {
                $env->deleteFolder(self::ASSET_ROOT);
                $changes[] = sprintf('Deleted the folder %s with the demo assets', self::ASSET_ROOT);
            }
            $portalId = $env->portalId();
            if ($portalId !== null) {
                $env->deletePortal($portalId);
                $changes[] = sprintf('Deleted the portal "%s"', self::PORTAL_NAME);
            }

            return $changes;
        }

        foreach ($env->assets(self::COASTER_FOLDER) as $filename => $content) {
            if ($filename === self::COASTER_FILENAME && $content === $this->revision1()) {
                continue;
            }
            $env->deleteAsset(self::COASTER_FOLDER, (string) $filename);
            $changes[] = sprintf('Deleted %s/%s', self::COASTER_FOLDER, $filename);
        }

        return [...$changes, ...$this->setup($domain)];
    }

    /** What a setup must have given the supplier: compared with DemoEnvironment::supplier(), saved as is. */
    public function supplier(int $portalId, int $dataPoolId): array
    {
        return [
            'email' => self::SUPPLIER_EMAIL,
            'firstname' => self::SUPPLIER_FIRSTNAME,
            'lastname' => self::SUPPLIER_LASTNAME,
            'password' => self::SUPPLIER_PASSWORD,
            'permissions' => [
                self::PORTAL_ACCESS . $portalId => 'allow',
                self::DATA_POOL_ACCESS . $dataPoolId => 'allow',
            ],
            'assetWorkspaces' => [self::ASSET_ROOT => self::WORKSPACE_PERMISSIONS],
        ];
    }

    public function briefHtml(): string
    {
        return BriefHtml::fromMarkdown($this->readDemoData('brief.md'));
    }

    public function revision1(): string
    {
        return $this->readDemoData(self::REVISION_1);
    }

    private function supplierMatches(?array $actual, array $wanted): bool
    {
        if ($actual === null || !($actual['passwordValid'] ?? false)) {
            return false;
        }
        foreach (['email', 'firstname', 'lastname'] as $field) {
            if (($actual[$field] ?? null) !== $wanted[$field]) {
                return false;
            }
        }
        foreach ($wanted['permissions'] as $permission => $value) {
            if (($actual['permissions'][$permission] ?? null) !== $value) {
                return false;
            }
        }
        $workspaces = $actual['assetWorkspaces'] ?? [];
        if (array_keys($workspaces) !== array_keys($wanted['assetWorkspaces'])) {
            return false;
        }
        foreach ($wanted['assetWorkspaces'] as $path => $permissions) {
            if (array_diff($permissions, $workspaces[$path]) !== [] || array_diff($workspaces[$path], $permissions) !== []) {
                return false;
            }
        }

        return true;
    }

    private function readDemoData(string $file): string
    {
        $content = @file_get_contents($this->demoDataDir . '/' . $file);
        if ($content === false) {
            throw new \RuntimeException(sprintf('Demo data file %s/%s is missing.', $this->demoDataDir, $file));
        }

        return $content;
    }
}
