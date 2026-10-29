<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Portal;

use Pimcore\Bundle\PortalEngineBundle\Service\Plugin\PortalPluginConfigProviderInterface;
use Pimcore\Bundle\PortalEngineBundle\Service\Plugin\PortalPluginProviderInterface;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\Portal\Talk\TalkPage;

/**
 * Registers the portal plugin built from assets/portal with Portal Engine. An editor enables it per portal in the
 * portal's "Enabled plugins" field; until assets/portal has been built there is no entrypoints.json, and the portal
 * loads nothing for it.
 */
class StudioExampleEnterprisePortalPlugin implements PortalPluginProviderInterface, PortalPluginConfigProviderInterface
{
    public function __construct(private readonly TalkPage $talkPage)
    {
    }

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

    /**
     * Read by the plugin as config('studio-example-enterprise'): the URL of the portal page "Talk" for its navigation
     * entry (assets/portal/talk/TalkNavEntry.tsx).
     *
     * @return array<string, mixed>
     */
    public function getFrontendConfig(): array
    {
        $talk = $this->talkPage->getNavEntry();

        return $talk === null ? [] : ['talk' => $talk];
    }
}
