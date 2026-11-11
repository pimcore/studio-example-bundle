<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Portal;

use Pimcore\Bundle\PortalEngineBundle\Service\Plugin\PortalPluginConfigProviderInterface;
use Pimcore\Bundle\PortalEngineBundle\Service\Plugin\PortalPluginProviderInterface;
use Symfony\Component\Routing\Exception\ExceptionInterface;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

/**
 * Registers the portal plugin built from assets/portal with Portal Engine. An editor enables it per portal in the
 * portal's "Enabled plugins" field (coaster-demo:setup does it for the demo portal); until assets/portal has been built there is no entrypoints.json, and the portal
 * loads nothing for it.
 */
class StudioExampleEnterprisePortalPlugin implements PortalPluginProviderInterface, PortalPluginConfigProviderInterface
{
    // The plugin's id in a portal's "Enabled plugins"; coaster-demo:setup enables it on the demo portal by this id.
    public const ID = 'studio-example-enterprise';

    // The portal's agent chat route (config/pimcore/routing.yaml, src/Portal/Agent/README.md): the panel "Ask the
    // brief" (assets/portal/js/src/agent/README.md) posts to it.
    public const AGENT_CHAT_ROUTE = 'pimcore_studio_example_enterprise_agent_chat';

    public const AGENT_LABEL = 'Ask the brief';

    /**
     * @param bool $agentEnabled the container parameter studio_example_enterprise.agent.enabled (config/portal.yaml,
     *                           default true): false hides the panel's button
     */
    public function __construct(
        private readonly UrlGeneratorInterface $urlGenerator,
        private readonly bool $agentEnabled = true,
    ) {
    }

    public function getId(): string
    {
        return self::ID;
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
     * Read by the plugin as config('studio-example-enterprise'): `agent` for the "Ask the brief" button (assets/portal/js/src/agent/AskBriefButton.tsx). Without `agent` there is no button. `mode` says where the answers come from today; the
     * "recorded" badge never depends on it, it comes from the stream.
     *
     * @return array<string, mixed>
     */
    public function getFrontendConfig(): array
    {
        $config = [];
        $agent = $this->getAgentConfig();
        if ($agent !== null) {
            $config['agent'] = $agent;
        }

        return $config;
    }

    /**
     * @return array{chatUrl: string, label: string, mode: string}|null null when disabled or the route is missing
     */
    private function getAgentConfig(): ?array
    {
        if (!$this->agentEnabled) {
            return null;
        }
        try {
            $chatUrl = $this->urlGenerator->generate(self::AGENT_CHAT_ROUTE);
        } catch (ExceptionInterface) {
            return null;
        }

        return ['chatUrl' => $chatUrl, 'label' => self::AGENT_LABEL, 'mode' => 'replay'];
    }
}
