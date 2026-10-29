<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Portal;

use Pimcore\Bundle\PortalEngineBundle\Service\Plugin\PortalPluginProviderInterface;

/**
 * Registers the portal plugin built from assets/portal with Portal Engine. An editor enables it per portal in the
 * portal's "Enabled plugins" field; until assets/portal has been built there is no entrypoints.json, and the portal
 * loads nothing for it.
 */
class StudioExampleEnterprisePortalPlugin implements PortalPluginProviderInterface
{
    public function getId(): string
    {
        return 'studio-example-enterprise';
    }

    public function getLabel(): string
    {
        return 'Studio Example Enterprise';
    }

    /**
     * @return string[]
     */
    public function getEntryPointsJsonLocations(): array
    {
        return [dirname(__DIR__, 2) . '/public/portal/entrypoints.json'];
    }

    public function isAlways(): bool
    {
        return false;
    }
}
